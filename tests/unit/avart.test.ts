// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { Dir, FloorGrid } from '../../src/engine/grid';
import {
  AVART_INTERCEPT_MS,
  AVART_LEAD_S,
  AVART_SENTINEL_FLOOR,
  SPRINT_SPEED,
  WALK_SPEED,
} from '../../src/engine/constants';
import {
  AVART_SPEED,
  ambushCell,
  initAavart,
  updateAavart,
  type AvartState,
} from '../../src/game/avart';

// Same corridor as gher.test.ts: one straight open row across a 5×5 grid —
// row y=2 whose cell centers lie on world y=0 (x = −8..8). The ambush plays
// on this line; the T-grid below adds one spur for the corner-cut cases.
const openGrid = (): FloorGrid => {
  const g = new FloorGrid(5, 5);
  for (let x = 0; x < 4; x++) g.setOpen(x, 2, Dir.East);
  return g;
};

/** Corridor plus a north spur at x=2: (2,2)—(2,1). From (0,2) the road to the
 *  spur's end runs (1,2),(2,2),(2,1) — a bend the projection can cut. */
const teeGrid = (): FloorGrid => {
  const g = openGrid();
  g.setOpen(2, 2, Dir.North);
  return g;
};

const EAST = Math.PI / 2; // heading 0 = north = −y, so east is +x → π/2
const NORTH = 0;
const STEP = 1 / 120; // the fixed step, as the frame loop feeds it

