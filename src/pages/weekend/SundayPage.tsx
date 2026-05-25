import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, ChevronLeft, Lock, CheckCircle, Zap } from 'lucide-react';
import { ICONS } from '../../lib/assets';
import AssetIcon from '../../components/ui/AssetIcon';
import { useWeekendEvents } from '../../hooks/useWeekendEvents';
import { useQualification } from '../../hooks/useQualification';
import { useFlyers } from '../../hooks/useFlyers';
import { WinnerCard } from '../../components/flyers/FlyerCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ImageButton from '../../components/ui/ImageButton';
import { BUTTONS } from '../../lib/assets';

export default function SundayPage() {
  const navigate = useNavigate();
  const { sunEntry, loading, error, fetchMyEntries, enterEvent } = useWeekendEvents();
  const { qualification, fetchQualification } = useQualification();
  const { winners, fetchAssets } = useFlyers();

  useEffect(() => {
    fetchMyEntries();
    fetchQualification();
    fetchAssets();
  }, [fetchMyEntries, fetchQualification, fetchAssets]);

  const qualified = qualification?.sunday_qualified ?? false;
  const alreadyEntered = !!sunEntry;

  const sunWinners = winners.filter((w) => w.event_game_id === 'sunday_winners_event');

  const handleEnter = async () => {
    if (!qualified || alreadyEntered) return;
    await enterEvent('sunday_winners_event');
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

        {/* Hero */}
        <div className="border border-torch-orange/30 bg-gradient-to-b from-torch-orange/8 to-transparent px-6 py-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center border border-torch-orange/30 bg-torch-orange/10">
              <AssetIcon src={ICONS.crown} fallback={Crown} size={32} style={{ filter: 'drop-shadow(0 0 8px rgba(255,122,0,0.4))' }} />
            </div>
          </div>
          <h1 className="font-heading text-2xl font-bold text-torch-ember" style={{ textShadow: '0 0 16px rgba(255,179,71,0.3)' }}>
            Sunday Crown
          </h1>
          <p className="mt-2 text-[11px] text-bone-muted">
            The final test of the week. Only the most qualified players enter. The ultimate prize awaits.
          </p>
        </div>

        {/* Entry Status */}
        <div className="border border-moss-dark/30 bg-ritual-surface/30 px-4 py-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-bone-faint mb-3">Your Status</div>

          {loading ? (
            <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
          ) : alreadyEntered ? (
            <div className="flex items-center gap-3">
              <AssetIcon src={ICONS.check_circle} fallback={CheckCircle} size={20} style={{ filter: 'drop-shadow(0 0 4px rgba(255,122,0,0.4))' }} />
              <div>
                <div className="text-sm font-medium text-torch-ember">You are entered</div>
                <div className="text-[9px] text-bone-dark mt-0.5">Good luck in Sunday's Crown</div>
              </div>
            </div>
          ) : qualified ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <AssetIcon src={ICONS.check_circle} fallback={CheckCircle} size={20} style={{ opacity: 0.8 }} />
                <div>
                  <div className="text-sm font-medium text-bone">Qualified for Sunday</div>
                  <div className="text-[9px] text-bone-dark mt-0.5">
                    {qualification?.total_points} pts earned this week
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
                  Enter Sunday Crown
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
                    Need {qualification?.sun_pts_threshold ?? 100} pts — currently{' '}
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
                  Play Games to Qualify
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

        {/* Requirements */}
        <div className="border border-moss-dark/20 bg-ritual-surface/20 px-4 py-4 space-y-3">
          <div className="text-[9px] uppercase tracking-[0.2em] text-bone-faint">Requirements</div>
          {[
            { icon: Zap, src: ICONS.zap, text: `Earn ${qualification?.sun_pts_threshold ?? 100} qualification points this week` },
            { icon: CheckCircle, src: ICONS.check_circle, text: 'Play at least 3 different daily games' },
            { icon: Crown, src: ICONS.crown, text: 'One entry per player — used entries cannot be reclaimed' },
          ].map(({ icon: Icon, src, text }, i) => (
            <div key={i} className="flex items-start gap-2">
              <AssetIcon src={src} fallback={Icon} size={14} className="flex-shrink-0 mt-0.5" style={{ filter: 'drop-shadow(0 0 2px rgba(255,122,0,0.3))' }} />
              <p className="text-[10px] text-bone-muted">{text}</p>
            </div>
          ))}
        </div>

        {sunWinners.length > 0 && (
          <div className="space-y-2">
            <div className="text-[9px] uppercase tracking-[0.2em] text-bone-faint">Past Champions</div>
            {sunWinners.slice(0, 3).map((w) => (
              <WinnerCard key={w.id} winner={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
