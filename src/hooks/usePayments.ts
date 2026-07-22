import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type {
  PaymentConfig,
  PaymentOrder,
  WithdrawalRequest,
  CreateCreditOrderResponse,
  CreateWithdrawalResponse,
  SimulateResponse,
} from '../lib/payments/paymentTypes';

function paymentsUrl(path: string): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payments${path}`;
}

function getAuthHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

const paymentsUiEnabled =
  import.meta.env.VITE_PAYMENTS_UI_ENABLED === 'true';

export function usePayments() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configFetched = useRef(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(paymentsUrl('/config'), {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        setError('Failed to load payment config');
        return;
      }
      const data = await res.json() as PaymentConfig;
      setConfig(data);
      setError(null);
    } catch {
      setError('Failed to load payment config');
    }
  }, []);

  useEffect(() => {
    if (!paymentsUiEnabled) return;
    if (configFetched.current) return;
    configFetched.current = true;
    fetchConfig();
  }, [fetchConfig]);

  const createCreditOrder = useCallback(async (packageKey: string): Promise<CreateCreditOrderResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(paymentsUrl('/create-credit-order'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ package_key: packageKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create order');
        return null;
      }
      return data as CreateCreditOrderResponse;
    } catch {
      setError('Failed to create order');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(paymentsUrl('/credit-orders'), {
        method: 'GET',
        headers: { ...getAuthHeaders(), 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data.orders as PaymentOrder[]);
    } catch {
      // silent
    }
  }, []);

  const createWithdrawal = useCallback(async (amountCents: number): Promise<CreateWithdrawalResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(paymentsUrl('/create-withdrawal-request'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount_cents: amountCents }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create withdrawal');
        return null;
      }
      return data as CreateWithdrawalResponse;
    } catch {
      setError('Failed to create withdrawal');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWithdrawals = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(paymentsUrl('/withdrawal-requests'), {
        method: 'GET',
        headers: { ...getAuthHeaders(), 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setWithdrawals(data.withdrawals as WithdrawalRequest[]);
    } catch {
      // silent
    }
  }, []);

  const simulatePayment = useCallback(async (orderId: string, outcome: 'succeeded' | 'failed'): Promise<SimulateResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const adminSession = localStorage.getItem('admin_session') || '';
      const res = await fetch(paymentsUrl('/dummy/simulate-payment'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'x-admin-session': adminSession,
        },
        body: JSON.stringify({ order_id: orderId, outcome }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Simulation failed');
        return null;
      }
      return data as SimulateResponse;
    } catch {
      setError('Simulation failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const simulatePayout = useCallback(async (withdrawalId: string, outcome: 'paid' | 'failed'): Promise<SimulateResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const adminSession = localStorage.getItem('admin_session') || '';
      const res = await fetch(paymentsUrl('/dummy/simulate-payout'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'x-admin-session': adminSession,
        },
        body: JSON.stringify({ withdrawal_id: withdrawalId, outcome }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Simulation failed');
        return null;
      }
      return data as SimulateResponse;
    } catch {
      setError('Simulation failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    config,
    orders,
    withdrawals,
    loading,
    error,
    paymentsUiEnabled,
    fetchConfig,
    fetchOrders,
    fetchWithdrawals,
    createCreditOrder,
    createWithdrawal,
    simulatePayment,
    simulatePayout,
  };
}
