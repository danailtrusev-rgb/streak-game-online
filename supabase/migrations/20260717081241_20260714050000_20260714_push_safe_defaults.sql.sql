/*
  # Force safe initial values for scheduled Web Push types

  ## The problem
  `20260714010000_push_settings.sql` seeded `push_next_day_enabled` and
  `push_last_call_enabled` as `true` — wrong. The required safe
  deployment defaults are ALL of the following disabled except test mode:
    push_global_enabled   = false
    push_next_day_enabled = false
    push_last_call_enabled = false
    push_test_mode        = true
  `push_global_enabled` was already correctly seeded `false`, so applying
  migrations was never going to start real scheduled sends on its own
  (the scheduler checks `push_global_enabled` first and no-ops if it's
  false — see schedule-reactivation-notifications/index.ts) — but leaving
  the two type-level switches at `true` is still a real latent-activation
  risk: the moment someone flips `push_global_enabled` on for an
  unrelated reason (e.g. testing), both notification types would
  immediately go live with no further review. Fixed here.

  ## Why UPDATE, not another seed INSERT
  The original migration already ran (or would run before this one, given
  migration ordering) with `ON CONFLICT (key) DO NOTHING` — re-inserting
  the same keys with different values would be a silent no-op against an
  already-seeded row. An explicit UPDATE is the correct, append-only way
  to change an already-seeded default without touching the historic
  migration file.

  This does not affect `push_global_enabled` (already `false`) or
  `push_test_mode` (already `true`) — both are left as-is.
*/

UPDATE settings SET value_json = 'false'::jsonb, updated_at = now()
WHERE key = 'push_next_day_enabled';

UPDATE settings SET value_json = 'false'::jsonb, updated_at = now()
WHERE key = 'push_last_call_enabled';

-- Defensive: guarantee push_global_enabled and push_test_mode are correct
-- too, in case a differently-configured environment applied the seed
-- migration with different starting values through some other path.
UPDATE settings SET value_json = 'false'::jsonb, updated_at = now()
WHERE key = 'push_global_enabled' AND value_json <> 'false'::jsonb;

UPDATE settings SET value_json = 'true'::jsonb, updated_at = now()
WHERE key = 'push_test_mode' AND value_json <> 'true'::jsonb;