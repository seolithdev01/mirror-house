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