describe('ambushCell — the projection', () => {
  it('sprint: projects far ahead ONTO the path (pinned)', () => {
    const g = openGrid();
    // player at (0,2)'s center facing east at SPRINT_SPEED: reach =
    // 1.8·(6/6) s · 6 m/s = 10.8 m → P = x −8+10.8 = 2.8 → cell (3,2) —
    // the 3rd of the 4 steps to the objective at (4,2)
    const cell = ambushCell({ x: -8, y: 0, heading: EAST, speed: SPRINT_SPEED }, g, [
      { x: 4, y: 2 },
    ]);
    expect(cell).toEqual({ x: 3, y: 2 });
  });

  it('walk: the one-cell shadow — reach 3.675 m cannot clear a 4 m cell', () => {
    const g = openGrid();
    // lead = 1.8·(3.5/6) = 1.05 s → reach 3.675 m: P = −4.325 → cell (1,2),
    // the FIRST step. At WALK_SPEED he never earns more than a one-step lead
    // — mid between creep's zero and sprint's three. That is the counter.
    const cell = ambushCell({ x: -8, y: 0, heading: EAST, speed: WALK_SPEED }, g, [
      { x: 4, y: 2 },
    ]);
    expect(cell).toEqual({ x: 1, y: 2 });
  });

  it("creep: lead ≈ 0 → the player's own NEXT path cell (pinned)", () => {
    const g = openGrid();
    // speed 0.35: reach 0.0368 m — P stays inside the player's own cell (0,2),
    // which is not on the path; the nearest path cell is the first step
    expect(ambushCell({ x: -8, y: 0, heading: EAST, speed: 0.35 }, g, [{ x: 4, y: 2 }])).toEqual({
      x: 1,
      y: 2,
    });
    // a dead standstill projects nothing: still the next cell
    expect(ambushCell({ x: -8, y: 0, heading: EAST, speed: 0 }, g, [{ x: 4, y: 2 }])).toEqual({
      x: 1,
      y: 2,
    });
  });

  it('off-path heading: the projection left the roads → he waits at the objective (the LAST cell)', () => {
    const g = teeGrid();
    // facing due north at sprint: P = (−8, −10.8) → cell (0,0), walled off
    // from the player's own road — no read, and unlike Gher there is no feint:
    // he goes to the road's end and waits
    expect(
      ambushCell({ x: -8, y: 0, heading: NORTH, speed: SPRINT_SPEED }, g, [{ x: 2, y: 1 }]),
    ).toEqual({ x: 2, y: 1 });
  });

  it('nearest-cell selection — the corner-cut: past the bend, the NEAREST path cell, not the end', () => {
    const g = teeGrid();
    // sprinting east past the turn: P = 2.8 → cell (3,2) — on the roads but
    // off the path. Nearest path cell to (3,2): (2,2) at 1 cell beats (2,1)
    // at √2 and (1,2) at 2 — he cuts the corner, he does not camp the goal
    const cell = ambushCell({ x: -8, y: 0, heading: EAST, speed: SPRINT_SPEED }, g, [
      { x: 2, y: 1 },
    ]);
    expect(cell).toEqual({ x: 2, y: 2 });
  });

  it('beyond the path end → the LAST cell (he waits at the objective)', () => {
    const g = openGrid();
    // objective mid-corridor at (2,2): path is (1,2),(2,2). Sprint projects P
    // to cell (3,2) — past the end but still on the roads; the nearest path
    // cell is (2,2), the objective itself
    const cell = ambushCell({ x: -8, y: 0, heading: EAST, speed: SPRINT_SPEED }, g, [
      { x: 2, y: 2 },
    ]);
    expect(cell).toEqual({ x: 2, y: 2 });
  });

  it('the player standing ON an objective: the ambush is the ground they stand on', () => {
    const g = openGrid();
    expect(ambushCell({ x: -8, y: 0, heading: EAST, speed: SPRINT_SPEED }, g, [{ x: 0, y: 2 }])).toEqual(
      { x: 0, y: 2 },
    );
  });

  it('walks the path to the NEAREST objective (multi-source BFS)', () => {
    const g = teeGrid();
    // both ends offered: the spur (2,1) is 3 steps from (0,2), the corridor
    // end (4,2) is 4 — the projection rides the near road
    const cell = ambushCell({ x: -8, y: 0, heading: EAST, speed: 0.35 }, g, [
      { x: 4, y: 2 },
      { x: 2, y: 1 },
    ]);
    expect(cell).toEqual({ x: 1, y: 2 });
  });

  it('no objectives → null; an unreachable player (no road to read) → null', () => {
    expect(ambushCell({ x: -8, y: 0, heading: EAST, speed: SPRINT_SPEED }, openGrid(), [])).toBeNull();
    // every objective walled off from the player: no road, no ambush
    expect(
      ambushCell({ x: -8, y: 0, heading: EAST, speed: SPRINT_SPEED }, teeGrid(), [{ x: 0, y: 0 }]),
    ).toBeNull();
  });
});

describe('initAavart — the spawn', () => {
  it('seeds at the patrol anchor FARTHEST from the player (grace to commit first)', () => {
    const anchors = [
      { x: -8, y: 0 },
      { x: 0, y: 0 },
      { x: 8, y: 0 },
    ];
    expect(initAavart(anchors, { x: 8, y: 0 })).toMatchObject({ x: -8, y: 0 });
    expect(initAavart(anchors, { x: -8, y: 0 })).toMatchObject({ x: 8, y: 0 });
  });

  it('no anchors → null: a floor with no roads cannot be ambushed', () => {
    expect(initAavart([], { x: 0, y: 0 })).toBeNull();
  });
});

