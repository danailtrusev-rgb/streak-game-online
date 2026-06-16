import { useEffect } from 'react';
import { Trophy, Flame, Coins } from 'lucide-react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { formatCents } from '../lib/constants';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AssetIcon from '../components/ui/AssetIcon';
import { ICONS } from '../lib/assets';

const FF = "'Metal Mania', 'Cinzel', Georgia, serif";
const BF = "'Lora', Georgia, serif";
const UF = "'Inter', system-ui, sans-serif";

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, { bg: string; border: string; text: string }> = {
    1: { bg: 'rgba(245,208,96,0.12)',  border: 'rgba(245,208,96,0.45)',  text: '#F5D060' },
    2: { bg: 'rgba(200,200,210,0.10)', border: 'rgba(180,180,200,0.4)',  text: '#C8C8D8' },
    3: { bg: 'rgba(180,100,40,0.12)',  border: 'rgba(160,90,30,0.45)',   text: '#D08840' },
  };
  const c = colors[rank] ?? { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.4)' };
  return (
    <div style={{
      width: 32, height: 32, flexShrink: 0,
      background: c.bg, border: `1px solid ${c.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: FF, fontSize: 13, color: c.text, lineHeight: 1 }}>
        {rank}
      </span>
    </div>
  );
}

export default function LeaderboardPage() {
  const { entries, loading, error, fetch } = useLeaderboard();
  const { playerState } = useAuth();
  const { t } = useI18n();

  useEffect(() => { fetch(); }, [fetch]);

  const myGuestId = playerState?.user?.guest_id ?? '';

  return (
    <div className="pg-transition pg-transition--fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(18,26,20,0.95) 0%, rgba(9,13,10,0.98) 100%)',
        border: '1px solid rgba(245,208,96,0.12)',
        padding: '24px 20px 20px',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <AssetIcon
            src={ICONS.trophy}
            fallback={Trophy}
            size={36}
            style={{ filter: 'drop-shadow(0 0 12px rgba(245,208,96,0.6)) brightness(1.2)' }}
          />
        </div>
        <h1 style={{
          fontFamily: FF, fontSize: 22, letterSpacing: '0.08em',
          color: '#F5D060',
          textShadow: '0 0 18px rgba(245,208,96,0.35), 0 2px 6px rgba(0,0,0,0.9)',
          margin: '0 0 6px',
        }}>
          {t('leaderboard.title')}
        </h1>
        <p style={{
          fontFamily: BF, fontSize: 13,
          color: 'rgba(255,255,255,0.4)',
          lineHeight: 1.55, margin: 0,
        }}>
          {t('leaderboard.subtitle')}
        </p>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px',
        fontFamily: UF, fontSize: 10,
        textTransform: 'uppercase', letterSpacing: '0.18em',
        color: 'rgba(255,255,255,0.3)',
      }}>
        <div style={{ width: 32, textAlign: 'center' }}>#</div>
        <div style={{ flex: 1 }}>{t('leaderboard.player')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <span style={{ width: 48, textAlign: 'right' }}>{t('common.streak')}</span>
          <span style={{ width: 52, textAlign: 'right' }}>{t('common.pot')}</span>
        </div>
      </div>

      {/* List */}
      {loading && entries.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div style={{ padding: '16px', border: '1px solid rgba(180,30,30,0.3)', background: 'rgba(80,0,0,0.2)', textAlign: 'center', fontSize: 13, color: '#CC4444', fontFamily: UF }}>
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: BF, fontSize: 15, color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
            {t('leaderboard.empty')}
          </div>
          <div style={{ fontFamily: UF, fontSize: 11, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.08em' }}>
            {t('leaderboard.empty_sub')}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {entries.map((entry) => {
            const isMe = myGuestId && entry.guest_id === myGuestId;
            return (
              <div
                key={entry.guest_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: isMe ? 'rgba(255,122,0,0.07)' : entry.rank <= 3 ? 'rgba(18,26,20,0.85)' : 'rgba(11,15,12,0.6)',
                  border: `1px solid ${
                    isMe        ? 'rgba(255,122,0,0.35)'
                    : entry.rank === 1 ? 'rgba(245,208,96,0.22)'
                    : entry.rank === 2 ? 'rgba(180,180,200,0.18)'
                    : entry.rank === 3 ? 'rgba(160,90,30,0.22)'
                    : 'rgba(255,255,255,0.04)'
                  }`,
                  transition: 'border-color 0.15s ease',
                }}
              >
                <RankBadge rank={entry.rank} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: UF, fontSize: 13, fontWeight: 600,
                    color: isMe ? '#FF9A30' : 'rgba(255,255,255,0.8)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {isMe ? t('leaderboard.you') : `${t('leaderboard.player_anon')} ${entry.rank}`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                  {/* Streak */}
                  <div style={{ width: 48, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <AssetIcon src={ICONS.flame} fallback={Flame} size={12} style={{ opacity: 0.6 }} />
                    <span style={{ fontFamily: BF, fontSize: 14, fontWeight: 700, color: entry.rank === 1 ? '#F5D060' : 'rgba(255,255,255,0.75)' }}>
                      {entry.current_streak}
                    </span>
                  </div>
                  {/* Pot */}
                  <div style={{ width: 52, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                    <AssetIcon src={ICONS.coin} fallback={Coins} size={11} style={{ opacity: 0.5 }} />
                    <span style={{ fontFamily: BF, fontSize: 12, color: entry.pot_cents > 0 ? '#D8C080' : 'rgba(255,255,255,0.2)' }}>
                      {entry.pot_cents > 0 ? `€${formatCents(entry.pot_cents)}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        padding: '12px 14px',
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.05)',
        fontFamily: BF, fontSize: 12,
        color: 'rgba(255,255,255,0.3)',
        lineHeight: 1.6,
      }}>
        {t('leaderboard.privacy_note')}
      </div>
    </div>
  );
}
