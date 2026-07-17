/*
  # Economy v1 Schema Foundation

  ## Changes
  1. plays.meta — jsonb audit column for full per-play economy breakdown
  2. wallet_ledger type constraint — adds POOL_CONTRIB to allowed types
  3. economy_pools table — community prize pool balances (saturday, sunday)
     jackpot remains in jackpot_state; pools only track saturday/sunday here

  ## Notes
  - plays.meta stores full rate snapshot at play time: survival_probability,
    daily_streak_value_rate, eff_jackpot_contribution_rate, pool rates, etc.
  - POOL_CONTRIB wallet_ledger entries use amount_cents = 0 (audit only);
    actual pool allocation stored in meta->>'amount_cents'
  - economy_pools has RLS enabled; all writes via SECURITY DEFINER RPCs
*/

-- 1. Add audit meta column to plays
ALTER TABLE public.plays ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}';

-- 2. Expand wallet_ledger type constraint to include POOL_CONTRIB
ALTER TABLE public.wallet_ledger DROP CONSTRAINT IF EXISTS wallet_ledger_type_check;
ALTER TABLE public.wallet_ledger ADD CONSTRAINT wallet_ledger_type_check
  CHECK (type = ANY (ARRAY[
    'TOPUP'::text, 'STAKE'::text, 'CASHOUT'::text,
    'ADMIN_ADJUST'::text, 'JACKPOT_CONTRIB'::text, 'JACKPOT_WIN'::text,
    'POOL_CONTRIB'::text
  ]));

-- 3. Community prize pool table
CREATE TABLE IF NOT EXISTS public.economy_pools (
  pool_key      text        PRIMARY KEY,
  balance_cents integer     NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.economy_pools ENABLE ROW LEVEL SECURITY;

-- Seed pools (jackpot stays in jackpot_state)
INSERT INTO public.economy_pools (pool_key, balance_cents) VALUES
  ('saturday_pool', 0),
  ('sunday_pool',   0)
ON CONFLICT (pool_key) DO NOTHING;
