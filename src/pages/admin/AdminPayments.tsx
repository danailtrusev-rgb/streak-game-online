import { useEffect, useState, useCallback } from 'react';
import { CreditCard, ArrowLeft, Loader2, ExternalLink } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { supabase } from '../../lib/supabase';

interface AdminPaymentOrder {
  id: string;
  user_id: string;
  provider_key: string;
  provider_payment_id: string | null;
  status: string;
  amount_cents: number;
  credits_cents: number;
  created_at: string;
}

interface AdminWithdrawalRequest {
  id: string;
  user_id: string;
  provider_key: string;
  provider_payout_id: string | null;
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
  const [orders, setOrders] = useState<AdminPaymentOrder[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalRequest[]>([]);
  const [webhooks, setWebhooks] = useState<AdminWebhookEvent[]>([]);
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
        .select('id, user_id, provider_key, provider_payment_id, status, amount_cents, credits_cents, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (ordData) setOrders(ordData as AdminPaymentOrder[]);

      const { data: wdrData } = await supabase
        .from('withdrawal_requests')
        .select('id, user_id, provider_key, provider_payout_id, status, amount_cents, created_at')
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

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-bone-dark hover:text-bone-muted transition-colors">
        <ArrowLeft className="h-3 w-3" /> Config
      </button>

      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-bone">Payments</h2>
      </div>

      {/* Provider dashboard instruction */}
      <div className="border border-torch-ember/20 bg-torch-ember/5 px-4 py-3">
        <div className="flex items-start gap-2">
          <ExternalLink className="h-3.5 w-3.5 text-torch-ember/60 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs text-bone mb-1">Provider Outcomes</div>
            <div className="text-[11px] text-bone-faint leading-relaxed">
              Use the hosted dummy PSP dashboard to resolve pending payments and payouts.
              Payment and payout outcomes are controlled externally by the provider via signed webhooks.
            </div>
          </div>
        </div>
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
                {settings[key] ? <span className="text-torch-ember text-xs">✓</span> : <span className="text-bone-faint text-xs">✕</span>}
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Recent payment orders with provider payment IDs */}
      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-[0.1em] text-bone-faint">Recent Payment Orders</h3>
        {orders.length === 0 ? (
          <p className="text-[12px] text-bone-faint">No orders yet.</p>
        ) : (
          <div className="space-y-1">
            {orders.slice(0, 10).map((o) => (
              <div key={o.id} className="border border-moss-dark/10 px-3 py-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-[11px] text-bone-dark">{o.provider_key} · €{(o.amount_cents / 100).toFixed(2)} → {o.credits_cents / 100} credits</span>
                  <span className={`text-[10px] uppercase tracking-wider ${
                    o.status === 'succeeded' ? 'text-torch-ember' : o.status === 'failed' ? 'text-death-glow' : 'text-bone-faint'
                  }`}>{o.status}</span>
                </div>
                <div className="text-[10px] text-bone-faint">
                  Order: {o.id.slice(0, 8)}… · Provider: {o.provider_payment_id ? o.provider_payment_id.slice(0, 16) + '…' : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent withdrawal requests with provider payout IDs */}
      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-[0.1em] text-bone-faint">Recent Withdrawal Requests</h3>
        {withdrawals.length === 0 ? (
          <p className="text-[12px] text-bone-faint">No withdrawal requests yet.</p>
        ) : (
          <div className="space-y-1">
            {withdrawals.slice(0, 10).map((w) => (
              <div key={w.id} className="border border-moss-dark/10 px-3 py-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-[11px] text-bone-dark">{w.provider_key} · €{(w.amount_cents / 100).toFixed(2)}</span>
                  <span className={`text-[10px] uppercase tracking-wider ${
                    w.status === 'paid' ? 'text-torch-ember' : w.status === 'failed' ? 'text-death-glow' : 'text-bone-faint'
                  }`}>{w.status}</span>
                </div>
                <div className="text-[10px] text-bone-faint">
                  Withdrawal: {w.id.slice(0, 8)}… · Provider: {w.provider_payout_id ? w.provider_payout_id.slice(0, 16) + '…' : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent webhook events */}
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
