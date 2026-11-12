// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { WATER_RIPPLE_MS, WATER_RIPPLE_RADIUS } from '../../src/engine/constants';
import {
  generateFloorObjects,
  M2_PARAMS,
  textureParamsForTier,
} from '../../src/game/floorObjects';
import { initWaterRuntime, rippleState, rippleTrigger } from '../../src/game/water';
import { floorFromGrid, generateFloor, TIER_ONE, type Floor } from '../../src/game/maze';
import { dwaarGrid, floorParams, floorSeed, isDwaar } from '../../src/game/campaign';

// T3/T3 — the water-mirrors' pure core. rippleState is the TTL derivation
// every consumer shares (echo senses, the patch dim, the map dot); the
// exclusive-expiry contract mirrors the fog timers (the last blinded ms is
// in, `at + TTL` is out).
describe('rippleState — the blindness TTL', () => {
  it('still water (null) is never blinded', () => {
    expect(rippleState(null, 0)).toBe(false);
    expect(rippleState(null, 1_000_000)).toBe(false);
  });

  it('the ripple moment itself is blinded', () => {
    expect(rippleState(1000, 1000)).toBe(true);
  });

  it('the last ms of the TTL is blinded, expiry is not (exclusive)', () => {
    expect(rippleState(1000, 1000 + WATER_RIPPLE_MS - 1)).toBe(true);
    expect(rippleState(1000, 1000 + WATER_RIPPLE_MS)).toBe(false);
  });

  it('the TTL is WATER_RIPPLE_MS long (10 s)', () => {
    expect(WATER_RIPPLE_MS).toBe(10_000);
  });
});

describe('rippleTrigger — which pools the player disturbs', () => {
  // spaced ≥ 2·WATER_RIPPLE_RADIUS apart so single-pool assertions stay clean
  const pools = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 40, y: 0 },
  ];

  it('the rim is inclusive (the FOG_RANGE convention)', () => {
    expect(WATER_RIPPLE_RADIUS).toBe(1.4);
    expect(rippleTrigger(WATER_RIPPLE_RADIUS, 0, pools)).toEqual([0]);
  });

  it('just past the rim does not ripple', () => {
    expect(rippleTrigger(WATER_RIPPLE_RADIUS + 0.01, 0, pools)).toEqual([]);
  });

  it('standing on the center ripples; several pools can ripple at once', () => {
    expect(rippleTrigger(0, 0, pools)).toEqual([0]);
    // two pools 2 m apart, the player between them: 1 m from each — both ripple
    const pair = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ];
    expect(rippleTrigger(1, 0, pair)).toEqual([0, 1]);
  });

  it('distance is euclidean in the plane, not per-axis', () => {
    // (0.7, 0.7) is exactly 0.7·√2 ≈ 0.9899 m from pool 0 — inside the rim
    expect(rippleTrigger(0.7, 0.7, pools)).toEqual([0]);
    // (1.2, 1.2) is ≈ 1.697 m out — outside
    expect(rippleTrigger(1.2, 1.2, pools)).toEqual([]);
  });

  it('no pools, no ripples', () => {
    expect(rippleTrigger(0, 0, [])).toEqual([]);
  });
});

