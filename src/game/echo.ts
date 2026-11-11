// SPDX-License-Identifier: Apache-2.0
//
// Echoes: hollow reflections that see only through mirrors. Pure state
// machine — updateEcho returns a new state and never mutates its input.
// Sense model: ∃ mirror (standing|beacon|true, unfogged) with clear LOS from
// BOTH the echo and the player to the mirror center, both within SENSE_RANGE.
// T3: standing water pools are eyes too — the same both-LOS + SENSE_RANGE
// shape, kind-independent of the mirror list (a pool is not a MirrorRef, so
// frost never touches it; only a ripple blinds it — rippleState consults).
import {
  CHASE_MEMORY_MS,
  CONFUSE_FOGGED_R,
  CONFUSE_UNFOGGED_R,
  ECHO_SPEED,
  SENSE_INTERVAL_MS,
  SENSE_RANGE,
} from '../engine/constants';
import type { CellIndex, FloorGrid } from '../engine/grid';
import { losClear } from '../engine/los';
import { buildFlowField, flowStep } from '../engine/flowField';
import { isFogged, type MirrorRuntime } from './frost';
import type { MirrorRef } from './floorObjects';
import { lureTarget, type DecoyState } from './decoy';
import { rippleState, type WaterRuntime } from './water';
import type { PlayerState } from './player';
import { loudestAt, type NoiseEvent } from './noise';

export interface EchoState {
  id: number;
  x: number;
  y: number;
  heading: number;
  mode: 'patrol' | 'chase' | 'confused';
  anchorIdx: number;
  target: CellIndex | null;
  field: Int32Array | null;
  lastSensedCell: CellIndex | null;
  loseMemoryAt: number | null;
  nextSenseAt: number;
  stuckAwarded: boolean; // T6 awards SHARD_STUCK once per echo lured into a trap
  /** T7/T2 — how this echo knows the world: 'glass' reads the mirrors (and
   *  the pools, and the lure) exactly as tiers 1–6 always did; 'ears' reads
   *  the noise ring alone — the Library's wardens are blind, and the mirror
   *  eye logic never runs for them at all. Set at spawn from the floor's
   *  tier; defaults to 'glass' so every earlier tier spawns byte-identical. */
  sense: 'glass' | 'ears';
}

/** The runtime entry for a mirror ref (runtime arrays are id-keyed copies of
 *  the ref list — match by id so test fixtures with arbitrary ids work). */
function runtimeFor(rt: MirrorRuntime[], m: MirrorRef): MirrorRuntime | null {
  return rt.find((r) => r.id === m.id) ?? null;
}

/** Mirrors an Echo can see through — silvered glass scatters, true glass
 *  reflects. T2: the ancestor portraits are eyes exactly like standing glass.
 *  T4: the distorting mirrors are eyes too — fogable glass like standing;
 *  whatever they show is the caller's `apparent` position (the lie). */
function sensesThrough(m: MirrorRef): boolean {
  return (
    m.kind === 'standing' ||
    m.kind === 'beacon' ||
    m.kind === 'true' ||
    m.kind === 'portrait' ||
    m.kind === 'distort'
  );
}

export function initEchoes(
  spawns: Array<{ x: number; y: number }>,
  grid: FloorGrid,
  anchors: Array<{ x: number; y: number }>,
  now: number,
  /** T7/T2 — the floor's sense: 'ears' on the Whisper Library (tier 7,
   *  mirror-sight gone), 'glass' everywhere else. Default keeps the tiers
   *  1–6 call sites (and their tests) byte-identical. */
  sense: EchoState['sense'] = 'glass',
): EchoState[] {
  return spawns.map((s, i) => ({
    id: i,
    x: s.x,
    y: s.y,
    heading: 0,
    mode: 'patrol',
    anchorIdx: anchors.length > 0 ? i % anchors.length : 0,
    target: null,
    field: null,
    lastSensedCell: null,
    loseMemoryAt: null,
    nextSenseAt: now,
    stuckAwarded: false,
    sense,
  }));
}

