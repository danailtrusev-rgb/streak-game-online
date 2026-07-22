/*
# Payments Hardening — Safe Defaults & Dummy Simulation Security

## Purpose

Ensures safe defaults after the payments foundation migration:
1. Withdrawals remain disabled by default (withdrawals_enabled = false)
2. Dummy provider is NOT active for withdrawal by default
3. Dummy simulation is disabled unless explicitly enabled
4. topup_wallet remains service-role only (re-revoke)
5. cashout_game is NOT altered

## Settings Seeded

- dummy_simulation_enabled = false (admin must explicitly enable)
- withdrawals_enabled = false (re-confirmed)
- dummy provider is_active_for_withdrawal = false (re-confirmed)

## Security

- No new tables
- No new RPCs
- No changes to existing functions
- Only settings and provider flags are adjusted
*/

-- ── Ensure withdrawals are disabled by default ─────────────────────────────────

INSERT INTO public.settings (key, value_json) VALUES
  ('dummy_simulation_enabled', 'false'::jsonb),
  ('withdrawals_enabled', 'false'::jsonb)
ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json
WHERE public.settings.key IN ('withdrawals_enabled');

-- Only set dummy_simulation_enabled to false if it doesn't exist yet
INSERT INTO public.settings (key, value_json) VALUES
  ('dummy_simulation_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── Ensure dummy provider is NOT active for withdrawal ─────────────────────────

UPDATE public.payment_providers
SET is_active_for_withdrawal = false,
    updated_at = now()
WHERE provider_key = 'dummy' AND is_active_for_withdrawal = true;

-- ── Re-confirm topup_wallet is service-role only ───────────────────────────────

REVOKE ALL ON FUNCTION public.topup_wallet(integer, text) FROM PUBLIC, anon, authenticated;

-- ── Re-confirm cashout_game is not altered ─────────────────────────────────────
-- No changes needed — explicitly documented as NOT altered.
