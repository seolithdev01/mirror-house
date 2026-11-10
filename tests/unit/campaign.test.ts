// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { FloorGrid, Dir, type CellIndex } from '../../src/engine/grid';
import { bfsDistances } from '../../src/game/maze';
import {
  bestKey,
  completeTier,
  descend,
  DWAAR_II_LAYOUT,
  DWAAR_LAYOUT,
  dwaarGrid,
  floorParams,
  floorSeed,
  isDwaar,
  newCampaign,
  tierOf,
} from '../../src/game/campaign';
import {
  BEAT_TICK_MS,
  DWAAR_FLOOR,
  TAAL_FLOOR,
  TIER_ONE_FLOORS,
  TIER_TWO_FLOORS,
} from '../../src/engine/constants';

/** Build a FloorGrid from a layout: edges open only between adjacent open cells. */
function layoutGrid(layout: readonly string[] = DWAAR_LAYOUT): {
  grid: FloorGrid;
  open: CellIndex[];
} {
  const g = new FloorGrid(13, 13);
  const open: CellIndex[] = [];
  layout.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '.') open.push({ x, y });
  });
  for (const c of open)
    for (const d of [Dir.East, Dir.South]) {
      const n = g.neighborIndex(c.x, c.y, d);
      if (n && layout[n.y]![n.x] === '.') g.setOpen(c.x, c.y, d);
    }
  return { grid: g, open };
}

/** Count pillar cells — interior wall cells whose four neighbors are all open
 *  (the Dwaar II chamber's columns). */
function pillarCount(layout: readonly string[]): number {
  const isOpen = (x: number, y: number): boolean => layout[y]![x] === '.';
  let pillars = 0;
  for (let y = 1; y < 12; y++)
    for (let x = 1; x < 12; x++)
      if (
        !isOpen(x, y) &&
        isOpen(x + 1, y) &&
        isOpen(x - 1, y) &&
        isOpen(x, y + 1) &&
        isOpen(x, y - 1)
      )
        pillars++;
  return pillars;
}

describe('campaign constants', () => {
  it('pins the tier-one campaign constants', () => {
    expect(TIER_ONE_FLOORS).toBe(10);
    expect(DWAAR_FLOOR).toBe(10);
    expect(TAAL_FLOOR).toBe(5);
    expect(BEAT_TICK_MS).toBe(250);
  });

  it('pins the tier-two campaign constant — 20 floors, Dwaar II on the last', () => {
    expect(TIER_TWO_FLOORS).toBe(20);
  });
});

