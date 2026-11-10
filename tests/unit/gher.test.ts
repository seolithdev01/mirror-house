// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { Dir, FloorGrid } from '../../src/engine/grid';
import {
  GHER_INTERCEPT_MS,
  GHER_SENTINEL_FLOOR,
} from '../../src/engine/constants';
import {
  GHER_SPEED,
  initGher,
  interceptCell,
  INTERCEPT_CONE_COS,
  updateGher,
  type GherState,
} from '../../src/game/gher';

// Same corridor as taal.test.ts: one straight open row across a 5×5 grid —
// row y=2 whose cell centers lie on world y=0 (x = −8..8). The encirclement
// plays on this line; the T-grid below adds one spur for nearest-objective.
const openGrid = (): FloorGrid => {
  const g = new FloorGrid(5, 5);
  for (let x = 0; x < 4; x++) g.setOpen(x, 2, Dir.East);
  return g;
};

/** Corridor plus a north spur at x=2: (2,2)—(2,1). From (0,2) the spur's open
 *  end sits 3 steps away, the corridor's east end 4 — the nearer road. */
const teeGrid = (): FloorGrid => {
  const g = openGrid();
  g.setOpen(2, 2, Dir.North);
  return g;
};

const EAST = Math.PI / 2; // heading 0 = north = −y, so east is +x → π/2
const STEP = 1 / 120; // the fixed step, as the frame loop feeds it

describe('interceptCell — the prediction', () => {
  it('heading along the path: picks the ~3rd path cell (pinned)', () => {
    const g = openGrid();
    // player at cell (0,2) center, facing east down the corridor at the far
    // objective (4,2): path (1,2),(2,2),(3,2) → the seal is 3 cells ahead
    const cell = interceptCell({ x: -8, y: 0, heading: EAST }, g, [{ x: 4, y: 2 }]);
    expect(cell).toEqual({ x: 3, y: 2 });
  });

  it('heading off the path: null — the feint window (pinned)', () => {
    const g = openGrid();
    // facing north / west while the road runs east: no commit, no seal
    expect(interceptCell({ x: -8, y: 0, heading: 0 }, g, [{ x: 4, y: 2 }])).toBeNull();
    expect(interceptCell({ x: -8, y: 0, heading: 3 * EAST }, g, [{ x: 4, y: 2 }])).toBeNull();
  });

  it('the commit window is 60°: 45° off still commits, 70° off is a feint', () => {
    const g = openGrid();
    // 45° north of east — inside the cone (dot = cos45 ≈ 0.707 ≥ cos60)
    const inCone = interceptCell(
      { x: -8, y: 0, heading: EAST - Math.PI / 4 },
      g,
      [{ x: 4, y: 2 }],
    );
    expect(inCone).toEqual({ x: 3, y: 2 });
    // 70° north of east — outside (dot = cos70 ≈ 0.342 < cos60)
    const outCone = interceptCell(
      { x: -8, y: 0, heading: EAST - (70 * Math.PI) / 180 },
      g,
      [{ x: 4, y: 2 }],
    );
    expect(outCone).toBeNull();
    // the cone itself is pinned: cos(60°) = 0.5
    expect(INTERCEPT_CONE_COS).toBeCloseTo(0.5, 12);
  });

  it('walks the path to the NEAREST objective (multi-source BFS)', () => {
    const g = teeGrid();
    // spur end (2,1) is 3 steps from (0,2); corridor end (4,2) is 4 — the
    // prediction must follow the near road: path (1,2),(2,2),(2,1)
    const cell = interceptCell(
      { x: -8, y: 0, heading: EAST },
      g,
      [
        { x: 4, y: 2 },
        { x: 2, y: 1 },
      ],
    );
    expect(cell).toEqual({ x: 2, y: 1 });
  });

  it('the gate reads the FIRST step, not the far cell: heading at the objective across a bend is still a feint', () => {
    const g = teeGrid();
    // path runs east first even for the spur objective — facing dead north
    // (at the spur end itself) is 90° off the first step → null
    expect(
      interceptCell(
        { x: -8, y: 0, heading: 0 },
        g,
        [
          { x: 4, y: 2 },
          { x: 2, y: 1 },
        ],
      ),
    ).toBeNull();
  });

  it('short paths: the objective itself is the seal (2 away, 1 away)', () => {
    const g = openGrid();
    expect(interceptCell({ x: -8, y: 0, heading: EAST }, g, [{ x: 2, y: 2 }])).toEqual({
      x: 2,
      y: 2,
    });
    expect(interceptCell({ x: -8, y: 0, heading: EAST }, g, [{ x: 1, y: 2 }])).toEqual({
      x: 1,
      y: 2,
    });
  });

  it('the player standing ON an objective: the seal is the ground they stand on', () => {
    const g = openGrid();
    expect(interceptCell({ x: -8, y: 0, heading: EAST }, g, [{ x: 0, y: 2 }])).toEqual({
      x: 0,
      y: 2,
    });
  });

  it('no objectives → null — nothing to encircle', () => {
    expect(interceptCell({ x: -8, y: 0, heading: EAST }, openGrid(), [])).toBeNull();
  });
});

