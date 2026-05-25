import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ChevronLeft, Lock, CheckCircle, Users, Zap } from 'lucide-react';
import { ICONS } from '../../lib/assets';
import AssetIcon from '../../components/ui/AssetIcon';
import { useWeekendEvents } from '../../hooks/useWeekendEvents';
import { useQualification } from '../../hooks/useQualification';
import { useFlyers } from '../../hooks/useFlyers';
import { WinnerCard } from '../../components/flyers/FlyerCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ImageButton from '../../components/ui/ImageButton';
import { BUTTONS } from '../../lib/assets';

export default function SaturdayPage() {
  const navigate = useNavigate();
  const { satEntry, loading, error, fetchMyEntries, enterEvent } = useWeekendEvents();
  const { qualification, fetchQualification } = useQualification();
  const { winners, fetchAssets } = useFlyers();

  useEffect(() => {
    fetchMyEntries();
    fetchQualification();
    fetchAssets();
  }, [fetchMyEntries, fetchQualification, fetchAssets]);

  const qualified = qualification?.saturday_qualified ?? false;
  const alreadyEntered = !!satEntry;

  const satWinners = winners.filter((w) => w.event_game_id === 'saturday_main_event');

  const handleEnter = async () => {
    if (!qualified || alreadyEntered) return;
    await enterEvent('saturday_main_event');
    await fetchQualification();
  };

  return (
    <div className="pg-transition pg-transition--fade-in flex flex-col min-h-screen min-h-[100dvh] bg-ritual-bg">
      <div className="relative z-10 flex flex-col flex-1 px-5 py-6 max-w-md mx-auto w-full gap-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-bone-dark hover:text-bone-muted transition-colors"
        >
          <AssetIcon src={ICONS.back} fallback={ChevronLeft} size={14} style={{ transform: 'rotate(180deg)' }} />
          Back
        </button>

        <div className="border border-gold-300/30 bg-gradient-to-b from-gold-500/12 to-transparent px-6 py-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center border border-gold-300/40 bg-gold-500/10">
              <AssetIcon src={ICONS.trophy} fallback={Trophy} size={32} style={{ filter: 'drop-shadow(0 0 8px rgba(245,208,96,0.4))' }} />
            </div>
          </div>
          <h1 className="font-heading text-2xl font-bold text-gold-300" style={{ textShadow: '0 0 16px rgba(245,208,96,0.3)' }}>
            Saturday Showdown
          </h1>
          <p className="mt-2 text-[11px] text-bone-muted">
            The main weekly event. Qualified players only. Compete for the largest prizes.
          </p>
        </div>

        <div className="border border-moss-dark/30 bg-ritual-surface/30 px-4 py-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-bone-faint mb-3">Your Status</div>

          {loading ? (
            <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
          ) : alreadyEntered ? (
            <div className="flex items-center gap-3">
              <AssetIcon src={ICONS.check_circle} fallback={CheckCircle} size={20} style={{ filter: 'drop-shadow(0 0 4px rgba(245,208,96,0.4))' }} />
              <div>
                <div className="text-sm font-medium text-gold-300">You are entered</div>
                <div className="text-[9px] text-bone-dark mt-0.5">Good luck in this Saturday's Showdown</div>
              </div>
            </div>
          ) : qualified ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <AssetIcon src={ICONS.check_circle} fallback={CheckCircle} size={20} style={{ opacity: 0.8 }} />
                <div>
                  <div className="text-sm font-medium text-bone">Qualified this week</div>
                  <div className="text-[9px] text-bone-dark mt-0.5">
                    {qualification?.total_points} pts earned
                  </div>
                </div>
              </div>
              <ImageButton
                onClick={handleEnter}
                base={BUTTONS.enter_default}
                hover={BUTTONS.enter_hover}
                pressed={BUTTONS.enter_pressed}
                className="w-full"
                style={{ minHeight: 56 }}
              >
                <span style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#F5F0E8', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                  Enter Saturday Showdown
                </span>
              </ImageButton>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <AssetIcon src={ICONS.lock} fallback={Lock} size={20} style={{ opacity: 0.6 }} />
                <div>
                  <div className="text-sm font-medium text-bone-muted">Not yet qualified</div>
                  <div className="text-[9px] text-bone-dark mt-0.5">
                    Need {qualification?.sat_pts_threshold ?? 50} pts — currently{' '}
                    {qualification?.total_points ?? 0} pts
                  </div>
                </div>
              </div>
              <ImageButton
                onClick={() => navigate('/games')}
                base={BUTTONS.return_default}
                hover={BUTTONS.return_hover}
                pressed={BUTTONS.return_pressed}
                className="w-full"
                style={{ minHeight: 52 }}
              >
                <span style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9E9688', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                  Play Daily Games to Qualify
                </span>
              </ImageButton>
            </div>
          )}

          {error && (
            <div className="mt-3 border border-death-red/30 bg-death-dim/30 px-3 py-2 text-center text-xs text-death-glow">
              {error}
            </div>
          )}
        </div>

        <div className="border border-moss-dark/20 bg-ritual-surface/20 px-4 py-4 space-y-3">
          <div className="text-[9px] uppercase tracking-[0.2em] text-bone-faint">How It Works</div>
          {[
            { icon: Zap, src: ICONS.zap, text: 'Play daily games Mon–Fri to earn qualification points' },
            { icon: CheckCircle, src: ICONS.check_circle, text: 'Reach the points threshold to qualify for Saturday' },
            { icon: Trophy, src: ICONS.trophy, text: 'Enter the Showdown and compete for weekly prizes' },
            { icon: Users, src: ICONS.user, text: 'Winners are announced and celebrated on the leaderboard' },
          ].map(({ icon: Icon, src, text }, i) => (
            <div key={i} className="flex items-start gap-2">
              <AssetIcon src={src} fallback={Icon} size={14} className="flex-shrink-0 mt-0.5" style={{ filter: 'drop-shadow(0 0 2px rgba(245,208,96,0.3))' }} />
              <p className="text-[10px] text-bone-muted">{text}</p>
            </div>
          ))}
        </div>

        {satWinners.length > 0 && (
          <div className="space-y-2">
            <div className="text-[9px] uppercase tracking-[0.2em] text-bone-faint">Past Champions</div>
            {satWinners.slice(0, 3).map((w) => (
              <WinnerCard key={w.id} winner={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