export function sensesPlayer(
  echo: EchoState,
  player: PlayerState,
  mirrors: MirrorRef[],
  rt: MirrorRuntime[],
  water: ReadonlyArray<WaterRuntime>,
  grid: FloorGrid,
  now: number,
  /** T4/T3 — where the house says the player stands (distort.ts
   *  apparentPlayer): the range check + the player-side LOS read the
   *  APPARENT position, so a displaced player is sensed (or hidden) where
   *  they appear. Defaults to the true position — tiers 1–3 unchanged. */
  apparent: Pick<PlayerState, 'x' | 'y'> = player,
  /** T5/T2 — the decoy lure: when the nearest unshattered copy stands closer
   *  to THIS echo than the player does, the copy is "the player position"
   *  for both the range check and the second LOS. Defaults to none — tiers
   *  1–4 byte-identical. */
  decoys: ReadonlyArray<DecoyState> = [],
  /** T5/T3 — the flood's blindness (frost.mirrorEyeBlind of the live water
   *  level): while true, standing/beacon/portrait/distort glass stops being
   *  eyes — drowned panes see nothing. TRUE mirrors stay eyes (the floor's
   *  honest pair) and the pools keep their ripple-only blindness. Defaults
   *  to false — tiers 1–4 byte-identical. */
  mirrorEyeOff = false,
): boolean {
  const target = lureTarget(echo, apparent, decoys);
  for (const m of mirrors) {
    if (!sensesThrough(m)) continue;
    // T5/T3 — the waterline test: the drownable glass (everything but the
    // true pair) is blind while the flood stands above its eyes.
    if (mirrorEyeOff && m.kind !== 'true') continue;
    const r = runtimeFor(rt, m);
    if (!r || isFogged(r, now)) continue;
    const echoDist = Math.hypot(m.x - echo.x, m.z - echo.y);
    const playerDist = Math.hypot(m.x - target.x, m.z - target.y);
    if (echoDist > SENSE_RANGE || playerDist > SENSE_RANGE) continue;
    if (!losClear(grid, echo.x, echo.y, m.x, m.z)) continue;
    if (!losClear(grid, target.x, target.y, m.x, m.z)) continue;
    return true; // both stand in this mirror's reflection
  }
  // T3 — the water eyes: still pools see exactly like clear glass (both LOS,
  // SENSE_RANGE). No fog state exists for water — the ripple is the only
  // blindness, and it is the player's verb (see water.ts). T4: they read the
  // apparent position like every other eye. T5: the lure target, same as the
  // glass above.
  for (const w of water) {
    if (rippleState(w.rippledAt, now)) continue; // rippled shut
    const echoDist = Math.hypot(w.x - echo.x, w.y - echo.y);
    const playerDist = Math.hypot(w.x - target.x, w.y - target.y);
    if (echoDist > SENSE_RANGE || playerDist > SENSE_RANGE) continue;
    if (!losClear(grid, echo.x, echo.y, w.x, w.y)) continue;
    if (!losClear(grid, target.x, target.y, w.x, w.y)) continue;
    return true; // both stand in the pool's reflection
  }
  return false;
}

