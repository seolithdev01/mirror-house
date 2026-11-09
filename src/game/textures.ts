// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { floorAccent, TIER_ONE_PALETTE } from './palette';

const CELL_PX = 64;
const LATTICE = 6;

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

export function makeFloorTexture(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = CELL_PX * LATTICE;
  canvas.height = CELL_PX * LATTICE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  for (let gy = 0; gy < LATTICE; gy++)
    for (let gx = 0; gx < LATTICE; gx++) {
      ctx.fillStyle = hex(floorAccent(gx, gy));
      ctx.fillRect(gx * CELL_PX, gy * CELL_PX, CELL_PX, CELL_PX);
      ctx.strokeStyle = hex(TIER_ONE_PALETTE.void);
      ctx.lineWidth = 2;
      ctx.strokeRect(gx * CELL_PX + 1, gy * CELL_PX + 1, CELL_PX - 2, CELL_PX - 2);
    }
  return canvas;
}

export function makeWallTexture(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, hex(TIER_ONE_PALETTE.wallTop));
  grad.addColorStop(1, hex(TIER_ONE_PALETTE.wallBottom));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = hex(TIER_ONE_PALETTE.gold); // wainscot band
  ctx.fillRect(0, 208, 128, 6);
  ctx.fillStyle = 'rgba(11,16,38,0.25)';
  for (let x = 16; x < 128; x += 32) ctx.fillRect(x, 0, 3, 256); // faint panel joints
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
