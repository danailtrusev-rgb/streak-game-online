// SkullGateSceneChallenge
//
// Scene-renderer-driven version of SkullGateChallenge.
// Rendered ONLY when USE_SCENE_BASED_SKULL_GATE = true AND an assignment with
// a valid scene config exists. Caller (HomePage) guarantees both conditions.
//
// Props mirror SkullGateChallenge exactly so the switch in HomePage is trivial.
//
// What this component does:
//   - Renders the assigned scene via SkullGateSceneRenderer (player mode)
//   - Manages idle → selected → revealing → done phase progression
//   - Allows choice switching before CTA; locks choice after CTA press
//   - Calls onComplete() when reveal finishes (same as SkullGateChallenge)
//   - Uses pendingResult.outcome ONLY for visual reveal styling
//   - Fire-and-forgets markStarted / markCompleted for analytics
//
// hold_reveal template:
//   - Tapping the relic auto-selects it (choiceId = 'relic')
//   - CTA press locks and begins reveal (same flow, no actual hold timer)
//   - holdProgress 0→1 animates over REVEAL_HOLD_MS for the ring effect

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
  pendingResult: PlayResult;
  onComplete:    () => void;
  sceneConfig:   SkullGateSceneConfig;
  assignment:    SkullGateAssignment;
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
  const startedRef    = useRef(false);
  const holdRafRef    = useRef<number>(0);
  const holdStartRef  = useRef<number>(0);

  const isHoldReveal = sceneConfig.templateType === 'hold_reveal';
  const survived     = pendingResult.outcome === 'SURVIVE';

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

  // For hold_reveal: auto-select the relic when tapped
  const handleChoiceSelect = useCallback((choiceId: string) => {
    if (phase !== 'idle' && phase !== 'selected') return;
    setSelectedChoice(choiceId);
    setPhase('selected');
  }, [phase]);

  // CTA pressed — animate hold ring then begin reveal
  const handleCta = useCallback(() => {
    if (phase !== 'selected' || !selectedChoice) return;

    setPhase('revealing');
    holdStartRef.current = performance.now();
    setHoldProgress(0);

    const animate = (now: number) => {
      const elapsed = now - holdStartRef.current;
      const progress = Math.min(1, elapsed / REVEAL_HOLD_MS);
      setHoldProgress(progress);
      if (progress < 1) {
        holdRafRef.current = requestAnimationFrame(animate);
      } else {
        setPhase('done');
        onMarkCompleted(assignment.assignment_id, pendingResult.outcome);
        setTimeout(onComplete, 400);
      }
    };
    holdRafRef.current = requestAnimationFrame(animate);
  }, [phase, selectedChoice, assignment.assignment_id, pendingResult.outcome, onMarkCompleted, onComplete]);

  // Cleanup RAF on unmount
  useEffect(() => () => { if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current); }, []);

  // For hold_reveal idle phase: auto-select the relic so the effect shows immediately on tap
  // (relic is the only choice, and tapping it triggers handleChoiceSelect)

  const rendererPhase: 'idle' | 'selected' | 'revealing' | 'done' =
    phase === 'idle'      ? 'idle'      :
    phase === 'selected'  ? 'selected'  :
    phase === 'revealing' ? 'revealing' : 'done';

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
      {/* 9:16 play area — constrained by both width and height so it never distorts */}
      <div
        className="animate-scene-enter"
        style={{
          position:  'relative',
          width:     'min(100%, calc(100vh * 9 / 16))',
          maxWidth:   480,
          aspectRatio: '9 / 16',
          alignSelf: 'center',
          overflow:  'hidden',
          flexShrink: 0,
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
          showEditorOutlines={false}
          holdProgress={holdProgress}
        />

        {/* Idle nudge overlay — only before any choice is made */}
        {phase === 'idle' && (
          <div
            style={{
              position:  'absolute',
              bottom:    'max(env(safe-area-inset-bottom, 0px), 24px)',
              left:       0, right: 0,
              display:   'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex:     100,
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
                ? 'Touch the relic to begin'
                : (sceneConfig.instructionText ?? 'Tap to begin')}
            </span>
          </div>
        )}

        {/* Reveal status bar — appears during/after reveal, above renderer layers */}
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

