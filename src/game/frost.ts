// SPDX-License-Identifier: Apache-2.0
//
// Frost Lantern (M2): the core verb. Pure state-in/state-out — no three.js.
// Consumes T2's deterministic MirrorRef list; main.ts binds runtime entries
// to rendered meshes (RT hero mirrors or cheap mirror meshes) by id.
import {
  BREATH_RECHARGE_PER_S,
  FOG_COST,
  FOG_DURATION_MS,
  FOG_RANGE,
  FROST_CONE_COS,
} from '../engine/constants';
import type { MirrorKind, MirrorRef } from './floorObjects';
import type { PlayerState } from './player';

export { FOG_COST };

export interface MirrorRuntime {
  id: number;
  /** Kept from the MirrorRef so applyFog can tell permanent beacons from timed standing mirrors. */
  kind: MirrorKind;
  foggedUntil: number | null;
  captured: boolean;
  cracked: boolean;
}

export function initMirrorRuntime(mirrors: MirrorRef[]): MirrorRuntime[] {
  return mirrors.map((m) => ({
    id: m.id,
    kind: m.kind,
    foggedUntil: null,
    captured: false,
    cracked: false,
  }));
}

/**
 * The mirror the lantern would fog right now: nearest `standing`|`beacon`
 * mirror within FOG_RANGE and the 60° cone around the player's heading.
 * (`true`/`silvered` are never fog targets; fog state is deliberately not
 * consulted — this is a pure function of geometry, so re-fogging an
 * already-fogged mirror simply refreshes its timer.)
 */
export function fogTarget(mirrors: MirrorRef[], player: PlayerState): MirrorRef | null {
  const fx = Math.sin(player.heading);
  const fz = -Math.cos(player.heading); // heading 0 = north (-y); world z ↔ player y
  let best: MirrorRef | null = null;
  let bestDist = Infinity;
  for (const m of mirrors) {
    if (m.kind !== 'standing' && m.kind !== 'beacon') continue;
    const dx = m.x - player.x;
    const dz = m.z - player.y;
    const dist = Math.hypot(dx, dz);
    if (dist > FOG_RANGE || dist === 0) continue;
    const nx = dx / dist;
    const nz = dz / dist;
    const dot = fx * nx + fz * nz;
    const lateral = Math.abs(fx * nz - fz * nx); // |sin(bearing off heading)|
    // 60° cone = ±30°: ahead of the player, and the lateral sine within
    // sin(30°) = cos(60°) = FROST_CONE_COS. The dot > 0 half also rejects
    // mirrors behind the player whose lateral sine alone would qualify
    // (sin(150°) = sin(30°)).
    if (dot <= 0 || lateral > FROST_CONE_COS) continue;
    if (dist < bestDist) {
      best = m;
      bestDist = dist;
    }
  }
  return best;
}

/** Beacon fog is permanent (captured); standing fog lasts FOG_DURATION_MS from `now`. */
export function applyFog(rt: MirrorRuntime[], id: number, now: number): void {
  const m = rt.find((r) => r.id === id);
  if (!m) return;
  if (m.kind === 'beacon') {
    m.captured = true;
    m.foggedUntil = null;
  } else {
    m.foggedUntil = now + FOG_DURATION_MS;
  }
}

/**
 * A mirror's single sight/display state — the one place that decides whether
 * glass is see-through, frosted, or permanently captured. Precedence is
 * meaningful: a captured beacon never clears, an unexpired standing fog is
 * `fogged`, everything else is `clear`.
 *
 * `cracked` is ORTHOGONAL damage, deliberately outside this union: a crack
 * tints the glass but changes neither what it shows nor what can see through
 * it. A floor reset clears everything — cracks, fogs, and captures alike
 * (`resetFloor` re-runs `initMirrorRuntime`).
 */
export type MirrorVisual = 'clear' | 'fogged' | 'captured';

export function mirrorVisual(m: MirrorRuntime, now: number): MirrorVisual {
  if (m.captured) return 'captured';
  if (m.foggedUntil !== null && now <= m.foggedUntil) return 'fogged';
  return 'clear';
}

/** Sight test — one derivation, shared by echoes, passages and the renderer. */
export function isFogged(m: MirrorRuntime, now: number): boolean {
  return mirrorVisual(m, now) !== 'clear';
}

/** Spend FOG_COST / recharge BREATH_RECHARGE_PER_S, clamped to 0..1. */
export function updateBreath(breath: number, dtS: number, spent: boolean): number {
  const next = breath - (spent ? FOG_COST : 0) + dtS * BREATH_RECHARGE_PER_S;
  return Math.min(1, Math.max(0, next));
}
