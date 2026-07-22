import { useEffect, useState, useCallback } from 'react';
import { CreditCard, ArrowLeft, Check, X, Loader2 } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';

interface AdminPaymentProvider {
  id: string;
  provider_key: string;
  display_name: string;
  mode: string;
  enabled: boolean;
  supports_credit_purchase: boolean;
  supports_withdrawal: boolean;
  is_active_for_credit_purchase: boolean;
  is_active_for_withdrawal: boolean;
  config_json: Record<string, unknown>;
}

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
  const [providers] = useState<AdminPaymentProvider[]>([]);
  const [orders] = useState<AdminPaymentOrder[]>([]);
  const [withdrawals] = useState<AdminWithdrawalRequest[]>([]);
  const [webhooks] = useState<AdminWebhookEvent[]>([]);
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

  const handleToggleProvider = useCallback(async (_providerId: string, _field: string, _value: boolean) => {
    // Provider toggling will be wired when admin edge function routes are added
    setSaving(false);
  }, []);

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

      {/* Providers */}
      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-[0.1em] text-bone-faint">Providers</h3>
        {providers.map((p) => (
          <div key={p.id} className="border border-moss-dark/20 bg-ritual-surface/20 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-bone">{p.display_name}</span>
                <span className="text-[10px] text-bone-faint ml-2 uppercase tracking-wider">{p.mode}</span>
              </div>
              <span className={`text-[10px] uppercase tracking-wider ${p.enabled ? 'text-torch-ember' : 'text-bone-faint'}`}>
                {p.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleToggleProvider(p.id, 'enabled', !p.enabled)}
                disabled={saving}
                className={`border px-2 py-1 text-[10px] uppercase tracking-wider ${
                  p.enabled ? 'border-torch-ember/30 bg-torch-ember/5 text-torch-ember' : 'border-moss-dark/20 text-bone-faint'
                }`}
              >
                {p.enabled ? 'Enabled' : 'Enable'}
              </button>
              <button
                onClick={() => handleToggleProvider(p.id, 'is_active_for_credit_purchase', !p.is_active_for_credit_purchase)}
                disabled={saving}
                className={`border px-2 py-1 text-[10px] uppercase tracking-wider ${
                  p.is_active_for_credit_purchase ? 'border-torch-ember/30 bg-torch-ember/5 text-torch-ember' : 'border-moss-dark/20 text-bone-faint'
                }`}
              >
                {p.is_active_for_credit_purchase ? 'Active Purchase' : 'Set Active Purchase'}
              </button>
              <button
                onClick={() => handleToggleProvider(p.id, 'is_active_for_withdrawal', !p.is_active_for_withdrawal)}
                disabled={saving}
                className={`border px-2 py-1 text-[10px] uppercase tracking-wider ${
                  p.is_active_for_withdrawal ? 'border-torch-ember/30 bg-torch-ember/5 text-torch-ember' : 'border-moss-dark/20 text-bone-faint'
                }`}
              >
                {p.is_active_for_withdrawal ? 'Active Withdrawal' : 'Set Active Withdrawal'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
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

      {/* Recent withdrawals */}
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
