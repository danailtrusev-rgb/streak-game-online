import { useEffect, useState, useCallback } from 'react';
import { CreditCard, ArrowLeft, Check, X, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { usePayments } from '../../hooks/usePayments';
import { supabase } from '../../lib/supabase';

interface AdminPaymentOrder {
  id: string;
  user_id: string;
  provider_key: string;
  status: string;
  amount_cents: number;
  credits_cents: number;
  created_at: string;
}

interface AdminWithdrawalRequest {
  id: string;
  user_id: string;
  provider_key: string;
  status: string;
  amount_cents: number;
  created_at: string;
}

interface AdminWebhookEvent {
  id: string;
  provider_key: string;
  event_id: string;
  event_type: string;
  processed: boolean;
  processing_error: string | null;
  created_at: string;
}

export default function AdminPayments({ onBack }: { onBack: () => void }) {
  const { fetchSettings, updateSetting } = useAdmin();
  const { simulatePayment, simulatePayout } = usePayments();
  const [orders, setOrders] = useState<AdminPaymentOrder[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalRequest[]>([]);
  const [webhooks, setWebhooks] = useState<AdminWebhookEvent[]>([]);
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const setRes = await fetchSettings();
      if (setRes) {
        const map: Record<string, boolean> = {};
        for (const s of setRes) {
          if (['payments_enabled', 'credit_purchases_enabled', 'withdrawals_enabled', 'dummy_payments_enabled'].includes(s.key)) {
            map[s.key] = s.value_json === true || s.value_json === 'true';
          }
        }
        setSettings(map);
      }

      const { data: ordData } = await supabase
        .from('payment_orders')
        .select('id, user_id, provider_key, status, amount_cents, credits_cents, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (ordData) setOrders(ordData as AdminPaymentOrder[]);

      const { data: wdrData } = await supabase
        .from('withdrawal_requests')
        .select('id, user_id, provider_key, status, amount_cents, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (wdrData) setWithdrawals(wdrData as AdminWithdrawalRequest[]);

      const { data: whkData } = await supabase
        .from('payment_webhook_events')
        .select('id, provider_key, event_id, event_type, processed, processing_error, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (whkData) setWebhooks(whkData as AdminWebhookEvent[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }, [fetchSettings]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleSetting = useCallback(async (key: string, value: boolean) => {
    setSaving(true);
    await updateSetting(key, value);
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaving(false);
  }, [updateSetting]);

  const handleSimulatePayment = useCallback(async (orderId: string, outcome: 'succeeded' | 'failed') => {
    setSimulating(orderId);
    await simulatePayment(orderId, outcome);
    await fetchData();
    setSimulating(null);
  }, [simulatePayment, fetchData]);

  const handleSimulatePayout = useCallback(async (withdrawalId: string, outcome: 'paid' | 'failed') => {
    setSimulating(withdrawalId);
    await simulatePayout(withdrawalId, outcome);
    await fetchData();
    setSimulating(null);
  }, [simulatePayout, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-torch-ember" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-bone-dark hover:text-bone-muted">
          <ArrowLeft className="h-3 w-3" /> Config
        </button>
        <p className="text-death-glow text-sm">{error}</p>
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'processing' || w.status === 'requested');

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-bone-dark hover:text-bone-muted transition-colors">
        <ArrowLeft className="h-3 w-3" /> Config
      </button>

      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-bone">Payments</h2>
      </div>

      {/* Settings toggles */}
      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-[0.1em] text-bone-faint">Payment Toggles</h3>
        {[
          { key: 'payments_enabled', label: 'Payments Enabled' },
          { key: 'credit_purchases_enabled', label: 'Credit Purchases Enabled' },
          { key: 'withdrawals_enabled', label: 'Withdrawals Enabled (KYC gate placeholder)' },
          { key: 'dummy_payments_enabled', label: 'Dummy Payments Enabled' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between border border-moss-dark/20 bg-ritual-surface/20 px-4 py-3">
            <span className="text-xs text-bone">{label}</span>
            <button
              onClick={() => handleToggleSetting(key, !settings[key])}
              disabled={saving}
              className={`flex h-6 w-12 items-center rounded-sm border transition-colors ${
                settings[key]
                  ? 'border-torch-ember/40 bg-torch-ember/10'
                  : 'border-moss-dark/30 bg-transparent'
              }`}
            >
              <span className={`h-4 w-4 transition-transform ${settings[key] ? 'translate-x-6' : 'translate-x-1'}`}>
                {settings[key] ? <Check className="h-4 w-4 text-torch-ember" /> : <X className="h-4 w-4 text-bone-faint" />}
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Pending orders with simulation controls */}
      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-[0.1em] text-bone-faint">Pending Payment Orders (Dummy Simulation)</h3>
        {pendingOrders.length === 0 ? (
          <p className="text-[12px] text-bone-faint">No pending orders.</p>
        ) : (
          <div className="space-y-2">
            {pendingOrders.map((o) => (
              <div key={o.id} className="border border-moss-dark/20 bg-ritual-surface/20 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-bone-dark">{o.provider_key} · €{(o.amount_cents / 100).toFixed(2)} → {o.credits_cents / 100} credits</span>
                    <div className="text-[10px] text-bone-faint mt-0.5">Order: {o.id.slice(0, 8)}… · User: {o.user_id.slice(0, 8)}…</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-bone-faint">{o.status}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSimulatePayment(o.id, 'succeeded')}
                    disabled={simulating === o.id}
                    className="flex items-center gap-1.5 border border-torch-ember/30 bg-torch-ember/5 px-3 py-1.5 text-[10px] uppercase tracking-wider text-torch-ember hover:bg-torch-ember/10 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Simulate Success
                  </button>
                  <button
                    onClick={() => handleSimulatePayment(o.id, 'failed')}
                    disabled={simulating === o.id}
                    className="flex items-center gap-1.5 border border-death-glow/30 bg-death-glow/5 px-3 py-1.5 text-[10px] uppercase tracking-wider text-death-glow hover:bg-death-glow/10 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="h-3 w-3" />
                    Simulate Failure
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All recent orders */}
      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-[0.1em] text-bone-faint">Recent Payment Orders</h3>
        {orders.length === 0 ? (
          <p className="text-[12px] text-bone-faint">No orders yet.</p>
        ) : (
          <div className="space-y-1">
            {orders.slice(0, 10).map((o) => (
              <div key={o.id} className="flex justify-between border border-moss-dark/10 px-3 py-2">
                <span className="text-[11px] text-bone-dark">{o.provider_key} · €{(o.amount_cents / 100).toFixed(2)}</span>
                <span className={`text-[10px] uppercase tracking-wider ${
                  o.status === 'succeeded' ? 'text-torch-ember' : o.status === 'failed' ? 'text-death-glow' : 'text-bone-faint'
                }`}>{o.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending withdrawals with simulation controls */}
      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-[0.1em] text-bone-faint">Pending Withdrawal Requests (Dummy Simulation)</h3>
        {pendingWithdrawals.length === 0 ? (
          <p className="text-[12px] text-bone-faint">No pending withdrawals.</p>
        ) : (
          <div className="space-y-2">
            {pendingWithdrawals.map((w) => (
              <div key={w.id} className="border border-moss-dark/20 bg-ritual-surface/20 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-bone-dark">{w.provider_key} · €{(w.amount_cents / 100).toFixed(2)}</span>
                    <div className="text-[10px] text-bone-faint mt-0.5">Withdrawal: {w.id.slice(0, 8)}… · User: {w.user_id.slice(0, 8)}…</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-bone-faint">{w.status}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSimulatePayout(w.id, 'paid')}
                    disabled={simulating === w.id}
                    className="flex items-center gap-1.5 border border-torch-ember/30 bg-torch-ember/5 px-3 py-1.5 text-[10px] uppercase tracking-wider text-torch-ember hover:bg-torch-ember/10 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Simulate Paid
                  </button>
                  <button
                    onClick={() => handleSimulatePayout(w.id, 'failed')}
                    disabled={simulating === w.id}
                    className="flex items-center gap-1.5 border border-death-glow/30 bg-death-glow/5 px-3 py-1.5 text-[10px] uppercase tracking-wider text-death-glow hover:bg-death-glow/10 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="h-3 w-3" />
                    Simulate Failed
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All recent withdrawals */}
      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-[0.1em] text-bone-faint">Recent Withdrawal Requests</h3>
        {withdrawals.length === 0 ? (
          <p className="text-[12px] text-bone-faint">No withdrawal requests yet.</p>
        ) : (
          <div className="space-y-1">
            {withdrawals.slice(0, 10).map((w) => (
              <div key={w.id} className="flex justify-between border border-moss-dark/10 px-3 py-2">
                <span className="text-[11px] text-bone-dark">{w.provider_key} · €{(w.amount_cents / 100).toFixed(2)}</span>
                <span className={`text-[10px] uppercase tracking-wider ${
                  w.status === 'paid' ? 'text-torch-ember' : w.status === 'failed' ? 'text-death-glow' : 'text-bone-faint'
                }`}>{w.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent webhooks */}
      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-[0.1em] text-bone-faint">Recent Webhook Events</h3>
        {webhooks.length === 0 ? (
          <p className="text-[12px] text-bone-faint">No webhook events yet.</p>
        ) : (
          <div className="space-y-1">
            {webhooks.slice(0, 10).map((w) => (
              <div key={w.id} className="flex justify-between border border-moss-dark/10 px-3 py-2">
                <span className="text-[11px] text-bone-dark">{w.event_type}</span>
                <span className={`text-[10px] uppercase tracking-wider ${
                  w.processed ? 'text-torch-ember' : w.processing_error ? 'text-death-glow' : 'text-bone-faint'
                }`}>
                  {w.processed ? 'Processed' : w.processing_error ? 'Error' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