describe('initGher — the spawn', () => {
  it('seeds at the patrol anchor FARTHEST from the player (grace to commit first)', () => {
    const anchors = [
      { x: -8, y: 0 },
      { x: 0, y: 0 },
      { x: 8, y: 0 },
    ];
    expect(initGher(anchors, { x: 8, y: 0 })).toMatchObject({ x: -8, y: 0 });
    expect(initGher(anchors, { x: -8, y: 0 })).toMatchObject({ x: 8, y: 0 });
  });

  it('no anchors → null: a floor with no roads cannot be encircled', () => {
    expect(initGher([], { x: 0, y: 0 })).toBeNull();
  });
});

describe('updateGher — the glide and the tick', () => {
  // spawns at (−8,0) (farthest from the player at +8): the walk starts there
  const spawn = (): GherState =>
    initGher(
      [
        { x: -8, y: 0 },
        { x: 8, y: 0 },
      ],
      { x: 8, y: 0 },
    )!;

  it('adopts the first intercept on the tick and glides at GHER_SPEED (pinned)', () => {
    const g = updateGher(spawn(), { x: 4, y: 2 }, openGrid(), 0, STEP);
    expect(g.interceptAt).toEqual({ x: 4, y: 2 });
    expect(g.nextTickAt).toBe(GHER_INTERCEPT_MS); // 1000 — the reaction clock
    expect(g.x).toBeCloseTo(-8 + GHER_SPEED * STEP); // one steady step east
    expect(g.y).toBeCloseTo(0);
    expect(g.heading).toBeCloseTo(EAST);
  });

  it('steady glide — no beat: the step at an odd taal tick equals the accent tick', () => {
    const atAccent = updateGher(spawn(), { x: 4, y: 2 }, openGrid(), 0, STEP);
    const atRest = updateGher(spawn(), { x: 4, y: 2 }, openGrid(), 250, STEP);
    expect(atRest.x + 8).toBeCloseTo(atAccent.x + 8); // taal would crawl here
  });

  it('between ticks a NEW intercept is not adopted — he keeps gliding to the old seal', () => {
    const g0 = updateGher(spawn(), { x: 4, y: 2 }, openGrid(), 0, STEP);
    const g1 = updateGher(g0, { x: 0, y: 2 }, openGrid(), 500, STEP);
    expect(g1.interceptAt).toEqual({ x: 4, y: 2 }); // the offer was refused
    expect(g1.nextTickAt).toBe(1000); // the clock did not move
    expect(g1.x).toBeGreaterThan(g0.x); // still bound east
  });

  it('the feint lands AT ONCE: a null offer mid-window stops him mid-stride', () => {
    const g0 = updateGher(spawn(), { x: 4, y: 2 }, openGrid(), 0, STEP);
    const g1 = updateGher(g0, null, openGrid(), 500, STEP);
    expect(g1.interceptAt).toBeNull();
    expect(g1.x).toBe(g0.x); // frozen mid-corridor — the window is the player's
    expect(g1.nextTickAt).toBe(1000); // the clock runs; the re-commit waits for it
  });

  it('after a feint, a re-commit inside the window still holds — the tick is his reaction time', () => {
    const held: GherState = { x: -6, y: 0, heading: EAST, interceptAt: null, nextTickAt: 1000 };
    const g = updateGher(held, { x: 4, y: 2 }, openGrid(), 500, STEP);
    expect(g.interceptAt).toBeNull();
    expect(g.x).toBe(-6);
  });

  it('the tick re-fires on schedule and adopts the new seal', () => {
    const g0 = updateGher(spawn(), { x: 4, y: 2 }, openGrid(), 0, STEP);
    const g1 = updateGher(g0, { x: 0, y: 2 }, openGrid(), 1000, STEP);
    expect(g1.interceptAt).toEqual({ x: 0, y: 2 });
    expect(g1.nextTickAt).toBe(2000);
    expect(g1.x).toBeLessThan(g0.x); // westbound now — toward the player's end
  });

  it('arrival: standing in the seal cell he holds its center, heading kept', () => {
    const seated: GherState = { x: 8, y: 0, heading: EAST, interceptAt: { x: 4, y: 2 }, nextTickAt: 1000 };
    const g = updateGher(seated, { x: 4, y: 2 }, openGrid(), 1500, STEP);
    expect(g.x).toBe(8);
    expect(g.y).toBe(0);
    expect(g.heading).toBe(EAST);
  });

  it('never mutates its input state', () => {
    const g0 = spawn();
    const before = { ...g0 };
    updateGher(g0, { x: 4, y: 2 }, openGrid(), 0, STEP);
    expect(g0).toEqual(before);
  });
});

describe('Gher contract pins (T3)', () => {
  it('GHER_SPEED 1.9 m/s, GHER_INTERCEPT_MS 1000, GHER_SENTINEL_FLOOR 21', () => {
    expect(GHER_SPEED).toBe(1.9);
    expect(GHER_INTERCEPT_MS).toBe(1000);
    expect(GHER_SENTINEL_FLOOR).toBe(21);
  });
});
