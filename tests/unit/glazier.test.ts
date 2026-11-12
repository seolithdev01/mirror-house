// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { Dir, FloorGrid } from '../../src/engine/grid';
import { CONTACT_RADIUS, GLAZIER_FLOOR } from '../../src/engine/constants';
import {
  GLAZIER_NEAR_M,
  GLAZIER_SPEED,
  GLAZIER_TELEPORT_S,
  glazierCatches,
  glazierNear,
  glazierTarget,
  initGlazier,
  updateGlazier,
  type GlazierState,
} from '../../src/game/glazier';

// The gher.test.ts corridor: one straight open row across a 5×5 grid — row
// y=2 whose cell centers lie on world y=0 (x = −8..8). The Foundations play
// on this line; the T-grid adds one spur, the tie-grid two, for the perch's
// determinism.
const openGrid = (): FloorGrid => {
  const g = new FloorGrid(5, 5);
  for (let x = 0; x < 4; x++) g.setOpen(x, 2, Dir.East);
  return g;
};

/** Corridor plus a north spur at x=2: (2,2)—(2,1). From the spur's end the
 *  ONLY walk off it doubles back south — the flow walk's witness. */
const teeGrid = (): FloorGrid => {
  const g = openGrid();
  g.setOpen(2, 2, Dir.North);
  return g;
};

/** Corridor with north stubs at BOTH ends: from the center cell (2,2) the
 *  two stub ends (0,1) and (4,1) sit at the same bfs distance 3 — the tie. */
const tieGrid = (): FloorGrid => {
  const g = openGrid();
  g.setOpen(0, 2, Dir.North);
  g.setOpen(4, 2, Dir.North);
  return g;
};

const EAST = Math.PI / 2; // heading 0 = north = −y, so east is +x → π/2
const SOUTH = Math.PI;
const STEP = 1 / 120; // the fixed step, as the frame loop feeds it

describe('glazierTarget — the perch (the max bfs-dist cell from the player)', () => {
  it('corridor: the far end from the player (pinned)', () => {
    expect(glazierTarget(openGrid(), { x: 8, y: 0 })).toEqual({ x: 0, y: 2 });
    expect(glazierTarget(openGrid(), { x: -8, y: 0 })).toEqual({ x: 4, y: 2 });
  });

  it('ties break to the FIRST row-major cell — deterministic as farthestCell', () => {
    // player mid-corridor (0,0): the stub ends (0,1) and (4,1) both sit 3
    // steps away; (0,1) is the lower index → the perch
    expect(glazierTarget(tieGrid(), { x: 0, y: 0 })).toEqual({ x: 0, y: 1 });
  });

  it('never perches ON the player\u2019s own cell (a perch is strictly farther)', () => {
    const t = glazierTarget(openGrid(), { x: 0, y: 0 }); // player mid-corridor
    expect(t).not.toEqual({ x: 2, y: 2 });
    expect(t).toEqual({ x: 0, y: 2 }); // dist 2 — the nearest far end
  });

  it('degenerate grid: no cell strictly farther → null (nowhere to perch)', () => {
    const lone = new FloorGrid(1, 1); // one cell, all walls
    expect(glazierTarget(lone, { x: 0, y: 0 })).toBeNull();
  });
});

describe('initGlazier — the spawn', () => {
  it('spawns at the open cell MAX bfs-dist from the player (the far perch)', () => {
    const g = initGlazier(openGrid(), { x: 8, y: 0 }, 1000);
    expect(g.x).toBeCloseTo(-8); // cell (0,2)'s center
    expect(g.y).toBeCloseTo(0);
    expect(initGlazier(openGrid(), { x: -8, y: 0 }, 1000)).toMatchObject({ x: 8, y: 0 });
  });

  it('arms the teleport clock: nextTeleportAt = now + GLAZIER_TELEPORT_S·1000', () => {
    expect(initGlazier(openGrid(), { x: 8, y: 0 }, 1000).nextTeleportAt).toBe(
      1000 + GLAZIER_TELEPORT_S * 1000,
    );
  });

  it('starts facing north (heading 0), the Surveyor convention', () => {
    expect(initGlazier(openGrid(), { x: 8, y: 0 }, 0).heading).toBe(0);
  });

  it('degenerate grid: he lands on the player\u2019s cell — the only ground there is', () => {
    const g = initGlazier(new FloorGrid(1, 1), { x: 0, y: 0 }, 0);
    expect(g.x).toBeCloseTo(0);
    expect(g.y).toBeCloseTo(0);
    expect(g.nextTeleportAt).toBe(GLAZIER_TELEPORT_S * 1000);
  });
});

