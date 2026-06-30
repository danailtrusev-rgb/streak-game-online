// Skull Gate Scene Renderer — Prompt 19 created, Prompt 20 revised
//
// Renders a SkullGateSceneConfig from src/lib/skullGateScenes.ts.
// Used in AdminSkullGatePreview for internal testing only.
//
// Live SkullGateChallenge.tsx is NOT touched. Prompt 21+ will wire this
// into the live challenge flow to replace the hardcoded Torch Trial.

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

const STYLE_ID = 'sgsr-keyframes-v3';
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
    case 'light_ray_pulse':   return 'sgsr-light-ray 5s ease-in-out infinite';
    case 'gate_rumble':       return 'sgsr-rumble 0.35s ease-in-out 3';
    case 'torch_flicker':     return 'sgsr-torch-flicker 2.8s ease-in-out infinite';
    case 'inner_light_pulse': return 'sgsr-inner-light 3s ease-in-out infinite';
    default:                  return undefined;
  }
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
  if (phase === 'idle')     return scene.introText ?? scene.instructionText;
  if (phase === 'selected') return scene.instructionText;
  if (phase === 'revealing') {
    return outcome === 'SURVIVE'
      ? 'The gate answers…'
      : 'The gate answers…';
  }
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
  const isReveal = phase === 'revealing' || phase === 'done';
  const animEnabled = layer.parallaxEnabled !== false;

  // Fireflies
  if (layer.role === 'particle_effect' || layer.effectPreset === 'fireflies') {
    return (
      <AmbientFireflies
        count={isReveal ? 22 : 12}
        intensity={isReveal ? 'medium' : 'low'}
        zIndex={layer.zIndex}
      />
    );
  }

  // Fog
  if (layer.role === 'atmosphere_effect' || layer.effectPreset === 'fog') {
    const animCSS = animEnabled ? animPresetToCSS(layer.animationPreset) : undefined;
    const pos = resolveLayerCSS({ ...layer, y: layer.y ?? 55, height: layer.height ?? 45 });
    return (
      <div
        aria-hidden="true"
        className="sgsr-anim"
        style={{
          position:   'absolute',
          left:       pos.left,
          top:        pos.top,
          width:      pos.width,
          height:     pos.height,
          opacity:    layer.opacity ?? 0.4,
          zIndex:     layer.zIndex,
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, transparent 0%, rgba(5,12,7,0.5) 50%, rgba(3,8,5,0.72) 100%)',
          filter:     'blur(6px)',
          animation:  animCSS,
          '--fog-op': String(layer.opacity ?? 0.4),
        } as React.CSSProperties}
      />
    );
  }

  // Gate glow
  if (layer.role === 'gate_glow' || layer.effectPreset === 'gate_glow') {
    const animCSS = animEnabled ? animPresetToCSS(layer.animationPreset) : undefined;
    const glowColor = outcome === 'SURVIVE' && isReveal
      ? 'rgba(245,208,96,0.20)'
      : outcome === 'DIE' && isReveal
      ? 'rgba(150,20,20,0.16)'
      : isBloodMoon
      ? 'rgba(140,15,5,0.18)'   // blood moon idle — deep crimson
      : 'rgba(255,130,20,0.10)';
    const pos = resolveLayerCSS({ ...layer, height: layer.height ?? 55 });
    return (
      <div
        aria-hidden="true"
        className="sgsr-anim"
        style={{
          position:   'absolute',
          left:       pos.left,
          top:        pos.top,
          width:      pos.width,
          height:     pos.height,
          opacity:    layer.opacity ?? 0.7,
          zIndex:     layer.zIndex,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 80% 70% at 50% 40%, ${glowColor} 0%, transparent 70%)`,
          transition: 'background 0.8s ease',
          animation:  animCSS,
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
          position:   'absolute',
          left:       pos.left,
          top:        pos.top,
          width:      pos.width,
          height:     pos.height,
          opacity:    ilOp,
          zIndex:     layer.zIndex,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 65% at 50% 55%, rgba(245,228,140,0.30) 0%, rgba(255,190,60,0.10) 45%, transparent 70%)',
          transition: 'opacity 1s ease 0.3s',
          animation:  visible ? animCSS : undefined,
          '--il-op':  String(ilOp),
        } as React.CSSProperties}
      />
    );
  }

  // Torch flame procedural fallback (no asset)
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
  layer:           SceneLayer;
  scene:           SkullGateSceneConfig;
  phase:           Phase;
  selectedChoiceId: string | null;
  onCta?:          () => void;
  templateType?:   string;
}) {
  const isReveal = phase === 'revealing' || phase === 'done';
  // For hold_reveal: button shows when the player has "touched" the relic (selectedChoiceId set)
  // For other templates: button shows when a choice is selected
  const show = !isReveal && selectedChoiceId !== null;

  if (!show) return null;

  const label = layer.text ?? scene.ctaText;
  const pos = resolveLayerCSS({ ...layer, x: layer.x ?? 5, y: layer.y ?? 84, width: layer.width ?? 90 });

  return (
    <div
      style={{
        position:   'absolute',
        left:       pos.left,
        top:        pos.top,
        width:      pos.width,
        zIndex:     layer.zIndex,
        opacity:    layer.opacity ?? 1,
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

  const isReveal = phase === 'revealing' || phase === 'done';
  const transition = `transform ${da.durationMs}ms ${da.easing ?? 'ease'} ${da.delayMs ?? 0}ms, opacity ${da.durationMs}ms ease ${da.delayMs ?? 0}ms`;

  const shouldOpen =
    isReveal && outcome === 'SURVIVE' &&
    (da.trigger === 'on_survive' || da.trigger === 'on_result_reveal');

  const shouldRumble =
    isReveal && outcome === 'DIE' && da.preset === 'rumble_only';

  if (shouldRumble) {
    return { animation: 'sgsr-rumble 0.35s ease-in-out 3', transition };
  }

  if (!shouldOpen) return { transition };

  const tx  = da.openTranslateX ?? 0;
  const ty  = da.openTranslateY ?? 0;
  const rot = da.openRotation ?? 0;
  const sc  = da.openScale ?? 1;

  let tf: string;
  switch (da.preset) {
    case 'swing_open':
      tf = `rotate(${rot}deg) translateX(${tx}%) translateY(${ty}%)`;
      break;
    case 'crack_open':
      tf = `translateX(${tx * 0.3}%) scaleX(${sc * 0.97})`;
      break;
    default: // slide_open
      tf = `translateX(${tx}%) translateY(${ty}%) rotate(${rot}deg) scale(${sc})`;
  }

  return { transform: tf, opacity: da.openOpacity ?? 1, transition };
}

// ─────────────────────────────────────────────────────────────────────────────
// Image/choice/door layer
// ─────────────────────────────────────────────────────────────────────────────

interface ImageLayerProps {
  layer:            SceneLayer;
  selectedChoiceId: string | null;
  outcome:          Outcome;
  phase:            Phase;
  onChoiceSelect?:  (choiceId: string) => void;
  showOutlines:     boolean;
  mode:             'preview' | 'player';
  templateType?:    string;
}

function ImageLayer({
  layer, selectedChoiceId, outcome, phase, onChoiceSelect, showOutlines, mode, templateType,
}: ImageLayerProps) {
  if (!layer.assetPath) return null;

  const isReveal    = phase === 'revealing' || phase === 'done';
  const isDoor      = layer.role === 'gate_door_left' || layer.role === 'gate_door_right';
  const isChoice    = layer.role === 'choice_object' && layer.clickable && !!layer.choiceId;
  const isSelected  = isChoice && selectedChoiceId === layer.choiceId;
  const isOther     = isChoice && selectedChoiceId !== null && selectedChoiceId !== layer.choiceId;
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
      // Idle unselected — hold_reveal uses normal brightness so the dark foreground is visible
      imgFilter = isTapReveal
        ? 'brightness(1.0) drop-shadow(0 0 8px rgba(255,140,40,0.5))'
        : isHoldReveal
        ? 'brightness(1.0)'
        : 'brightness(0.92) drop-shadow(0 0 6px rgba(255,120,0,0.35))';
    }
  }

  // Scale for selected choice
  // (removed — selection shown via fire, glow, and brightness only)

  // Door transform
  const doorStyle = isDoor ? getDoorStyle(layer, outcome, phase) : {};

  // Animation — tap_reveal gets pulsing when selected, burst on reveal, crack on fail
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

  const containerStyle: React.CSSProperties = {
    position:   'absolute',
    ...(() => { const p = resolveLayerCSS(layer); return { left: p.left, top: p.top, width: p.width, height: p.height }; })(),
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
    ...doorStyle,
  };

  const Wrapper = isChoice ? 'button' : 'div';

  return (
    <Wrapper
      className="sgsr-anim sgsr-door"
      style={containerStyle as React.CSSProperties}
      {...(isChoice && onChoiceSelect && (phase === 'idle' || phase === 'selected') ? {
        onClick:     () => onChoiceSelect(layer.choiceId!),
        'aria-label': layer.name,
      } : {})}
    >
      {/* Radial glow behind selected choice — no rectangle */}
      {isChoice && isSelected && (
        <div
          aria-hidden="true"
          style={{
            position:   'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
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

      {/* Tap ring burst — tap_reveal only, fires once on selection */}
      {isTapReveal && isChoice && isSelected && !isReveal && (
        <div
          aria-hidden="true"
          style={{
            position:     'absolute',
            inset:        '-20%',
            pointerEvents: 'none',
            zIndex:        1,
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
            position:     'absolute',
            inset:        '-30%',
            pointerEvents: 'none',
            zIndex:        1,
            borderRadius: '50%',
            background:   'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(255,230,100,0.5) 0%, rgba(255,180,40,0.2) 40%, transparent 70%)',
            animation:    'sgsr-tap-ring 0.8s ease-out 1 forwards',
          }}
        />
      )}

      <img
        src={layer.assetPath}
        alt={layer.name}
        draggable={false}
        style={{
          position:      'absolute', inset: 0,
          width:         '100%', height: '100%',
          // hold_reveal foreground spans the full container — fill, not letterbox
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
    </Wrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Torch fire overlay — positioned over the selected torch's flame area
// ─────────────────────────────────────────────────────────────────────────────

interface TorchFireOverlayProps {
  choiceLayer: SceneLayer;
  phase:       Phase;
  outcome:     Outcome;
}

function TorchFireOverlay({ choiceLayer, phase, outcome }: TorchFireOverlayProps) {
  const isReveal = phase === 'revealing' || phase === 'done';

  // Intensity ramp: medium on selected, high on revealing, outcome-based on done
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
      intensity  = 1.1;
      coreColor  = '#FFFAE0';
      midColor   = '#FFD040';
      outerColor = '#FFA000';
    } else {
      // Dying / dim
      intensity  = 0.35;
      coreColor  = '#FF8C40';
      midColor   = '#CC4400';
      outerColor = '#880000';
    }
  } else {
    return null; // idle — no fire
  }

  // Position fire above the top-center of the torch choice layer
  // The fire is centered horizontally and placed so its bottom sits at ~20% from top of torch
  const pos = resolveLayerCSS(choiceLayer);

  return (
    <div
      aria-hidden="true"
      style={{
        position:      'absolute',
        left:          pos.left,
        top:           pos.top,
        width:         pos.width,
        height:        pos.height,
        zIndex:        (choiceLayer.zIndex ?? 9) + 1,
        pointerEvents: 'none',
        overflow:      'visible',
      }}
    >
      {/* Centered at top of torch */}
      <div
        style={{
          position:  'absolute',
          left:      '50%',
          top:       '-5%',
          transform: 'translateX(-50%) translateY(-100%)',
        }}
      >
        <TorchFireEffect
          width={44}
          height={72}
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
  sceneConfig:        SkullGateSceneConfig;
  mode?:              'preview' | 'player';
  selectedChoiceId?:  string | null;
  resultOutcome?:     Outcome;
  revealPhase?:       Phase;
  onChoiceSelect?:    (choiceId: string) => void;
  onCta?:             () => void;
  showEditorOutlines?: boolean;
  /** 0–1 hold progress for hold_reveal template (used by BloodMoonRelicEffect ring) */
  holdProgress?:      number;
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
  showEditorOutlines = false,
  holdProgress       = 0,
}: SkullGateSceneRendererProps) {
  ensureKeyframes();

  const isHoldReveal = sceneConfig.templateType === 'hold_reveal';
  const isBloodMoon  = isHoldReveal; // all hold_reveal scenes use blood moon color scheme

  const sortedLayers = useMemo(
    () => [...sceneConfig.layers].sort((a, b) => a.zIndex - b.zIndex),
    [sceneConfig.layers],
  );

  // For hold_reveal: the single choice_object is the relic. Find it for effect positioning.
  const selectedChoiceLayer = useMemo(() => {
    if (!selectedChoiceId || revealPhase === 'idle') return null;
    return sceneConfig.layers.find(
      (l) => l.role === 'choice_object' && l.choiceId === selectedChoiceId && l.visible,
    ) ?? null;
  }, [sceneConfig.layers, selectedChoiceId, revealPhase]);

  const isReveal  = revealPhase === 'revealing' || revealPhase === 'done';
  const bgFilter  = resultOutcome === 'DIE' && isReveal
    ? 'brightness(0.6) saturate(0.45)'
    : undefined;

  // Map renderer phase to BloodMoonPhase
  const bloodMoonPhase: BloodMoonPhase =
    revealPhase === 'idle'      ? (selectedChoiceId ? 'holding' : 'idle') :
    revealPhase === 'selected'  ? 'holding' :
    revealPhase === 'revealing' ? 'resolving' :
    revealPhase === 'done'      ? (resultOutcome === 'SURVIVE' ? 'survived' : 'failed') :
    'idle';

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

        // Procedural-only roles
        const isProcedural =
          layer.role === 'particle_effect'  ||
          layer.role === 'atmosphere_effect' ||
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

        // image / effect with assetPath
        return (
          <ImageLayer
            key={layer.id}
            layer={layer}
            selectedChoiceId={selectedChoiceId}
            outcome={resultOutcome}
            phase={revealPhase}
            onChoiceSelect={onChoiceSelect}
            showOutlines={showEditorOutlines}
            mode={mode}
            templateType={sceneConfig.templateType}
          />
        );
      })}

      {/* Torch fire effect on selected torch (choice_2 only) */}
      {!isHoldReveal && selectedChoiceLayer && (
        <TorchFireOverlay
          choiceLayer={selectedChoiceLayer}
          phase={revealPhase}
          outcome={resultOutcome}
        />
      )}

      {/* Blood Moon Relic effect overlay (hold_reveal) */}
      {isHoldReveal && selectedChoiceLayer && (() => {
        const pos = resolveLayerCSS(selectedChoiceLayer);
        return (
          <div
            aria-hidden="true"
            style={{
              position:      'absolute',
              left:          pos.left,
              top:           pos.top,
              width:         pos.width,
              height:        pos.height,
              zIndex:        (selectedChoiceLayer.zIndex ?? 10) + 1,
              pointerEvents: 'none',
              overflow:      'visible',
            }}
          >
            <BloodMoonRelicEffect
              phase={bloodMoonPhase}
              holdProgress={holdProgress}
            />
          </div>
        );
      })()}

      {/* Gold bloom on survive — scene-level */}
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

      {/* Vignette — always on top */}
      <div
        aria-hidden="true"
        style={{
          position:   'absolute', inset: 0, pointerEvents: 'none', zIndex: 50,
          background: 'radial-gradient(ellipse 90% 80% at 50% 45%, transparent 35%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Editor outline label */}
      {showEditorOutlines && mode === 'preview' && (
        <div
          style={{
            position:  'absolute', top: 4, left: 4, zIndex: 999,
            fontSize:  9, fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color:     'rgba(120,200,100,0.7)', background: 'rgba(0,0,0,0.55)',
            padding:   '2px 6px', pointerEvents: 'none',
          }}
        >
          Outlines On
        </div>
      )}
    </div>
  );
}
