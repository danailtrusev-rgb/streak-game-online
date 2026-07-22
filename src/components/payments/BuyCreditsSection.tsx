import { useState, useCallback, useEffect } from 'react';
import { CreditCard, AlertTriangle, Info } from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import { formatEuros, shouldShowDummyLabel } from '../../lib/payments/dummyProvider';
import type { PaymentOrder } from '../../lib/payments/paymentTypes';

export default function BuyCreditsSection() {
  const { config, createCreditOrder, fetchOrders, orders, loading, error } = usePayments();
  const [activeOrder, setActiveOrder] = useState<PaymentOrder | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleBuy = useCallback(async (packageKey: string) => {
    const result = await createCreditOrder(packageKey);
    if (result) {
      setActiveOrder(result.order);
      await fetchOrders();
    }
  }, [createCreditOrder, fetchOrders]);

  if (!config?.payments_enabled || !config.credit_purchases_enabled) {
    return null;
  }

  const isDummy = shouldShowDummyLabel(config.active_purchase_provider?.provider_key);

  return (
    <div>
      <div style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        color: 'rgba(255,255,255,0.45)',
        fontWeight: 600,
        marginBottom: 12,
      }}>
        Buy Credits
      </div>

      {isDummy && (
        <div style={{
          border: '1px solid rgba(245,208,96,0.2)',
          background: 'rgba(245,208,96,0.04)',
          padding: '8px 12px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertTriangle size={12} style={{ color: '#F5D060', flexShrink: 0 }} />
          <span style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 11,
            color: 'rgba(245,208,96,0.7)',
          }}>
            Test mode — no real payment is processed.
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {config.credit_packages.map((pkg) => (
          <button
            key={pkg.package_key}
            onClick={() => handleBuy(pkg.package_key)}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              border: '1px solid rgba(245,208,96,0.12)',
              background: 'linear-gradient(180deg, rgba(18,26,20,0.8) 0%, rgba(9,13,10,0.9) 100%)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CreditCard size={16} style={{ color: '#F5D060' }} />
              <span style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.85)',
              }}>
                {pkg.display_name}
              </span>
            </div>
            <span style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: 16,
              fontWeight: 700,
              color: '#F5D060',
            }}>
              {formatEuros(pkg.amount_cents)}
            </span>
          </button>
        ))}
      </div>

      {activeOrder && activeOrder.status === 'pending' && (
        <div style={{
          marginTop: 12,
          border: '1px solid rgba(245,208,96,0.15)',
          background: 'rgba(18,26,20,0.6)',
          padding: 16,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}>
            <Info size={14} style={{ color: '#F5D060', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 12,
                color: 'rgba(255,255,255,0.7)',
                marginBottom: 4,
              }}>
                Dummy checkout created. An admin must simulate success or failure from Admin → Payments.
              </div>
              <div style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 11,
                color: 'rgba(255,255,255,0.4)',
              }}>
                Order ID: {activeOrder.id.slice(0, 8)}…
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 8,
          fontSize: 12,
          color: '#CC4444',
          fontFamily: "'Inter', sans-serif",
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {orders.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.3)',
            marginBottom: 8,
          }}>
            Recent Orders
          </div>
          {orders.slice(0, 5).map((order) => (
            <div key={order.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
            }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {formatEuros(order.amount_cents)}
              </span>
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                color: order.status === 'succeeded' ? '#78B060' : order.status === 'failed' ? '#CC4444' : 'rgba(255,255,255,0.4)',
              }}>
                {order.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
