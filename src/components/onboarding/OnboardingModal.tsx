import { useState, useEffect } from 'react';
import { Skull, Trophy, Crown, Zap, X, Flame, Coins } from 'lucide-react';
import { ICONS } from '../../lib/assets';
import { supabase } from '../../lib/supabase';
import AssetIcon from '../ui/AssetIcon';
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface OnboardingModalProps {
  onClose: () => void;
}

interface SlideOverride {
  id: string;
  title: string;
  body: string;
  image_url: string;
}

interface SlideDefinition {
  id: string;
  icon: LucideIcon;
  iconSrc: string;
  stepIconSrc: string;
  title: string;
  body: string;
  bullets?: string[];
}

const FALLBACK_SLIDES: SlideDefinition[] = [
  {
    id: 'skull_gate',
    icon: Skull,
    iconSrc: ICONS.skull,
    stepIconSrc: ICONS.skull,
    title: 'Face the Skull Gate',
    body: 'Each day a new challenge opens. Choose your stake, step through the gate, and test your courage.',
    bullets: [
      'Pick a stake — it enters your pot.',
      'Survive and your streak grows.',
      'Fall and your streak resets to zero.',
      'One chance per day. Come back tomorrow.',
    ],
  },
  {
    id: 'build_streak',
    icon: Flame,
    iconSrc: ICONS.flame,
    stepIconSrc: ICONS.flame,
    title: 'Build Your Streak',
    body: 'Every survival adds to your streak. The longer you hold on, the more your pot grows.',
    bullets: [
      'Higher stake tiers unlock at longer streaks.',
      'Cash out at any time to claim your pot.',
      'Cashing out resets your streak to zero.',
      'Milestone badges unlock at Days 3, 7, 14 & 30.',
    ],
  },
  {
    id: 'grow_pot',
    icon: Coins,
    iconSrc: ICONS.coin,
    stepIconSrc: ICONS.coin,
    title: 'Grow Your Pot',
    body: 'Your stake goes into the pot each time you survive. The pot keeps building until you cash out.',
    bullets: [
      'Survive → stake is added to pot.',
      'Fall → pot is lost with your streak.',
      'Cash out at any time to move pot to wallet.',
      'Cashing out ends your current run.',
    ],
  },
  {
    id: 'earn_points',
    icon: Zap,
    iconSrc: ICONS.zap,
    stepIconSrc: ICONS.zap,
    title: 'Earn Qualification Points',
    body: 'Play daily games to earn points toward the weekend events. Every game counts.',
    bullets: [
      'Skull Gate, Dice, Pick, Puzzle all earn points.',
      'Points accumulate across the week.',
      'Saturday Showdown unlocks at the lower threshold.',
      'Sunday Crown unlocks at the higher threshold.',
    ],
  },
  {
    id: 'weekly_events',
    icon: Trophy,
    iconSrc: ICONS.trophy,
    stepIconSrc: ICONS.trophy,
    title: 'Unlock Weekly Events',
    body: 'Qualify and enter the Saturday Showdown or the Sunday Crown to compete for the week\'s biggest prizes.',
    bullets: [
      'Saturday Showdown — weekly main event.',
      'Sunday Crown — elite final event.',
      'Check your qualification bar on the home screen.',
      'New week, new points tally, new chances.',
    ],
  },
];

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [overrides, setOverrides] = useState<SlideOverride[]>([]);
  const { t } = useI18n();

  useEffect(() => {
    supabase
      .from('settings')
      .select('value_json')
      .eq('key', 'onboarding_slides')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value_json && Array.isArray(data.value_json)) {
          setOverrides(data.value_json as SlideOverride[]);
        }
      });
  }, []);

  const slides = FALLBACK_SLIDES.map((s) => {
    const ov = overrides.find((o) => o.id === s.id);
    return {
      ...s,
      title:     ov?.title     || s.title,
      body:      ov?.body      || s.body,
      image_url: ov?.image_url || '',
    };
  });

  const slide  = slides[step];
  const isFirst = step === 0;
  const isLast  = step === slides.length - 1;

  const goBack = () => { if (!isFirst) setStep((s) => s - 1); };
  const goNext = () => { if (!isLast)  setStep((s) => s + 1); };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md animate-slide-up">
        <div
          className="relative border border-gold-400/30 bg-ritual-bg"
          style={{ background: 'linear-gradient(180deg, rgba(16,22,18,0.99) 0%, rgba(9,13,10,0.99) 100%)' }}
        >
          {/* ── Step icons row ── */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex items-center gap-1">
              {FALLBACK_SLIDES.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    width:           32,
                    height:          32,
                    transition:     'all 0.25s ease',
                    opacity:        i === step ? 1 : i < step ? 0.65 : 0.3,
                    transform:      i === step ? 'scale(1.12)' : 'scale(1)',
                  }}
                  aria-label={`Go to intro step ${i + 1}`}
                >
                  <AssetIcon src={s.stepIconSrc} fallback={s.icon} size={20} />
                </button>
              ))}
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  style={{
                    width:      i === step ? 18 : 6,
                    height:     6,
                    background: i === step
                      ? 'rgba(245,208,96,0.8)'
                      : i < step
                      ? 'rgba(245,208,96,0.3)'
                      : 'rgba(255,255,255,0.15)',
                    border:     'none',
                    cursor:     'pointer',
                    transition: 'all 0.25s ease',
                    padding:    0,
                  }}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={onClose}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                width:           36,
                height:          36,
                background:     'rgba(255,255,255,0.05)',
                border:         '1px solid rgba(255,255,255,0.1)',
                cursor:         'pointer',
                transition:     'background 0.15s ease',
              }}
              aria-label="Close intro"
            >
              <AssetIcon src={ICONS.close} fallback={X} size={18} style={{ opacity: 0.7 }} />
            </button>
          </div>

          {/* ── Slide content ── */}
          <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Visual */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width:          68,
                height:         68,
                border:         '1px solid rgba(245,208,96,0.25)',
                background:     'rgba(245,208,96,0.04)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                overflow:       'hidden',
              }}>
                {slide.image_url ? (
                  <img
                    src={slide.image_url}
                    alt={slide.title}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <AssetIcon src={slide.iconSrc} fallback={slide.icon} size={38} />
                )}
              </div>
            </div>

            {/* Title + body */}
            <div style={{ textAlign: 'center' }}>
              <h2 style={{
                fontFamily:    "'Metal Mania', 'Cinzel', Georgia, serif",
                fontSize:       22,
                letterSpacing: '0.06em',
                color:          '#F5D060',
                textShadow:    '0 0 16px rgba(245,208,96,0.3), 0 2px 4px rgba(0,0,0,0.8)',
                margin:         '0 0 8px',
              }}>
                {slide.title}
              </h2>
              <p style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize:    14,
                lineHeight:  1.6,
                color:       'rgba(255,255,255,0.65)',
                margin:       0,
              }}>
                {slide.body}
              </p>
            </div>

            {/* Bullets — from fallback slide (not overrideable) */}
            {FALLBACK_SLIDES[step].bullets && (
              <div style={{
                background: 'rgba(255,122,0,0.04)',
                border:     '1px solid rgba(255,122,0,0.1)',
                padding:    '12px 14px',
                display:    'flex',
                flexDirection: 'column',
                gap:         7,
              }}>
                {FALLBACK_SLIDES[step].bullets!.map((line) => (
                  <div
                    key={line}
                    style={{
                      display:    'flex',
                      alignItems: 'flex-start',
                      gap:         8,
                      fontSize:    13,
                      fontFamily: "'Lora', Georgia, serif",
                      color:      'rgba(255,255,255,0.6)',
                      lineHeight:  1.45,
                      textAlign:  'left',
                    }}
                  >
                    <span style={{ color: '#FF9A30', flexShrink: 0, marginTop: 1, fontSize: 11 }}>›</span>
                    {line}
                  </div>
                ))}
              </div>
            )}

            {/* Nav row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
              <button
                onClick={goBack}
                disabled={isFirst}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  width:           44,
                  height:          44,
                  background:     'none',
                  border:         'none',
                  cursor:         isFirst ? 'not-allowed' : 'pointer',
                  opacity:        isFirst ? 0.25 : 0.7,
                  transition:     'opacity 0.15s ease',
                }}
                aria-label="Previous step"
              >
                <AssetIcon src={ICONS.arrow_left} fallback={X} size={30} />
              </button>

              <span style={{
                fontSize:      10,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color:         'rgba(255,255,255,0.28)',
                fontFamily:   "'Inter', system-ui, sans-serif",
              }}>
                {step + 1} / {slides.length}
              </span>

              {isLast ? (
                <button
                  onClick={onClose}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    padding:        '10px 20px',
                    background:     'rgba(245,208,96,0.12)',
                    border:         '1px solid rgba(245,208,96,0.35)',
                    cursor:         'pointer',
                    fontFamily:    "'Metal Mania', 'Cinzel', Georgia, serif",
                    fontSize:       13,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color:          '#F5D060',
                    transition:     'background 0.15s ease',
                  }}
                >
                  {t('onboarding.enter')}
                </button>
              ) : (
                <button
                  onClick={goNext}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    width:           44,
                    height:          44,
                    background:     'none',
                    border:         'none',
                    cursor:         'pointer',
                    opacity:        0.7,
                    transition:     'opacity 0.15s ease',
                  }}
                  aria-label="Next step"
                >
                  <span style={{ display: 'inline-flex', transform: 'scaleX(-1)' }}>
                    <AssetIcon src={ICONS.arrow_left} fallback={X} size={30} />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