describe('tierOf', () => {
  it('splits the campaign at floor 10: 1–10 → 1, 11–20 → 2', () => {
    expect(tierOf(1)).toBe(1);
    expect(tierOf(5)).toBe(1);
    expect(tierOf(10)).toBe(1);
    expect(tierOf(11)).toBe(2);
    expect(tierOf(14)).toBe(2);
    expect(tierOf(20)).toBe(2);
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

  it('walks the whole campaign 1..20', () => {
    let c = newCampaign('CCCC');
    for (let i = 2; i <= TIER_TWO_FLOORS; i++) c = descend(c);
    expect(c.floor).toBe(TIER_TWO_FLOORS);
  });

  it('leaving Dwaar I re-arms the tier flag for tier two (Act I continues)', () => {
    // the claim at floor 10 sets the flag; the stairs into the Hall of
    // Ancestors clear it so tier-two floors pay their first-clear bonus
    const d = descend({ seedBase: 'DDDD', floor: DWAAR_FLOOR, tierComplete: true });
    expect(d).toEqual({ seedBase: 'DDDD', floor: 11, tierComplete: false });
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

  it('flags completion at Dwaar II — the single flag set again at floor 20', () => {
    let c = newCampaign('DDDD');
    for (let i = 1; i < TIER_TWO_FLOORS; i++) c = descend(c);
    expect(c.tierComplete).toBe(false); // the descent from 10 re-armed it
    const done = completeTier(c);
    expect(done.tierComplete).toBe(true);
  });

  it('is a no-op below the Dwaar floor', () => {
    const c = descend(newCampaign('EEEE'));
    expect(completeTier(c)).toEqual(c);
  });

  it('is a no-op on tier-two procedural floors 11..19', () => {
    const c = { seedBase: 'FFFF', floor: 14, tierComplete: false };
    expect(completeTier(c)).toEqual(c);
  });
});

describe('isDwaar', () => {
  it('is true only for the Dwaar floors', () => {
    expect(isDwaar(10)).toBe(true);
    expect(isDwaar(20)).toBe(true);
    expect(isDwaar(1)).toBe(false);
    expect(isDwaar(9)).toBe(false);
    expect(isDwaar(11)).toBe(false);
    expect(isDwaar(19)).toBe(false);
    expect(isDwaar(DWAAR_FLOOR)).toBe(true);
    expect(isDwaar(TIER_TWO_FLOORS)).toBe(true);
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

describe('floorParams tier-two ramp (floors 11–20 pinned)', () => {
  // echoes = 5,5,5,6,6,6,6,6,6,6 (Dwaar II fixed 5)
  // beacons = 4 on every tier-two floor
  // braid = 0.22 + 0.005*(f-11)
  // chhayaDelayMs = max(4000, 4500 - 50*(f-11)) (Dwaar II 3800)
  const pinned: [number, number, number, number, number][] = [
    // floor, echoes, beacons, braid, chhayaDelayMs
    [11, 5, 4, 0.22, 4500],
    [12, 5, 4, 0.225, 4450],
    [13, 5, 4, 0.23, 4400],
    [14, 6, 4, 0.235, 4350],
    [15, 6, 4, 0.24, 4300],
    [16, 6, 4, 0.245, 4250],
    [17, 6, 4, 0.25, 4200],
    [18, 6, 4, 0.255, 4150],
    [19, 6, 4, 0.26, 4100],
    [20, 5, 4, 0.265, 3800],
  ];

  it('matches the pinned ramp for every tier-two floor', () => {
    expect(pinned.length).toBe(TIER_TWO_FLOORS - TIER_ONE_FLOORS);
    for (const [floor, echoes, beacons, braid, delay] of pinned) {
      const p = floorParams(floor);
      expect(p.echoes, `floor ${floor} echoes`).toBe(echoes);
      expect(p.beacons, `floor ${floor} beacons`).toBe(beacons);
      expect(p.braid, `floor ${floor} braid`).toBeCloseTo(braid, 10);
      expect(p.chhayaDelayMs, `floor ${floor} chhayaDelayMs`).toBe(delay);
    }
  });

  it('delays never drop below the 4000 clamp on tier-two procedural floors', () => {
    for (let f = TIER_ONE_FLOORS + 1; f < TIER_TWO_FLOORS; f++)
      expect(floorParams(f).chhayaDelayMs).toBeGreaterThanOrEqual(4000);
  });

  it('clamps floors past the campaign to the Dwaar II values', () => {
    expect(floorParams(99)).toEqual(floorParams(TIER_TWO_FLOORS));
  });

  it('leaves every tier-one pin untouched (the tier-one experience is frozen)', () => {
    for (let f = 1; f <= TIER_ONE_FLOORS; f++) {
      const p = floorParams(f);
      expect(p.echoes, `floor ${f} echoes`).toBe(f === DWAAR_FLOOR ? 4 : Math.min(5, 2 + f - 1));
      expect(p.braid, `floor ${f} braid`).toBeCloseTo(0.12 + 0.01 * (f - 1), 10);
    }
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

  it('derives the Dwaar II open-cell set from DWAAR_II_LAYOUT for floor 20', () => {
    const g = dwaarGrid(TIER_TWO_FLOORS);
    expect(g.width).toBe(13);
    expect(g.height).toBe(13);
    expect(g.open.length).toBe(96);
    expect(g.open[0]).toEqual({ x: 1, y: 1 });
    for (const c of g.open) expect(DWAAR_II_LAYOUT[c.y]![c.x]).toBe('.');
    const seen = new Set(g.open.map((c) => `${c.x},${c.y}`));
    expect(seen.size).toBe(g.open.length); // no duplicates
    const sorted = [...g.open].sort((a, b) => a.y - b.y || a.x - b.x);
    expect(g.open).toEqual(sorted);
  });
});

describe("DWAAR_II_LAYOUT — Taal's hall", () => {
  it('is 13 rows of 13 chars, walls and open cells only', () => {
    expect(DWAAR_II_LAYOUT.length).toBe(13);
    for (const row of DWAAR_II_LAYOUT) {
      expect(row.length).toBe(13);
      expect(row).toMatch(/^[#.]{13}$/);
    }
  });

  it('is symmetric under 180° rotation', () => {
    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 13; x++)
        expect(DWAAR_II_LAYOUT[y]![x]).toBe(DWAAR_II_LAYOUT[12 - y]![12 - x]);
  });

  it('is MORE OPEN than Dwaar I: 96 open cells vs 83', () => {
    const count = (layout: readonly string[]): number =>
      layout.reduce((n, row) => n + [...row].filter((c) => c === '.').length, 0);
    expect(count(DWAAR_II_LAYOUT)).toBe(96);
    expect(count(DWAAR_II_LAYOUT)).toBeGreaterThan(count(DWAAR_LAYOUT)); // 83
  });

  it('carries pillar cells in the central chamber (isolated wall columns)', () => {
    expect(pillarCount(DWAAR_II_LAYOUT)).toBe(5); // the chamber's five columns
  });

  it('all open cells are connected (BFS via maze bfsDistances)', () => {
    const { grid, open } = layoutGrid(DWAAR_II_LAYOUT);
    const entrance = open[0]!; // first open cell row-major = (1,1)
    const dist = bfsDistances(grid, entrance);
    const reached = Array.from(dist).filter((d) => d >= 0).length;
    expect(open.length).toBe(96);
    expect(reached).toBe(open.length); // every open cell reachable, walls sealed off
  });

  it('entrance/exit are derivable: (1,1) → farthest open cell (11,11), 20 steps', () => {
    const { grid, open } = layoutGrid(DWAAR_II_LAYOUT);
    const entrance = open[0]!;
    expect(entrance).toEqual({ x: 1, y: 1 });
    const dist = bfsDistances(grid, entrance);
    let best = 0;
    for (let i = 1; i < dist.length; i++) if (dist[i]! > dist[best]!) best = i;
    const exit: CellIndex = { x: best % 13, y: Math.floor(best / 13) };
    expect(exit).toEqual({ x: 11, y: 11 }); // bottom-right mirror of the entrance
    expect(dist[best]).toBe(20); // a real traverse of the hall
  });
});
