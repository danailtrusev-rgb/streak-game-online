// SkullGateSceneChallenge
//
// Scene-renderer-driven challenge component.
// Used when USE_SCENE_BASED_SKULL_GATE = true AND an assignment with a valid
// scene config exists. Caller (HomePage) guarantees both conditions.
//
// Props mirror SkullGateChallenge exactly so the switch in HomePage is trivial.
//
// hold_reveal interaction (Blood Moon Relic):
//   - Pointer down on relic → starts RAF hold-progress loop (0→1)
//   - Pointer up / cancel / leave before 100% → reset to 0, phase back to idle
//   - Hold reaches 100% → trigger reveal (no CTA button needed)
//   - CTA button is hidden for hold_reveal template
//
// choice_2 / tap_reveal interaction:
//   - Tap choice_object → phase becomes 'selected'
//   - CTA button appears → press to confirm → reveal

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { PlayResult } from '../../lib/types';
import type { SkullGateSceneConfig } from '../../lib/types';
import SkullGateSceneRenderer from './SkullGateSceneRenderer';
import type { SkullGateAssignment } from '../../hooks/useSkullGateAssignment';

// ── Constants ─────────────────────────────────────────────────────────────────

const REVEAL_HOLD_MS = 1800;

// ── Types ─────────────────────────────────────────────────────────────────────

type ChallengePhase = 'idle' | 'selected' | 'revealing' | 'done';

