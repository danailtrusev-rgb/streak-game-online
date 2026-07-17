/*
  # Economy & Financial Model — Seed Default Planning Settings

  These are planning-model defaults for the Economy v1 locked assumptions.
  They do NOT affect live gameplay math (play_daily_gate, cashout_game, jackpot).
  They are used only for admin visibility and future Economy Dashboard reporting.

  Keys seeded (all planning-only unless noted):
    - blended_rtp_target           = 48   (planning only)
    - hard_rtp_cap                 = 55   (planning only — not enforced in RPC yet)
    - daily_streak_value_rate      = 35   (planning only)
    - jackpot_allocation_rate      = 6    (planning only — separate from jackpot_contribution_rate)
    - saturday_pool_allocation_rate = 3   (planning only — Saturday pools not yet implemented)
    - sunday_pool_allocation_rate  = 4    (planning only — Sunday pools not yet implemented)
    - payment_processing_rate      = 9    (planning only)
    - fraud_risk_buffer_rate       = 4    (planning only)
    - affiliate_promo_budget_rate  = 10   (planning only)
    - target_gross_margin_rate     = 29   (planning only)

  Uses INSERT ... ON CONFLICT DO NOTHING — safe to run multiple times,
  will never overwrite existing values.
*/

INSERT INTO settings (key, value_json) VALUES
  ('blended_rtp_target',            '48'),
  ('hard_rtp_cap',                  '55'),
  ('daily_streak_value_rate',       '35'),
  ('jackpot_allocation_rate',       '6'),
  ('saturday_pool_allocation_rate', '3'),
  ('sunday_pool_allocation_rate',   '4'),
  ('payment_processing_rate',       '9'),
  ('fraud_risk_buffer_rate',        '4'),
  ('affiliate_promo_budget_rate',   '10'),
  ('target_gross_margin_rate',      '29')
ON CONFLICT (key) DO NOTHING;
