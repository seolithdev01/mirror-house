// SPDX-License-Identifier: Apache-2.0
//
// The distorting mirrors (T4/T3) — the Carnival of Faces' carnival glass,
// floors 31–40, 2–3 panes a floor. While an UNFOGGED distort mirror SEES the
// player — mirror↔player LOS within SENSE_RANGE, nothing else; the mirror
// lies to whoever looks, so no echo↔mirror leg is required for the
// displacement itself — the player's APPARENT position (what every enemy's
// mirror-sight reads, what the map pings show, what the echoes chase) is
// displaced by that mirror's fixed per-id delta (floorObjects.distortDelta:
// axis-aligned cells, ±DISTORT_MAX_CELLS). Fogging the pane restores the
// truth for its sight. Pure core, no three.js: main computes the apparent
// position once per fixed step and feeds it to the echo sense/chase (the
// same single-derivation contract the water ripple rides).
import { CELL_SIZE, DISTORT_MAX_CELLS, SENSE_RANGE } from '../engine/constants';
import type { FloorGrid } from '../engine/grid';
import { losClear } from '../engine/los';
import type { MirrorRef } from './floorObjects';
import { isFogged, type MirrorRuntime } from './frost';
import type { PlayerState } from './player';

export { DISTORT_MAX_CELLS };

/** Where the house says the player stands: world meters, the same shape the
 *  sense/chase/ping consumers read off PlayerState. */
export interface ApparentPosition {
  x: number;
  y: number;
}

/**
 * The player's apparent position: the true spot, or — while the FIRST
 * unfogged distort mirror in list order sees the player (within SENSE_RANGE,
 * clear grid LOS mirror↔player) — the true spot displaced by that mirror's
 * fixed delta, cells converted to world meters. Deterministic: mirror list
 * order decides which pane wins when several see the player. Fog every
 * seeing pane (or break their sight) and the house tells the truth again.
 */
export function apparentPlayer(
  player: PlayerState,
  mirrors: ReadonlyArray<MirrorRef>,
  runtime: ReadonlyArray<MirrorRuntime>,
  grid: FloorGrid,
  now: number,
): ApparentPosition {
  for (const m of mirrors) {
    if (m.kind !== 'distort') continue;
    const r = runtime.find((rt) => rt.id === m.id);
    if (!r || isFogged(r, now)) continue; // fogged carnival glass lies about nothing
    if (Math.hypot(m.x - player.x, m.z - player.y) > SENSE_RANGE) continue;
    if (!losClear(grid, player.x, player.y, m.x, m.z)) continue; // the pane cannot see them
    return {
      x: player.x + (m.distortDx ?? 0) * CELL_SIZE,
      y: player.y + (m.distortDy ?? 0) * CELL_SIZE,
    };
  }
  return { x: player.x, y: player.y };
}
