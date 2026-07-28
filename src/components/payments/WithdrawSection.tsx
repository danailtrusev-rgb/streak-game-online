import { useState, useCallback, useEffect } from 'react';
import { ArrowDownCircle, AlertTriangle, Info } from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import { useAuth } from '../../context/AuthContext';
import { formatCents } from '../../lib/constants';
import { formatEuros, shouldShowDummyLabel } from '../../lib/payments/dummyProvider';
import type { WithdrawalRequest } from '../../lib/payments/paymentTypes';

export default function WithdrawSection() {
  const { config, createWithdrawal, fetchWithdrawals, withdrawals, loading, error } = usePayments();
  const { playerState, refresh } = useAuth();
  const [amount, setAmount] = useState('');

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const balance = playerState?.wallet_balance_cents ?? 0;

  const handleSubmit = useCallback(async () => {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) return;
    await createWithdrawal(cents);
    await fetchWithdrawals();
    await refresh();
    setAmount('');
  }, [amount, createWithdrawal, fetchWithdrawals, refresh]);

  if (!config?.payments_enabled) {
    return null;
  }

  if (!config.withdrawals_enabled) {
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
          Withdraw Balance
        </div>
        <div style={{
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(18,26,20,0.4)',
          padding: '20px 16px',
          textAlign: 'center',
        }}>
          <ArrowDownCircle size={20} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 8px' }} />
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            color: 'rgba(255,255,255,0.3)',
          }}>
            Withdrawals are not enabled yet.
          </p>
        </div>
      </div>
    );
  }

  const isDummy = shouldShowDummyLabel(config.active_withdrawal_provider?.provider_key);
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'processing' || w.status === 'requested');

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
        Withdraw Balance
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
            Test withdrawal — no real payout is sent.
          </span>
        </div>
      )}

      <div style={{
        marginBottom: 12,
        padding: '12px 16px',
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(18,26,20,0.4)',
      }}>
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'rgba(255,255,255,0.3)',
          marginBottom: 4,
        }}>
          Available
        </div>
        <div style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: 20,
          fontWeight: 700,
          color: '#F5D060',
        }}>
          {formatCents(balance)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="1"
          step="0.01"
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(9,13,10,0.6)',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !amount}
          style={{
            padding: '10px 16px',
            border: '1px solid rgba(245,208,96,0.2)',
            background: 'rgba(245,208,96,0.06)',
            cursor: loading || !amount ? 'not-allowed' : 'pointer',
            opacity: loading || !amount ? 0.4 : 1,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: '#F5D060',
            whiteSpace: 'nowrap',
          }}
        >
          Withdraw
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#CC4444', fontFamily: "'Inter', sans-serif", textAlign: 'center' }}>
          {error}
        </div>
      )}

      {pendingWithdrawals.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {pendingWithdrawals.map((w) => (
            <div key={w.id} style={{
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(18,26,20,0.4)',
              padding: 12,
              marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                  {formatEuros(w.amount_cents)}
                </span>
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                }}>
                  {w.status}
                </span>
              </div>
              {isDummy && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                }}>
                  <Info size={12} style={{ color: '#F5D060', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(245,208,96,0.6)' }}>
                    Payout is pending. The provider will process it and notify us automatically.
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {withdrawals.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.3)',
            marginBottom: 8,
          }}>
            Recent Withdrawals
          </div>
          {withdrawals.slice(0, 5).map((w: WithdrawalRequest) => (
            <div key={w.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
            }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {formatEuros(w.amount_cents)}
              </span>
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                color: w.status === 'paid' ? '#78B060' : w.status === 'failed' ? '#CC4444' : 'rgba(255,255,255,0.4)',
              }}>
                {w.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
