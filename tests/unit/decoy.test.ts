// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { Dir, FloorGrid } from '../../src/engine/grid';
import {
  CONTACT_RADIUS,
  DECOY_MAX_ALIVE,
  DECOY_SHARD,
  DECOY_SPAWN_EVERY_MS,
  DECOY_SPEED,
} from '../../src/engine/constants';
import { buildFlowField } from '../../src/engine/flowField';
import { createRng } from '../../src/engine/rng';
import {
  nearestDecoy,
  shatterDecoys,
  spawnDecoy,
  updateDecoys,
  type DecoyState,
} from '../../src/game/decoy';

// The decoy tests walk two grids: one straight open corridor (row y=2, cell
// centers on world y=0 — the taal/echo precedent) for the exit-walk, and one
// fully open 21×21 hall (cell centers x = −40..40) wide enough that BFS
// distances 8..12 from the player exist in every direction for the spawn
// window.
const corridor = (): FloorGrid => {
  const g = new FloorGrid(5, 5);
  for (let x = 0; x < 4; x++) g.setOpen(x, 2, Dir.East);
  return g;
};

const hall = (w = 21, h = 21): FloorGrid => {
  const g = new FloorGrid(w, h);
  for (let y = 0; h > 1 && y < h; y++)
    for (let x = 0; x < w; x++) {
      if (x < w - 1) g.setOpen(x, y, Dir.East);
      if (y < h - 1) g.setOpen(x, y, Dir.South);
    }
  return g;
};

const decoyAt = (id: number, x: number, y: number, over: Partial<DecoyState> = {}): DecoyState => ({
  id,
  x,
  y,
  born: 0,
  shattered: false,
  ...over,
});

describe('the DECOY_* constants (T5 Act II, pinned)', () => {
  it('pins the spawn cadence, the cap, the shard price and the stride', () => {
    expect(DECOY_SPAWN_EVERY_MS).toBe(45000);
    expect(DECOY_MAX_ALIVE).toBe(2);
    expect(DECOY_SHARD).toBe(5);
    expect(DECOY_SPEED).toBe(2.0);
  });
});

describe('spawnDecoy — a copy of you, 8–12 cells out', () => {
  it('lands on an open cell whose BFS distance from the player is 8..12', () => {
    const g = hall();
    const player = { x: 0, y: 0 }; // center cell (10,10)
    const field = buildFlowField(g, [g.cellAt(player.x, player.y)]);
    for (let i = 0; i < 200; i++) {
      const d = spawnDecoy([], player, g, createRng(`spawn-window-${i}`), i, 1000);
      expect(d).not.toBeNull();
      const cell = g.cellAt(d!.x, d!.y);
      const dist = field[cell.y * g.width + cell.x]!;
      expect(dist).toBeGreaterThanOrEqual(8);
      expect(dist).toBeLessThanOrEqual(12);
      // world position is that cell's center, exactly
      const { cx, cy } = g.cellCenter(cell.x, cell.y);
      expect(d!.x).toBe(cx);
      expect(d!.y).toBe(cy);
    }
  });

  it('carries the given id, the birth now, and an intact (unshattered) flag', () => {
    const g = hall();
    const d = spawnDecoy([], { x: 0, y: 0 }, g, createRng('spawn-fields'), 7, 4200);
    expect(d).toMatchObject({ id: 7, born: 4200, shattered: false });
  });

  it('is deterministic: the same rng seed picks the same cell', () => {
    const g = hall();
    const a = spawnDecoy([], { x: 0, y: 0 }, g, createRng('same-seed'), 0, 0);
    const b = spawnDecoy([], { x: 0, y: 0 }, g, createRng('same-seed'), 0, 0);
    expect(a).toEqual(b);
  });

  it('never spawns while DECOY_MAX_ALIVE unshattered decoys stand', () => {
    const g = hall();
    const first = spawnDecoy([], { x: 0, y: 0 }, g, createRng('cap-a'), 0, 0)!;
    const second = spawnDecoy([first], { x: 0, y: 0 }, g, createRng('cap-b'), 1, 0)!;
    expect(second).not.toBeNull();
    // two alive: the house holds its fire
    expect(
      spawnDecoy([first, second], { x: 0, y: 0 }, g, createRng('cap-c'), 2, 0),
    ).toBeNull();
  });

  it('shattered copies do not count against the cap — alive means unshattered', () => {
    const g = hall();
    const gone1 = { ...spawnDecoy([], { x: 0, y: 0 }, g, createRng('dead-a'), 0, 0)!, shattered: true };
    const gone2 = { ...spawnDecoy([gone1], { x: 0, y: 0 }, g, createRng('dead-b'), 1, 0)!, shattered: true };
    expect(
      spawnDecoy([gone1, gone2], { x: 0, y: 0 }, g, createRng('dead-c'), 2, 0),
    ).not.toBeNull();
  });

  it('a floor too small to hold an 8-cell distance spawns nothing', () => {
    const g = corridor(); // 5×5, max BFS distance from anywhere is < 8
    expect(spawnDecoy([], { x: 0, y: 0 }, g, createRng('tiny'), 0, 0)).toBeNull();
  });
});