// The placement half: pools are CELL features (2–4 per tier-3 floor via the
// rng-gated param), and the gate is the whole tier-1/2 contract — water draws
// happen ONLY when params.water > 0, and LAST in the stream, so the tier-1/2
// rng order (and therefore every floor below 21) is byte-identical.
describe('water placement — tier-3 pools, tier-1/2 streams untouched', () => {
  const floor = generateFloor({ ...TIER_ONE, seed: 'WATER' });

  it('asks for 2–4 pools (the param is the floor of the range, one int(3) coin)', () => {
    const o = generateFloorObjects(floor, { ...M2_PARAMS, water: 2 });
    expect(o.water.length).toBeGreaterThanOrEqual(2);
    expect(o.water.length).toBeLessThanOrEqual(4);
  });

  it('is deterministic across rebuilds of the same floor', () => {
    const a = generateFloorObjects(floor, { ...M2_PARAMS, water: 2 });
    const b = generateFloorObjects(floor, { ...M2_PARAMS, water: 2 });
    expect(a.water).toEqual(b.water);
  });

  it('pools sit at open cell centers, never the entrance/exit and never within 2 cells of either', () => {
    const o = generateFloorObjects(floor, { ...M2_PARAMS, water: 2 });
    expect(o.water.length).toBeGreaterThan(0);
    const centers = new Set<string>();
    for (let y = 0; y < floor.grid.height; y++)
      for (let x = 0; x < floor.grid.width; x++) {
        const { cx, cy } = floor.grid.cellCenter(x, y);
        centers.add(`${cx},${cy}`);
      }
    for (const p of o.water) {
      expect(centers.has(`${p.x},${p.y}`), `${p.x},${p.y} is a cell center`).toBe(true);
      const cell = floor.grid.cellAt(p.x, p.y);
      const dIn = Math.max(
        Math.abs(cell.x - floor.entrance.x),
        Math.abs(cell.y - floor.entrance.y),
      );
      const dOut = Math.max(Math.abs(cell.x - floor.exit.x), Math.abs(cell.y - floor.exit.y));
      expect(dIn, 'not within 2 cells of the entrance').toBeGreaterThanOrEqual(2);
      expect(dOut, 'not within 2 cells of the exit').toBeGreaterThanOrEqual(2);
    }
  });

  it('no two pools share a cell', () => {
    const o = generateFloorObjects(floor, { ...M2_PARAMS, water: 2 });
    const cells = o.water.map((p) => `${p.x},${p.y}`);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it('default params place zero pools — the tier-1/2 experience is unchanged', () => {
    const o = generateFloorObjects(floor);
    expect(o.water).toEqual([]);
    expect(generateFloorObjects(floor, { ...M2_PARAMS, water: 0 })).toEqual(o);
  });

  it('the tier-1/2 rng streams are untouched: water draws append, they never perturb', () => {
    const plain = generateFloorObjects(floor);
    const withWater = generateFloorObjects(floor, { ...M2_PARAMS, water: 3 });
    expect(withWater.mirrors).toEqual(plain.mirrors);
    expect(withWater.echoSpawns).toEqual(plain.echoSpawns);
    expect(withWater.patrolAnchors).toEqual(plain.patrolAnchors);
  });
});

// ---------------------------------------------------------------------------
// T9/T2 — the Warrens' water. The Gardens' branch draws again, on new floors:
// every tier-9 floor (81–89 procedural on the ramp braid, Dwaar IX from its
// layout) pools 2–3 standing pools — the tier-3 ask with the roll thinned to
// int(2) (textureParamsForTier(9).waterRoll) — at the SAME cell rule (open,
// ≥ 2 Chebyshev from both entrance and exit). The tier-3 streams stay
// byte-identical (the floors 1–80 sweep in floorobjects.test.ts pins them).
// ---------------------------------------------------------------------------
const warrenFloor = (f: number): Floor => {
  const seed = floorSeed({ seedBase: 'WARDEN', floor: f, tierComplete: false });
  return isDwaar(f)
    ? floorFromGrid(dwaarGrid(f), seed)
    : generateFloor({ ...TIER_ONE, seed, braid: floorParams(f).braid });
};

describe('water placement — the Warrens\u2019 return (T9/T2)', () => {
  const t9 = textureParamsForTier(9);
  const warrenObjects = (f: number): ReturnType<typeof generateFloorObjects> =>
    generateFloorObjects(warrenFloor(f), { ...M2_PARAMS, ...t9 });

  it('pools 2–3 on every Warrens floor 81–90, procedural and Dwaar IX alike', () => {
    for (let f = 81; f <= 90; f++) {
      const o = warrenObjects(f);
      expect(o.water.length >= 2, `floor ${f}: ${o.water.length} pools`).toBe(true);
      expect(o.water.length <= 3, `floor ${f}: ${o.water.length} pools`).toBe(true);
    }
  });

  it('is deterministic across rebuilds of the same warren floor', () => {
    const a = warrenObjects(81);
    const b = warrenObjects(81);
    expect(a).toEqual(b);
  });

  it('pools sit at open cell centers, never the entrance/exit and never within 2 cells of either', () => {
    for (const f of [81, 85, 90]) {
      const floor = warrenFloor(f);
      const o = warrenObjects(f);
      expect(o.water.length).toBeGreaterThan(0);
      const centers = new Set<string>();
      for (let y = 0; y < floor.grid.height; y++)
        for (let x = 0; x < floor.grid.width; x++) {
          const { cx, cy } = floor.grid.cellCenter(x, y);
          centers.add(`${cx},${cy}`);
        }
      for (const p of o.water) {
        expect(centers.has(`${p.x},${p.y}`), `${f}: ${p.x},${p.y} is a cell center`).toBe(true);
        const cell = floor.grid.cellAt(p.x, p.y);
        const dIn = Math.max(
          Math.abs(cell.x - floor.entrance.x),
          Math.abs(cell.y - floor.entrance.y),
        );
        const dOut = Math.max(Math.abs(cell.x - floor.exit.x), Math.abs(cell.y - floor.exit.y));
        expect(dIn, `${f}: not within 2 cells of the entrance`).toBeGreaterThanOrEqual(2);
        expect(dOut, `${f}: not within 2 cells of the exit`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('no two warren pools share a cell', () => {
    for (let f = 81; f <= 90; f++) {
      const cells = warrenObjects(f).water.map((p) => `${p.x},${p.y}`);
      expect(new Set(cells).size, `floor ${f}`).toBe(cells.length);
    }
  });

  it('the tier-9 draws append — they never perturb the mirrors, spawns or anchors drawn before them', () => {
    const plain = generateFloorObjects(warrenFloor(84), { ...M2_PARAMS });
    const dressed = warrenObjects(84);
    // the pools never touch mirror cells and draw AFTER every mirror kind:
    // the pre-existing glass is id-for-id identical
    expect(dressed.mirrors.filter((m) => m.kind !== 'distort')).toEqual(plain.mirrors);
    expect(dressed.echoSpawns).toEqual(plain.echoSpawns);
    expect(dressed.patrolAnchors).toEqual(plain.patrolAnchors);
  });

  it('the Gardens\u2019 roll stays int(3) — a tier-3 ask of 2 still places 2–4, the Warrens\u2019 2–3', () => {
    // the same floor seed, the two rolls: only the upper bound moves
    for (let roll = 0; roll < 16; roll++) {
      const f = 21 + (roll % 10); // tier-3 floors for the Gardens' ask
      const g = generateFloorObjects(warrenFloor(f), {
        ...M2_PARAMS,
        water: 2,
        waterRoll: 3,
      });
      expect(g.water.length >= 2 && g.water.length <= 4, `floor ${f} gardens`).toBe(true);
    }
    for (let f = 81; f <= 90; f++) {
      const w = generateFloorObjects(warrenFloor(f), {
        ...M2_PARAMS,
        water: 2,
        waterRoll: 2,
      });
      expect(w.water.length >= 2 && w.water.length <= 3, `floor ${f} warrens`).toBe(true);
    }
  });
});

describe('initWaterRuntime — the ripple state binding', () => {
  it('binds placed pools to still water (rippledAt null), 1:1 and in order', () => {
    const pools = [
      { x: -2, y: 0 },
      { x: 6, y: 8 },
    ];
    const rt = initWaterRuntime(pools);
    expect(rt).toEqual([
      { x: -2, y: 0, rippledAt: null },
      { x: 6, y: 8, rippledAt: null },
    ]);
    // still water senses through (the runtime feeds rippleState directly)
    expect(rippleState(rt[0]!.rippledAt, 500)).toBe(false);
  });
});
