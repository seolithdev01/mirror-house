// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { FloorGrid, Dir, type CellIndex } from '../../src/engine/grid';
import { bfsDistances } from '../../src/game/maze';
import {
  bestKey,
  completeTier,
  descend,
  DWAAR_LAYOUT,
  dwaarGrid,
  floorParams,
  floorSeed,
  isDwaar,
  newCampaign,
} from '../../src/game/campaign';
import { BEAT_TICK_MS, DWAAR_FLOOR, TAAL_FLOOR, TIER_ONE_FLOORS } from '../../src/engine/constants';

/** Build a FloorGrid from the layout: edges open only between adjacent open cells. */
function layoutGrid(): { grid: FloorGrid; open: CellIndex[] } {
  const g = new FloorGrid(13, 13);
  const open: CellIndex[] = [];
  DWAAR_LAYOUT.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '.') open.push({ x, y });
  });
  for (const c of open)
    for (const d of [Dir.East, Dir.South]) {
      const n = g.neighborIndex(c.x, c.y, d);
      if (n && DWAAR_LAYOUT[n.y]![n.x] === '.') g.setOpen(c.x, c.y, d);
    }
  return { grid: g, open };
}

describe('campaign constants', () => {
  it('pins the tier-one campaign constants', () => {
    expect(TIER_ONE_FLOORS).toBe(10);
    expect(DWAAR_FLOOR).toBe(10);
    expect(TAAL_FLOOR).toBe(5);
    expect(BEAT_TICK_MS).toBe(250);
  });
});

describe('newCampaign', () => {
  it('starts at floor 1, tier incomplete, seed preserved', () => {
    const c = newCampaign('ABCD');
    expect(c).toEqual({ seedBase: 'ABCD', floor: 1, tierComplete: false });
  });
});

describe('floorSeed / bestKey', () => {
  it('composes base and floor', () => {
    expect(floorSeed(newCampaign('QWERTY'))).toBe('QWERTY:1');
    expect(floorSeed(descend(newCampaign('QWERTY')))).toBe('QWERTY:2');
  });

  it('bestKey is the floor seed (per-floor best-time bucket)', () => {
    const c = descend(descend(newCampaign('ZZZZ')));
    expect(bestKey(c)).toBe(floorSeed(c));
    expect(bestKey(c)).toBe('ZZZZ:3');
  });
});

describe('descend', () => {
  it('increments the floor and stays pure', () => {
    const c = newCampaign('AAAA');
    const d = descend(c);
    expect(d.floor).toBe(2);
    expect(c.floor).toBe(1); // original untouched
    expect(d).not.toBe(c);
  });

  it('preserves seedBase and tierComplete', () => {
    const c = { seedBase: 'BBBB', floor: 3, tierComplete: true };
    expect(descend(c)).toEqual({ seedBase: 'BBBB', floor: 4, tierComplete: true });
  });

  it('walks the whole tier 1..10', () => {
    let c = newCampaign('CCCC');
    for (let i = 2; i <= TIER_ONE_FLOORS; i++) c = descend(c);
    expect(c.floor).toBe(TIER_ONE_FLOORS);
  });
});

describe('completeTier', () => {
  it('flags completion at the Dwaar floor', () => {
    let c = newCampaign('DDDD');
    for (let i = 1; i < DWAAR_FLOOR; i++) c = descend(c);
    const done = completeTier(c);
    expect(done.tierComplete).toBe(true);
    expect(done).not.toBe(c);
    expect(c.tierComplete).toBe(false); // pure
  });

  it('is a no-op below the Dwaar floor', () => {
    const c = descend(newCampaign('EEEE'));
    expect(completeTier(c)).toEqual(c);
  });
});

describe('isDwaar', () => {
  it('is true only for the Dwaar floor', () => {
    expect(isDwaar(10)).toBe(true);
    expect(isDwaar(1)).toBe(false);
    expect(isDwaar(9)).toBe(false);
    expect(isDwaar(11)).toBe(false);
    expect(isDwaar(DWAAR_FLOOR)).toBe(true);
  });
});

