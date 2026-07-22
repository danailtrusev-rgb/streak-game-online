// Relic Offering — custom Skull Gate scene module (drag_to_target template).
// Theatrical drag interaction only; outcome is decided by the admin preview
// simulate survive/fail controls or the backend when available.

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  RELIC_POOL,
  RELIC_OFFERING_BASE_ASSETS,
  RELIC_OFFERING_SLOT_POSITIONS,
  RELIC_OFFERING_ALTAR_POSITION,
} from '../../lib/skullGateScenes';
import type { RelicDef } from '../../lib/skullGateScenes';

export type RelicOfferingPhase = 'idle' | 'dragging' | 'resolving' | 'revealing' | 'done';
export type RelicOfferingOutcome = 'SURVIVE' | 'DIE' | null;

export interface RelicOfferingSceneProps {
  /** When backend playId is available, use it as the seed. */
  playId?: string | null;
  /** Override outcome — used by admin preview simulate controls. */
  outcome?: RelicOfferingOutcome;
  /** Controlled phase — used by admin preview to force reveal/done. */
  revealPhase?: RelicOfferingPhase;
  /** Called when a relic is dropped on the altar. */
  onDragComplete?: (input: {
    sceneId: string;
    moduleKey: string;
    interactionType: string;
    inputData: {
      selectedRelicId: string;
      visibleRelicIds: string[];
    };
  }) => void;
  /** Called when player resets the scene. */
  /** Show debug outlines for slots/altar. */
  showOutlines?: boolean;
}

const STORAGE_KEY_PREFIX = 'stg:relic-offering:selectedRelics';

function getStorageKey(playId?: string | null): string {
  if (playId) return `${STORAGE_KEY_PREFIX}:${playId}`;
  // Use a stable local date-based key so relics persist across refreshes
  const today = new Date().toISOString().slice(0, 10);
  return `${STORAGE_KEY_PREFIX}:${today}`;
}

/** Deterministic seeded selection of 3 relics from the 10-relic pool. */
function selectRelics(seed: string): RelicDef[] {
  // Simple deterministic hash → pick 3 unique indices
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const abs = Math.abs(hash);
  const indices: number[] = [];
  let cursor = abs;
  while (indices.length < 3) {
    const idx = cursor % RELIC_POOL.length;
    if (!indices.includes(idx)) indices.push(idx);
    cursor = Math.floor(cursor / RELIC_POOL.length) + idx + 1;
    if (cursor < 0) cursor = abs + indices.length;
  }
  return indices.map((i) => RELIC_POOL[i]);
}

function loadOrGenerateRelics(playId?: string | null): RelicDef[] {
  const key = getStorageKey(playId);
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const ids: string[] = JSON.parse(stored);
      const relics = ids
        .map((id) => RELIC_POOL.find((r) => r.id === id))
        .filter((r): r is RelicDef => r !== undefined);
      if (relics.length === 3) return relics;
    }
  } catch {
    // ignore parse errors
  }
  const selected = selectRelics(key);
  try {
    localStorage.setItem(key, JSON.stringify(selected.map((r) => r.id)));
  } catch {
    // ignore write errors
  }
  return selected;
}

