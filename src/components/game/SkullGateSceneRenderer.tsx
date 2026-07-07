// Skull Gate Scene Renderer

import { useMemo } from 'react';
import type { SkullGateSceneConfig, SceneLayer, AnimationPreset } from '../../lib/types';
import { resolveLayerCSS } from '../../lib/layerLayout';
import { BUTTONS } from '../../lib/assets';
import ImageButton from '../ui/ImageButton';
import AmbientFireflies from '../fx/AmbientFireflies';
import TorchFireEffect from '../fx/TorchFireEffect';
import BloodMoonRelicEffect from '../fx/BloodMoonRelicEffect';
import type { BloodMoonPhase } from '../fx/BloodMoonRelicEffect';

// ─────────────────────────────────────────────────────────────────────────────
// Keyframe injection
// ─────────────────────────────────────────────────────────────────────────────

const STYLE_ID = 'sgsr-keyframes-v4';
const KEYFRAMES = `
@keyframes sgsr-slow-float {
  0%,100% { transform: translateY(0px); }
  50%     { transform: translateY(-7px); }
}
@keyframes sgsr-slow-sway {
  0%,100% { transform: rotate(-1.5deg); }
  50%     { transform: rotate(1.5deg); }
}
@keyframes sgsr-fog-drift {
  0%   { transform: translateX(0) scaleX(1); opacity: var(--fog-op, 0.4); }
  40%  { opacity: calc(var(--fog-op, 0.4) * 1.3); }
  60%  { transform: translateX(3%) scaleX(1.04); }
  100% { transform: translateX(0) scaleX(1); opacity: var(--fog-op, 0.4); }
}
@keyframes sgsr-flicker {
  0%,100% { opacity: 1; }
  12%     { opacity: 0.88; }
  24%     { opacity: 0.96; }
  36%     { opacity: 0.82; }
  55%     { opacity: 0.98; }
  68%     { opacity: 0.87; }
  80%     { opacity: 0.93; }
}
@keyframes sgsr-pulse-glow {
  0%,100% { opacity: var(--glow-op, 0.65); filter: blur(0px); }
  50%     { opacity: calc(var(--glow-op, 0.65) * 1.25); filter: blur(1px); }
}
@keyframes sgsr-branch-sway {
  0%,100% { transform-origin: top center; transform: rotate(-0.8deg); }
  50%     { transform-origin: top center; transform: rotate(0.8deg); }
}
@keyframes sgsr-ember-float {
  0%   { transform: translate(0,0) scale(1); opacity: 0.7; }
  40%  { transform: translate(-4px,-18px) scale(0.85); opacity: 0.5; }
  80%  { transform: translate(3px,-32px) scale(0.6); opacity: 0.2; }
  100% { transform: translate(1px,-40px) scale(0.3); opacity: 0; }
}
@keyframes sgsr-light-ray {
  0%,100% { opacity: var(--ray-op, 0.15); transform: scaleX(1); }
  45%     { opacity: calc(var(--ray-op, 0.15) * 1.5); transform: scaleX(1.06); }
}
@keyframes sgsr-rumble {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-3px) rotate(-0.5deg); }
  40%     { transform: translateX(3px) rotate(0.5deg); }
  60%     { transform: translateX(-2px); }
  80%     { transform: translateX(2px); }
}
@keyframes sgsr-tap-pulse {
  0%   { transform: scale(1);    opacity: 0.9; }
  30%  { transform: scale(1.06); opacity: 1; }
  60%  { transform: scale(1.03); opacity: 0.95; }
  100% { transform: scale(1.06); opacity: 1; }
}
@keyframes sgsr-tap-ring {
  0%   { transform: scale(0.7); opacity: 0.75; }
  60%  { transform: scale(1.5); opacity: 0.3; }
  100% { transform: scale(1.9); opacity: 0; }
}
@keyframes sgsr-tap-survive {
  0%   { transform: scale(1.06); filter: brightness(1.6) drop-shadow(0 0 20px rgba(255,210,50,0.9)); }
  40%  { transform: scale(1.18); filter: brightness(2.0) drop-shadow(0 0 30px rgba(255,230,80,1.0)); }
  100% { transform: scale(1.06); filter: brightness(1.6) drop-shadow(0 0 20px rgba(255,210,50,0.9)); }
}
@keyframes sgsr-tap-crack {
  0%,100% { transform: translateX(0) rotate(0deg); filter: brightness(0.4) saturate(0.2); }
  15%     { transform: translateX(-5px) rotate(-1deg); }
  30%     { transform: translateX(5px) rotate(0.8deg); }
  45%     { transform: translateX(-4px) rotate(-0.6deg); }
  60%     { transform: translateX(3px) rotate(0.4deg); }
  75%     { transform: translateX(-2px); }
}
@keyframes sgsr-torch-flicker {
  0%,100% { filter: var(--torch-filter-base); }
  15%     { filter: var(--torch-filter-bright); }
  30%     { filter: var(--torch-filter-base); }
  50%     { filter: var(--torch-filter-dim); }
  65%     { filter: var(--torch-filter-bright); }
  80%     { filter: var(--torch-filter-base); }
}
@keyframes sgsr-inner-light {
  0%,100% { opacity: var(--il-op, 0); }
  50%     { opacity: calc(var(--il-op, 0) * 1.2); }
}
@keyframes sgsr-ritual-mote {
  0%   { transform: translate(var(--mx0,0px), var(--my0,0px)) scale(1);   opacity: 0; }
  15%  { opacity: var(--mop, 0.6); }
  70%  { opacity: calc(var(--mop, 0.6) * 0.7); }
  100% { transform: translate(var(--mx1,0px), var(--my1,0px)) scale(0.4); opacity: 0; }
}
@keyframes sgsr-bmg-pulse {
  0%,100% { opacity: var(--bmg-op, 0.55); filter: blur(24px); }
  50%     { opacity: calc(var(--bmg-op, 0.55) * 1.35); filter: blur(30px); }
}
@media (prefers-reduced-motion: reduce) {
  .sgsr-anim { animation: none !important; }
  .sgsr-door { transition: none !important; }
}`;

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = KEYFRAMES;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation preset → CSS animation string
// ─────────────────────────────────────────────────────────────────────────────