describe('floorParams ramp (all 10 floors pinned)', () => {
  // echoes = min(5, 2 + floor - 1) for 1..9, Dwaar fixed 4
  // beacons = 2,2,3,3,3,4,4,4,4,4
  // braid = 0.12 + 0.01*(floor-1)
  // chhayaDelayMs = max(4500, 7000 - 300*(floor-1)), Dwaar 4000
  const pinned: [number, number, number, number, number][] = [
    // floor, echoes, beacons, braid, chhayaDelayMs
    [1, 2, 2, 0.12, 7000],
    [2, 3, 2, 0.13, 6700],
    [3, 4, 3, 0.14, 6400],
    [4, 5, 3, 0.15, 6100],
    [5, 5, 3, 0.16, 5800],
    [6, 5, 4, 0.17, 5500],
    [7, 5, 4, 0.18, 5200],
    [8, 5, 4, 0.19, 4900],
    [9, 5, 4, 0.2, 4600],
    [10, 4, 4, 0.21, 4000],
  ];

  it('matches the pinned ramp for every tier-one floor', () => {
    expect(pinned.length).toBe(TIER_ONE_FLOORS);
    for (const [floor, echoes, beacons, braid, delay] of pinned) {
      const p = floorParams(floor);
      expect(p.echoes, `floor ${floor} echoes`).toBe(echoes);
      expect(p.beacons, `floor ${floor} beacons`).toBe(beacons);
      expect(p.braid, `floor ${floor} braid`).toBeCloseTo(braid, 10);
      expect(p.chhayaDelayMs, `floor ${floor} chhayaDelayMs`).toBe(delay);
    }
  });

  it('delays never drop below the 4500 clamp on procedural floors', () => {
    for (let f = 1; f < DWAAR_FLOOR; f++)
      expect(floorParams(f).chhayaDelayMs).toBeGreaterThanOrEqual(4500);
  });
});

describe('DWAAR_LAYOUT', () => {
  it('is 13 rows of 13 chars, walls and open cells only', () => {
    expect(DWAAR_LAYOUT.length).toBe(13);
    for (const row of DWAAR_LAYOUT) {
      expect(row.length).toBe(13);
      expect(row).toMatch(/^[#.]{13}$/);
    }
  });

  it('is symmetric under 180° rotation', () => {
    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 13; x++) expect(DWAAR_LAYOUT[y]![x]).toBe(DWAAR_LAYOUT[12 - y]![12 - x]);
  });

  it('all open cells are connected (BFS via maze bfsDistances)', () => {
    const { grid, open } = layoutGrid();
    const entrance = open[0]!; // first open cell row-major = (1,1)
    const dist = bfsDistances(grid, entrance);
    const reached = Array.from(dist).filter((d) => d >= 0).length;
    expect(open.length).toBe(83);
    expect(reached).toBe(open.length); // every open cell reachable, walls sealed off
  });

  it('entrance/exit are derivable: (1,1) → farthest open cell (11,11), 20 steps', () => {
    const { grid, open } = layoutGrid();
    const entrance = open[0]!;
    expect(entrance).toEqual({ x: 1, y: 1 });
    const dist = bfsDistances(grid, entrance);
    let best = 0;
    for (let i = 1; i < dist.length; i++) if (dist[i]! > dist[best]!) best = i;
    const exit: CellIndex = { x: best % 13, y: Math.floor(best / 13) };
    expect(exit).toEqual({ x: 11, y: 11 }); // bottom-right mirror of the entrance
    expect(dist[best]).toBe(20); // far — a real traverse of the hall
  });
});

describe('dwaarGrid', () => {
  it('derives the open-cell set from the layout, row-major', () => {
    const g = dwaarGrid();
    expect(g.width).toBe(13);
    expect(g.height).toBe(13);
    expect(g.open.length).toBe(83);
    expect(g.open[0]).toEqual({ x: 1, y: 1 });
    for (const c of g.open) expect(DWAAR_LAYOUT[c.y]![c.x]).toBe('.');
    const seen = new Set(g.open.map((c) => `${c.x},${c.y}`));
    expect(seen.size).toBe(g.open.length); // no duplicates
    // row-major order (entrance = first open cell)
    const sorted = [...g.open].sort((a, b) => a.y - b.y || a.x - b.x);
    expect(g.open).toEqual(sorted);
  });
});
