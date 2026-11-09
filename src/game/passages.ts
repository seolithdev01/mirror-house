// SPDX-License-Identifier: Apache-2.0
//
// Passages (M2/T7): true-mirror step-through pairs and silvered push-doors.
// Pure geometry + grid logic — no three.js. main.ts binds these to the HUD
// hint, the Space teleport, and the E door slide.
import { DOOR_SLIDE_MS, FROST_CONE_COS, PASSAGE_RANGE, PLAYER_RADIUS } from '../engine/constants';
import type { FloorGrid } from '../engine/grid';
import type { MirrorRef } from './floorObjects';
import type { PlayerState } from './player';

export { PASSAGE_RANGE };

/** Wall clearance (m) every legal standing/teleport position keeps — the same
 *  margin positionIsLegal enforces, so emergence points are legal by
 *  construction and the check in tryTeleport stays a pure safety net (it
 *  rejects hand-placed pairs whose normal points into their own wall). */
export const PASSAGE_CLEARANCE = PLAYER_RADIUS + 0.05;

/**
 * True when (x, y) keeps PASSAGE_CLEARANCE from every wall plane in the 3x3
 * cell neighborhood — the same planes movePlayer clamps against, so anything
 * legal here can be stood on without clipping through glass.
 */
export function positionIsLegal(grid: FloorGrid, x: number, y: number): boolean {
  const r = PASSAGE_CLEARANCE;
  const cell = grid.cellAt(x, y);
  for (const s of grid.wallSegmentsNearCells(cell.x, cell.y)) {
    const vertical = s.x1 === s.x2; // vertical walls constrain x, horizontal y
    const wallPos = vertical ? s.x1 : s.y1;
    const a = vertical ? x : y; // signed distance to the wall plane
    const b = vertical ? y : x; // position along the wall
    const lo = vertical ? Math.min(s.y1, s.y2) : Math.min(s.x1, s.x2);
    const hi = vertical ? Math.max(s.y1, s.y2) : Math.max(s.x1, s.x2);
    if (b + r <= lo || b - r >= hi) continue; // runs parallel, no overlap
    if (Math.abs(a - wallPos) < r) return false;
  }
  return true;
}

export interface TeleportResult {
  x: number;
  y: number;
  heading: number;
  /** Id of the mirror stepped INTO (the one in range), for HUD/debug. */
  usedId: number;
}

/**
 * The step-through a Space press would perform: the nearest `true` mirror
 * within PASSAGE_RANGE teleports the player to its pair — emerging one
 * PASSAGE_CLEARANCE step out of the pair's glass along its plane normal
 * (sin rotY, cos rotY), facing the same direction (heading 0 = north = −y ⇒
 * heading = atan2(nx, −nz)). Null when nothing is in range, the pair is
 * missing, or the emergence point would be illegal.
 */
export function tryTeleport(
  mirrors: MirrorRef[],
  player: PlayerState,
  grid: FloorGrid,
): TeleportResult | null {
  let target: MirrorRef | null = null;
  let best = Infinity;
  for (const m of mirrors) {
    if (m.kind !== 'true') continue;
    const d = Math.hypot(m.x - player.x, m.z - player.y);
    if (d <= PASSAGE_RANGE && d < best) {
      target = m;
      best = d;
    }
  }
  if (target === null || target.pairId === null) return null;
  const pair = mirrors.find((m) => m.id === target.pairId);
  if (!pair) return null;

  const nx = Math.sin(pair.rotY);
  const nz = Math.cos(pair.rotY);
  const x = pair.x + nx * PASSAGE_CLEARANCE;
  const y = pair.z + nz * PASSAGE_CLEARANCE;
  if (!positionIsLegal(grid, x, y)) return null;
  return { x, y, heading: Math.atan2(nx, -nz), usedId: target.id };
}

/**
 * The silvered door an E press would push: the nearest `silvered` mirror
 * within PASSAGE_RANGE and inside the 60° heading cone (same geometry as the
 * frost lantern's fogTarget — you push what you face). main.ts filters out
 * already-opened doors before calling, so one push is final.
 */
export function tryPushDoor(mirrors: MirrorRef[], player: PlayerState): MirrorRef | null {
  const fx = Math.sin(player.heading);
  const fz = -Math.cos(player.heading); // heading 0 = north (-y); world z ↔ player y
  let best: MirrorRef | null = null;
  let bestDist = Infinity;
  for (const m of mirrors) {
    if (m.kind !== 'silvered') continue;
    const dx = m.x - player.x;
    const dz = m.z - player.y;
    const dist = Math.hypot(dx, dz);
    if (dist > PASSAGE_RANGE || dist === 0) continue;
    const nx = dx / dist;
    const nz = dz / dist;
    const dot = fx * nx + fz * nz;
    const lateral = Math.abs(fx * nz - fz * nx); // |sin(bearing off heading)|
    if (dot <= 0 || lateral > FROST_CONE_COS) continue; // behind or outside ±30°
    if (dist < bestDist) {
      best = m;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Silvered door lifecycle — the only owner of "is this door still pushable".
 * One-way by design: `closed → opening → open`, and `open` is terminal. A
 * floor reset does not re-close a door (the house remembers its own secrets),
 * so this state outlives GamePhase transitions.
 */
export type DoorPhase = 'closed' | 'opening' | 'open';

export interface DoorAnim {
  id: number;
  phase: DoorPhase;
  /** Slide progress 0..1 — meaningful only while `opening`. */
  t: number;
}

export function createDoor(id: number): DoorAnim {
  return { id, phase: 'closed', t: 0 };
}

/** One push: closed → opening. Any other phase is unchanged (one push per door). */
export function beginDoorSlide(d: DoorAnim): DoorAnim {
  return d.phase === 'closed' ? { id: d.id, phase: 'opening', t: 0 } : d;
}

/** Advance an opening door by dtS; reaches `open` at t ≥ 1. Other phases are unchanged. */
export function stepDoor(d: DoorAnim, dtS: number): DoorAnim {
  if (d.phase !== 'opening') return d;
  const t = d.t + (dtS * 1000) / DOOR_SLIDE_MS;
  return t >= 1 ? { id: d.id, phase: 'open', t: 1 } : { id: d.id, phase: 'opening', t };
}
