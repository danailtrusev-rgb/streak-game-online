// Scene Editor Canvas — Prompt 22
//
// Wraps SkullGateSceneRenderer with an editor overlay for:
//   - Direct canvas layer selection (click)
//   - Drag-to-move (pointer events)
//   - Resize handles (8-point, corner + edge)
//   - Editor-only outlines
//   - Keyboard nudge (handled by parent via ref)
//
// Only active in Editor mode. In Preview mode this component renders the renderer
// directly with no overlay.
//
// Does NOT touch SkullGateSceneRenderer or live gameplay code.

import { useRef, useCallback, useEffect } from 'react';
import type { SkullGateSceneConfig, SceneLayer } from '../../../lib/types';
import SkullGateSceneRenderer from '../../../components/game/SkullGateSceneRenderer';

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase   = 'idle' | 'selected' | 'revealing' | 'done';
type Outcome = 'SURVIVE' | 'DIE' | null;

type HandlePos =
  | 'nw' | 'n' | 'ne'
  | 'w'         | 'e'
  | 'sw' | 's' | 'se';

const HANDLE_POSITIONS: HandlePos[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];

const HANDLE_CURSOR: Record<HandlePos, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
  w:  'w-resize',                 e: 'e-resize',
  sw: 'sw-resize', s: 's-resize', se: 'se-resize',
};

// Anchor % for each handle (how far from top-left of bounding box)
const HANDLE_ANCHOR: Record<HandlePos, [number, number]> = {
  nw: [0, 0],   n: [50, 0],   ne: [100, 0],
  w:  [0, 50],                e:  [100, 50],
  sw: [0, 100], s: [50, 100], se: [100, 100],
};

export interface SceneEditorCanvasProps {
  // Scene data
  sceneConfig:      SkullGateSceneConfig;
  canvasMode:       'editor' | 'preview';
  showOutlines:     boolean;

  // Layer selection
  selectedLayerId:  string | null;
  onSelectLayer:    (id: string | null) => void;

  // Layer mutation (drag/resize produce updated layers)
  onUpdateLayer:    (updated: SceneLayer) => void;

  // Preview-mode-only props (passed through to renderer)
  previewChoice?:   string | null;
  previewOutcome?:  Outcome;
  previewPhase?:    Phase;
  onPreviewChoice?: (id: string) => void;
  onPreviewCta?:    () => void;
}

// ── Round to N decimal places ─────────────────────────────────────────────────

function r1(v: number): number { return Math.round(v * 10) / 10; }

// ── Canvas component ──────────────────────────────────────────────────────────

