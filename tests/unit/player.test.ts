// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { FloorGrid, Dir } from '../../src/engine/grid';
import { PLAYER_RADIUS, SPRINT_SPEED, MAX_STEP_DT, WALK_SPEED } from '../../src/engine/constants';
import { movePlayer, spawnPlayer, type PlayerState } from '../../src/game/player';
import { generateFloor, TIER_ONE } from '../../src/game/maze';

const grid = new FloorGrid(15, 15);
const atCenter = (): PlayerState => ({ x: 0, y: 0, heading: 0 }); // center of cell (7,7) in a 15x15 grid

describe('movePlayer', () => {
  it('walks north at WALK_SPEED for the clamped dt', () => {
    const p = movePlayer(atCenter(), { forward: 1, strafe: 0, sprint: false, turn: 0 }, grid, 0.5);
    expect(p.y).toBeCloseTo(-WALK_SPEED * MAX_STEP_DT); // dt clamped to 1/30
    expect(p.x).toBeCloseTo(0);
  });

  it('sprints east with strafe input', () => {
    const p = movePlayer(
      atCenter(),
      { forward: 0, strafe: 1, sprint: true, turn: 0 },
      grid,
      1 / 120,
    );
    expect(p.x).toBeCloseTo(SPRINT_SPEED / 120);
  });

  it('is blocked by a wall and stops at PLAYER_RADIUS from it', () => {
    // all-walls grid: north wall of cell (7,7) sits at y = -2; start 0.5m away heading north.
    // dt clamps to 1/30, so the 0.2m sprint step crosses the stop plane at -2 + PLAYER_RADIUS.
    const start: PlayerState = { x: 0, y: -1.5, heading: 0 };
    const p = movePlayer(start, { forward: 1, strafe: 0, sprint: true, turn: 0 }, grid, 1);
    expect(p.y).toBeCloseTo(-2 + PLAYER_RADIUS); // clamped against the wall
  });

  it('slides along a wall on the perpendicular axis', () => {
    const start: PlayerState = { x: 0, y: -2 + PLAYER_RADIUS, heading: 0 }; // hugging north wall
    const p = movePlayer(start, { forward: 1, strafe: 1, sprint: true, turn: 0 }, grid, 1 / 120);
    expect(p.x).toBeCloseTo(SPRINT_SPEED / 120); // east slide happened
    expect(p.y).toBeCloseTo(-2 + PLAYER_RADIUS); // no north penetration
  });

  it('never tunnels: giant dt still clamps to a legal position', () => {
    const start: PlayerState = { x: 0, y: -1.5, heading: 0 };
    const p = movePlayer(start, { forward: 1, strafe: 0, sprint: true, turn: 0 }, grid, 1000);
    expect(p.y).toBeCloseTo(-2 + PLAYER_RADIUS);
  });

  it('applies turn to heading', () => {
    const p = movePlayer(
      atCenter(),
      { forward: 0, strafe: 0, sprint: false, turn: 0.5 },
      grid,
      1 / 120,
    );
    expect(p.heading).toBeCloseTo(0.5);
  });
});

describe('spawnPlayer', () => {
  it('spawns at entrance center facing an open direction', () => {
    const floor = generateFloor({ ...TIER_ONE, seed: 'SPAWN' });
    const p = spawnPlayer(floor);
    const { cx, cy } = floor.grid.cellCenter(floor.entrance.x, floor.entrance.y);
    expect(p.x).toBeCloseTo(cx);
    expect(p.y).toBeCloseTo(cy);
    const dirs = [Dir.North, Dir.East, Dir.South, Dir.West] as const;
    const cardinals = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]; // index = Dir value
    const openHeadings = cardinals.filter((_c, d) =>
      floor.grid.canWalk(floor.entrance.x, floor.entrance.y, dirs[d]!),
    );
    expect(openHeadings.some((c) => Math.abs(p.heading - c) < 1e-9)).toBe(true);
  });
});
