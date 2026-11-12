// SPDX-License-Identifier: Apache-2.0
//
// Frost Lantern (M2): the core verb. Pure state-in/state-out — no three.js.
// Consumes T2's deterministic MirrorRef list; main.ts binds runtime entries
// to rendered meshes (RT hero mirrors or cheap mirror meshes) by id.
import {
  BREATH_RECHARGE_PER_S,
  FOG_COST,
  FOG_RANGE,
  FROST_CONE_COS,
} from '../engine/constants';
import type { FloorGrid } from '../engine/grid';
import { losClear } from '../engine/los';
import type { MirrorKind, MirrorRef } from './floorObjects';
import type { PlayerState } from './player';
import { eyeBlind } from './waterLevel';

export { FOG_COST };

export interface MirrorRuntime {
  id: number;
  /** Kept from the MirrorRef so applyFog can tell permanent beacons from timed standing mirrors. */
  kind: MirrorKind;
  foggedUntil: number | null;
  captured: boolean;
  cracked: boolean;
  /** T8 — the Frozen Atrium's spawn state: the fogable glass
   *  (standing/portrait/distort — never beacons, never the true pair) arrives
   *  ENCASED. A frozen pane is eye-blind like fogged and renders frost-white;
   *  frost on ice THAWS it instead of fogging (applyFog routes by state).
   *  Always false off tier 8 — tiers ≤ 7 spawn byte-identical. */
  frozen: boolean;
  /** T8 — thawed by the lantern's breath: the ice is gone for the attempt (no
   *  timer — permanent until a reset re-freezes the floor), the pane is a live
   *  eye again AND a warden lure (echo.ts lureAt). Frost on a thawed pane
   *  cold-fogs it (COLD_FOG_MS) and clears this flag. */
  thawed: boolean;
}

export interface MirrorRuntimeOpts {
  /** T8 — tier-8 spawn: freeze the fogable glass at init. Defaults to false
   *  (every pre-T8 call site and test is byte-identical). */
  frozenSpawn?: boolean;
}

/** The kinds the Atrium freezes: the fogable, lie-able glass. Beacons stay
 *  live (the capture objective cannot start encased) and the true pair stays
 *  honest (the step-through is never blind). */
const FREEZABLE: ReadonlySet<MirrorKind> = new Set(['standing', 'portrait', 'distort']);

export function initMirrorRuntime(
  mirrors: MirrorRef[],
  opts: MirrorRuntimeOpts = {},
): MirrorRuntime[] {
  const frozenSpawn = opts.frozenSpawn === true;
  return mirrors.map((m) => ({
    id: m.id,
    kind: m.kind,
    foggedUntil: null,
    captured: false,
    cracked: false,
    frozen: frozenSpawn && FREEZABLE.has(m.kind),
    thawed: false,
  }));
}

/**
 * The mirror the lantern would fog right now: nearest `standing`|`beacon`|
 * `portrait`|`distort` mirror within FOG_RANGE and the 60° cone around the
 * player's heading, with clear grid LOS from the player to the mirror center —
 * frost does not pass through walls. (`true`/`silvered` are never fog
 * targets; T2's portraits fog exactly like standing glass; T4's distorting
 * mirrors fog like standing too — fog one and it stops lying about where you
 * stand; fog state is deliberately not consulted — this is a pure function
 * of geometry, so re-fogging an already-fogged mirror simply refreshes its
 * timer.)
 */
export function fogTarget(
  mirrors: MirrorRef[],
  player: PlayerState,
  grid: FloorGrid,
): MirrorRef | null {
  const fx = Math.sin(player.heading);
  const fz = -Math.cos(player.heading); // heading 0 = north (-y); world z ↔ player y
  let best: MirrorRef | null = null;
  let bestDist = Infinity;
  for (const m of mirrors) {
    if (
      m.kind !== 'standing' &&
      m.kind !== 'beacon' &&
      m.kind !== 'portrait' &&
      m.kind !== 'distort'
    )
      continue;
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
    // A wall between the player and the glass blocks the throw — the lantern
    // reaches only what the player can see (same DDA LOS the echo senses use).
    if (!losClear(grid, player.x, player.y, m.x, m.z)) continue;
    if (dist < bestDist) {
      best = m;
      bestDist = dist;
    }
  }
  return best;
}