interface Props {
  pendingResult:   PlayResult;
  onComplete:      () => void;
  sceneConfig:     SkullGateSceneConfig;
  assignment:      SkullGateAssignment;
  onMarkStarted:   (id: string | null) => void;
  onMarkCompleted: (id: string | null, outcome: 'SURVIVE' | 'DIE') => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SkullGateSceneChallenge({
  pendingResult,
  onComplete,
  sceneConfig,
  assignment,
  onMarkStarted,
  onMarkCompleted,
}: Props) {
  const [phase,          setPhase]          = useState<ChallengePhase>('idle');
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [holdProgress,   setHoldProgress]   = useState(0);
  const [visible,        setVisible]        = useState(false);

  const startedRef     = useRef(false);
  const holdRafRef     = useRef<number>(0);
  const holdStartRef   = useRef<number>(0);
  const holdActiveRef  = useRef(false);   // true while pointer is held down
  const holdPointerRef = useRef<number>(-1);
  const phaseRef       = useRef<ChallengePhase>('idle');

  const isHoldReveal = sceneConfig.templateType === 'hold_reveal';
  const survived     = pendingResult.outcome === 'SURVIVE';

  // Keep phaseRef in sync so RAF callbacks see current phase without stale closure
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Fade-in entrance
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Mark started once on first render (analytics, fire-and-forget)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    onMarkStarted(assignment.assignment_id);
  }, [assignment.assignment_id, onMarkStarted]);

  // ── Finish reveal ──────────────────────────────────────────────────────────

  const finishReveal = useCallback(() => {
    setPhase('done');
    onMarkCompleted(assignment.assignment_id, pendingResult.outcome);
    setTimeout(onComplete, 400);
  }, [assignment.assignment_id, pendingResult.outcome, onMarkCompleted, onComplete]);

  // ── RAF hold loop ──────────────────────────────────────────────────────────

  const cancelHold = useCallback(() => {
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
    holdActiveRef.current  = false;
    holdPointerRef.current = -1;
    setHoldProgress(0);
    // Only reset phase if we haven't started the reveal yet
    if (phaseRef.current !== 'revealing' && phaseRef.current !== 'done') {
      setPhase('idle');
      setSelectedChoice(null);
    }
  }, []);

  const startHoldLoop = useCallback(() => {
    holdStartRef.current = performance.now();
    holdActiveRef.current = true;

    const tick = (now: number) => {
      if (!holdActiveRef.current) return;
      const progress = Math.min(1, (now - holdStartRef.current) / REVEAL_HOLD_MS);
      setHoldProgress(progress);
      if (progress < 1) {
        holdRafRef.current = requestAnimationFrame(tick);
      } else {
        holdActiveRef.current = false;
        setPhase('revealing');
        // Phase transition: revealing → done handled by a small timeout
        setTimeout(finishReveal, 400);
      }
    };
    holdRafRef.current = requestAnimationFrame(tick);
  }, [finishReveal]);

  // ── hold_reveal pointer handlers (passed down to renderer via callbacks) ───

  const handleRelicPointerDown = useCallback((pointerId: number) => {
    if (phaseRef.current === 'revealing' || phaseRef.current === 'done') return;
    if (holdActiveRef.current) return;

    holdPointerRef.current = pointerId;
    setSelectedChoice('relic');
    setPhase('selected');
    startHoldLoop();
  }, [startHoldLoop]);

  const handleRelicPointerUp = useCallback((pointerId: number) => {
    if (holdPointerRef.current !== pointerId) return;
    if (phaseRef.current === 'revealing' || phaseRef.current === 'done') return;
    cancelHold();
  }, [cancelHold]);

  // ── choice_2 / tap_reveal handlers ────────────────────────────────────────

  const handleChoiceSelect = useCallback((choiceId: string) => {
    if (isHoldReveal) return; // hold_reveal doesn't use click-select flow
    if (phase !== 'idle' && phase !== 'selected') return;
    setSelectedChoice(choiceId);
    setPhase('selected');
  }, [isHoldReveal, phase]);

  // CTA pressed — for non-hold_reveal templates
  const handleCta = useCallback(() => {
    if (isHoldReveal) return;
    if (phase !== 'selected' || !selectedChoice) return;

    setPhase('revealing');
    // For non-hold templates the reveal is immediate (no progress animation)
    setTimeout(finishReveal, 400);
  }, [isHoldReveal, phase, selectedChoice, finishReveal]);

  // ── Global pointer-up listener for hold_reveal ────────────────────────────

  useEffect(() => {
    if (!isHoldReveal) return;

    const onPointerUp = (e: PointerEvent) => {
      if (holdPointerRef.current === e.pointerId) {
        handleRelicPointerUp(e.pointerId);
      }
    };
    const onPointerCancel = (e: PointerEvent) => {
      if (holdPointerRef.current === e.pointerId) {
        cancelHold();
      }
    };
    const onVisChange = () => {
      if (document.visibilityState === 'hidden') cancelHold();
    };

    window.addEventListener('pointerup',     onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      window.removeEventListener('pointerup',     onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [isHoldReveal, handleRelicPointerUp, cancelHold]);

  // ── Cleanup RAF on unmount ─────────────────────────────────────────────────

  useEffect(() => () => {
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
  }, []);

  // ── Phase mapping for renderer ────────────────────────────────────────────

  const rendererPhase: 'idle' | 'selected' | 'revealing' | 'done' = phase;

  const rendererOutcome: 'SURVIVE' | 'DIE' | null =
    (phase === 'revealing' || phase === 'done') ? pendingResult.outcome : null;

  return createPortal(
    <div
      style={{
        position:       'fixed',
        inset:           0,
        zIndex:          150,
        background:     'rgba(2,5,3,0.96)',
        opacity:         visible ? 1 : 0,
        transition:     'opacity 0.4s ease',
        overflow:       'hidden',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
      }}
    >
      {/* 9:16 play area */}
      <div
        className="animate-scene-enter"
        style={{
          position:    'relative',
          width:       'min(100%, calc(100vh * 9 / 16))',
          maxWidth:     480,
          aspectRatio: '9 / 16',
          alignSelf:   'center',
          overflow:    'hidden',
          flexShrink:   0,
        }}
      >
        <SkullGateSceneRenderer
          sceneConfig={sceneConfig}
          mode="player"
          selectedChoiceId={selectedChoice}
          resultOutcome={rendererOutcome}
          revealPhase={rendererPhase}
          onChoiceSelect={handleChoiceSelect}
          onCta={handleCta}
          onRelicPointerDown={isHoldReveal ? handleRelicPointerDown : undefined}
          showEditorOutlines={false}
          holdProgress={holdProgress}
        />

        {/* Idle nudge — only before hold starts */}
        {phase === 'idle' && (
          <div
            style={{
              position:      'absolute',
              bottom:        'max(env(safe-area-inset-bottom, 0px), 24px)',
              left:           0, right: 0,
              display:       'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex:         100,
            }}
          >
            <span style={{
              fontSize:      11,
              color:         'rgba(255,255,255,0.28)',
              fontFamily:    "'Inter', system-ui, sans-serif",
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              {isHoldReveal
                ? 'Press and hold the relic'
                : (sceneConfig.instructionText ?? 'Tap to begin')}
            </span>
          </div>
        )}

        {/* Hold progress hint — shows while holding */}
        {isHoldReveal && phase === 'selected' && (
          <div
            style={{
              position:      'absolute',
              bottom:        'max(env(safe-area-inset-bottom, 0px), 24px)',
              left:           0, right: 0,
              display:       'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex:         100,
            }}
          >
            <span style={{
              fontSize:      11,
              color:         'rgba(200,80,60,0.55)',
              fontFamily:    "'Inter', system-ui, sans-serif",
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              Hold…
            </span>
          </div>
        )}

        {/* Reveal status bar */}
        {(phase === 'revealing' || phase === 'done') && (
          <div
            style={{
              position:   'absolute',
              bottom:     'max(env(safe-area-inset-bottom, 0px), 20px)',
              left:       20, right: 20,
              zIndex:     200,
              padding:    '14px 20px',
              border:     `1px solid ${survived ? 'rgba(245,208,96,0.35)' : 'rgba(160,20,20,0.35)'}`,
              background:  survived ? 'rgba(245,208,96,0.06)' : 'rgba(100,0,0,0.14)',
              fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
              fontSize:    15, letterSpacing: '0.1em',
              textAlign:  'center',
              color:       survived ? '#D4A020' : '#993333',
              transition: 'all 0.5s ease',
              textShadow:  survived
                ? '0 0 12px rgba(245,208,96,0.4)'
                : '0 0 10px rgba(160,20,20,0.5)',
            }}
          >
            {survived
              ? (sceneConfig.surviveText ?? 'The gate opens. Your streak lives.')
              : (sceneConfig.failText    ?? 'The flame fades. The gate rejects you.')
            }
          </div>
        )}
      </div>
    </div>
  , document.body);
}