describe('updateAavart — the glide and the tick', () => {
  // spawns at (−8,0) (farthest from the player at +8): the run starts there
  const spawn = (): AvartState =>
    initAavart(
      [
        { x: -8, y: 0 },
        { x: 8, y: 0 },
      ],
      { x: 8, y: 0 },
    )!;

  it('adopts the first ambush on the tick and glides at AVART_SPEED (pinned)', () => {
    const a = updateAavart(spawn(), { x: 4, y: 2 }, openGrid(), 0, STEP);
    expect(a.ambushAt).toEqual({ x: 4, y: 2 });
    expect(a.nextTickAt).toBe(AVART_INTERCEPT_MS); // 1200 — the retarget clock
    expect(a.x).toBeCloseTo(-8 + AVART_SPEED * STEP); // the fastest sentinel runs
    expect(a.y).toBeCloseTo(0);
    expect(a.heading).toBeCloseTo(EAST);
  });

  it('between ticks a NEW ambush is not adopted — he keeps gliding to the old one', () => {
    const a0 = updateAavart(spawn(), { x: 4, y: 2 }, openGrid(), 0, STEP);
    const a1 = updateAavart(a0, { x: 0, y: 2 }, openGrid(), 600, STEP);
    expect(a1.ambushAt).toEqual({ x: 4, y: 2 }); // the offer was refused
    expect(a1.nextTickAt).toBe(1200); // the clock did not move
    expect(a1.x).toBeGreaterThan(a0.x); // still bound east
  });

  it('a null offer keeps the last read — no feint holds HIM (the Gher difference)', () => {
    const a0 = updateAavart(spawn(), { x: 4, y: 2 }, openGrid(), 0, STEP);
    const a1 = updateAavart(a0, null, openGrid(), 600, STEP);
    expect(a1.ambushAt).toEqual({ x: 4, y: 2 }); // he finishes the ambush
    expect(a1.x).toBeGreaterThan(a0.x); // the glide never breaks mid-stride
    expect(a1.nextTickAt).toBe(AVART_INTERCEPT_MS); // 1200, unchanged
  });

  it('with no ambush in hand a null offer holds him still', () => {
    const fresh: AvartState = { x: -6, y: 0, heading: EAST, ambushAt: null, nextTickAt: 0 };
    const a = updateAavart(fresh, null, openGrid(), 0, STEP);
    expect(a.ambushAt).toBeNull();
    expect(a.x).toBe(-6); // nowhere to go — he waits
  });

  it('the tick re-fires on schedule and adopts the new ambush', () => {
    const a0 = updateAavart(spawn(), { x: 4, y: 2 }, openGrid(), 0, STEP);
    const a1 = updateAavart(a0, { x: 0, y: 2 }, openGrid(), AVART_INTERCEPT_MS, STEP);
    expect(a1.ambushAt).toEqual({ x: 0, y: 2 });
    expect(a1.nextTickAt).toBe(2 * AVART_INTERCEPT_MS);
    expect(a1.x).toBeLessThan(a0.x); // westbound now — toward the player's end
  });

  it('a fresh read landing mid-window waits for the tick — 1200 ms is his reaction time', () => {
    const held: AvartState = { x: -6, y: 0, heading: EAST, ambushAt: null, nextTickAt: 1000 };
    const a = updateAavart(held, { x: 4, y: 2 }, openGrid(), 500, STEP);
    expect(a.ambushAt).toBeNull(); // not yet — the window is the player's
    expect(a.x).toBe(-6);
  });

  it('arrival: standing in the ambush cell he holds its center, heading kept', () => {
    const seated: AvartState = {
      x: 8,
      y: 0,
      heading: EAST,
      ambushAt: { x: 4, y: 2 },
      nextTickAt: 1000,
    };
    const a = updateAavart(seated, { x: 4, y: 2 }, openGrid(), 1500, STEP);
    expect(a.x).toBe(8);
    expect(a.y).toBe(0);
    expect(a.heading).toBe(EAST);
  });

  it('never mutates its input state', () => {
    const a0 = spawn();
    const before = { ...a0 };
    updateAavart(a0, { x: 4, y: 2 }, openGrid(), 0, STEP);
    expect(a0).toEqual(before);
  });
});

describe('Aavart contract pins (T4)', () => {
  it('AVART_SPEED 2.4 m/s (the fastest sentinel), tick 1200 ms, lead 1.8 s, floor 31', () => {
    expect(AVART_SPEED).toBe(2.4);
    expect(AVART_INTERCEPT_MS).toBe(1200);
    expect(AVART_LEAD_S).toBe(1.8);
    expect(AVART_SENTINEL_FLOOR).toBe(31);
  });
});
