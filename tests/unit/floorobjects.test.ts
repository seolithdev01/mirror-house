// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { bfsDistances, generateFloor, TIER_ONE } from '../../src/game/maze';
import { mirrorSpots } from '../../src/game/mirror';
import { generateFloorObjects, mirrorSpotFor, M2_PARAMS } from '../../src/game/floorObjects';

const floor = generateFloor({ ...TIER_ONE, seed: 'OBJECTS' });

describe('generateFloorObjects', () => {
  it('is deterministic and matches params', () => {
    const a = generateFloorObjects(floor);
    const b = generateFloorObjects(floor);
    expect(a).toEqual(b);
    expect(a.mirrors.filter((m) => m.kind === 'standing')).toHaveLength(M2_PARAMS.standing);
    expect(a.mirrors.filter((m) => m.kind === 'beacon')).toHaveLength(M2_PARAMS.beacons);
    expect(a.mirrors.filter((m) => m.kind === 'true')).toHaveLength(2);
    expect(a.mirrors.filter((m) => m.kind === 'silvered')).toHaveLength(1);
    expect(a.echoSpawns).toHaveLength(M2_PARAMS.echoes);
    expect(a.patrolAnchors).toHaveLength(M2_PARAMS.anchors);
  });

  it('no two mirrors share a cell; true mirrors pair with each other', () => {
    const o = generateFloorObjects(floor);
    const cells = o.mirrors.map((m) => `${m.cellX},${m.cellY}`);
    expect(new Set(cells).size).toBe(cells.length);
    const trues = o.mirrors.filter((m) => m.kind === 'true');
    expect(trues[0]!.pairId).toBe(trues[1]!.id);
    expect(trues[1]!.pairId).toBe(trues[0]!.id);
    expect(o.mirrors.filter((m) => m.kind !== 'true').every((m) => m.pairId === null)).toBe(true);
  });

  it('wallDir is the mount dir for standing/silvered, null for beacon/true', () => {
    const o = generateFloorObjects(floor);
    for (const m of o.mirrors) {
      const spot = mirrorSpotFor(floor.grid, m.cellX, m.cellY);
      expect(spot).not.toBeNull();
      expect(m.wallDir).toBe(m.kind === 'standing' || m.kind === 'silvered' ? spot!.dir : null);
    }
  });

  it('beacons are far from the entrance and mutually spread', () => {
    const dist = bfsDistances(floor.grid, floor.entrance);
    const o = generateFloorObjects(floor);
    const beacons = o.mirrors.filter((m) => m.kind === 'beacon');
    // mutual spread: >= 4 Chebyshev apart (guaranteed on the 15x15 test grid)
    for (let i = 0; i < beacons.length; i++) {
      for (let j = i + 1; j < beacons.length; j++) {
        const a = beacons[i]!;
        const b = beacons[j]!;
        const cheb = Math.max(Math.abs(a.cellX - b.cellX), Math.abs(a.cellY - b.cellY));
        expect(cheb).toBeGreaterThanOrEqual(4);
      }
    }
    for (const m of beacons) {
      expect(dist[m.cellY * floor.grid.width + m.cellX]!).toBeGreaterThan(floor.grid.width / 2);
    }
  });

  it('mirrorSpotFor matches the mirror.ts wall-mount geometry (offset, facing into the cell)', () => {
    const heroSpots = mirrorSpots(floor);
    for (const [i, cell] of [floor.entrance, floor.exit].entries()) {
      const spot = mirrorSpotFor(floor.grid, cell.x, cell.y);
      expect(spot).not.toBeNull();
      expect(spot!.x).toBeCloseTo(heroSpots[i]!.x, 9);
      expect(spot!.z).toBeCloseTo(heroSpots[i]!.z, 9);
      expect(spot!.rotY).toBeCloseTo(heroSpots[i]!.rotY, 9);
    }
  });

  it('never crashes on degenerate tiny grids and stays deterministic', () => {
    const tiny = generateFloor({
      ...TIER_ONE,
      seed: 'TINY',
      width: 3,
      height: 3,
      braid: 0,
      rooms: 0,
      roomMin: 1,
      roomMax: 1,
    });
    const a = generateFloorObjects(tiny);
    const b = generateFloorObjects(tiny);
    expect(a).toEqual(b);
    expect(a.mirrors.length).toBeLessThanOrEqual(M2_PARAMS.standing + M2_PARAMS.beacons + 2 + 1);
  });
});

// T2 — ancestor portrait mirrors: 2–3 per tier-2 floor, wall-mounted like the
// standing glass, fogable echo eyes. The count itself is the floor rng's call
// (the param is the floor of the range — a coin adds one more).
describe('portraits — tier-2 ancestor mirrors (T2)', () => {
  const portraitFloor = (): ReturnType<typeof generateFloorObjects> =>
    generateFloorObjects(floor, { ...M2_PARAMS, portraits: 2 });

  it('places 2–3 portraits per floor, deterministic across rebuilds', () => {
    const a = portraitFloor();
    const b = portraitFloor();
    expect(a).toEqual(b);
    const portraits = a.mirrors.filter((m) => m.kind === 'portrait');
    expect(portraits.length).toBeGreaterThanOrEqual(2);
    expect(portraits.length).toBeLessThanOrEqual(3);
  });

  it('mounts every portrait on a wall exactly like the standing glass', () => {
    const portraits = portraitFloor().mirrors.filter((m) => m.kind === 'portrait');
    expect(portraits.length).toBeGreaterThan(0);
    for (const m of portraits) {
      const spot = mirrorSpotFor(floor.grid, m.cellX, m.cellY);
      expect(spot).not.toBeNull();
      expect(m.x).toBeCloseTo(spot!.x, 9);
      expect(m.z).toBeCloseTo(spot!.z, 9);
      expect(m.rotY).toBeCloseTo(spot!.rotY, 9);
      expect(m.pairId).toBeNull(); // portraits never pair
      expect(m.wallDir).toBeNull(); // and never open anything (not T7 doors)
    }
  });

  it("portrait cells never collide with another mirror's cell", () => {
    const o = portraitFloor();
    const cells = o.mirrors.map((m) => `${m.cellX},${m.cellY}`);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it('default params place zero portraits — the tier-1 experience is unchanged', () => {
    const o = generateFloorObjects(floor);
    expect(o.mirrors.filter((m) => m.kind === 'portrait')).toHaveLength(0);
    expect(generateFloorObjects(floor, { ...M2_PARAMS, portraits: 0 })).toEqual(o);
  });
});
