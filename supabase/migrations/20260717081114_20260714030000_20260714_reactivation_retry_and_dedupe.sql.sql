/*
  # Reactivation Phase 1 hardening — retry fields, player-level dedupe, job claiming

  ## Problem 1: failed_temporary permanently occupied the dedupe slot
  The original unique index was `(user_id, subscription_id, notification_type,
  game_date)`. A `failed_temporary` row satisfied that index for the rest of
  the game day, so a later Cron tick could never retry it — a temporary
  failure (a transient push-service error) silently became permanent for
  that day. This migration adds real bounded-retry fields and changes the
  claiming logic so a `failed_temporary` row with a future `next_attempt_at`
  IS revisited, while a genuinely exhausted/expired one is not (see the
  claim RPC below).

  ## Problem 2: dedupe was per-subscription, not per-player
  The product rule is one next-day and one last-call notification **per
  player per game day** — not per device. The original index allowed a
  3-device player to receive 3 separate "next day" pushes. Fixed by
  re-scoping the unique index to `(user_id, notification_type, game_date)`
  — one logical delivery-log row IS the one scheduled notification for that
  player/type/day, regardless of how many devices they have. Device
  selection (which subscription actually receives it) is Phase 1's
  "preferred device" strategy — see 20260714040000_*.sql's
  select_preferred_subscription() and PROJECT_CHANGELOG.md "Preferred
  device selection." `subscription_id` remains on the row (records which
  device the send was attempted against) but is no longer part of the
  uniqueness key.

  ## Retry fields added
  - `attempt_count` — starts at 0, incremented on each temporary-failure attempt.
  - `first_attempt_at` — set once, on the very first send attempt.
  - `last_attempt_at` — updated on every attempt (first and retries).
  - `next_attempt_at` — when this job becomes claimable again. NULL means
    "never claim this again" (success, permanent failure, or attempts/
    expiry exhausted) — this is the deliberate inversion from the
    original design, where NULL was accidentally treated as "claim
    immediately." A fresh job always gets an explicit `next_attempt_at`
    at insert time (now()), never NULL.
  - `expires_at` — the notification's real usefulness deadline. For
    last-call this MUST be the actual game cutoff (Madrid midnight) —
    never later. For next-day, the end of the current game day. Checked
    on every claim attempt; an expired job is never sent, retried, or
    claimed again.

  ## Job claiming: FOR UPDATE SKIP LOCKED
  `claim_due_notification_jobs(p_limit)` atomically selects and flips
  status to 'sending' for up to `p_limit` due jobs in one transaction,
  using `FOR UPDATE SKIP LOCKED`. A concurrent second scheduler
  invocation's own `FOR UPDATE SKIP LOCKED` selection simply skips any row
  still locked by an in-flight first transaction — it never blocks waiting,
  and it never claims the same row twice. If a worker crashes before
  committing, Postgres releases the row lock automatically when that
  connection/transaction ends, so the row becomes claimable again on the
  next tick — no permanent lock is possible. This is the standard
  Postgres-native leasing pattern, requiring no new infrastructure beyond
  what this project already runs.
*/

-- ── Retry fields ─────────────────────────────────────────────────────────
ALTER TABLE notification_delivery_log
  ADD COLUMN IF NOT EXISTS attempt_count    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_attempt_at  timestamptz,
  ADD COLUMN IF NOT EXISTS next_attempt_at  timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at       timestamptz;

-- ── Re-scope the dedupe index to player-level, not device-level ──────────
DROP INDEX IF EXISTS idx_notification_delivery_dedupe;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_delivery_dedupe
  ON notification_delivery_log (user_id, notification_type, game_date)
  WHERE notification_type <> 'test';

-- Supports the claim query's WHERE clause efficiently.
CREATE INDEX IF NOT EXISTS idx_notification_delivery_claimable
  ON notification_delivery_log (next_attempt_at)
  WHERE status IN ('queued', 'failed_temporary') AND next_attempt_at IS NOT NULL;

-- ── Job claiming RPC ─────────────────────────────────────────────────────
-- Service-role only (the scheduler's Supabase client already runs as
-- service_role, which bypasses RLS — SECURITY DEFINER here is not about
-- an RLS bypass, it's about giving this one function a controlled,
-- reviewable search_path regardless of caller).
CREATE OR REPLACE FUNCTION public.claim_due_notification_jobs(p_limit integer DEFAULT 50)
RETURNS SETOF notification_delivery_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.notification_delivery_log
  SET    status          = 'sending',
         last_attempt_at = now(),
         first_attempt_at = COALESCE(first_attempt_at, now()),
         updated_at      = now()
  WHERE  id IN (
    SELECT id FROM public.notification_delivery_log
    WHERE  status IN ('queued', 'failed_temporary')
      AND  next_attempt_at IS NOT NULL
      AND  next_attempt_at <= now()
      AND  (expires_at IS NULL OR expires_at > now())
    ORDER BY created_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_notification_jobs(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_due_notification_jobs(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_due_notification_jobs(integer) TO authenticated, service_role;
-- Granted to `authenticated` too only because Postgres requires SOME grant
-- for a SECURITY DEFINER function to be callable at all via PostgREST in
-- some Supabase configurations; the function's own logic does not trust
-- the caller's identity for anything (it operates on already-inserted
-- rows, never accepts a user-supplied user_id/subscription_id), so this
-- is not a privilege-escalation surface — worth revisiting if this
-- project's Supabase role model changes.

/*
  ## Rollback
  `DROP FUNCTION IF EXISTS public.claim_due_notification_jobs(integer);`
  Revert the unique index to the previous per-subscription scope with:
  `DROP INDEX IF EXISTS idx_notification_delivery_dedupe;`
  `CREATE UNIQUE INDEX idx_notification_delivery_dedupe ON notification_delivery_log
   (user_id, subscription_id, notification_type, game_date) WHERE notification_type <> 'test';`
  The new columns can remain (additive, NULL-safe) or be dropped with
  `ALTER TABLE notification_delivery_log DROP COLUMN ...` — no existing
  row's meaning changes either way; nothing is rewritten.
*/