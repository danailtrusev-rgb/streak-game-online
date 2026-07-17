import { useParallax } from '../../hooks/useParallax';
import type { ClickZone, GameEngineConfig } from '../../lib/types';
import AmbientFireflies from '../fx/AmbientFireflies';

export type ZoneState = 'hidden' | 'selected' | 'won' | 'lost' | 'dim';

interface GameSceneProps {
  config: GameEngineConfig;
  zoneStates: Record<string | number, ZoneState>;
  onZoneClick?: (zoneId: number) => void;
  interactive: boolean;
  children?: React.ReactNode;
  hideBackground?: boolean;
}

export default function GameScene({
  config,
  zoneStates,
  onZoneClick,
  interactive,
  children,
  hideBackground = false,
}: GameSceneProps) {
  const parallax = useParallax(6);

  const hasDone = Object.values(zoneStates).some((s) => s === 'won' || s === 'lost');
  const hasWin  = Object.values(zoneStates).some((s) => s === 'won');
  const hasLose = Object.values(zoneStates).some((s) => s === 'lost');

  return (
    <div
      className="relative w-full overflow-hidden animate-scene-enter"
      style={{ aspectRatio: '9/16', maxHeight: '70vh', minHeight: 220 }}
    >
      {/* Layer 1: Background */}
      {!hideBackground && (
        <div
          className="absolute inset-0 bg-ritual-bg"
          style={{
            backgroundImage:    `url(${config.background})`,
            backgroundSize:     'cover',
            backgroundPosition: 'center top',
            transform:          `translate(${-parallax.x * 0.6}px, ${-parallax.y * 0.4}px) scale(1.04)`,
            transition:         'filter 600ms ease',
            filter:             hasLose ? 'brightness(0.55) saturate(0.4)' : undefined,
          }}
        />
      )}

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, transparent 20%, rgba(0,0,0,0.65) 100%)',
          zIndex: 1,
        }}
      />

      {/* Ambient fireflies */}
      <AmbientFireflies count={14} intensity="low" zIndex={2} yBand={[5, 80]} />

      {/* Win glow */}
      {hasWin && (
        <div
          className="absolute inset-0 pointer-events-none animate-fade-in"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(245,208,96,0.18) 0%, transparent 70%)',
            zIndex: 2,
          }}
        />
      )}

      {/* Layer 2: Click Zones */}
      <div
        className="absolute inset-0"
        style={{ transform: `translate(${parallax.x * 0.3}px, ${parallax.y * 0.3}px)`, zIndex: 3 }}
      >
        {config.zones.map((zone) => (
          <ZoneButton
            key={zone.id}
            zone={zone}
            state={zoneStates[zone.id] ?? 'hidden'}
            interactive={interactive}
            onClick={onZoneClick}
          />
        ))}
      </div>

      {/* Layer 3: FX Overlay */}
      {hasDone && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 4, transform: `translate(${parallax.x * 0.5}px, ${parallax.y * 0.5}px)` }}
        >
          {hasWin  && <WinFX />}
          {hasLose && <LoseFX />}
        </div>
      )}

      {/* Slot for game-specific content (dice, etc.) */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 5 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Zone Button ────────────────────────────────────────────────────────────────

interface ZoneButtonProps {
  zone:        ClickZone;
  state:       ZoneState;
  interactive: boolean;
  onClick?:    (id: number) => void;
}

function ZoneButton({ zone, state, interactive, onClick }: ZoneButtonProps) {
  const isWon      = state === 'won';
  const isLost     = state === 'lost';
  const isSelected = state === 'selected';
  const isDim      = state === 'dim';

  // Scale: selected gets a subtle lift, won gets a stronger lift
  const scale = isWon ? 1.06 : isSelected ? 1.04 : 1;

  // Drop-shadow glow replaces border boxes
  const dropShadow = isWon
    ? 'drop-shadow(0 0 18px rgba(245,208,96,0.7)) drop-shadow(0 0 6px rgba(245,208,96,0.4))'
    : isLost
    ? 'drop-shadow(0 0 12px rgba(180,30,30,0.55))'
    : isSelected
    ? 'drop-shadow(0 0 14px rgba(255,140,20,0.55)) drop-shadow(0 0 4px rgba(255,140,20,0.3))'
    : undefined;

  // Image brightness: selected brightens slightly, won brightens more
  const imgFilter = isWon
    ? `brightness(1.4) drop-shadow(0 0 12px rgba(245,208,96,0.5))`
    : isLost
    ? 'brightness(0.55) saturate(0.3)'
    : isSelected
    ? 'brightness(1.2) drop-shadow(0 0 8px rgba(255,140,20,0.4))'
    : isDim
    ? 'brightness(0.4) saturate(0.3)'
    : 'brightness(0.92)';

  return (
    <button
      onClick={() => interactive && onClick && onClick(Number(zone.id))}
      disabled={!interactive}
      style={{
        position:       'absolute',
        left:           `${zone.x}%`,
        top:            `${zone.y}%`,
        width:          `${zone.width}%`,
        height:         `${zone.height}%`,
        border:         'none',
        background:     'transparent',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            6,
        cursor:         interactive ? 'pointer' : 'default',
        opacity:        isDim ? 0.35 : 1,
        transform:      `scale(${scale})`,
        transition:     'transform 280ms ease, opacity 280ms ease, filter 280ms ease',
        filter:         dropShadow,
        WebkitTapHighlightColor: 'transparent',
        outline:        'none',
      }}
    >
      {(zone.hiddenImage || zone.revealImage) && (
        <ZoneImage zone={zone} state={state} imgFilter={imgFilter} />
      )}

      {/* Zone label — only when no image, or always show below */}
      {!(zone.hiddenImage || zone.revealImage) && (
        <span style={{
          fontFamily:    "'Cinzel', Georgia, serif",
          fontSize:      14,
          fontWeight:    700,
          letterSpacing: '0.1em',
          color:         isWon ? '#F5D060' : isLost ? '#CC4444' : isSelected ? '#FFB84A' : 'rgba(255,255,255,0.75)',
          textShadow:    '0 1px 6px rgba(0,0,0,0.9)',
        }}>
          {zone.label}
        </span>
      )}

      {/* Result badge — small text below icon on reveal */}
      {(isWon || isLost) && (
        <span style={{
          fontFamily:    "'Inter', system-ui, sans-serif",
          fontSize:      9,
          fontWeight:    700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:         isWon ? '#F5D060' : '#CC4444',
          textShadow:    '0 1px 4px rgba(0,0,0,0.9)',
        }}>
          {isWon ? 'Found it' : 'Empty'}
        </span>
      )}
    </button>
  );
}

function ZoneImage({
  zone,
  state,
  imgFilter,
}: {
  zone: ClickZone;
  state: ZoneState;
  imgFilter: string;
}) {
  const isRevealed = state === 'won' || state === 'lost';
  const src  = isRevealed && zone.revealImage ? zone.revealImage : zone.hiddenImage;
  const size = zone.iconSize ?? 64;

  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        width:         size,
        height:        size,
        objectFit:     'contain',
        display:       'block',
        filter:        imgFilter,
        transition:    'filter 350ms ease, transform 350ms ease',
        userSelect:    'none',
        pointerEvents: 'none',
      }}
      onError={(e) => {
        const el = e.target as HTMLImageElement;
        el.style.display = 'none';
        const span = document.createElement('span');
        span.style.fontSize = `${Math.round(size * 0.65)}px`;
        span.textContent = zone.fallbackEmoji ?? '?';
        el.parentNode?.insertBefore(span, el);
      }}
    />
  );
}

// ── FX ────────────────────────────────────────────────────────────────────────

const EMBERS = Array.from({ length: 12 }, (_, i) => ({
  left:     10 + ((i * 37 + 17) % 80),
  bottom:   5  + ((i * 53 + 11) % 60),
  duration: 1.5 + ((i * 13 + 5) % 20) / 10,
  delay:    ((i * 7 + 3) % 8) / 10,
  size:     2 + ((i * 11 + 3) % 3),
  gold:     i % 3 === 0,
}));

function WinFX() {
  return (
    <>
      {EMBERS.map((e, i) => (
        <div
          key={i}
          className="ember"
          style={{
            left:              `${e.left}%`,
            bottom:            `${e.bottom}%`,
            animationDuration: `${e.duration}s`,
            animationDelay:    `${e.delay}s`,
            background:        e.gold ? '#F5D060' : '#FF8C14',
            width:             `${e.size}px`,
            height:            `${e.size}px`,
          }}
        />
      ))}
    </>
  );
}

function LoseFX() {
  return (
    <div
      className="absolute inset-0 animate-fade-in"
      style={{ background: 'rgba(80,0,0,0.25)', pointerEvents: 'none' }}
    />
  );
}
