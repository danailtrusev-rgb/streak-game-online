// Scene Editor Canvas
//
// Wraps SkullGateSceneRenderer with an editor overlay for:
//   - Direct canvas layer selection (click)
//   - Drag-to-move (pointer events, hardened drag system)
//   - Resize handles (8-point, corner + edge)
//   - Anchor/unit-aware drag & resize via bounding-box approach
//   - Editor-only outlines + keyboard nudge

import { useRef, useCallback, useEffect } from 'react';
import type { SkullGateSceneConfig, SceneLayer } from '../../../lib/types';
import { resolveLayerCSS, layerToBBox, bboxToLayer } from '../../../lib/layerLayout';
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

// Anchor % for each handle (0–100, relative to bounding box)
const HANDLE_ANCHOR: Record<HandlePos, [number, number]> = {
  nw: [0, 0],   n: [50, 0],   ne: [100, 0],
  w:  [0, 50],                e:  [100, 50],
  sw: [0, 100], s: [50, 100], se: [100, 100],
};

export interface SceneEditorCanvasProps {
  sceneConfig:      SkullGateSceneConfig;
  canvasMode:       'editor' | 'preview';
  showOutlines:     boolean;
  selectedLayerId:  string | null;
  onSelectLayer:    (id: string | null) => void;
  onUpdateLayer:    (updated: SceneLayer) => void;
  previewChoice?:   string | null;
  previewOutcome?:  Outcome;
  previewPhase?:    Phase;
  onPreviewChoice?: (id: string) => void;
  onPreviewCta?:    () => void;
}

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

  // ── Stable refs — updated every render, used inside stable callbacks ─────────
  const layersRef        = useRef(sceneConfig.layers);
  layersRef.current      = sceneConfig.layers;
  const onUpdateLayerRef = useRef(onUpdateLayer);
  onUpdateLayerRef.current = onUpdateLayer;
  const selectedLayerIdRef = useRef(selectedLayerId);
  selectedLayerIdRef.current = selectedLayerId;
  const canvasModeRef    = useRef(canvasMode);
  canvasModeRef.current  = canvasMode;

  // ── Drag/resize state ─────────────────────────────────────────────────────────
  type XA = 'left' | 'center' | 'right';
  type YA = 'top'  | 'middle' | 'bottom';
  type U  = 'pct'  | 'px';

  const dragState = useRef<{
    active:      boolean;
    type:        'move' | HandlePos;
    layerId:     string;
    pointerId:   number;
    captureEl:   Element | null;
    // Pointer start position (% of canvas)
    pctX0:       number; pctY0: number;
    // Effective bounding box at drag start (px, relative to container)
    effL0: number; effT0: number; effR0: number; effB0: number;
    // Container size at drag start (px)
    cw: number; ch: number;
    // Layer layout settings (cached to avoid reading from ref during drag)
    xAnchor: XA; yAnchor: YA; xUnit: U; yUnit: U;
  } | null>(null);

  // ── Convert DOM pointer event → canvas-relative % ────────────────────────────
  const toPct = useCallback((clientX: number, clientY: number): [number, number] => {
    const el = containerRef.current;
    if (!el) return [0, 0];
    const rect = el.getBoundingClientRect();
    return [
      ((clientX - rect.left) / rect.width)  * 100,
      ((clientY - rect.top)  / rect.height) * 100,
    ];
  }, []);

  // ── Centralized drag cleanup — safe to call multiple times ───────────────────
  const endDrag = useCallback(() => {
    const ds = dragState.current;
    if (!ds) return;
    if (ds.captureEl) {
      try { ds.captureEl.releasePointerCapture(ds.pointerId); } catch (_) { /* already released */ }
    }
    dragState.current = null;
    if (containerRef.current) containerRef.current.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // ── Pointer move — stable (no layer deps) ─────────────────────────────────────
  const onPointerMove = useCallback((e: PointerEvent) => {
    const ds = dragState.current;
    if (!ds?.active) return;

    // If button was released outside our view (missed pointerup), end immediately
    if (e.buttons === 0) { endDrag(); return; }

    // Ignore events from a different pointer (e.g. second touch)
    if (e.pointerId !== ds.pointerId) return;

    const layer = layersRef.current.find((l) => l.id === ds.layerId);
    if (!layer) return;

    const [pctX, pctY] = toPct(e.clientX, e.clientY);
    const dxPx = (pctX - ds.pctX0) * ds.cw / 100;
    const dyPx = (pctY - ds.pctY0) * ds.ch / 100;

    if (ds.type === 'move') {
      const wPx = ds.effR0 - ds.effL0;
      const hPx = ds.effB0 - ds.effT0;
      const minVis = Math.min(ds.cw, ds.ch) * 0.05;
      const newL = Math.max(-wPx + minVis, Math.min(ds.cw - minVis, ds.effL0 + dxPx));
      const newT = Math.max(-hPx + minVis, Math.min(ds.ch - minVis, ds.effT0 + dyPx));
      const { x, y } = bboxToLayer(
        newL, newT, newL + wPx, newT + hPx,
        ds.cw, ds.ch, ds.xAnchor, ds.yAnchor, ds.xUnit, ds.yUnit,
      );
      onUpdateLayerRef.current({ ...layer, x, y });
      return;
    }

    // Resize
    const minSzW = ds.cw * 0.02;
    const minSzH = ds.ch * 0.02;
    let l = ds.effL0, t = ds.effT0, r = ds.effR0, b = ds.effB0;

    const h = ds.type as HandlePos;
    if (h.includes('e')) r = Math.max(l + minSzW, ds.effR0 + dxPx);
    if (h.includes('w')) l = Math.min(r - minSzW, ds.effL0 + dxPx);
    if (h.includes('s')) b = Math.max(t + minSzH, ds.effB0 + dyPx);
    if (h.includes('n')) t = Math.min(b - minSzH, ds.effT0 + dyPx);

    const { x, y, width, height } = bboxToLayer(
      l, t, r, b,
      ds.cw, ds.ch, ds.xAnchor, ds.yAnchor, ds.xUnit, ds.yUnit,
    );
    onUpdateLayerRef.current({ ...layer, x, y, width, height });
  }, [toPct, endDrag]);

  // ── Attach global drag-ending listeners once ──────────────────────────────────
  useEffect(() => {
    const onVisChange = () => { if (document.hidden) endDrag(); };
    const onKey = (e: KeyboardEvent) => {
      // Escape cancels active drag; other keys handled by nudge handler
      if (e.key === 'Escape' && dragState.current?.active) endDrag();
    };

    window.addEventListener('pointermove',        onPointerMove);
    window.addEventListener('pointerup',          endDrag);
    window.addEventListener('pointercancel',      endDrag);
    window.addEventListener('mouseup',            endDrag); // fallback for missed pointerup
    window.addEventListener('blur',               endDrag);
    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('keydown',            onKey);

    return () => {
      window.removeEventListener('pointermove',        onPointerMove);
      window.removeEventListener('pointerup',          endDrag);
      window.removeEventListener('pointercancel',      endDrag);
      window.removeEventListener('mouseup',            endDrag);
      window.removeEventListener('blur',               endDrag);
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('keydown',            onKey);
    };
  }, [onPointerMove, endDrag]);

  // ── Keyboard nudge ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (canvasModeRef.current !== 'editor') return;
      // Don't nudge while dragging or when Escape is used to cancel
      if (dragState.current?.active) return;
      const id = selectedLayerIdRef.current;
      if (!id) return;

      const dirs: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        ArrowUp:   [0, -1], ArrowDown:  [0, 1],
      };
      if (!dirs[e.key]) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      e.preventDefault();
      const step = e.shiftKey ? 2 : 0.5;
      const [dx, dy] = dirs[e.key];

      const layer = layersRef.current.find((l) => l.id === id);
      if (!layer || layer.locked) return;

      const xUnit = layer.xUnit ?? 'pct';
      const yUnit = layer.yUnit ?? 'pct';
      const container = containerRef.current;
      const cw = container?.getBoundingClientRect().width  ?? 280;
      const ch = container?.getBoundingClientRect().height ?? 497;
      const dxU = xUnit === 'px' ? (dx * step * cw / 100) : (dx * step);
      const dyU = yUnit === 'px' ? (dy * step * ch / 100) : (dy * step);

      const round1 = (v: number) => Math.round(v * 10) / 10;
      onUpdateLayerRef.current({
        ...layer,
        x: round1((layer.x ?? 0) + dxU),
        y: round1((layer.y ?? 0) + dyU),
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // stable — reads from refs

  // ── Start move ────────────────────────────────────────────────────────────────
  const startMove = useCallback((e: React.PointerEvent, layer: SceneLayer) => {
    if (canvasMode !== 'editor' || layer.locked) return;
    e.stopPropagation();
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cw = rect.width, ch = rect.height;
    const bbox = layerToBBox(layer, cw, ch);
    const [px, py] = toPct(e.clientX, e.clientY);
    const captureEl = e.currentTarget as Element;
    dragState.current = {
      active: true, type: 'move', layerId: layer.id,
      pointerId: e.pointerId,
      captureEl,
      pctX0: px, pctY0: py,
      effL0: bbox.l, effT0: bbox.t, effR0: bbox.r, effB0: bbox.b,
      cw, ch,
      xAnchor: (layer.xAnchor ?? 'left') as XA,
      yAnchor: (layer.yAnchor ?? 'top')  as YA,
      xUnit:   (layer.xUnit   ?? 'pct')  as U,
      yUnit:   (layer.yUnit   ?? 'pct')  as U,
    };
    document.body.style.userSelect = 'none';
    container.style.cursor = 'grabbing';
    try { captureEl.setPointerCapture(e.pointerId); } catch (_) { /* no-op */ }
  }, [canvasMode, toPct]);

  // ── Start resize ──────────────────────────────────────────────────────────────
  const startResize = useCallback((
    e: React.PointerEvent, layer: SceneLayer, handle: HandlePos,
  ) => {
    if (canvasMode !== 'editor' || layer.locked) return;
    e.stopPropagation();
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cw = rect.width, ch = rect.height;
    const bbox = layerToBBox(layer, cw, ch);
    const [px, py] = toPct(e.clientX, e.clientY);
    const captureEl = e.currentTarget as Element;
    dragState.current = {
      active: true, type: handle, layerId: layer.id,
      pointerId: e.pointerId,
      captureEl,
      pctX0: px, pctY0: py,
      effL0: bbox.l, effT0: bbox.t, effR0: bbox.r, effB0: bbox.b,
      cw, ch,
      xAnchor: (layer.xAnchor ?? 'left') as XA,
      yAnchor: (layer.yAnchor ?? 'top')  as YA,
      xUnit:   (layer.xUnit   ?? 'pct')  as U,
      yUnit:   (layer.yUnit   ?? 'pct')  as U,
    };
    document.body.style.userSelect = 'none';
    container.style.cursor = HANDLE_CURSOR[handle];
    try { captureEl.setPointerCapture(e.pointerId); } catch (_) { /* no-op */ }
  }, [canvasMode, toPct]);

  // ── Layer click to select (not drag) ────────────────────────────────────────
  const handleLayerClick = useCallback((e: React.PointerEvent, layer: SceneLayer) => {
    if (canvasMode !== 'editor') return;
    e.stopPropagation();
    if (dragState.current?.active) return;
    onSelectLayer(layer.id);
  }, [canvasMode, onSelectLayer]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (canvasMode !== 'editor') return;
    if ((e.target as HTMLElement) === containerRef.current) onSelectLayer(null);
  }, [canvasMode, onSelectLayer]);

  // ── Sorted layers for overlay ────────────────────────────────────────────────
  const sortedForHit = [...sceneConfig.layers]
    .filter((l) => l.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

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

  // ── Editor mode: renderer + overlay ──────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      onClick={handleCanvasClick}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      {/* Scene renderer — pointer events off so overlay handles interaction */}
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

      {/* Editor overlay: hit zones + outlines */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {sortedForHit.map((layer) => {
          const isSelected = layer.id === selectedLayerId;
          const isLocked   = !!layer.locked;
          const pos = resolveLayerCSS(layer);

          return (
            <div
              key={layer.id}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{
                position:      'absolute',
                left:           pos.left,
                top:            pos.top,
                width:          pos.width,
                height:         pos.height,
                pointerEvents: 'all',
                touchAction:   'none',
                cursor:         isLocked ? 'default' : isSelected ? 'grab' : 'pointer',
                boxSizing:     'border-box',
                outline:        isSelected
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
              {isSelected && (
                <>
                  {/* Name badge */}
                  <div style={{
                    position:      'absolute',
                    top:            -18,
                    left:           0,
                    background:    'rgba(245,208,96,0.9)',
                    color:         '#0B0F0C',
                    fontSize:       9,
                    fontFamily:    "'Inter', system-ui, sans-serif",
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding:       '1px 5px',
                    whiteSpace:    'nowrap',
                    pointerEvents: 'none',
                    lineHeight:     1.6,
                    maxWidth:       120,
                    overflow:      'hidden',
                    textOverflow:  'ellipsis',
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
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
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
                          touchAction:  'none',
                          zIndex:       200,
                          outline:      'none',
                        }}
                      />
                    );
                  })}

                  {/* Lock indicator */}
                  {isLocked && (
                    <div style={{
                      position:      'absolute',
                      top:           '50%',
                      left:          '50%',
                      transform:     'translate(-50%, -50%)',
                      fontSize:       12,
                      color:         'rgba(255,154,48,0.7)',
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

      {/* Click-to-deselect catch-all */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: -1 }}
        onClick={() => onSelectLayer(null)}
      />
    </div>
  );
}