function clearStoredRelics(playId?: string | null): void {
  const key = getStorageKey(playId);
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ── Keyframes (injected once) ────────────────────────────────────────────────

const KEYFRAMES_ID = 'relic-offering-keyframes';

function injectKeyframes(): void {
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
@keyframes ro-sky-loop {
  0% { transform: translateX(0); }
  100% { transform: translateX(-8%); }
}
@keyframes ro-altar-idle {
  0%,100% { opacity: 0.25; box-shadow: 0 0 20px 4px rgba(245,208,96,0.15); }
  50%     { opacity: 0.45; box-shadow: 0 0 30px 8px rgba(245,208,96,0.25); }
}
@keyframes ro-altar-dragover {
  0%,100% { opacity: 0.5; box-shadow: 0 0 28px 8px rgba(245,208,96,0.3); }
  50%     { opacity: 0.7; box-shadow: 0 0 40px 12px rgba(245,208,96,0.45); }
}
@keyframes ro-altar-accepted {
  0%   { opacity: 0.5; box-shadow: 0 0 24px 6px rgba(245,208,96,0.3); }
  40%  { opacity: 0.8; box-shadow: 0 0 50px 16px rgba(180,230,120,0.5); }
  100% { opacity: 0.6; box-shadow: 0 0 36px 10px rgba(180,230,120,0.35); }
}
@keyframes ro-altar-rejected {
  0%   { opacity: 0.4; box-shadow: 0 0 20px 4px rgba(245,208,96,0.2); }
  30%  { opacity: 0.7; box-shadow: 0 0 30px 8px rgba(200,40,40,0.4); }
  60%  { opacity: 0.3; box-shadow: 0 0 15px 3px rgba(120,20,20,0.3); }
  100% { opacity: 0.15; box-shadow: 0 0 8px 2px rgba(80,20,20,0.2); }
}
@keyframes ro-relic-shake {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(2px); }
}
@keyframes ro-relic-settle {
  0%   { transform: scale(1.1) translateY(-10px); opacity: 0.8; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}
@keyframes ro-dust-mote {
  0%   { transform: translateY(0) translateX(0); opacity: 0; }
  30%  { opacity: 0.4; }
  100% { transform: translateY(-40px) translateX(8px); opacity: 0; }
}
@keyframes ro-sacred-particle {
  0%   { transform: translateY(0) scale(1); opacity: 0.6; }
  100% { transform: translateY(-30px) scale(0.3); opacity: 0; }
}
@keyframes ro-smoke-rise {
  0%   { transform: translateY(0) scale(1); opacity: 0.5; }
  50%  { opacity: 0.3; }
  100% { transform: translateY(-25px) scale(1.5); opacity: 0; }
}
  `;
  document.head.appendChild(style);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function RelicOfferingScene({
  playId = null,
  outcome = null,
  revealPhase,
  onDragComplete,
  showOutlines = false,
}: RelicOfferingSceneProps): JSX.Element {
  const [relics, setRelics] = useState<RelicDef[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [overAltar, setOverAltar] = useState(false);
  const [droppedRelicId, setDroppedRelicId] = useState<string | null>(null);
  const [internalPhase, setInternalPhase] = useState<RelicOfferingPhase>('idle');
  const [internalOutcome, setInternalOutcome] = useState<RelicOfferingOutcome>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  // Inject keyframes on mount
  useEffect(() => {
    injectKeyframes();
  }, []);

  // Generate / load relics on mount
  useEffect(() => {
    const selected = loadOrGenerateRelics(playId);
    setRelics(selected);
  }, [playId]);

  // Sync external outcome/phase from admin preview
  useEffect(() => {
    if (revealPhase) setInternalPhase(revealPhase);
  }, [revealPhase]);

  useEffect(() => {
    if (outcome) setInternalOutcome(outcome);
  }, [outcome]);

  const phase = revealPhase ?? internalPhase;
  const currentOutcome = outcome ?? internalOutcome;

  // ── Drag handlers (pointer events for desktop + mobile) ───────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    if (phase !== 'idle' && phase !== 'dragging') return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingIdx(idx);
    setInternalPhase('dragging');
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      dragStartPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, [phase]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (draggingIdx === null) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragPos({ x, y });

    // Check if over altar
    const altar = RELIC_OFFERING_ALTAR_POSITION;
    const ax = (altar.x / 100) * rect.width;
    const ay = (altar.y / 100) * rect.height;
    const aw = (altar.width / 100) * rect.width;
    const ah = (altar.height / 100) * rect.height;
    setOverAltar(x >= ax && x <= ax + aw && y >= ay && y <= ay + ah);
  }, [draggingIdx]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (draggingIdx === null) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      setDraggingIdx(null);
      setDragPos(null);
      setOverAltar(false);
      return;
    }
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const altar = RELIC_OFFERING_ALTAR_POSITION;
    const ax = (altar.x / 100) * rect.width;
    const ay = (altar.y / 100) * rect.height;
    const aw = (altar.width / 100) * rect.width;
    const ah = (altar.height / 100) * rect.height;
    const isOnAltar = x >= ax && x <= ax + aw && y >= ay && y <= ay + ah;

    if (isOnAltar) {
      const selectedRelic = relics[draggingIdx];
      setDroppedRelicId(selectedRelic.id);
      setInternalPhase('resolving');
      onDragComplete?.({
        sceneId: 'relic-offering',
        moduleKey: 'relic-offering',
        interactionType: 'drag_complete',
        inputData: {
          selectedRelicId: selectedRelic.id,
          visibleRelicIds: relics.map((r) => r.id),
        },
      });
    }

    setDraggingIdx(null);
    setDragPos(null);
    setOverAltar(false);
  }, [draggingIdx, relics, onDragComplete]);

  // ── Render ───────────────────────────────────────────────────────────────

  const isResolving = phase === 'resolving';
  const isRevealing = phase === 'revealing';
  const isDone = phase === 'done';
  const isAccepted = isRevealing && currentOutcome === 'SURVIVE';
  const isRejected = isRevealing && currentOutcome === 'DIE';

  const altarAnim = isAccepted
    ? 'ro-altar-accepted 2s ease-out forwards'
    : isRejected
    ? 'ro-altar-rejected 2s ease-out forwards'
    : overAltar
    ? 'ro-altar-dragover 1s ease-in-out infinite'
    : 'ro-altar-idle 3s ease-in-out infinite';

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#070A08',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {/* 1. Sky — slow horizontal loop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '110%',
          height: '100%',
          backgroundImage: `url(${RELIC_OFFERING_BASE_ASSETS.sky})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'ro-sky-loop 50s linear infinite',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* 2. Background mountains */}
      <img
        src={RELIC_OFFERING_BASE_ASSETS.mountains}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 3. Behind relic holder */}
      <img
        src={RELIC_OFFERING_BASE_ASSETS.behindHolder}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* 4. Altar / drop target (invisible hit area + glow) */}
      <div
        style={{
          position: 'absolute',
          left: `${RELIC_OFFERING_ALTAR_POSITION.x}%`,
          top: `${RELIC_OFFERING_ALTAR_POSITION.y}%`,
          width: `${RELIC_OFFERING_ALTAR_POSITION.width}%`,
          height: `${RELIC_OFFERING_ALTAR_POSITION.height}%`,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 3,
          ...(showOutlines
            ? { border: '2px dashed rgba(245,208,96,0.5)', background: 'rgba(245,208,96,0.05)' }
            : {}),
        }}
      />
      {/* Altar glow effect */}
      <div
        style={{
          position: 'absolute',
          left: `${RELIC_OFFERING_ALTAR_POSITION.x}%`,
          top: `${RELIC_OFFERING_ALTAR_POSITION.y}%`,
          width: `${RELIC_OFFERING_ALTAR_POSITION.width}%`,
          height: `${RELIC_OFFERING_ALTAR_POSITION.height}%`,
          borderRadius: '50%',
          background: isAccepted
            ? 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(180,230,120,0.3) 0%, transparent 70%)'
            : isRejected
            ? 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(200,40,40,0.25) 0%, transparent 70%)'
            : 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(245,208,96,0.2) 0%, transparent 70%)',
          animation: altarAnim,
          pointerEvents: 'none',
          zIndex: 4,
        }}
      />

      {/* 5. Relics in slots */}
      {relics.map((relic, idx) => {
        const slot = RELIC_OFFERING_SLOT_POSITIONS[idx];
        const isDragging = draggingIdx === idx;
        const isDropped = droppedRelicId === relic.id && (isResolving || isRevealing || isDone);

        // If this relic was dropped on altar, render it at altar position
        if (isDropped) {
          return (
            <img
              key={relic.id}
              src={relic.assetPath}
              alt={relic.name}
              draggable={false}
              style={{
                position: 'absolute',
                left: `${RELIC_OFFERING_ALTAR_POSITION.x + RELIC_OFFERING_ALTAR_POSITION.width / 2 - slot.width / 2}%`,
                top: `${RELIC_OFFERING_ALTAR_POSITION.y + RELIC_OFFERING_ALTAR_POSITION.height / 2 - slot.height / 2}%`,
                width: `${slot.width}%`,
                height: `${slot.height}%`,
                objectFit: 'contain',
                pointerEvents: 'none',
                zIndex: 10,
                animation: isRejected
                  ? 'ro-relic-shake 0.4s ease-in-out 3'
                  : 'ro-relic-settle 0.5s ease-out forwards',
                opacity: isRejected ? 0.5 : 1,
                filter: isRejected ? 'brightness(0.4) saturate(0.5)' : 'none',
              }}
            />
          );
        }

        // If dragging, render at pointer position
        if (isDragging && dragPos && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          return (
            <img
              key={relic.id}
              src={relic.assetPath}
              alt={relic.name}
              draggable={false}
              style={{
                position: 'absolute',
                left: dragPos.x - (slot.width / 100) * rect.width / 2,
                top: dragPos.y - (slot.height / 100) * rect.height / 2,
                width: `${slot.width}%`,
                height: `${slot.height}%`,
                objectFit: 'contain',
                pointerEvents: 'none',
                zIndex: 50,
                opacity: 0.85,
                transform: 'scale(1.1)',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
              }}
            />
          );
        }

        // Normal slot rendering
        return (
          <img
            key={relic.id}
            src={relic.assetPath}
            alt={relic.name}
            draggable={false}
            onPointerDown={(e) => handlePointerDown(e, idx)}
            style={{
              position: 'absolute',
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: `${slot.width}%`,
              height: `${slot.height}%`,
              objectFit: 'contain',
              pointerEvents: phase === 'idle' || phase === 'dragging' ? 'auto' : 'none',
              zIndex: 10,
              cursor: phase === 'idle' ? 'grab' : 'default',
              touchAction: 'none',
              ...(showOutlines
                ? { border: '1px dashed rgba(255,154,48,0.4)' }
                : {}),
            }}
          />
        );
      })}

      {/* 6. Foreground */}
      <img
        src={RELIC_OFFERING_BASE_ASSETS.foreground}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
          zIndex: 20,
        }}
      />

      {/* ── Effects ───────────────────────────────────────────────────────── */}

      {/* Morning dust motes (subtle, always on) */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={`dust-${i}`}
          style={{
            position: 'absolute',
            left: `${10 + i * 15}%`,
            top: `${30 + (i % 3) * 10}%`,
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            background: 'rgba(255,240,200,0.3)',
            pointerEvents: 'none',
            zIndex: 15,
            animation: `ro-dust-mote ${4 + (i % 3)}s ease-in-out ${i * 0.7}s infinite`,
          }}
        />
      ))}

      {/* Accepted: sacred particles */}
      {isAccepted && Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`sacred-${i}`}
          style={{
            position: 'absolute',
            left: `${RELIC_OFFERING_ALTAR_POSITION.x + RELIC_OFFERING_ALTAR_POSITION.width / 2 + (i - 4) * 3}%`,
            top: `${RELIC_OFFERING_ALTAR_POSITION.y + RELIC_OFFERING_ALTAR_POSITION.height / 2}%`,
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: 'rgba(180,230,120,0.7)',
            boxShadow: '0 0 6px rgba(160,220,100,0.5)',
            pointerEvents: 'none',
            zIndex: 15,
            animation: `ro-sacred-particle ${1.5 + (i % 3) * 0.5}s ease-out ${i * 0.15}s forwards`,
          }}
        />
      ))}

      {/* Rejected: smoke */}
      {isRejected && Array.from({ length: 5 }).map((_, i) => (
        <div
          key={`smoke-${i}`}
          style={{
            position: 'absolute',
            left: `${RELIC_OFFERING_ALTAR_POSITION.x + RELIC_OFFERING_ALTAR_POSITION.width / 2 + (i - 2) * 4}%`,
            top: `${RELIC_OFFERING_ALTAR_POSITION.y + RELIC_OFFERING_ALTAR_POSITION.height / 2}%`,
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'rgba(60,20,20,0.4)',
            filter: 'blur(4px)',
            pointerEvents: 'none',
            zIndex: 15,
            animation: `ro-smoke-rise ${2 + (i % 2) * 0.5}s ease-out ${i * 0.2}s forwards`,
          }}
        />
      ))}

      {/* Instruction text */}
      {(phase === 'idle' || phase === 'dragging') && (
        <div
          style={{
            position: 'absolute',
            left: '10%',
            top: '85%',
            width: '80%',
            textAlign: 'center',
            fontSize: '11px',
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.6)',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            zIndex: 25,
          }}
        >
          Drag one relic to the altar.
        </div>
      )}

      {/* Resolving text */}
      {isResolving && (
        <div
          style={{
            position: 'absolute',
            left: '10%',
            top: '85%',
            width: '80%',
            textAlign: 'center',
            fontSize: '11px',
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '0.08em',
            color: 'rgba(245,208,96,0.7)',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            zIndex: 25,
          }}
        >
          The altar examines your offering…
        </div>
      )}
    </div>
  );
}

export { clearStoredRelics as clearRelicSelection };
