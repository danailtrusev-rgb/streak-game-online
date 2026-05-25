import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { WalletEntry, TopupResult } from '../lib/types';

export function useWallet() {
  const { refresh } = useAuth();
  const [ledger, setLedger] = useState<WalletEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const { data, error: queryError } = await supabase
        .from('wallet_ledger')
        .select('id, type, amount_cents, meta, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (queryError) {
        setError(queryError.message);
        return;
      }

      setLedger((data || []) as WalletEntry[]);
      setError(null);
    } finally {
      setLoadingLedger(false);
    }
  }, []);

  const topup = useCallback(async (amountCents: number) => {
    setToppingUp(true);
    setError(null);

    try {
      const idemKey = crypto.randomUUID();
      const { data, error: rpcError } = await supabase.rpc('topup_wallet', {
        p_amount_cents: amountCents,
        p_idem_key: idemKey,
      });

      if (rpcError) {
        setError(rpcError.message);
        return null;
      }

      await refresh();
      await fetchLedger();
      return data as TopupResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Topup failed';
      setError(msg);
      return null;
    } finally {
      setToppingUp(false);
    }
  }, [refresh, fetchLedger]);

  return { ledger, loadingLedger, fetchLedger, topup, toppingUp, error };
}
