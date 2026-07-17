/*
  # STS Reactivation System Phase 1 — core schema

  ## Audit summary (done before writing this — see PROJECT_CHANGELOG.md
  "Reactivation System Phase 1" for the full write-up)
  - `public/sw.js` already exists (hand-registered in index.html, no
    vite-plugin-pwa, no competing service worker) — has no `push` or
    `notificationclick` handlers yet. Extended, not replaced.
  - `src/hooks/useNotifications.ts` + `supabase/functions/notifications`
    already exist, but are entirely for verification-code-based
    email/SMS/WhatsApp/Telegram/Discord channels (GoHighLevel-based,
    explicitly `PENDING PROVIDER`). Out of scope for this task
    (no email/SMS/WhatsApp/Telegram) and architecturally unrelated to Web
    Push (no subscription concept at all) — left completely untouched.
  - `settings` table (`key text PRIMARY KEY, value_json jsonb`) already
    exists and is the project's real admin-config pattern
    (`AdminSettings.tsx`). An existing `reminders_*` key group already
    exists there too, but is scoped to email/SMS/GHL — also out of scope,
    also left untouched. This migration adds a clearly-separated `push_*`
    key namespace instead of touching `reminders_*`.
  - `game_state.updated_at`, `get_madrid_today()`, `played_today`,
    `last_play_date`, `current_streak` are the authoritative game-day
    primitives (confirmed via `get_my_state()` and `cashout_game()` in
    prior migrations) — this system reuses them, never redefines them.

  ## Tables added
  - `push_subscriptions` — one row per device/browser subscription.
  - `notification_preferences` — one row per player.
  - `notification_delivery_log` — one row per attempted send, with the
    dedupe key described in the task brief
    (user + subscription + notification_type + game_date).

  ## Not included here
  Settings keys and Cron are in separate migrations (see
  `20260714010000_*` and `20260714020000_*`) — this file is schema only.
*/

-- ── push_subscriptions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint          text NOT NULL,
  p256dh_key        text NOT NULL,
  auth_key          text NOT NULL,
  user_agent        text,
  browser_family    text,
  platform          text,
  device_label      text,
  timezone          text,
  enabled           boolean NOT NULL DEFAULT true,
  permission_status text NOT NULL DEFAULT 'granted' CHECK (permission_status IN ('granted', 'denied', 'default')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  last_success_at   timestamptz,
  last_failure_at   timestamptz,
  failure_count     integer NOT NULL DEFAULT 0,
  revoked_at        timestamptz
);

-- One endpoint must never be duplicated (a browser reusing/renewing the
-- same subscription endpoint updates the existing row instead of
-- creating a second one). Endpoints are unique globally by construction
-- (push-service-issued URLs), so this does not need to be scoped by user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(user_id, enabled) WHERE revoked_at IS NULL AND enabled = true;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Players may only see/manage their own subscriptions.
CREATE POLICY push_subscriptions_select_own ON push_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY push_subscriptions_insert_own ON push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subscriptions_update_own ON push_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No DELETE policy for players — disabling/revoking is a column update
-- (enabled=false / revoked_at set), not a row delete, so history is
-- retained for audit as the task requires. service_role (used by Edge
-- Functions) bypasses RLS entirely by design and needs no explicit
-- policy here.

-- ── notification_preferences ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id           uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push_enabled      boolean NOT NULL DEFAULT false,
  next_day_enabled  boolean NOT NULL DEFAULT true,
  last_call_enabled boolean NOT NULL DEFAULT true,
  timezone          text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_select_own ON notification_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notification_preferences_insert_own ON notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notification_preferences_update_own ON notification_preferences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── notification_delivery_log ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id  uuid REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('next_day', 'last_call', 'test')),
  game_date        date NOT NULL,
  scheduled_for    timestamptz,
  attempted_at     timestamptz,
  delivered_at     timestamptz,
  clicked_at       timestamptz,
  status           text NOT NULL DEFAULT 'queued' CHECK (status IN (
                     'queued', 'sending', 'sent', 'failed_temporary',
                     'failed_permanent', 'clicked', 'skipped'
                   )),
  provider_status  text,
  failure_code     text,
  retry_count      integer NOT NULL DEFAULT 0,
  dedupe_key       text NOT NULL,
  payload_meta     jsonb DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- The dedupe rule the task specifies: user + subscription + type + game
-- date. Test sends use notification_type='test' and are exempt from this
-- constraint's practical effect since each test send should be allowed
-- to recur (test sends don't consume the scheduled-message limit) — see
-- the Edge Function logic, which never checks this index for 'test' rows
-- and always inserts them with a fresh dedupe_key. Real 'next_day'/
-- 'last_call' rows rely on this index to make a repeated Cron run a
-- no-op rather than a duplicate send.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_delivery_dedupe
  ON notification_delivery_log (user_id, subscription_id, notification_type, game_date)
  WHERE notification_type <> 'test';

CREATE INDEX IF NOT EXISTS idx_notification_delivery_status ON notification_delivery_log(status, notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_user ON notification_delivery_log(user_id, game_date DESC);

ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Players may read their own delivery history (e.g. "was I notified
-- today") but can never write to it directly — only service-role Edge
-- Functions (which bypass RLS) create/update these rows. This prevents a
-- normal client from inserting a fake delivery log or marking their own
-- notification as sent/clicked without a real click event being recorded
-- server-side.
CREATE POLICY notification_delivery_log_select_own ON notification_delivery_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policy for authenticated — intentionally. All
-- writes happen via service-role Edge Functions.