import { useEffect } from 'react';
import { Trophy, Flame, Users, UsersRound } from 'lucide-react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useAuth } from '../context/AuthContext';
import { ICONS } from '../lib/assets';
import AssetIcon from '../components/ui/AssetIcon';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCents } from '../lib/constants';

const tabs = [
  { key: 'global', label: 'Global', assetSrc: ICONS.trophy, icon: Trophy },
  { key: 'friends', label: 'Friends', assetSrc: ICONS.user, icon: Users },
  { key: 'teams', label: 'Teams', assetSrc: ICONS.shield, icon: UsersRound },
];

export default function LeaderboardPage() {
  const { entries, loading, error, fetch } = useLeaderboard();
  const { playerState } = useAuth();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div className="flex flex-col gap-5 pg-transition pg-transition--fade-up">
      <div className="flex gap-2">
        {tabs.map(({ key, label, assetSrc, icon }) => (
          <button
            key={key}
            disabled={key !== 'global'}
            className={`flex items-center gap-1.5 border px-4 py-2 text-xs font-medium tracking-[0.1em] uppercase transition-all duration-300 font-ui ${
              key === 'global'
                ? 'border-torch-orange/30 bg-torch-orange/5 text-torch-ember'
                : 'border-moss-dark/30 bg-ritual-surface/20 text-bone-dark opacity-50 cursor-not-allowed'
            }`}
          >
            <AssetIcon src={assetSrc} fallback={icon} size={18} strokeWidth={1.5} style={{ opacity: key === 'global' ? 1 : 0.5 }} />
            {label}
            {key !== 'global' && (
              <span className="text-[8px]">Soon</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="border border-death-red/30 bg-death-dim/30 px-4 py-3 text-center text-sm text-death-glow">
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="py-12 text-center text-sm text-bone-dark">
          No active streaks yet. Be the first.
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry, idx) => {
            const isMe = playerState?.user.guest_id === entry.guest_id;
            const rankColor =
              idx === 0
                ? 'text-gold-400'
                : idx === 1
                ? 'text-bone'
                : idx === 2
                ? 'text-torch-ember'
                : 'text-bone-dark';

            return (
              <div
                key={entry.guest_id}
                className={`flex items-center gap-3 border px-4 py-3 transition-all duration-300 ${
                  isMe
                    ? 'border-torch-orange/25 bg-torch-orange/5'
                    : 'border-moss-dark/20 bg-ritual-surface/30'
                }`}
              >
                <span className={`w-8 font-heading text-xl font-bold ${rankColor}`}>
                  {entry.rank || idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-medium truncate ${isMe ? 'text-torch-ember' : 'text-bone-muted'}`}>
                      {entry.guest_id.slice(0, 8)}
                    </span>
                    {isMe && (
                      <span className="border border-torch-orange/20 bg-torch-orange/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-torch-ember">
                        You
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div className="flex items-center gap-1">
                    <AssetIcon src={ICONS.flame} fallback={Flame} size={18} style={{ filter: 'drop-shadow(0 0 3px rgba(204,98,0,0.7))' }} />
                    <span className="font-heading text-base font-bold text-bone">
                      {entry.current_streak}
                    </span>
                  </div>
                  <div className="text-sm text-bone-dark">
                    {formatCents(entry.pot_cents)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
