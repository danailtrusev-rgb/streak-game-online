/*
  # Account Upgrade Verifications Table

  ## Summary
  Stores server-side hashed verification codes for the guest-to-registered account
  upgrade email flow. The Edge Function generates a 6-digit code, stores a bcrypt
  hash here, sends the plaintext code to the target email, and verifies it on submit.
  This completely replaces the Supabase native email_change flow which was sending
  "Confirm Change of Email" links from the fake @survive.local guest address.

  ## New Table: account_upgrade_verifications

  Columns:
  - id           — uuid primary key
  - user_id      — uuid FK to auth.users (the guest user being upgraded)
  - channel      — text, currently always 'email'
  - target_value — text, the destination email address
  - code_hash    — text, bcrypt hash of the 6-digit code
  - expires_at   — timestamptz, code expires 15 minutes after generation
  - resend_available_at — timestamptz, next resend allowed (2 minutes after last send)
  - attempts     — integer, count of failed verify attempts (max 5)
  - verified_at  — timestamptz, set when code is successfully verified
  - created_at   — timestamptz default now()

  UNIQUE constraint on (user_id, channel) — one pending upgrade per user per channel
  (upserted on new send).

  ## Security
  - RLS enabled
  - No direct client read/write policies — all access via SECURITY DEFINER edge function
  - Service role (edge function) handles all operations
*/

CREATE TABLE IF NOT EXISTS public.account_upgrade_verifications (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel              text        NOT NULL DEFAULT 'email',
  target_value         text        NOT NULL,
  code_hash            text        NOT NULL,
  expires_at           timestamptz NOT NULL,
  resend_available_at  timestamptz NOT NULL,
  attempts             integer     NOT NULL DEFAULT 0,
  verified_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_upgrade_user_channel UNIQUE (user_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_auv_user_id ON public.account_upgrade_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_auv_expires_at ON public.account_upgrade_verifications(expires_at);

ALTER TABLE public.account_upgrade_verifications ENABLE ROW LEVEL SECURITY;

-- No client-facing policies — only the service role edge function accesses this table.
-- Service role bypasses RLS entirely, so no USING policy is needed for edge functions.
-- This table intentionally has no policies (same pattern as admin_credentials).
