// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { floorAccent, TIER_ONE_PALETTE, type TierPalette } from './palette';
import { createRng } from '../engine/rng';

const CELL_PX = 64;
const LATTICE = 6;

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

/** rgba() string of a palette color at an alpha — the panel joints below use
 *  it to tint with the palette's own void (tier-1: 0x0b1026 → the exact
 *  historic 'rgba(11,16,38,0.25)', so tier-1 output stays byte-identical). */
function rgba(n: number, alpha: number): string {
  return `rgba(${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff},${alpha})`;
}

export function makeFloorTexture(palette: TierPalette = TIER_ONE_PALETTE): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = CELL_PX * LATTICE;
  canvas.height = CELL_PX * LATTICE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  for (let gy = 0; gy < LATTICE; gy++)
    for (let gx = 0; gx < LATTICE; gx++) {
      ctx.fillStyle = hex(floorAccent(gx, gy, palette));
      ctx.fillRect(gx * CELL_PX, gy * CELL_PX, CELL_PX, CELL_PX);
      ctx.strokeStyle = hex(palette.void);
      ctx.lineWidth = 2;
      ctx.strokeRect(gx * CELL_PX + 1, gy * CELL_PX + 1, CELL_PX - 2, CELL_PX - 2);
    }
  return canvas;
}

export function makeWallTexture(palette: TierPalette = TIER_ONE_PALETTE): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, hex(palette.wallTop));
  grad.addColorStop(1, hex(palette.wallBottom));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = hex(palette.gold); // wainscot band
  ctx.fillRect(0, 208, 128, 6);
  ctx.fillStyle = rgba(palette.void, 0.25);
  for (let x = 16; x < 128; x += 32) ctx.fillRect(x, 0, 3, 256); // faint panel joints
  return canvas;
}

// T2 — the ancestor portraits. The PURE half is portraitSpec: the
// deterministic per-id shape parameters drawn from `createRng('portrait:'+id)`,
// so the node suite can pin determinism without a canvas. The browser half is
// makePortraitCanvas: amber-tinted glass with a dim robed figure — a few
// arcs/ellipses — painted strictly inside the spec's bounds.
export interface PortraitSpec {
  /** Head center + radius, in 0..1 canvas space (x across, y down). */
  headX: number;
  headY: number;
  headR: number;
  /** Robe half-width at the hem + hem height (0..1 of the canvas). */
  robeW: number;
  robeH: number;
  /** Figure lean: 0 = none, 1 = the canvas-max tilt. */
  lean: number;
  /** Hood depth: 0 = bare head, 1 = deep shroud. */
  hood: number;
  /** The amber glass tint behind the figure (pinned to the tier-2 accent). */
  glass: number;
}

/** The one amber every portrait glass wears — the tier-2 accent (Task 3's
 *  palette will land on the same hex; the portrait pins it now). */
export const PORTRAIT_GLASS = 0xc98a3d;

/** Deterministic ancestor parameters for mirror `id` — same id, same figure. */
export function portraitSpec(id: number): PortraitSpec {
  const rng = createRng(`portrait:${id}`);
  return {
    // head near the upper third, robe swallowing the lower half — a portrait
    headX: 0.38 + rng.next() * 0.24,
    headY: 0.24 + rng.next() * 0.08,
    headR: 0.07 + rng.next() * 0.05,
    robeW: 0.18 + rng.next() * 0.1,
    robeH: 0.34 + rng.next() * 0.1,
    lean: rng.next() * 0.5,
    hood: rng.next(),
    glass: PORTRAIT_GLASS,
  };
}

/** Paint the ancestor on her amber glass. Node-guarded like every other
 *  texture factory: no document → null (the caller falls back to plain
 *  amber-tinted material). */
export function makePortraitCanvas(spec: PortraitSpec): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const W = 192;
  const H = 307; // the 1.5 × 2.4 m plane's aspect
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Amber glass — a soft hotspot low in the pane (behind the robe, not the
  // face) so the figure reads as one backlit silhouette; dark at the edges.
  const glass = ctx.createRadialGradient(W / 2, H * 0.62, W * 0.12, W / 2, H * 0.62, H * 0.78);
  glass.addColorStop(0, 'rgba(0, 0, 0, 0)');
  glass.addColorStop(1, 'rgba(30, 18, 6, 0.55)');
  ctx.fillStyle = hex(spec.glass);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = glass;
  ctx.fillRect(0, 0, W, H);

  // The ancestor: a dark robed figure — hood arc, head ellipse, robe body
  // (two arcs flaring to the hem), all in near-black over the amber.
  const hx = spec.headX * W;
  const hy = spec.headY * H;
  const hr = spec.headR * W;
  const hemY = (1 - spec.robeH * 0.35) * H;
  const shoulderY = hy + hr * 2.4;
  const hemHalf = spec.robeW * W;
  ctx.save();
  ctx.translate(hx, shoulderY); // lean pivots at the shoulders
  ctx.rotate((spec.lean - 0.25) * 0.12); // ±~1.7° — a sway, not a stagger
  ctx.translate(-hx, -shoulderY);
  ctx.fillStyle = 'rgba(16, 11, 8, 0.88)';
  // robe body: ellipse from shoulders to hem
  ctx.beginPath();
  ctx.ellipse(hx, (shoulderY + hemY) / 2, hemHalf, (hemY - shoulderY) / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // hood: arc over the head, deepening with spec.hood
  ctx.beginPath();
  ctx.arc(hx, hy + hr * 0.4, hr * (1.5 + spec.hood * 0.5), Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  ctx.fill();
  // head: the dim oval inside the hood
  ctx.beginPath();
  ctx.ellipse(hx, hy, hr, hr * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // sleeves folded before her: two shallow arcs across the robe
  ctx.strokeStyle = 'rgba(16, 11, 8, 0.88)';
  ctx.lineWidth = hr * 0.8;
  ctx.beginPath();
  ctx.arc(hx, hemY - (hemY - shoulderY) * 0.28, hemHalf * 0.55, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.restore();

  // Frame vignette — the glass dims into its edges.
  const frame = ctx.createLinearGradient(0, 0, 0, H);
  frame.addColorStop(0, 'rgba(20, 12, 4, 0.35)');
  frame.addColorStop(0.2, 'rgba(20, 12, 4, 0)');
  frame.addColorStop(0.85, 'rgba(20, 12, 4, 0)');
  frame.addColorStop(1, 'rgba(20, 12, 4, 0.4)');
  ctx.fillStyle = frame;
  ctx.fillRect(0, 0, W, H);
  return canvas;
}

/** T3 — the standing water's static sheen: a radial gradient, still-water
 *  highlight at the center deepening to a rim. Painted ONCE and never
 *  animated — the reduced-flash rule bars shimmer; the only change a pool
 *  ever knows is the ripple's one-time dim (main.ts drops the material's
 *  opacity, the texture itself holds). Node-guarded like every texture
 *  factory: no document → null (the caller falls back to flat teal). */
export function makeWaterCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const sheen = ctx.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S / 2);
  sheen.addColorStop(0, '#8fd9c9'); // the still highlight at the center
  sheen.addColorStop(0.5, '#3fae9a'); // water-teal body (the tier-3 accent)
  sheen.addColorStop(1, '#2b7d6e'); // the deeper rim
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, S, S);
  return canvas;
}

export function canvasTexture(
  canvas: HTMLCanvasElement | null,
  repeatX: number,
  repeatY: number,
): THREE.CanvasTexture | null {
  if (!canvas) return null;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
