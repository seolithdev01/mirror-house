// SPDX-License-Identifier: Apache-2.0
//
// House state (M2/T6): the palace's anger, sprint-cracks, the beacon gate on
// the exit, and shard scoring. Pure state-in/state-out — no three.js.
// HouseState is immutable (applyCrack returns a new state); MirrorRuntime
// carries the once-per-mirror `cracked` flag and is mutated in place, the
// same contract as frost's applyFog.
import {
  ANGER_MAX,
  CRACK_ANGER,
  CRACK_RANGE,
  FROST_CONE_COS,
  SHARD_PERFECT,
  SHARD_STUCK,
} from '../engine/constants';
import type { MirrorRef } from './floorObjects';
import type { MirrorRuntime } from './frost';
import type { PlayerState } from './player';

export interface HouseState {
  anger: number;
  attempts: number;
  /** Shards pending for this attempt — beacon captures bank here and are only
   *  awarded (with the clear bonus) when the floor is cleared; a fail resets them. */
  shards: number;
  crackedAny: boolean;
}

export function initHouseState(): HouseState {
  return { anger: 0, attempts: 0, shards: 0, crackedAny: false };
}

/** Crack one mirror: +CRACK_ANGER anger, once per mirror (the runtime's
 *  `cracked` flag guards re-cracks — the same mirror never angers twice).
 *  Returns the state unchanged when the id is unknown or already cracked. */
export function applyCrack(h: HouseState, rt: MirrorRuntime[], id: number): HouseState {
  const m = rt.find((r) => r.id === id);
  if (!m || m.cracked) return h;
  m.cracked = true;
  return { ...h, anger: h.anger + CRACK_ANGER, crackedAny: true };
}

/** The house collapses — fail the floor — at ANGER_MAX anger. */
export function isCollapse(h: HouseState): boolean {
  return h.anger >= ANGER_MAX;
}

/**
 * The mirror a sprinting player would crack right now: nearest
 * `standing`|`beacon` mirror within CRACK_RANGE and the 60° heading cone
 * (same geometry as frost's fogTarget — a body-check into the glass), not
 * already cracked. Walking (`sprinting` false) never cracks anything.
 */
export function crackTarget(
  mirrors: MirrorRef[],
  rt: MirrorRuntime[],
  player: PlayerState,
  sprinting: boolean,
): MirrorRef | null {
  if (!sprinting) return null;
  const fx = Math.sin(player.heading);
  const fz = -Math.cos(player.heading); // heading 0 = north (-y); world z ↔ player y
  let best: MirrorRef | null = null;
  let bestDist = Infinity;
  for (const m of mirrors) {
    if (m.kind !== 'standing' && m.kind !== 'beacon') continue;
    const r = rt.find((x) => x.id === m.id);
    if (!r || r.cracked) continue;
    const dx = m.x - player.x;
    const dz = m.z - player.y;
    const dist = Math.hypot(dx, dz);
    if (dist > CRACK_RANGE || dist === 0) continue;
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

/** Beacon capture tally straight off the runtime. */
export function beaconsCaptured(
  mirrors: MirrorRef[],
  rt: MirrorRuntime[],
): { captured: number; total: number } {
  let captured = 0;
  let total = 0;
  for (const m of mirrors) {
    if (m.kind !== 'beacon') continue;
    total++;
    if (rt.find((r) => r.id === m.id)?.captured) captured++;
  }
  return { captured, total };
}

/** The stair door opens only when every beacon is frosted over (vacuously
 *  true when the floor has none — degenerate grids still let you leave). */
export function exitUnlocked(mirrors: MirrorRef[], rt: MirrorRuntime[]): boolean {
  const { captured, total } = beaconsCaptured(mirrors, rt);
  return captured === total;
}

/** Shards banked on clear: the no-crack perfect bonus plus a bounty for every
 *  echo lured into confusion at least once this run. */
export function shardsForClear(h: HouseState, stuckEnemies: number): number {
  return (h.crackedAny ? 0 : SHARD_PERFECT) + SHARD_STUCK * stuckEnemies;
}