export default function SceneEditorCanvas({
  sceneConfig,
  canvasMode,
  showOutlines,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  previewChoice   = null,
  previewOutcome  = null,
  previewPhase    = 'idle',
  onPreviewChoice,
  onPreviewCta,
}: SceneEditorCanvasProps) {

  const containerRef = useRef<HTMLDivElement>(null);

  // Drag/resize state stored in refs to avoid re-render on every mousemove
  const dragState = useRef<{
    active:     boolean;
    type:       'move' | HandlePos;
    layerId:    string;
    // layer values at drag start
    startX:     number; startY:     number;
    startW:     number; startH:     number;
    // pointer position at drag start (% of canvas)
    pctX0:      number; pctY0:      number;
  } | null>(null);

  // Convert a DOM pointer event to canvas-relative percentages
  const toPct = useCallback((clientX: number, clientY: number): [number, number] => {
    const el = containerRef.current;
    if (!el) return [0, 0];
    const rect = el.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width)  * 100;
    const py = ((clientY - rect.top)  / rect.height) * 100;
    return [px, py];
  }, []);

  // Pointer move handler (global during drag)
  const onPointerMove = useCallback((e: PointerEvent) => {
    const ds = dragState.current;
    if (!ds?.active) return;

    const [px, py] = toPct(e.clientX, e.clientY);
    const dx = px - ds.pctX0;
    const dy = py - ds.pctY0;

    const layer = sceneConfig.layers.find((l) => l.id === ds.layerId);
    if (!layer) return;

    if (ds.type === 'move') {
      const MIN_VISIBLE = 5; // at least 5% on-canvas
      const newX = r1(Math.max(-(layer.width ?? 20) + MIN_VISIBLE, Math.min(100 - MIN_VISIBLE, ds.startX + dx)));
      const newY = r1(Math.max(-(layer.height ?? 20) + MIN_VISIBLE, Math.min(100 - MIN_VISIBLE, ds.startY + dy)));
      onUpdateLayer({ ...layer, x: newX, y: newY });
      return;
    }

    // Resize — compute new x/y/w/h from handle position
    const h = ds.type as HandlePos;
    let x = ds.startX, y = ds.startY, w = ds.startW, hh = ds.startH;

    if (h.includes('e')) { w  = Math.max(2, r1(ds.startW + dx)); }
    if (h.includes('w')) { x  = r1(ds.startX + dx); w = Math.max(2, r1(ds.startW - dx)); }
    if (h.includes('s')) { hh = Math.max(2, r1(ds.startH + dy)); }
    if (h.includes('n')) { y  = r1(ds.startY + dy); hh = Math.max(2, r1(ds.startH - dy)); }

    onUpdateLayer({ ...layer, x, y, width: w, height: hh });
  }, [sceneConfig.layers, onUpdateLayer, toPct]);

  const onPointerUp = useCallback(() => {
    if (!dragState.current?.active) return;
    dragState.current = null;
    if (containerRef.current) containerRef.current.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Attach/detach global pointer listeners
  useEffect(() => {
    window.addEventListener('pointermove',   onPointerMove);
    window.addEventListener('pointerup',     onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove',   onPointerMove);
      window.removeEventListener('pointerup',     onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  // ── Keyboard nudge (arrow keys) ─────────────────────────────────────────────
  useEffect(() => {
    if (canvasMode !== 'editor' || !selectedLayerId) return;

    const onKey = (e: KeyboardEvent) => {
      const dirs: Record<string, [number, number]> = {
        ArrowLeft:  [-1, 0],
        ArrowRight: [ 1, 0],
        ArrowUp:    [ 0,-1],
        ArrowDown:  [ 0, 1],
      };
      if (!dirs[e.key]) return;

      // Only nudge if not typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      e.preventDefault();
      const step = e.shiftKey ? 2 : 0.5;
      const [dx, dy] = dirs[e.key];

      const layer = sceneConfig.layers.find((l) => l.id === selectedLayerId);
      if (!layer || layer.locked) return;

      onUpdateLayer({
        ...layer,
        x: r1((layer.x ?? 0) + dx * step),
        y: r1((layer.y ?? 0) + dy * step),
      });
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canvasMode, selectedLayerId, sceneConfig.layers, onUpdateLayer]);

  // ── Start drag/resize from a layer hit zone ─────────────────────────────────
  const startMove = useCallback((
    e: React.PointerEvent,
    layer: SceneLayer,
  ) => {
    if (canvasMode !== 'editor' || layer.locked) return;
    e.stopPropagation();
    const [px, py] = toPct(e.clientX, e.clientY);
    dragState.current = {
      active: true, type: 'move', layerId: layer.id,
      startX: layer.x ?? 0, startY: layer.y ?? 0,
      startW: layer.width ?? 0, startH: layer.height ?? 0,
      pctX0: px, pctY0: py,
    };
    document.body.style.userSelect = 'none';
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
  }, [canvasMode, toPct]);

  const startResize = useCallback((
    e: React.PointerEvent,
    layer: SceneLayer,
    handle: HandlePos,
  ) => {
    if (canvasMode !== 'editor' || layer.locked) return;
    e.stopPropagation();
    e.preventDefault();
    const [px, py] = toPct(e.clientX, e.clientY);
    dragState.current = {
      active: true, type: handle, layerId: layer.id,
      startX: layer.x ?? 0, startY: layer.y ?? 0,
      startW: layer.width ?? 0, startH: layer.height ?? 0,
      pctX0: px, pctY0: py,
    };
    document.body.style.userSelect = 'none';
  }, [canvasMode, toPct]);

  // ── Layer click to select ─────────────────────────────────────────────────
  const handleLayerClick = useCallback((
    e: React.PointerEvent,
    layer: SceneLayer,
  ) => {
    if (canvasMode !== 'editor') return;
    e.stopPropagation();
    // Only select if pointer hasn't moved much (not a drag)
    const ds = dragState.current;
    if (ds?.active) return;
    onSelectLayer(layer.id);
  }, [canvasMode, onSelectLayer]);

  // Click on canvas background deselects
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (canvasMode !== 'editor') return;
    if ((e.target as HTMLElement) === containerRef.current) {
      onSelectLayer(null);
    }
  }, [canvasMode, onSelectLayer]);

  // ── Sorted layers for overlay hit zones ──────────────────────────────────
  // Sort highest zIndex last so they receive pointer events first (CSS stacking)
  const sortedForHit = [...sceneConfig.layers]
    .filter((l) => l.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  const selectedLayer = sceneConfig.layers.find((l) => l.id === selectedLayerId) ?? null;

  if (canvasMode === 'preview') {
    return (
      <SkullGateSceneRenderer
        sceneConfig={sceneConfig}
        mode="player"
        selectedChoiceId={previewChoice}
        resultOutcome={previewOutcome}
        revealPhase={previewPhase}
        onChoiceSelect={onPreviewChoice}
        onCta={onPreviewCta}
        showEditorOutlines={false}
      />
    );
  }

  // ── Editor mode: renderer + overlay ─────────────────────────────────────
  return (
    <div
      ref={containerRef}
      onClick={handleCanvasClick}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      {/* Scene renderer — pointer events off so overlay handles all interaction */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <SkullGateSceneRenderer
          sceneConfig={sceneConfig}
          mode="preview"
          selectedChoiceId={null}
          resultOutcome={null}
          revealPhase="idle"
          showEditorOutlines={false}
        />
      </div>

      {/* ── Editor overlay: hit zones + outlines ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {sortedForHit.map((layer) => {
          const isSelected = layer.id === selectedLayerId;
          const isLocked   = !!layer.locked;
          const x  = layer.x ?? 0;
          const y  = layer.y ?? 0;
          const w  = layer.width  ?? 100;
          const h  = layer.height ?? 100;

          return (
            <div
              key={layer.id}
              style={{
                position:  'absolute',
                left:      `${x}%`,
                top:       `${y}%`,
                width:     `${w}%`,
                height:    `${h}%`,
                pointerEvents: 'all',
                cursor:    isLocked ? 'default' : isSelected ? 'grab' : 'pointer',
                boxSizing: 'border-box',
                // Outline: selected = solid amber, others = dashed only if showOutlines
                outline: isSelected
                  ? '2px solid rgba(245,208,96,0.85)'
                  : showOutlines
                  ? '1px dashed rgba(80,160,100,0.35)'
                  : 'none',
                outlineOffset: isSelected ? '-1px' : '0px',
              }}
              onPointerDown={(e) => {
                onSelectLayer(layer.id);
                startMove(e, layer);
              }}
              onPointerUp={(e) => handleLayerClick(e, layer)}
            >
              {/* Selected layer: name label + resize handles */}
              {isSelected && (
                <>
                  {/* Name badge */}
                  <div style={{
                    position:     'absolute',
                    top:          -18,
                    left:         0,
                    background:   'rgba(245,208,96,0.9)',
                    color:        '#0B0F0C',
                    fontSize:     9,
                    fontFamily:   "'Inter', system-ui, sans-serif",
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding:      '1px 5px',
                    whiteSpace:   'nowrap',
                    pointerEvents:'none',
                    lineHeight:   1.6,
                    maxWidth:     120,
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {layer.name}
                  </div>

                  {/* Resize handles */}
                  {!isLocked && HANDLE_POSITIONS.map((handle) => {
                    const [hx, hy] = HANDLE_ANCHOR[handle];
                    const isCorner = handle.length === 2;
                    const SIZE = isCorner ? 8 : 7;
                    return (
                      <div
                        key={handle}
                        onPointerDown={(e) => { e.stopPropagation(); startResize(e, layer, handle); }}
                        style={{
                          position:     'absolute',
                          left:         `${hx}%`,
                          top:          `${hy}%`,
                          width:         SIZE,
                          height:        SIZE,
                          transform:    'translate(-50%, -50%)',
                          background:   isCorner ? 'rgba(245,208,96,1)' : 'rgba(255,255,255,0.85)',
                          border:       '1px solid rgba(0,0,0,0.45)',
                          borderRadius: isCorner ? 1 : '50%',
                          cursor:       HANDLE_CURSOR[handle],
                          pointerEvents:'all',
                          zIndex:       200,
                          // Suppress outline from parent on this element
                          outline: 'none',
                        }}
                      />
                    );
                  })}

                  {/* Lock indicator */}
                  {isLocked && (
                    <div style={{
                      position:  'absolute',
                      top:       '50%',
                      left:      '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize:  12,
                      color:     'rgba(255,154,48,0.7)',
                      pointerEvents: 'none',
                    }}>
                      &#128274;
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Canvas click-to-deselect catch-all (lowest z) */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: -1 }}
        onClick={() => onSelectLayer(null)}
      />
    </div>
  );
}
