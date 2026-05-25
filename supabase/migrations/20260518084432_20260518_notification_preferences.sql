/*
  # Notification Preferences

  ## Summary
  Creates the notification_preferences table for storing player reminder channel settings.

  ## New Tables

  ### notification_preferences
  Stores one row per user per channel (email, sms, whatsapp, telegram, discord).
  - `id` — primary key
  - `user_id` — references auth.users
  - `channel` — one of: email | sms | whatsapp | telegram | discord
  - `enabled` — whether the player has this channel active
  - `contact_value` — the destination (email address, phone number, telegram username, etc.)
  - `verified` — whether the contact value has been verified (code confirmed)
  - `verification_code` — temporary 6-digit code (hashed or plain, server-side only)
  - `code_sent_at` — when the last code was sent (rate-limit: 2 minutes)
  - `verified_at` — when verification was completed
  - `created_at` / `updated_at`

  ## Security
  - RLS enabled — users can only read/write their own rows
  - INSERT and UPDATE policies scoped to auth.uid()
  - verification_code column is never exposed to clients via RLS policy on select
*/

CREATE TABLE IF NOT EXISTS notification_preferences (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel           text        NOT NULL CHECK (channel IN ('email','sms','whatsapp','telegram','discord')),
  enabled           boolean     NOT NULL DEFAULT false,
  contact_value     text        NOT NULL DEFAULT '',
  verified          boolean     NOT NULL DEFAULT false,
  verification_code text,
  code_sent_at      timestamptz,
  verified_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RPCs (SECURITY DEFINER so they can access verification_code without exposing it to SELECT)

-- Get preferences for current user (without exposing verification_code)
CREATE OR REPLACE FUNCTION get_my_notification_prefs()
RETURNS TABLE (
  id             uuid,
  channel        text,
  enabled        boolean,
  contact_value  text,
  verified       boolean,
  code_sent_at   timestamptz,
  verified_at    timestamptz,
  updated_at     timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, channel, enabled, contact_value, verified, code_sent_at, verified_at, updated_at
  FROM notification_preferences
  WHERE user_id = auth.uid();
$$;

-- Upsert a channel's contact_value and reset verification
-- Called when user saves a new contact value
CREATE OR REPLACE FUNCTION upsert_notification_channel(
  p_channel       text,
  p_contact_value text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_channel NOT IN ('email','sms','whatsapp','telegram','discord') THEN
    RAISE EXCEPTION 'Invalid channel';
  END IF;

  INSERT INTO notification_preferences (user_id, channel, contact_value, verified, enabled, updated_at)
  VALUES (v_user_id, p_channel, p_contact_value, false, false, now())
  ON CONFLICT (user_id, channel) DO UPDATE
    SET contact_value     = EXCLUDED.contact_value,
        verified          = false,
        enabled           = false,
        verification_code = NULL,
        code_sent_at      = NULL,
        verified_at       = NULL,
        updated_at        = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Store a verification code (called by edge function after sending the code)
CREATE OR REPLACE FUNCTION set_notification_verification_code(
  p_channel text,
  p_code    text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_last_sent timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Rate limit: 2 minutes between sends
  SELECT code_sent_at INTO v_last_sent
  FROM notification_preferences
  WHERE user_id = v_user_id AND channel = p_channel;

  IF v_last_sent IS NOT NULL AND v_last_sent > now() - interval '2 minutes' THEN
    RAISE EXCEPTION 'Please wait before requesting another code';
  END IF;

  INSERT INTO notification_preferences (user_id, channel, verification_code, code_sent_at, updated_at)
  VALUES (v_user_id, p_channel, p_code, now(), now())
  ON CONFLICT (user_id, channel) DO UPDATE
    SET verification_code = EXCLUDED.verification_code,
        code_sent_at      = EXCLUDED.code_sent_at,
        updated_at        = EXCLUDED.updated_at;

  RETURN jsonb_build_object('success', true, 'sent_at', now());
END;
$$;

-- Verify the code submitted by the user
CREATE OR REPLACE FUNCTION verify_notification_channel(
  p_channel text,
  p_code    text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row     record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM notification_preferences
  WHERE user_id = v_user_id AND channel = p_channel;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Channel not found';
  END IF;

  -- Code expires after 15 minutes
  IF v_row.code_sent_at IS NULL OR v_row.code_sent_at < now() - interval '15 minutes' THEN
    RAISE EXCEPTION 'Code has expired. Please request a new one.';
  END IF;

  IF v_row.verification_code IS DISTINCT FROM p_code THEN
    RAISE EXCEPTION 'Invalid code';
  END IF;

  UPDATE notification_preferences
  SET verified          = true,
      verified_at       = now(),
      verification_code = NULL,
      enabled           = true,
      updated_at        = now()
  WHERE user_id = v_user_id AND channel = p_channel;

  RETURN jsonb_build_object('success', true, 'verified', true);
END;
$$;

-- Toggle enabled state (only if verified)
CREATE OR REPLACE FUNCTION toggle_notification_channel(
  p_channel text,
  p_enabled boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row     record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM notification_preferences
  WHERE user_id = v_user_id AND channel = p_channel;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Channel not configured';
  END IF;

  IF NOT v_row.verified AND p_enabled THEN
    RAISE EXCEPTION 'Channel must be verified before enabling';
  END IF;

  UPDATE notification_preferences
  SET enabled    = p_enabled,
      updated_at = now()
  WHERE user_id = v_user_id AND channel = p_channel;

  RETURN jsonb_build_object('success', true, 'enabled', p_enabled);
END;
$$;