describe('updateDecoys — the copy walks to the exit', () => {
  it('strides toward the exit cell center at DECOY_SPEED (pinned step)', () => {
    const g = corridor();
    // decoy on the corridor's west end (cell (0,2), world (−8,0)); exit cell
    // (4,2) at (+8,0): the first step is east, exactly speed·dt
    const d = decoyAt(0, -8, 0);
    const next = updateDecoys([d], g, { x: 4, y: 2 }, 1 / 120);
    expect(next[0]!.x).toBeCloseTo(-8 + (DECOY_SPEED * 1) / 120);
    expect(next[0]!.y).toBeCloseTo(0);
  });

  it('walks monotone: BFS distance to the exit never increases, arrival holds', () => {
    const g = hall();
    const exit = { x: 20, y: 20 }; // far corner of the open hall
    const field = buildFlowField(g, [exit]);
    // start on the west rim of the top row (cell (0,20), world (−40,40)):
    // 20 cells of corridor east = 80m = 40s of stride; 12000 fixed steps
    // (100s) crosses it twice over
    const d = decoyAt(0, -40, 40);
    let prevDist = Infinity;
    let cur = d;
    let arrived = false;
    for (let i = 0; i < 12000; i++) {
      cur = updateDecoys([cur], g, exit, 1 / 120)[0]!;
      expect(Number.isFinite(cur.x)).toBe(true);
      expect(Number.isFinite(cur.y)).toBe(true);
      const cell = g.cellAt(cur.x, cur.y);
      const dist = field[cell.y * g.width + cell.x]!;
      expect(dist).toBeLessThanOrEqual(prevDist); // monotone descent
      prevDist = dist;
      if (dist === 0) {
        arrived = true;
        break;
      }
    }
    expect(arrived).toBe(true);
    // inside the exit cell the walk finishes at its exact center, then holds
    // (no overshoot): converge, then assert the stride stopped
    const { cx, cy } = g.cellCenter(exit.x, exit.y);
    for (let i = 0; i < 2000 && (Math.abs(cur.x - cx) > 1e-9 || Math.abs(cur.y - cy) > 1e-9); i++)
      cur = updateDecoys([cur], g, exit, 1 / 120)[0]!;
    expect(cur.x).toBeCloseTo(cx);
    expect(cur.y).toBeCloseTo(cy);
    const held = updateDecoys([cur], g, exit, 1 / 120)[0]!;
    expect(held.x).toBe(cur.x); // dead center: further updates hold
    expect(held.y).toBe(cur.y);
  });

  it('a shattered copy never walks again', () => {
    const g = corridor();
    const d = decoyAt(0, -8, 0, { shattered: true });
    const next = updateDecoys([d], g, { x: 4, y: 2 }, 0.5);
    expect(next[0]!.x).toBe(-8);
    expect(next[0]!.y).toBe(0);
  });

  it('walks every unshattered copy and keeps ids and order stable', () => {
    const g = hall();
    const a = decoyAt(3, -40, 0); // cell (0,10) — same row as the exit (20,10)
    const b = decoyAt(4, -40, 4); // cell (0,11) — one row below
    const out = updateDecoys([a, b], g, { x: 20, y: 10 }, 1 / 120);
    expect(out.map((d) => d.id)).toEqual([3, 4]);
    expect(out[0]!.x).toBeGreaterThan(-40); // a strides east along the exit row
    expect(out[1]!.y).toBeLessThan(4); // b steps north (−y) toward the exit row
  });

  it('never mutates its input (the taal/echo contract)', () => {
    const g = corridor();
    const d = decoyAt(0, -8, 0);
    const before = { ...d };
    updateDecoys([d], g, { x: 4, y: 2 }, 1 / 120);
    expect(d).toEqual(before);
  });
});

