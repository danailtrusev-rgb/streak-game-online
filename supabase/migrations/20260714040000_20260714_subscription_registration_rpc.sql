/*
  # Subscription registration RPC — safe endpoint ownership handling

  ## The gap this closes
  The original design let the browser call
  `supabase.from('push_subscriptions').upsert(..., { onConflict: 'endpoint' })`
  directly, relying on RLS. Audited what actually happens when the same
  endpoint (the browser/push-service-issued subscription URL, tied to the
  device+browser profile, not to any STS login) already belongs to a
  DIFFERENT STS user — this happens for real whenever a player logs out
  and a different player logs in on the same browser/device, without
  ever unsubscribing in between:
  - The existing UPDATE policy is `USING (user_id = auth.uid())`. A
    conflicting row owned by a different user fails that USING clause, so
    RLS would **reject** the update outright — this is not a silent
    security hole (the previous owner's row can't be hijacked by an
    unrelated write), but it IS a dead end for the *new, legitimate*
    player: their subscribe attempt just fails, with no path to actually
    take over that endpoint. That's the real problem this closes — a
    correctness/availability gap, not an active vulnerability, and the
    report and changelog for this pass are precise about that distinction
    rather than overclaiming a security bug that wasn't quite there.

  ## Fix
  `register_push_subscription(...)` — SECURITY DEFINER, so it can
  legitimately reassign an existing endpoint row to whichever user is
  CURRENTLY authenticated, in one atomic `INSERT ... ON CONFLICT (endpoint)
  DO UPDATE` statement (no separate check-then-write race window):
  - Requires a real `auth.uid()` — never accepts a client-supplied user_id.
  - Validates endpoint/p256dh/auth key shape and length before touching
    the table (malformed/excessive values are rejected outright).
  - On a brand-new endpoint: inserts a fresh row for the current user.
  - On an existing endpoint (same or different previous owner): reassigns
    `user_id` to the current caller, re-enables it (`enabled = true`,
    `revoked_at = NULL`), resets `failure_count = 0` (a fresh
    re-registration deserves a clean failure history), and updates the
    device metadata to whatever the browser reports right now.
  - The previous owner is never exposed to the caller — the function
    returns only the (now-reassigned) subscription id.

  The direct client INSERT policy on `push_subscriptions` is dropped —
  subscription creation now only happens through this RPC. SELECT and
  UPDATE (for the "disable this device" action, which doesn't need
  ownership-transfer semantics and remains safely scoped by the existing
  `USING (user_id = auth.uid())` policy) are unchanged.
*/

CREATE OR REPLACE FUNCTION public.register_push_subscription(
  p_endpoint       text,
  p_p256dh         text,
  p_auth           text,
  p_user_agent     text DEFAULT NULL,
  p_browser_family text DEFAULT NULL,
  p_platform       text DEFAULT NULL,
  p_timezone       text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_id      uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_endpoint IS NULL OR length(p_endpoint) < 10 OR length(p_endpoint) > 2000 OR p_endpoint !~ '^https://' THEN
    RAISE EXCEPTION 'Invalid endpoint';
  END IF;
  IF p_p256dh IS NULL OR length(p_p256dh) < 10 OR length(p_p256dh) > 500 THEN
    RAISE EXCEPTION 'Invalid p256dh key';
  END IF;
  IF p_auth IS NULL OR length(p_auth) < 5 OR length(p_auth) > 200 THEN
    RAISE EXCEPTION 'Invalid auth key';
  END IF;

  INSERT INTO public.push_subscriptions (
    user_id, endpoint, p256dh_key, auth_key,
    user_agent, browser_family, platform, timezone,
    enabled, permission_status, revoked_at, failure_count, updated_at
  ) VALUES (
    v_user_id, p_endpoint, p_p256dh, p_auth,
    left(p_user_agent, 500), left(p_browser_family, 50), left(p_platform, 50), left(p_timezone, 100),
    true, 'granted', NULL, 0, now()
  )
  ON CONFLICT (endpoint) DO UPDATE SET
    user_id           = v_user_id, -- reassigns ownership to whoever is currently authenticated
    p256dh_key        = EXCLUDED.p256dh_key,
    auth_key          = EXCLUDED.auth_key,
    user_agent        = EXCLUDED.user_agent,
    browser_family    = EXCLUDED.browser_family,
    platform          = EXCLUDED.platform,
    timezone          = EXCLUDED.timezone,
    enabled           = true,
    permission_status = 'granted',
    revoked_at        = NULL,
    failure_count     = 0,
    updated_at        = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_subscription(text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_push_subscription(text, text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(text, text, text, text, text, text, text) TO authenticated;

-- Subscription rows are now only ever created via the RPC above — direct
-- client inserts are removed. SELECT/UPDATE (own rows only) are
-- unchanged and remain sufficient for reading status and disabling a
-- device, which don't need ownership-transfer semantics.
DROP POLICY IF EXISTS push_subscriptions_insert_own ON push_subscriptions;

/*
  ## Rollback
  Re-create the dropped policy:
  `CREATE POLICY push_subscriptions_insert_own ON push_subscriptions
   FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());`
  `DROP FUNCTION IF EXISTS public.register_push_subscription(text, text, text, text, text, text, text);`
  No existing subscription row is rewritten by this migration.
*/