describe('updateGlazier — the walk and the teleport', () => {
  // spawns at (−8,0) (the far perch from the player at +8): the walk starts there
  const spawn = (): GlazierState => initGlazier(openGrid(), { x: 8, y: 0 }, 0);

  it('before the clock: flow-walks toward the PLAYER at GLAZIER_SPEED (pinned)', () => {
    const g = updateGlazier(spawn(), openGrid(), { x: 8, y: 0 }, 0, STEP);
    expect(g.nextTeleportAt).toBe(GLAZIER_TELEPORT_S * 1000); // the clock did not move
    expect(g.x).toBeCloseTo(-8 + GLAZIER_SPEED * STEP); // one steady step east
    expect(g.y).toBeCloseTo(0);
    expect(g.heading).toBeCloseTo(EAST);
  });

  it('the walk rides the FLOW FIELD, not the straight line — around the spur', () => {
    // at the spur's end (2,1) center (0,−4), player at the corridor's east
    // end (8,0): the flow path doubles back south through (2,2) first — a
    // straight-line walk would cut the corner eastward
    const atSpur: GlazierState = { x: 0, y: -4, heading: EAST, nextTeleportAt: 999999 };
    const g = updateGlazier(atSpur, teeGrid(), { x: 8, y: 0 }, 0, STEP);
    expect(g.x).toBeCloseTo(0); // no eastward drift
    expect(g.y).toBeGreaterThan(-4); // south, toward (2,2)'s center
    expect(g.heading).toBeCloseTo(SOUTH);
  });

  it('never overshoots the next cell\u2019s center — a huge step lands exactly on it', () => {
    const g = updateGlazier(spawn(), openGrid(), { x: 8, y: 0 }, 0, 60); // 120 m of ask
    expect(g.x).toBeCloseTo(-4); // (1,2)'s center
    expect(g.y).toBeCloseTo(0);
  });

  it('at the player\u2019s cell the walk holds (flowStep null) — contact is the game, not the walk', () => {
    const seated: GlazierState = { x: 8, y: 0, heading: EAST, nextTeleportAt: 999999 };
    const g = updateGlazier(seated, openGrid(), { x: 8, y: 0 }, 0, STEP);
    expect(g.x).toBe(8);
    expect(g.y).toBe(0);
  });

  it('on the clock: relocates to the max-dist cell for the player\u2019s CURRENT spot', () => {
    const mid = updateGlazier(spawn(), openGrid(), { x: 8, y: 0 }, 0, STEP);
    const g = updateGlazier(mid, openGrid(), { x: 8, y: 0 }, GLAZIER_TELEPORT_S * 1000, STEP);
    expect(g.x).toBeCloseTo(-8); // the perch: cell (0,2)'s center
    expect(g.y).toBeCloseTo(0);
    expect(g.nextTeleportAt).toBe(GLAZIER_TELEPORT_S * 1000 * 2); // the clock RESET
    // and the perch follows the player: he moved to the west end mid-attempt
    const g2 = updateGlazier(mid, openGrid(), { x: -8, y: 0 }, GLAZIER_TELEPORT_S * 1000, STEP);
    expect(g2.x).toBeCloseTo(8); // now the EAST end is farthest
    expect(g2.y).toBeCloseTo(0);
  });

  it('the teleport keeps his heading (relocation is instant, the next step re-aims)', () => {
    const walked = updateGlazier(spawn(), openGrid(), { x: 8, y: 0 }, 0, STEP); // heading EAST
    const g = updateGlazier(walked, openGrid(), { x: 8, y: 0 }, GLAZIER_TELEPORT_S * 1000, STEP);
    expect(g.heading).toBeCloseTo(EAST);
  });

  it('one step before the clock: he walks, the clock holds — the boundary is exact', () => {
    const at = GLAZIER_TELEPORT_S * 1000 - 1;
    const g = updateGlazier(spawn(), openGrid(), { x: 8, y: 0 }, at, STEP);
    expect(g.x).toBeCloseTo(-8 + GLAZIER_SPEED * STEP); // walking, not teleporting
    expect(g.nextTeleportAt).toBe(GLAZIER_TELEPORT_S * 1000);
  });

  it('never mutates its input state', () => {
    const g0 = spawn();
    const before = { ...g0 };
    updateGlazier(g0, openGrid(), { x: 8, y: 0 }, 0, STEP);
    updateGlazier(g0, openGrid(), { x: 8, y: 0 }, GLAZIER_TELEPORT_S * 1000, STEP);
    expect(g0).toEqual(before);
  });
});

describe('glazierCatches — the contact gate (pure)', () => {
  it('inside CONTACT_RADIUS → caught', () => {
    expect(glazierCatches({ x: 0.5, y: 0 }, { x: 0, y: 0 })).toBe(true);
    expect(glazierCatches({ x: 0, y: 0.69 }, { x: 0, y: 0 })).toBe(true);
  });

  it('CONTACT_RADIUS itself is NOT a touch — strictly inside only', () => {
    expect(glazierCatches({ x: CONTACT_RADIUS, y: 0 }, { x: 0, y: 0 })).toBe(false);
    expect(glazierCatches({ x: 1, y: 0 }, { x: 0, y: 0 })).toBe(false);
  });
});

describe('glazierNear — the approach gate (pure)', () => {
  it('≤ GLAZIER_NEAR_M (3 m) speaks the approach — inclusive', () => {
    expect(glazierNear({ x: 3, y: 0 }, { x: 0, y: 0 })).toBe(true);
    expect(glazierNear({ x: 2.9, y: 0 }, { x: 0, y: 0 })).toBe(true);
    expect(glazierNear({ x: 0, y: 3.1 }, { x: 0, y: 0 })).toBe(false);
  });
});

describe('Glazier contract pins (T10)', () => {
  it('GLAZIER_TELEPORT_S 12 s, GLAZIER_SPEED 2.0 m/s, GLAZIER_NEAR_M 3 m', () => {
    expect(GLAZIER_TELEPORT_S).toBe(12);
    expect(GLAZIER_SPEED).toBe(2.0);
    expect(GLAZIER_NEAR_M).toBe(3);
  });

  it('GLAZIER_FLOOR 100 — he spawns on the Ground and nowhere else', () => {
    expect(GLAZIER_FLOOR).toBe(100);
  });
});