describe('nearestDecoy — which copy is closest', () => {
  it('returns the strictly nearest unshattered decoy', () => {
    const far = decoyAt(0, 10, 0);
    const near = decoyAt(1, 2, 0);
    expect(nearestDecoy([far, near], 0, 0)).toBe(near);
  });

  it('ignores shattered copies', () => {
    const shatteredNear = decoyAt(0, 1, 0, { shattered: true });
    const aliveFar = decoyAt(1, 9, 0);
    expect(nearestDecoy([shatteredNear, aliveFar], 0, 0)).toBe(aliveFar);
    expect(nearestDecoy([shatteredNear], 0, 0)).toBeNull();
  });

  it('null on an empty floor — no copy exists', () => {
    expect(nearestDecoy([], 0, 0)).toBeNull();
  });
});

describe('shatterDecoys — the touch economy (once per copy)', () => {
  it('a copy within CONTACT_RADIUS of the player shatters for DECOY_SHARD shards', () => {
    const d = decoyAt(0, CONTACT_RADIUS - 0.1, 0);
    const out = shatterDecoys([d], { x: 0, y: 0 }, CONTACT_RADIUS);
    expect(out.decoys[0]!.shattered).toBe(true);
    expect(out.shards).toBe(DECOY_SHARD);
    expect(out.decoys[0]!.x).toBe(d.x); // the state rides, only the flag flips
  });

  it('a copy just outside CONTACT_RADIUS is untouched and pays nothing', () => {
    const d = decoyAt(0, CONTACT_RADIUS + 0.05, 0);
    const out = shatterDecoys([d], { x: 0, y: 0 }, CONTACT_RADIUS);
    expect(out.decoys[0]!.shattered).toBe(false);
    expect(out.shards).toBe(0);
  });

  it('shatter-once: an already-shattered copy never pays a second time', () => {
    const d = decoyAt(0, 0, 0);
    const first = shatterDecoys([d], { x: 0, y: 0 }, CONTACT_RADIUS);
    expect(first.shards).toBe(DECOY_SHARD);
    const second = shatterDecoys(first.decoys, { x: 0, y: 0 }, CONTACT_RADIUS);
    expect(second.shards).toBe(0);
    expect(second.decoys[0]!.shattered).toBe(true);
  });

  it('mixed floor: only the touched copy pays; the others keep walking', () => {
    const touched = decoyAt(0, 0.3, 0);
    const walking = decoyAt(1, -20, 0);
    const out = shatterDecoys([touched, walking], { x: 0, y: 0 }, CONTACT_RADIUS);
    expect(out.shards).toBe(DECOY_SHARD);
    expect(out.decoys[0]!.shattered).toBe(true);
    expect(out.decoys[1]!.shattered).toBe(false);
  });

  it('never mutates its input', () => {
    const d = decoyAt(0, 0, 0);
    const before = { ...d };
    shatterDecoys([d], { x: 0, y: 0 }, CONTACT_RADIUS);
    expect(d).toEqual(before);
  });
});
