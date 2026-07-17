/*
  # Upgrade flow: reliable email detection + stale row cleanup

  1. New RPC
    - `check_email_registered(p_email text)` — service-role callable function that
      queries auth.users directly and returns (is_registered bool, owner_id uuid).
      Used by the account-upgrade edge function instead of listUsers() pagination.

  2. Cleanup
    - Delete stale account_upgrade_verifications rows that are expired and unverified.
      These are safe to remove because they were never completed.

  3. Security
    - Function is SECURITY DEFINER so it can query auth.users
    - REVOKE from public/anon; GRANT only to service_role
*/

-- ── 1. Clean up stale/expired unverified verification rows ────────────────────
DELETE FROM account_upgrade_verifications
WHERE verified_at IS NULL
  AND expires_at < now();

-- ── 2. Create reliable email-check function ───────────────────────────────────
CREATE OR REPLACE FUNCTION check_email_registered(p_email text)
RETURNS TABLE (is_registered boolean, owner_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE,
    u.id
  FROM auth.users u
  WHERE lower(u.email) = lower(p_email)
     OR lower(u.email_change) = lower(p_email)
  LIMIT 1;

  -- If no row found, return false with null id
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::uuid;
  END IF;
END;
$$;

-- Restrict to service_role only — not callable by anon or authenticated
REVOKE ALL ON FUNCTION check_email_registered(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION check_email_registered(text) TO service_role;