/** Beacon fog is permanent (captured); every other fogable glass — standing,
 *  portraits, T4's distort — lasts `durationMs` from `now` (a distort mirror
 *  is NOT a beacon: fogging it restores the truth for the duration, banks
 *  nothing, and the pane can be re-fogged when the lie returns).
 *  T6/T2 — the caller owns the duration (main passes
 *  `fogDurationMs(campaign.floor)`: the base 25 s on the cool floors, 12.5 s
 *  in the Furnace); this module stays floor-agnostic and heat-blind. Beacons
 *  ignore it — a capture is forever whatever the air is doing.
 *  T8 — the inversion routes by the pane's STATE: frost on a FROZEN pane
 *  THAWS it (frozen=false, thawed=true, foggedUntil=null — the caller passed
 *  a duration, but a thaw is permanent for the attempt and never reads it;
 *  the lure emission lives with the caller, who owns the echoes). Frost on a
 *  THAWED pane cold-fogs it — the caller passes COLD_FOG_MS — and clears the
 *  thaw: the eye closes, the lure ends. Re-frosting plain fogged glass keeps
 *  the old refresh semantics (tiers ≤ 7 byte-identical: nothing there is
 *  ever frozen or thawed). */
export function applyFog(rt: MirrorRuntime[], id: number, now: number, durationMs: number): void {
  const m = rt.find((r) => r.id === id);
  if (!m) return;
  if (m.kind === 'beacon') {
    m.captured = true;
    m.foggedUntil = null;
    return;
  }
  if (m.frozen) {
    // the breath is warmth on ice: the pane wakes for the rest of the attempt
    m.frozen = false;
    m.thawed = true;
    m.foggedUntil = null;
    return;
  }
  m.thawed = false; // fog over a thawed pane: the eye closes with the glass
  m.foggedUntil = now + durationMs;
}

/**
 * A mirror's single sight/display state — the one place that decides whether
 * glass is see-through, frosted, encased in ice, or permanently captured.
 * Precedence is meaningful: a captured beacon never clears, a frozen pane
 * outranks any stale fog timer (the Atrium's spawn state — live play never
 * overlaps them, the pin keeps the one derivation honest), an unexpired
 * standing fog is `fogged`, everything else is `clear`. A THAWED pane reads
 * `clear` — that is the point of the thaw: the glass is honest glass again,
 * a live eye (the `thawed` flag rides alongside for the lure; it is not a
 * visual state).
 *
 * `cracked` is ORTHOGONAL damage, deliberately outside this union: a crack
 * tints the glass but changes neither what it shows nor what can see through
 * it. A floor reset clears everything — cracks, fogs, and captures alike
 * (`resetFloor` re-runs `initMirrorRuntime`; on tier 8 it re-freezes too).
 */
export type MirrorVisual = 'clear' | 'fogged' | 'captured' | 'frozen';

export function mirrorVisual(m: MirrorRuntime, now: number): MirrorVisual {
  if (m.captured) return 'captured';
  if (m.frozen) return 'frozen';
  if (m.foggedUntil !== null && now <= m.foggedUntil) return 'fogged';
  return 'clear';
}

/** Sight test — one derivation, shared by echoes, passages and the renderer.
 *  T8: frozen counts blind exactly like fogged (the Atrium starts eye-closed
 *  — ice sees nothing), and a THAWED pane is SIGHTED (it reads clear: thawing
 *  is how the house gets its eyes back — and how the lure draws the wardens). */
export function isFogged(m: MirrorRuntime, now: number): boolean {
  return mirrorVisual(m, now) !== 'clear';
}

/** T5/T3 — the flood's other blindness, re-exported from waterLevel.ts so
 *  every water consumer reads ONE threshold: true while the halls stand
 *  above WATER_EYE_OFF_M (0.9 m), at which point echo.sensesPlayer skips the
 *  standing glass (standing/beacon/portrait/distort — `true` mirrors and the
 *  pools keep their sight). FOG IS UNTOUCHED: the lantern still fogs whatever
 *  dry tops remain above the waterline — a submerged pane can still be
 *  frosted and a beacon still captured; the water only shuts the SEEING. */
export const mirrorEyeBlind = eyeBlind;

/** Spend FOG_COST / recharge BREATH_RECHARGE_PER_S, clamped to 0..1. */
export function updateBreath(breath: number, dtS: number, spent: boolean): number {
  const next = breath - (spent ? FOG_COST : 0) + dtS * BREATH_RECHARGE_PER_S;
  return Math.min(1, Math.max(0, next));
}