function animPresetToCSS(preset: AnimationPreset | undefined): string | undefined {
  switch (preset) {
    case 'slow_float':        return 'sgsr-slow-float 6s ease-in-out infinite';
    case 'slow_sway':         return 'sgsr-slow-sway 8s ease-in-out infinite';
    case 'fog_drift':         return 'sgsr-fog-drift 14s ease-in-out infinite';
    case 'flicker_opacity':   return 'sgsr-flicker 3.5s ease-in-out infinite';
    case 'pulse_glow':        return 'sgsr-pulse-glow 4s ease-in-out infinite';
    case 'branch_sway':       return 'sgsr-branch-sway 7s ease-in-out infinite';
    case 'ember_float':       return 'sgsr-ember-float 2.8s ease-out infinite';
    case 'firefly_random':    return undefined; // handled by AmbientFireflies
    case 'ritual_motes':      return undefined; // handled by RitualMotes
    case 'light_ray_pulse':   return 'sgsr-light-ray 5s ease-in-out infinite';
    case 'gate_rumble':       return 'sgsr-rumble 0.35s ease-in-out 3';
    case 'torch_flicker':     return 'sgsr-torch-flicker 2.8s ease-in-out infinite';
    case 'inner_light_pulse': return 'sgsr-inner-light 3s ease-in-out infinite';
    default:                  return undefined;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ritual motes — seeded, deterministic, crimson/gold particles
// ─────────────────────────────────────────────────────────────────────────────

function seededRand(seed: number) {
  let s = seed;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return (s >>> 0) / 0x100000000; };
}

interface RitualMotesProps {
  count:   number;
  zIndex:  number;
  phase:   Phase;
  outcome: Outcome;
}

function RitualMotes({ count, zIndex, phase, outcome }: RitualMotesProps) {
  const motes = useMemo(() => {
    const rand = seededRand(0xb100d1c);
    const isReveal = phase === 'revealing' || phase === 'done';
    const n = isReveal ? Math.floor(count * 1.6) : count;
    return Array.from({ length: n }, (_, i) => {
      const x0 = 5 + rand() * 90;
      const y0 = 20 + rand() * 70;
      const dx = (rand() - 0.5) * 60;
      const dy = -(20 + rand() * 50);
      const size = 2.5 + rand() * 4;
      const dur  = 3.5 + rand() * 4.5;
      const delay = rand() * -8;
      // crimson → gold spectrum
      const hue = isReveal && outcome === 'SURVIVE'
        ? 35 + rand() * 25      // gold on survive
        : isReveal && outcome === 'DIE'
        ? 0 + rand() * 15       // deep red on fail
        : 5 + rand() * 30;      // red/orange idle
      const sat  = 80 + rand() * 20;
      const lig  = 45 + rand() * 25;
      const opacity = 0.35 + rand() * 0.5;
      return { i, x0, y0, dx, dy, size, dur, delay, hue, sat, lig, opacity };
    });
  }, [count, phase, outcome]);

  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, zIndex, pointerEvents: 'none', overflow: 'hidden' }}
    >
      {motes.map((m) => (
        <div
          key={m.i}
          className="sgsr-anim"
          style={{
            position:     'absolute',
            left:         `${m.x0}%`,
            top:          `${m.y0}%`,
            width:         m.size,
            height:        m.size,
            borderRadius: '50%',
            background:   `hsl(${m.hue}, ${m.sat}%, ${m.lig}%)`,
            boxShadow:    `0 0 ${m.size * 2}px hsl(${m.hue}, ${m.sat}%, ${m.lig + 15}%)`,
            animation:    `sgsr-ritual-mote ${m.dur}s ${m.delay}s ease-out infinite`,
            '--mx0':      '0px',
            '--my0':      '0px',
            '--mx1':      `${m.dx}px`,
            '--my1':      `${m.dy}px`,
            '--mop':      String(m.opacity),
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase-aware text helper
// ─────────────────────────────────────────────────────────────────────────────

type Phase   = 'idle' | 'selected' | 'revealing' | 'done';
type Outcome = 'SURVIVE' | 'DIE' | null;

function resolveInstructionText(
  scene:    SkullGateSceneConfig,
  phase:    Phase,
  outcome:  Outcome,
): string {
  if (phase === 'idle')      return scene.introText ?? scene.instructionText;
  if (phase === 'selected')  return scene.instructionText;
  if (phase === 'revealing') return 'The gate answers…';
  if (phase === 'done') {
    return outcome === 'SURVIVE' ? scene.surviveText : scene.failText;
  }
  return scene.instructionText;
}

// ─────────────────────────────────────────────────────────────────────────────
// Procedural effect sub-renderer
// ─────────────────────────────────────────────────────────────────────────────

function ProceduralEffect({
  layer, outcome, phase, isBloodMoon,
}: { layer: SceneLayer; outcome: Outcome; phase: Phase; isBloodMoon?: boolean }) {
  const isReveal     = phase === 'revealing' || phase === 'done';
  const animEnabled  = layer.parallaxEnabled !== false;

  // Fireflies (torch trial)
  if (layer.effectPreset === 'fireflies') {
    return (
      <AmbientFireflies
        count={isReveal ? 22 : 12}
        intensity={isReveal ? 'medium' : 'low'}
        zIndex={layer.zIndex}
      />
    );
  }

  // Ritual motes (blood moon relic)
  if (layer.effectPreset === 'ritual_motes' || layer.animationPreset === 'ritual_motes') {
    return (
      <RitualMotes
        count={isReveal ? 18 : 10}
        zIndex={layer.zIndex}
        phase={phase}
        outcome={outcome}
      />
    );
  }

  // Fog / atmosphere
  if (layer.role === 'atmosphere_effect' || layer.effectPreset === 'fog') {
    const animCSS = animEnabled ? animPresetToCSS(layer.animationPreset) : undefined;
    const fogOp   = layer.opacity ?? 0.55;
    const pos     = resolveLayerCSS({ ...layer, y: layer.y ?? 55, height: layer.height ?? 45 });
    return (
      <div
        aria-hidden="true"
        className="sgsr-anim"
        style={{
          position:  'absolute',
          left:      pos.left,
          top:       pos.top,
          width:     pos.width,
          height:    pos.height,
          opacity:   fogOp,
          zIndex:    layer.zIndex,
          pointerEvents: 'none',
          // blood moon fog: dark blue-gray rising from bottom
          background: isBloodMoon
            ? 'linear-gradient(180deg, transparent 0%, rgba(8,4,18,0.45) 40%, rgba(5,2,12,0.75) 100%)'
            : 'linear-gradient(180deg, transparent 0%, rgba(5,12,7,0.5) 50%, rgba(3,8,5,0.72) 100%)',
          filter:    'blur(8px)',
          animation: animCSS,
          '--fog-op': String(fogOp),
        } as React.CSSProperties}
      />
    );
  }

  // Blood moon glow — deep crimson radial bloom from top-center
  if (layer.effectPreset === 'blood_moon_glow') {
    const animCSS = animEnabled ? 'sgsr-bmg-pulse 3.5s ease-in-out infinite' : undefined;
    const bmgOp   = layer.opacity ?? 0.6;
    const glowColor = isReveal
      ? outcome === 'SURVIVE' ? 'rgba(220,160,40,0.5)' : 'rgba(140,15,5,0.65)'
      : 'rgba(160,20,8,0.55)';
    const pos = resolveLayerCSS({ ...layer, x: layer.x ?? 0, y: layer.y ?? 0, width: layer.width ?? 100, height: layer.height ?? 60 });
    return (
      <div
        aria-hidden="true"
        className="sgsr-anim"
        style={{
          position:  'absolute',
          left:      pos.left,
          top:       pos.top,
          width:     pos.width,
          height:    pos.height,
          opacity:   bmgOp,
          zIndex:    layer.zIndex,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 80% 65% at 50% 0%, ${glowColor} 0%, rgba(80,5,0,0.2) 55%, transparent 80%)`,
          filter:    'blur(24px)',
          animation: animCSS,
          transition: 'background 0.9s ease',
          '--bmg-op': String(bmgOp),
        } as React.CSSProperties}
      />
    );
  }

  // Gate glow (torch trial + blood moon fallback)
  if (layer.role === 'gate_glow' || layer.effectPreset === 'gate_glow') {
    const animCSS  = animEnabled ? animPresetToCSS(layer.animationPreset) : undefined;
    const glowColor = outcome === 'SURVIVE' && isReveal
      ? 'rgba(245,208,96,0.20)'
      : outcome === 'DIE' && isReveal
      ? 'rgba(150,20,20,0.16)'
      : isBloodMoon
      ? 'rgba(140,15,5,0.18)'
      : 'rgba(255,130,20,0.10)';
    const pos = resolveLayerCSS({ ...layer, height: layer.height ?? 55 });
    return (
      <div
        aria-hidden="true"
        className="sgsr-anim"
        style={{
          position:  'absolute',
          left:      pos.left,
          top:       pos.top,
          width:     pos.width,
          height:    pos.height,
          opacity:   layer.opacity ?? 0.7,
          zIndex:    layer.zIndex,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 80% 70% at 50% 40%, ${glowColor} 0%, transparent 70%)`,
          transition: 'background 0.8s ease',
          animation: animCSS,
          '--glow-op': String(layer.opacity ?? 0.7),
        } as React.CSSProperties}
      />
    );
  }

  // Gate inner light
  if (layer.role === 'gate_inner_light' || layer.effectPreset === 'inner_light') {
    const animCSS = animEnabled ? animPresetToCSS(layer.animationPreset) : undefined;
    const visible  = outcome === 'SURVIVE' && isReveal;
    const ilOp     = visible ? (layer.opacity ?? 0.65) : 0;
    const pos = resolveLayerCSS({ ...layer, x: layer.x ?? 20, y: layer.y ?? 12, width: layer.width ?? 60, height: layer.height ?? 58 });
    return (
      <div
        aria-hidden="true"
        className="sgsr-anim"
        style={{
          position:  'absolute',
          left:      pos.left,
          top:       pos.top,
          width:     pos.width,
          height:    pos.height,
          opacity:   ilOp,
          zIndex:    layer.zIndex,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 65% at 50% 55%, rgba(245,228,140,0.30) 0%, rgba(255,190,60,0.10) 45%, transparent 70%)',
          transition: 'opacity 1s ease 0.3s',
          animation: visible ? animCSS : undefined,
          '--il-op': String(ilOp),
        } as React.CSSProperties}
      />
    );
  }

  // Torch flame procedural fallback
  if (layer.role === 'torch_flame' || layer.effectPreset === 'torch_fire') {
    const animCSS = animEnabled ? animPresetToCSS(layer.animationPreset) : undefined;
    const pos = resolveLayerCSS({ ...layer, width: layer.width ?? 10, height: layer.height ?? 15 });
    return (
      <div
        aria-hidden="true"
        className="sgsr-anim"
        style={{
          position:    'absolute',
          left:        pos.left,
          top:         pos.top,
          width:       pos.width,
          height:      pos.height,
          opacity:     layer.opacity ?? 0.75,
          zIndex:      layer.zIndex,
          pointerEvents: 'none',
          background:  'radial-gradient(ellipse 60% 80% at 50% 80%, rgba(255,130,0,0.7) 0%, rgba(255,80,0,0.3) 50%, transparent 100%)',
          filter:      'blur(3px)',
          animation:   animCSS,
        } as React.CSSProperties}
      />
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Text layer
// ─────────────────────────────────────────────────────────────────────────────

function TextLayer({
  layer, scene, phase, outcome,
}: { layer: SceneLayer; scene: SkullGateSceneConfig; phase: Phase; outcome: Outcome }) {
  const isReveal  = phase === 'revealing' || phase === 'done';
  const text      = layer.text ?? resolveInstructionText(scene, phase, outcome);
  const isOutcome = phase === 'done';

  const color = isReveal
    ? outcome === 'SURVIVE' ? '#F5D060' : '#CC5555'
    : 'rgba(255,235,190,0.9)';

  const shadow = isReveal
    ? outcome === 'SURVIVE'
      ? '0 0 20px rgba(245,208,96,0.6), 0 1px 4px rgba(0,0,0,0.9)'
      : '0 0 16px rgba(180,40,40,0.6), 0 1px 4px rgba(0,0,0,0.9)'
    : '0 0 12px rgba(255,160,60,0.35), 0 1px 4px rgba(0,0,0,0.75)';

  const pos = resolveLayerCSS({ ...layer, x: layer.x ?? 10, y: layer.y ?? 74, width: layer.width ?? 80 });

  return (
    <div
      style={{
        position:    'absolute',
        left:        pos.left,
        top:         pos.top,
        width:       pos.width,
        zIndex:      layer.zIndex,
        opacity:     layer.opacity ?? 1,
        pointerEvents: 'none',
        textAlign:   'center',
        fontFamily:  isOutcome
          ? "'Metal Mania', 'Cinzel', Georgia, serif"
          : "'Cinzel', 'Metal Mania', Georgia, serif",
        fontSize:    isOutcome ? '0.9em' : '0.82em',
        color,
        letterSpacing: '0.07em',
        lineHeight:  1.55,
        textShadow:  shadow,
        transition:  'color 0.5s ease, text-shadow 0.5s ease',
        whiteSpace:  'pre-line',
        padding:     '0 4%',
      }}
    >
      {text}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Button layer
// ─────────────────────────────────────────────────────────────────────────────

function ButtonLayer({
  layer, scene, phase, selectedChoiceId, onCta, templateType,
}: {
  layer:            SceneLayer;
  scene:            SkullGateSceneConfig;
  phase:            Phase;
  selectedChoiceId: string | null;
  onCta?:           () => void;
  templateType?:    string;
}) {
  // hold_reveal: no CTA button — interaction is direct hold on relic
  if (templateType === 'hold_reveal') return null;

  const isReveal = phase === 'revealing' || phase === 'done';
  const show     = !isReveal && selectedChoiceId !== null;
  if (!show) return null;

  const label = layer.text ?? scene.ctaText;
  const pos   = resolveLayerCSS({ ...layer, x: layer.x ?? 5, y: layer.y ?? 84, width: layer.width ?? 90 });

  return (
    <div
      style={{
        position: 'absolute',
        left:     pos.left,
        top:      pos.top,
        width:    pos.width,
        zIndex:   layer.zIndex,
        opacity:  layer.opacity ?? 1,
      }}
      className="animate-soft-scale-in"
    >
      <ImageButton
        onClick={onCta}
        disabled={isReveal}
        base={BUTTONS.confirm_default}
        hover={BUTTONS.confirm_hover}
        pressed={BUTTONS.confirm_pressed}
        style={{ width: '100%' }}
      >
        <span style={{
          fontFamily:    "'Metal Mania', 'Cinzel', Georgia, serif",
          fontSize:      '1.2em',
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color:         '#F5D060',
          textShadow:    '0 0 12px rgba(245,208,96,0.5), 0 2px 4px rgba(0,0,0,0.9)',
        }}>
          {label}
        </span>
      </ImageButton>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Door transform calculator
// ─────────────────────────────────────────────────────────────────────────────

function getDoorStyle(layer: SceneLayer, outcome: Outcome, phase: Phase): React.CSSProperties {
  const da = layer.doorAnimation;
  if (!da) return {};

  const isReveal   = phase === 'revealing' || phase === 'done';
  const transition = `transform ${da.durationMs}ms ${da.easing ?? 'ease'} ${da.delayMs ?? 0}ms, opacity ${da.durationMs}ms ease ${da.delayMs ?? 0}ms`;

  const shouldOpen =
    isReveal && outcome === 'SURVIVE' &&
    (da.trigger === 'on_survive' || da.trigger === 'on_result_reveal');

  const shouldRumble =
    isReveal && outcome === 'DIE' && da.preset === 'rumble_only';

  if (shouldRumble) return { animation: 'sgsr-rumble 0.35s ease-in-out 3', transition };
  if (!shouldOpen)  return { transition };

  const tx  = da.openTranslateX ?? 0;
  const ty  = da.openTranslateY ?? 0;
  const rot = da.openRotation ?? 0;
  const sc  = da.openScale ?? 1;

  let tf: string;
  switch (da.preset) {
    case 'swing_open': tf = `rotate(${rot}deg) translateX(${tx}%) translateY(${ty}%)`; break;
    case 'crack_open': tf = `translateX(${tx * 0.3}%) scaleX(${sc * 0.97})`; break;
    default:           tf = `translateX(${tx}%) translateY(${ty}%) rotate(${rot}deg) scale(${sc})`;
  }

  return { transform: tf, opacity: da.openOpacity ?? 1, transition };
}

// ─────────────────────────────────────────────────────────────────────────────
// Image/choice/door layer
// ─────────────────────────────────────────────────────────────────────────────

interface ImageLayerProps {
  layer:              SceneLayer;
  selectedChoiceId:   string | null;
  outcome:            Outcome;
  phase:              Phase;
  onChoiceSelect?:    (choiceId: string) => void;
  onRelicPointerDown?: (pointerId: number) => void;
  showOutlines:       boolean;
  mode:               'preview' | 'player';
  templateType?:      string;
  holdProgress:       number;
  bloodMoonPhase:     BloodMoonPhase;
}

function ImageLayer({
  layer, selectedChoiceId, outcome, phase, onChoiceSelect, onRelicPointerDown,
  showOutlines, mode, templateType, holdProgress, bloodMoonPhase,
}: ImageLayerProps) {
  if (!layer.assetPath) return null;

  const isReveal     = phase === 'revealing' || phase === 'done';
  const isDoor       = layer.role === 'gate_door_left' || layer.role === 'gate_door_right';
  const isChoice     = layer.role === 'choice_object' && layer.clickable && !!layer.choiceId;
  const isSelected   = isChoice && selectedChoiceId === layer.choiceId;
  const isOther      = isChoice && selectedChoiceId !== null && selectedChoiceId !== layer.choiceId;
  const isTapReveal  = templateType === 'tap_reveal';
  const isHoldReveal = templateType === 'hold_reveal';

  // Image filter
  let imgFilter = '';
  if (isChoice) {
    if (isReveal && isSelected) {
      imgFilter = outcome === 'SURVIVE'
        ? 'brightness(1.6) drop-shadow(0 0 20px rgba(255,210,50,0.9)) drop-shadow(0 0 8px rgba(255,160,40,0.6))'
        : 'brightness(0.4) saturate(0.2) drop-shadow(0 0 12px rgba(160,20,20,0.7))';
    } else if (isReveal && !isSelected) {
      imgFilter = 'brightness(0.25) saturate(0.15)';
    } else if (isSelected) {
      if (isTapReveal) {
        imgFilter = 'brightness(1.4) drop-shadow(0 0 18px rgba(255,200,80,0.9)) drop-shadow(0 0 6px rgba(255,120,0,0.7)) saturate(1.2)';
      } else if (isHoldReveal) {
        imgFilter = 'brightness(1.15) drop-shadow(0 0 16px rgba(180,30,10,0.55))';
      } else {
        imgFilter = 'brightness(1.3) drop-shadow(0 0 14px rgba(255,140,20,0.8)) drop-shadow(0 0 5px rgba(255,100,0,0.5))';
      }
    } else if (isOther) {
      imgFilter = 'brightness(0.45) saturate(0.35)';
    } else {
      imgFilter = isTapReveal
        ? 'brightness(1.0) drop-shadow(0 0 8px rgba(255,140,40,0.5))'
        : isHoldReveal
        ? 'brightness(1.0)'
        : 'brightness(0.92) drop-shadow(0 0 6px rgba(255,120,0,0.35))';
    }
  }

  const doorStyle   = isDoor ? getDoorStyle(layer, outcome, phase) : {};
  const animEnabled = layer.parallaxEnabled !== false;

  let animCSS: string | undefined;
  if (isChoice && isTapReveal) {
    if (isReveal && isSelected) {
      animCSS = outcome === 'SURVIVE'
        ? 'sgsr-tap-survive 0.6s ease-out 1 forwards'
        : 'sgsr-tap-crack 0.5s ease-in-out 1 forwards';
    } else if (isSelected && !isReveal) {
      animCSS = 'sgsr-tap-pulse 1.8s ease-in-out infinite';
    }
  } else {
    animCSS = animEnabled && (layer.role === 'torch_flame' || layer.animationPreset === 'torch_flicker')
      ? animPresetToCSS(layer.animationPreset)
      : undefined;
  }

  const { left, top, width, height } = (() => { const p = resolveLayerCSS(layer); return p; })();

  const containerStyle: React.CSSProperties = {
    position:   'absolute',
    left, top, width, height,
    zIndex:     layer.zIndex,
    opacity:    layer.opacity ?? 1,
    background: 'transparent',
    border:     showOutlines && mode === 'preview'
      ? `1px dashed rgba(${isChoice ? '255,160,60' : '80,160,120'},0.45)`
      : 'none',
    padding:    0,
    WebkitTapHighlightColor: 'transparent',
    outline:    'none',
    overflow:   'visible',
    cursor:     isChoice && (phase === 'idle' || phase === 'selected') ? 'pointer' : 'default',
    animation:  animCSS,
    touchAction: isHoldReveal && isChoice ? 'none' : undefined,
    ...doorStyle,
  };

  const Wrapper = isChoice ? 'button' : 'div';

  // hit area — restricts interactive zone (layer-relative %)
  const ha = layer.hitArea;

  return (
    <Wrapper
      className="sgsr-anim sgsr-door"
      style={containerStyle as React.CSSProperties}
      {...(isChoice && !isHoldReveal && onChoiceSelect && (phase === 'idle' || phase === 'selected') ? {
        onClick:      () => onChoiceSelect(layer.choiceId!),
        'aria-label': layer.name,
      } : {})}
      {...(isChoice && isHoldReveal && onRelicPointerDown && (phase === 'idle' || phase === 'selected') ? {
        onPointerDown: (e: React.PointerEvent) => {
          e.preventDefault();
          onRelicPointerDown(e.pointerId);
        },
        'aria-label': layer.name,
      } : {})}
    >
      {/* BloodMoonRelicEffect — rendered BEHIND the image (lower z-index) */}
      {isHoldReveal && isChoice && (
        <BloodMoonRelicEffect
          phase={bloodMoonPhase}
          holdProgress={holdProgress}
          style={{ zIndex: 0 }}
        />
      )}

      {/* Radial glow behind selected choice (non-hold_reveal) */}
      {isChoice && isSelected && !isHoldReveal && (
        <div
          aria-hidden="true"
          style={{
            position:  'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
            background: isReveal
              ? outcome === 'SURVIVE'
                ? 'radial-gradient(ellipse 85% 90% at 50% 65%, rgba(255,210,50,0.32) 0%, transparent 70%)'
                : 'radial-gradient(ellipse 75% 80% at 50% 65%, rgba(160,20,20,0.28) 0%, transparent 65%)'
              : isTapReveal
                ? 'radial-gradient(ellipse 90% 95% at 50% 55%, rgba(255,160,40,0.35) 0%, transparent 70%)'
                : 'radial-gradient(ellipse 80% 85% at 50% 65%, rgba(255,130,20,0.22) 0%, transparent 70%)',
            transition: 'background 0.5s ease',
          }}
        />
      )}

      {/* Tap ring burst — tap_reveal only */}
      {isTapReveal && isChoice && isSelected && !isReveal && (
        <div
          aria-hidden="true"
          style={{
            position:     'absolute', inset: '-20%',
            pointerEvents: 'none',   zIndex: 2,
            borderRadius: '50%',
            border:       '2px solid rgba(255,190,60,0.7)',
            animation:    'sgsr-tap-ring 0.55s ease-out 1 forwards',
          }}
        />
      )}

      {/* Survive burst overlay — tap_reveal only */}
      {isTapReveal && isChoice && isSelected && isReveal && outcome === 'SURVIVE' && (
        <div
          aria-hidden="true"
          style={{
            position:     'absolute', inset: '-30%',
            pointerEvents: 'none',   zIndex: 2,
            borderRadius: '50%',
            background:   'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(255,230,100,0.5) 0%, rgba(255,180,40,0.2) 40%, transparent 70%)',
            animation:    'sgsr-tap-ring 0.8s ease-out 1 forwards',
          }}
        />
      )}

      {/* Image — rendered on top of BloodMoonRelicEffect (zIndex: 3) */}
      <img
        src={layer.assetPath}
        alt={layer.name}
        draggable={false}
        style={{
          position:      'absolute', inset: 0, zIndex: 3,
          width:         '100%', height: '100%',
          objectFit:     isHoldReveal && isChoice ? 'fill' : 'contain',
          objectPosition: 'center',
          filter:        imgFilter || undefined,
          transition:    'filter 0.45s ease',
          userSelect:    'none', pointerEvents: 'none', display: 'block',
          '--torch-filter-base':   imgFilter || 'none',
          '--torch-filter-bright': imgFilter
            ? imgFilter.replace(/brightness\([\d.]+\)/, 'brightness(1.4)')
            : 'brightness(1.4)',
          '--torch-filter-dim':    imgFilter
            ? imgFilter.replace(/brightness\([\d.]+\)/, 'brightness(0.75)')
            : 'brightness(0.75)',
        } as React.CSSProperties}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />

      {/* hitArea visual debug overlay (preview mode only) */}
      {showOutlines && mode === 'preview' && ha && (
        <div
          aria-hidden="true"
          style={{
            position:    'absolute',
            left:        `${ha.x}%`,
            top:         `${ha.y}%`,
            width:       `${ha.width}%`,
            height:      `${ha.height}%`,
            border:      '1px solid rgba(255,80,80,0.7)',
            pointerEvents: 'none',
            zIndex:       10,
          }}
        />
      )}
    </Wrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Torch fire overlay
// ─────────────────────────────────────────────────────────────────────────────

interface TorchFireOverlayProps {
  choiceLayer: SceneLayer;
  phase:       Phase;
  outcome:     Outcome;
}

function TorchFireOverlay({ choiceLayer, phase, outcome }: TorchFireOverlayProps) {
  const isReveal = phase === 'revealing' || phase === 'done';

  let intensity: number;
  let coreColor  = '#FFF5C0';
  let midColor   = '#FF9A20';
  let outerColor = '#FF4A00';

  if (phase === 'selected') {
    intensity = 0.75;
  } else if (phase === 'revealing') {
    intensity = 1.0;
  } else if (phase === 'done') {
    if (outcome === 'SURVIVE') {
      intensity = 1.1; coreColor = '#FFFAE0'; midColor = '#FFD040'; outerColor = '#FFA000';
    } else {
      intensity = 0.35; coreColor = '#FF8C40'; midColor = '#CC4400'; outerColor = '#880000';
    }
  } else {
    return null;
  }

  const pos = resolveLayerCSS(choiceLayer);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: pos.left, top: pos.top,
        width: pos.width, height: pos.height,
        zIndex: (choiceLayer.zIndex ?? 9) + 1,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <div style={{ position: 'absolute', left: '50%', top: '-5%', transform: 'translateX(-50%) translateY(-100%)' }}>
        <TorchFireEffect
          width={44} height={72}
          intensity={intensity}
          coreColor={coreColor}
          midColor={midColor}
          outerColor={outerColor}
          particleCount={isReveal ? 12 : 8}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface SkullGateSceneRendererProps {
  sceneConfig:          SkullGateSceneConfig;
  mode?:                'preview' | 'player';
  selectedChoiceId?:    string | null;
  resultOutcome?:       Outcome;
  revealPhase?:         Phase;
  onChoiceSelect?:      (choiceId: string) => void;
  onCta?:               () => void;
  /** hold_reveal: called when pointer goes down on the relic */
  onRelicPointerDown?:  (pointerId: number) => void;
  showEditorOutlines?:  boolean;
  holdProgress?:        number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main renderer
// ─────────────────────────────────────────────────────────────────────────────

export default function SkullGateSceneRenderer({
  sceneConfig,
  mode              = 'player',
  selectedChoiceId  = null,
  resultOutcome     = null,
  revealPhase       = 'idle',
  onChoiceSelect,
  onCta,
  onRelicPointerDown,
  showEditorOutlines = false,
  holdProgress       = 0,
}: SkullGateSceneRendererProps) {
  ensureKeyframes();

  const isHoldReveal = sceneConfig.templateType === 'hold_reveal';
  const isBloodMoon  = isHoldReveal;

  const sortedLayers = useMemo(
    () => [...sceneConfig.layers].sort((a, b) => a.zIndex - b.zIndex),
    [sceneConfig.layers],
  );

  // For torch fire overlay
  const selectedChoiceLayer = useMemo(() => {
    if (!selectedChoiceId) return null;
    return sceneConfig.layers.find(
      (l) => l.role === 'choice_object' && l.choiceId === selectedChoiceId && l.visible,
    ) ?? null;
  }, [sceneConfig.layers, selectedChoiceId]);

  const isReveal = revealPhase === 'revealing' || revealPhase === 'done';
  const bgFilter = resultOutcome === 'DIE' && isReveal
    ? 'brightness(0.6) saturate(0.45)'
    : undefined;

  // Map to BloodMoonPhase — used directly inside ImageLayer for hold_reveal choice objects
  const bloodMoonPhase: BloodMoonPhase =
    revealPhase === 'done'
      ? (resultOutcome === 'SURVIVE' ? 'survived' : 'failed')
      : revealPhase === 'revealing'
      ? 'resolving'
      : (selectedChoiceId ? 'holding' : 'idle');

  return (
    <div
      style={{
        position:   'relative',
        width:      '100%',
        height:     '100%',
        overflow:   'hidden',
        background: '#070A08',
        filter:     bgFilter,
        transition: 'filter 0.6s ease',
      }}
    >
      {sortedLayers.map((layer) => {
        if (!layer.visible) return null;

        const isProcedural =
          layer.role === 'particle_effect'  ||
          layer.role === 'atmosphere_effect' ||
          layer.effectPreset === 'ritual_motes' ||
          layer.effectPreset === 'blood_moon_glow' ||
          (layer.role === 'gate_glow'        && !layer.assetPath) ||
          (layer.role === 'gate_inner_light' && !layer.assetPath) ||
          (layer.role === 'torch_flame'      && !layer.assetPath);

        if (isProcedural) {
          return (
            <ProceduralEffect
              key={layer.id}
              layer={layer}
              outcome={resultOutcome}
              phase={revealPhase}
              isBloodMoon={isBloodMoon}
            />
          );
        }

        if (layer.type === 'text') {
          return (
            <TextLayer
              key={layer.id}
              layer={layer}
              scene={sceneConfig}
              phase={revealPhase}
              outcome={resultOutcome}
            />
          );
        }

        if (layer.type === 'button') {
          return (
            <ButtonLayer
              key={layer.id}
              layer={layer}
              scene={sceneConfig}
              phase={revealPhase}
              selectedChoiceId={selectedChoiceId}
              onCta={onCta}
              templateType={sceneConfig.templateType}
            />
          );
        }

        return (
          <ImageLayer
            key={layer.id}
            layer={layer}
            selectedChoiceId={selectedChoiceId}
            outcome={resultOutcome}
            phase={revealPhase}
            onChoiceSelect={onChoiceSelect}
            onRelicPointerDown={onRelicPointerDown}
            showOutlines={showEditorOutlines}
            mode={mode}
            templateType={sceneConfig.templateType}
            holdProgress={holdProgress}
            bloodMoonPhase={bloodMoonPhase}
          />
        );
      })}

      {/* Torch fire overlay (choice_2 / tap_reveal only) */}
      {!isHoldReveal && selectedChoiceLayer && (
        <TorchFireOverlay
          choiceLayer={selectedChoiceLayer}
          phase={revealPhase}
          outcome={resultOutcome}
        />
      )}

      {/* Gold bloom on survive */}
      {resultOutcome === 'SURVIVE' && isReveal && (
        <div
          aria-hidden="true"
          style={{
            position:   'absolute', inset: 0, pointerEvents: 'none', zIndex: 15,
            background: 'radial-gradient(ellipse 85% 65% at 50% 38%, rgba(245,208,96,0.13) 0%, transparent 70%)',
            transition: 'opacity 0.8s ease',
          }}
        />
      )}

      {/* Vignette */}
      <div
        aria-hidden="true"
        style={{
          position:   'absolute', inset: 0, pointerEvents: 'none', zIndex: 50,
          background: 'radial-gradient(ellipse 90% 80% at 50% 45%, transparent 35%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {showEditorOutlines && mode === 'preview' && (
        <div style={{
          position: 'absolute', top: 4, left: 4, zIndex: 999,
          fontSize: 9, fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'rgba(120,200,100,0.7)', background: 'rgba(0,0,0,0.55)',
          padding: '2px 6px', pointerEvents: 'none',
        }}>
          Outlines On
        </div>
      )}
    </div>
  );
}