export function updateEcho(
  echo: EchoState,
  player: PlayerState,
  mirrors: MirrorRef[],
  rt: MirrorRuntime[],
  water: ReadonlyArray<WaterRuntime>,
  grid: FloorGrid,
  anchors: Array<{ x: number; y: number }>,
  now: number,
  dtS: number,
  /** T4/T3 — the apparent position (distort.ts apparentPlayer): the sense
   *  check reads it AND the remembered chase cell is where the player
   *  APPEARS — the echoes hunt the house's lie, not the player. Defaults to
   *  the true position — tiers 1–3 unchanged. */
  apparent: Pick<PlayerState, 'x' | 'y'> = player,
  /** T5/T2 — the decoy lure (see sensesPlayer): the sense check reads the
   *  nearer of this position and the nearest unshattered copy, and the
   *  remembered chase cell is WHERE THAT BAIT STANDS — a copy that lured the
   *  echo is chased to its own cell (and keeps walking; the memory lapses
   *  and the echo gives up). Defaults to none — tiers 1–4 unchanged. */
  decoys: ReadonlyArray<DecoyState> = [],
  /** T5/T3 — the flood's blindness (see sensesPlayer): drowned glass is no
   *  eye at all, so it counts NEITHER as fogged NOR as a seeing eye in the
   *  confusion census below. Defaults to false — tiers 1–4 byte-identical. */
  mirrorEyeOff = false,
  /** T7/T2 — the noise ring: the ONLY sense an 'ears' echo has. 'glass'
   *  echoes never read it (noise-immune, the tiers 1–6 pin); an ears echo
   *  hears the nearest audible ping and chases where it came from. Defaults
   *  to empty — every pre-T7 call site is byte-identical. */
  noise: readonly NoiseEvent[] = [],
): EchoState {
  // Confused override: ≥2 frosted eyes within CONFUSE_FOGGED_R and no clear
  // eye within CONFUSE_UNFOGGED_R — the echo stalls and slowly spins.
  // T5/T3 — a water-blind pane is not an eye in any direction: skipped whole.
  // T7/T2 — 'ears' echoes have no glass to fog: the census (like every mirror
  // eye read) is skipped whole for them; confusion is a glass-only state.
  if (echo.sense === 'glass') {
    let foggedNear = 0;
    let unfoggedNear = 0;
    for (const m of mirrors) {
      if (!sensesThrough(m)) continue;
      if (mirrorEyeOff && m.kind !== 'true') continue;
      const r = runtimeFor(rt, m);
      if (!r) continue;
      const d = Math.hypot(m.x - echo.x, m.z - echo.y);
      if (isFogged(r, now)) {
        if (d <= CONFUSE_FOGGED_R) foggedNear++;
      } else if (d <= CONFUSE_UNFOGGED_R) {
        unfoggedNear++;
      }
    }
    if (foggedNear >= 2 && unfoggedNear === 0) {
      return {
        ...echo,
        mode: 'confused',
        target: null,
        field: null,
        heading: echo.heading + 2 * dtS,
      };
    }
  }

  // Sense check, at most once per SENSE_INTERVAL_MS per echo. T4/T3: the
  // check AND the remembered cell read the apparent position — the echo
  // chases where the player appears (the chase target below is
  // lastSensedCell, so the lie carries all the way to the pathing).
  // T5/T2: the same for the lure — when a nearer copy is the bait, both the
  // check and the remembered cell read the COPY (lureTarget), so the echo
  // chases the decoy's cell.
  // T7/T2 — 'ears' echoes skip ALL of that: their one sense is the ring.
  // On the same cadence, the nearest audible ping (loudestAt) becomes the
  // remembered cell with the same CHASE_MEMORY_MS; a quiet ring leaves them
  // to patrol. Memory/SENSE_INTERVAL semantics are unchanged.
  let { lastSensedCell, loseMemoryAt, nextSenseAt } = echo;
  if (echo.sense === 'ears') {
    if (now >= nextSenseAt) {
      nextSenseAt = now + SENSE_INTERVAL_MS;
      const heard = loudestAt(noise, echo.x, echo.y);
      if (heard !== null) {
        lastSensedCell = grid.cellAt(heard.x, heard.y);
        loseMemoryAt = now + CHASE_MEMORY_MS;
      }
    }
  } else {
    const bait = lureTarget(echo, apparent, decoys);
    if (now >= nextSenseAt) {
      nextSenseAt = now + SENSE_INTERVAL_MS;
      if (
        sensesPlayer(echo, player, mirrors, rt, water, grid, now, apparent, decoys, mirrorEyeOff)
      ) {
        lastSensedCell = grid.cellAt(bait.x, bait.y);
        loseMemoryAt = now + CHASE_MEMORY_MS;
      }
    }
  }

  // Mode select: fresh memory chases, otherwise patrol.
  const mode: EchoState['mode'] = loseMemoryAt !== null && now < loseMemoryAt ? 'chase' : 'patrol';

  // Targeting.
  let { anchorIdx } = echo;
  let target: CellIndex | null = null;
  if (mode === 'patrol' && anchors.length > 0) {
    const anchor = anchors[anchorIdx]!;
    if (Math.hypot(anchor.x - echo.x, anchor.y - echo.y) <= 0.15) {
      anchorIdx = (anchorIdx + 1) % anchors.length; // arrival rotates the patrol
    }
    const next = anchors[anchorIdx]!;
    target = grid.cellAt(next.x, next.y);
  } else if (mode === 'chase') {
    target = lastSensedCell;
  }

  // Pathing: follow the flow field toward the target cell; inside the target
  // cell (flowStep null) walk straight at its center — or, in chase mode, at
  // the player themself (see the lunge below). Both endpoints of every step
  // lie in the union of two adjacent open cells, so no wall collision is
  // needed — the field already respects walls.
  let { x, y, heading, field } = echo;
  if (target !== null) {
    if (
      field === null ||
      echo.target === null ||
      target.x !== echo.target.x ||
      target.y !== echo.target.y
    ) {
      field = buildFlowField(grid, [target]);
    }
    const cell = grid.cellAt(x, y);
    const goal = flowStep(field, grid, cell.x, cell.y) ?? target;
    // In-cell pursuit: once the echo stands in the sensed cell it lunges at
    // the player's exact position instead of parking on the cell center — but
    // only while the player is still IN that cell. The echo sees only through
    // mirrors: a player who slipped out is chased at the remembered spot, and
    // the same-cell endpoints keep every step inside one cell, preserving the
    // no-wall-collision invariant above.
    const playerCell = grid.cellAt(player.x, player.y);
    const lungeAtPlayer =
      mode === 'chase' &&
      cell.x === target.x &&
      cell.y === target.y &&
      playerCell.x === target.x &&
      playerCell.y === target.y;
    const { cx, cy } = lungeAtPlayer
      ? { cx: player.x, cy: player.y }
      : grid.cellCenter(goal.x, goal.y);
    const dx = cx - x;
    const dy = cy - y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1e-9) {
      const step = Math.min(ECHO_SPEED * dtS, dist); // never overshoot the goal
      const vx = dx / dist;
      const vy = dy / dist;
      x += vx * step;
      y += vy * step;
      heading = Math.atan2(vx, -vy); // heading 0 = north = −y
    }
  }

  return {
    ...echo,
    x,
    y,
    heading,
    mode,
    anchorIdx,
    target,
    field,
    lastSensedCell,
    loseMemoryAt,
    nextSenseAt,
  };
}
