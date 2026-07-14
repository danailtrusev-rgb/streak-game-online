import type { SceneLayer } from './types';

/**
 * Resolves a layer's anchor + unit settings to absolute CSS position values.
 * Defaults to left/top anchor with % units when fields are absent (backward-compatible).
 *
 * Anchors:
 *   xAnchor='left'   → x is distance from left edge of container (default)
 *   xAnchor='center' → x is offset from container center (0 = centered)
 *   xAnchor='right'  → x is distance from right edge of container
 *
 *   yAnchor='top'    → y is distance from top edge (default)
 *   yAnchor='middle' → y is offset from container middle (0 = centered)
 *   yAnchor='bottom' → y is distance from bottom edge
 *
 * Units: 'pct' (%) or 'px'. Width/height are always stored in %.
 */
export function resolveLayerCSS(layer: SceneLayer): {
  left: string; top: string; width: string; height: string;
} {
  const xAnchor = layer.xAnchor ?? 'left';
  const yAnchor = layer.yAnchor ?? 'top';
  const xUnit   = layer.xUnit   ?? 'pct';
  const yUnit   = layer.yUnit   ?? 'pct';
  const x = layer.x      ?? 0;
  const y = layer.y      ?? 0;
  const w = layer.width  ?? 100;
  const h = layer.height ?? 100;

  const xOff = xUnit === 'pct' ? `${x}%` : `${x}px`;
  const yOff = yUnit === 'pct' ? `${y}%` : `${y}px`;
  const wStr = `${w}%`;
  const hStr = `${h}%`;

  let left: string;
  switch (xAnchor) {
    case 'left':   left = xOff; break;
    case 'center': left = `calc(50% - ${wStr} / 2 + ${xOff})`; break;
    case 'right':  left = `calc(100% - ${wStr} - ${xOff})`; break;
    default:       left = xOff;
  }

  let top: string;
  switch (yAnchor) {
    case 'top':    top = yOff; break;
    case 'middle': top = `calc(50% - ${hStr} / 2 + ${yOff})`; break;
    case 'bottom': top = `calc(100% - ${hStr} - ${yOff})`; break;
    default:       top = yOff;
  }

  return { left, top, width: wStr, height: hStr };
}

// ── Bounding-box helpers (used by canvas editor drag/resize) ──────────────────

type XAnchor = 'left' | 'center' | 'right';
type YAnchor = 'top'  | 'middle' | 'bottom';
type Unit    = 'pct'  | 'px';

/** Compute the effective bounding box in px from layer settings + container size. */
export function layerToBBox(
  layer: SceneLayer,
  cw: number,
  ch: number,
): { l: number; t: number; r: number; b: number } {
  const xAnchor = (layer.xAnchor ?? 'left') as XAnchor;
  const yAnchor = (layer.yAnchor ?? 'top')  as YAnchor;
  const xUnit   = (layer.xUnit   ?? 'pct')  as Unit;
  const yUnit   = (layer.yUnit   ?? 'pct')  as Unit;
  const x  = layer.x      ?? 0;
  const y  = layer.y      ?? 0;
  const w  = layer.width  ?? 100;
  const h  = layer.height ?? 100;

  const xPx = xUnit === 'pct' ? (x  * cw / 100) : x;
  const yPx = yUnit === 'pct' ? (y  * ch / 100) : y;
  const wPx = w * cw / 100;
  const hPx = h * ch / 100;

  let l: number;
  switch (xAnchor) {
    case 'left':   l = xPx;                       break;
    case 'center': l = cw / 2 + xPx - wPx / 2;   break;
    case 'right':  l = cw - wPx - xPx;            break;
    default:       l = xPx;
  }

  let t: number;
  switch (yAnchor) {
    case 'top':    t = yPx;                        break;
    case 'middle': t = ch / 2 + yPx - hPx / 2;   break;
    case 'bottom': t = ch - hPx - yPx;            break;
    default:       t = yPx;
  }

  return { l, t, r: l + wPx, b: t + hPx };
}

/** Convert a bounding box (px) back to layer x/y/width/height in the layer's native units. */
export function bboxToLayer(
  l: number, t: number, r: number, b: number,
  cw: number, ch: number,
  xAnchor: XAnchor, yAnchor: YAnchor,
  xUnit: Unit, yUnit: Unit,
): { x: number; y: number; width: number; height: number } {
  const wPx = r - l;
  const hPx = b - t;

  let xPx: number;
  switch (xAnchor) {
    case 'left':   xPx = l;                    break;
    case 'center': xPx = (l + r) / 2 - cw / 2; break;
    case 'right':  xPx = cw - r;               break;
    default:       xPx = l;
  }

  let yPx: number;
  switch (yAnchor) {
    case 'top':    yPx = t;                    break;
    case 'middle': yPx = (t + b) / 2 - ch / 2; break;
    case 'bottom': yPx = ch - b;               break;
    default:       yPx = t;
  }

  const round1 = (v: number) => Math.round(v * 10) / 10;
  return {
    x:      round1(xUnit === 'pct' ? (xPx / cw * 100) : xPx),
    y:      round1(yUnit === 'pct' ? (yPx / ch * 100) : yPx),
    width:  round1(wPx / cw * 100),
    height: round1(hPx / ch * 100),
  };
}
