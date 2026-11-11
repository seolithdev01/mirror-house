// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { FloorGrid, Dir, type CellIndex } from '../../src/engine/grid';
import { bfsDistances } from '../../src/game/maze';
import {
  aavartPresent,
  bestKey,
  completeTier,
  descend,
  DWAAR_II_LAYOUT,
  DWAAR_III_LAYOUT,
  DWAAR_IV_LAYOUT,
  DWAAR_LAYOUT,
  DWAAR_V_LAYOUT,
  dwaarGrid,
  floorParams,
  floorSeed,
  gherPresent,
  isDwaar,
  newCampaign,
  taalPresent,
  tierOf,
} from '../../src/game/campaign';
import {
  BEAT_TICK_MS,
  DWAAR_FLOOR,
  TAAL_FLOOR,
  TIER_ONE_FLOORS,
  TIER_FIVE_FLOORS,
  TIER_FOUR_FLOORS,
  TIER_THREE_FLOORS,
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

  it('pins the tier-three campaign constant — 30 floors, Dwaar III on the last', () => {
    expect(TIER_THREE_FLOORS).toBe(30);
  });

  it('pins the tier-four campaign constant — 40 floors, Dwaar IV on the last (Act I closes)', () => {
    expect(TIER_FOUR_FLOORS).toBe(40);
  });

  it('T5 — pins the tier-five campaign constant — 50 floors, Dwaar V on the last (Act II opens)', () => {
    expect(TIER_FIVE_FLOORS).toBe(50);
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

  it('splits the campaign at floor 20: 21–30 → 3', () => {
    expect(tierOf(21)).toBe(3);
    expect(tierOf(24)).toBe(3);
    expect(tierOf(29)).toBe(3);
    expect(tierOf(30)).toBe(3);
  });

  it('T4 — splits the campaign at floor 30: 31–40 → 4 (the Carnival of Faces)', () => {
    expect(tierOf(31)).toBe(4);
    expect(tierOf(34)).toBe(4);
    expect(tierOf(39)).toBe(4);
    expect(tierOf(40)).toBe(4);
  });

  it('T5 — splits the campaign at floor 40: 41–50 → 5 (the Flood Halls)', () => {
    expect(tierOf(41)).toBe(5);
    expect(tierOf(44)).toBe(5);
    expect(tierOf(49)).toBe(5);
    expect(tierOf(50)).toBe(5);
    // and 50 is a tier of its OWN — never a relabel of 2/3/4 (the dressing
    // gates below read equality against 2/3/4 and must keep reading false)
    expect(tierOf(50)).not.toBe(2);
    expect(tierOf(50)).not.toBe(3);
    expect(tierOf(50)).not.toBe(4);
  });

  it('T5 — the tier-exclusive dressing gates stay put: portraits t2, water t3, distort t4', () => {
    // the placement gates in the floor builder read `tierOf(floor) === N`
    // equality — every Act II floor must fail all three so the Flood Halls
    // hang no ancestor portraits, pool no water and mount no carnival glass
    for (let f = TIER_FOUR_FLOORS + 1; f <= TIER_FIVE_FLOORS; f++) {
      expect(tierOf(f) === 2, `floor ${f} portraits gate`).toBe(false);
      expect(tierOf(f) === 3, `floor ${f} water gate`).toBe(false);
      expect(tierOf(f) === 4, `floor ${f} distort gate`).toBe(false);
    }
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

  it('walks the whole campaign 1..30', () => {
    let c = newCampaign('CCCC');
    for (let i = 2; i <= TIER_THREE_FLOORS; i++) c = descend(c);
    expect(c.floor).toBe(TIER_THREE_FLOORS);
  });

  it('leaving Dwaar I re-arms the tier flag for tier two (Act I continues)', () => {
    // the claim at floor 10 sets the flag; the stairs into the Hall of
    // Ancestors clear it so tier-two floors pay their first-clear bonus
    const d = descend({ seedBase: 'DDDD', floor: DWAAR_FLOOR, tierComplete: true });
    expect(d).toEqual({ seedBase: 'DDDD', floor: 11, tierComplete: false });
  });

  it('leaving Dwaar II re-arms the tier flag for tier three (Act II continues)', () => {
    // T3 — the same contract one tier down: the claim at floor 20 sets the
    // flag; the stairs into the Reflecting Gardens clear it so tier-three
    // floors pay their first-clear bonus
    const d = descend({ seedBase: 'DDDD', floor: TIER_TWO_FLOORS, tierComplete: true });
    expect(d).toEqual({ seedBase: 'DDDD', floor: 21, tierComplete: false });
  });

  it('T4 — leaving Dwaar III re-arms the tier flag for tier four (Act I continues)', () => {
    // the claim at floor 30 sets the flag; the stairs into the Carnival of
    // Faces clear it so tier-four floors pay their first-clear bonus
    const d = descend({ seedBase: 'DDDD', floor: TIER_THREE_FLOORS, tierComplete: true });
    expect(d).toEqual({ seedBase: 'DDDD', floor: 31, tierComplete: false });
  });

  it('T4 — walks the whole campaign 1..40', () => {
    let c = newCampaign('CCCC');
    for (let i = 2; i <= TIER_FOUR_FLOORS; i++) c = descend(c);
    expect(c.floor).toBe(TIER_FOUR_FLOORS);
  });

  it('T5 — walks the whole campaign 1..50', () => {
    let c = newCampaign('CCCC');
    for (let i = 2; i <= TIER_FIVE_FLOORS; i++) c = descend(c);
    expect(c.floor).toBe(TIER_FIVE_FLOORS);
  });

  it('T5 — leaving Dwaar IV re-arms the tier flag for tier five (Act II opens)', () => {
    // the T5 ratification: Act I no longer CLOSES the campaign at 40 — the
    // claim at floor 40 banks, and the stairs into the Flood Halls clear the
    // flag so tier-five floors pay their first-clear bonus (the act screen
    // is retired; the Act II banner greets floor 41 instead).
    const d = descend({ seedBase: 'DDDD', floor: TIER_FOUR_FLOORS, tierComplete: true });
    expect(d).toEqual({ seedBase: 'DDDD', floor: 41, tierComplete: false });
  });

  it('T5 — descend at floor 50 is a NO-OP returning the same object (the campaign is terminal)', () => {
    // §2.3 — Dwaar V closes Act II: there is no floor 51 until Act III
    // exists, so the stair door at 50 opens onto the tier screen and the
    // descend itself must refuse — the SAME object back, not a copy.
    const at50 = { seedBase: 'TTTT', floor: TIER_FIVE_FLOORS, tierComplete: true };
    expect(descend(at50)).toBe(at50);
    expect(descend(at50)).toEqual({ seedBase: 'TTTT', floor: 50, tierComplete: true });
    // the flag survives the no-op untouched (no re-arm past the tier close)
    expect(at50.tierComplete).toBe(true);
  });

  it('T5 — the campaign walks straight through the old Act I terminus', () => {
    // the T4 no-op at 40 is RETIRED: 40 → 41 is a real descent now (the
    // terminal floor moved to 50), purity preserved
    const at40 = { seedBase: 'UUUU', floor: 40, tierComplete: false };
    const d = descend(at40);
    expect(d.floor).toBe(41);
    expect(d).not.toBe(at40);
    expect(at40.floor).toBe(40); // original untouched
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

  it('flags completion at Dwaar III — the single flag set a third time at floor 30', () => {
    let c = newCampaign('DDDD');
    for (let i = 1; i < TIER_THREE_FLOORS; i++) c = descend(c);
    expect(c.tierComplete).toBe(false); // the descent from 20 re-armed it
    const done = completeTier(c);
    expect(done.tierComplete).toBe(true);
  });

  it('is a no-op on tier-three procedural floors 21..29', () => {
    const c = { seedBase: 'GGGG', floor: 27, tierComplete: false };
    expect(completeTier(c)).toEqual(c);
  });

  it('T4 — flags completion at Dwaar IV, the single flag set a fourth time at floor 40', () => {
    let c = newCampaign('DDDD');
    for (let i = 1; i < TIER_FOUR_FLOORS; i++) c = descend(c);
    expect(c.floor).toBe(40);
    expect(c.tierComplete).toBe(false); // the descent from 30 re-armed it
    const done = completeTier(c);
    expect(done.tierComplete).toBe(true);
  });

  it('T4 — is a no-op on tier-four procedural floors 31..39', () => {
    const c = { seedBase: 'HHHH', floor: 37, tierComplete: false };
    expect(completeTier(c)).toEqual(c);
  });

  it('T5 — flags completion at Dwaar V, the single flag set a fifth time at floor 50', () => {
    let c = newCampaign('DDDD');
    for (let i = 1; i < TIER_FIVE_FLOORS; i++) c = descend(c);
    expect(c.floor).toBe(50);
    expect(c.tierComplete).toBe(false); // the descent from 40 re-armed it
    const done = completeTier(c);
    expect(done.tierComplete).toBe(true);
  });

  it('T5 — is a no-op on tier-five procedural floors 41..49', () => {
    for (const floor of [41, 45, 49]) {
      const c = { seedBase: 'IIII', floor, tierComplete: false };
      expect(completeTier(c), `floor ${floor}`).toEqual(c);
    }
  });
});

describe('isDwaar', () => {
  it('is true only for the Dwaar floors', () => {
    expect(isDwaar(10)).toBe(true);
    expect(isDwaar(20)).toBe(true);
    expect(isDwaar(30)).toBe(true);
    expect(isDwaar(1)).toBe(false);
    expect(isDwaar(9)).toBe(false);
    expect(isDwaar(11)).toBe(false);
    expect(isDwaar(19)).toBe(false);
    expect(isDwaar(21)).toBe(false);
    expect(isDwaar(29)).toBe(false);
    expect(isDwaar(DWAAR_FLOOR)).toBe(true);
    expect(isDwaar(TIER_TWO_FLOORS)).toBe(true);
    expect(isDwaar(TIER_THREE_FLOORS)).toBe(true);
  });

  it('T4 — Dwaar IV joins the set at floor 40; 31..39 stay procedural', () => {
    expect(isDwaar(TIER_FOUR_FLOORS)).toBe(true);
    expect(isDwaar(40)).toBe(true);
    expect(isDwaar(31)).toBe(false);
    expect(isDwaar(39)).toBe(false);
    expect(isDwaar(41)).toBe(false); // Act II's first ramp floor — never a Dwaar
  });

  it('T5 — Dwaar V joins the set at floor 50; 41..49 stay procedural', () => {
    expect(isDwaar(TIER_FIVE_FLOORS)).toBe(true);
    expect(isDwaar(50)).toBe(true);
    for (const floor of [41, 44, 49]) expect(isDwaar(floor), `floor ${floor}`).toBe(false);
    expect(isDwaar(51)).toBe(false); // past the tier close — never a Dwaar
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

  it('clamps floors past the campaign to the terminal floor (T5: Dwaar V)', () => {
    // T3 pinned this to the Dwaar III values; T4 moved it to Dwaar IV's row;
    // T5 widens the campaign to 50, so the clamp lands on Dwaar V's row.
    expect(floorParams(99)).toEqual(floorParams(TIER_FIVE_FLOORS));
    expect(floorParams(99)).not.toEqual(floorParams(TIER_FOUR_FLOORS));
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

describe('floorParams tier-three ramp (floors 21–30 pinned)', () => {
  // T3 — the Reflecting Gardens: echoes 6 on every floor (Dwaar III fixed 6
  // too — the water-mirrors are the tier's teeth, not the count); beacons 4;
  // braid = 0.24 + 0.004*(f-21); chhayaDelayMs = max(3600, 4200 - 60*(f-21))
  // (Dwaar III 3400).
  const pinned: [number, number, number, number, number][] = [
    // floor, echoes, beacons, braid, chhayaDelayMs
    [21, 6, 4, 0.24, 4200],
    [22, 6, 4, 0.244, 4140],
    [23, 6, 4, 0.248, 4080],
    [24, 6, 4, 0.252, 4020],
    [25, 6, 4, 0.256, 3960],
    [26, 6, 4, 0.26, 3900],
    [27, 6, 4, 0.264, 3840],
    [28, 6, 4, 0.268, 3780],
    [29, 6, 4, 0.272, 3720],
    [30, 6, 4, 0.276, 3400],
  ];

  it('matches the pinned ramp for every tier-three floor', () => {
    expect(pinned.length).toBe(TIER_THREE_FLOORS - TIER_TWO_FLOORS);
    for (const [floor, echoes, beacons, braid, delay] of pinned) {
      const p = floorParams(floor);
      expect(p.echoes, `floor ${floor} echoes`).toBe(echoes);
      expect(p.beacons, `floor ${floor} beacons`).toBe(beacons);
      expect(p.braid, `floor ${floor} braid`).toBeCloseTo(braid, 10);
      expect(p.chhayaDelayMs, `floor ${floor} chhayaDelayMs`).toBe(delay);
    }
  });

  it('delays never drop below the 3600 clamp on tier-three procedural floors', () => {
    for (let f = TIER_TWO_FLOORS + 1; f < TIER_THREE_FLOORS; f++)
      expect(floorParams(f).chhayaDelayMs).toBeGreaterThanOrEqual(3600);
  });
});

describe('DWAAR_III_LAYOUT — the garden hall', () => {
  it('is 13 rows of 13 chars, walls and open cells only', () => {
    expect(DWAAR_III_LAYOUT.length).toBe(13);
    for (const row of DWAAR_III_LAYOUT) {
      expect(row.length).toBe(13);
      expect(row).toMatch(/^[#.]{13}$/);
    }
  });

  it('is symmetric under 180° rotation', () => {
    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 13; x++)
        expect(DWAAR_III_LAYOUT[y]![x]).toBe(DWAAR_III_LAYOUT[12 - y]![12 - x]);
  });

  it('is MORE OPEN than Dwaar II: 107 open cells vs 96 (the gardens breathe)', () => {
    const count = (layout: readonly string[]): number =>
      layout.reduce((n, row) => n + [...row].filter((c) => c === '.').length, 0);
    expect(count(DWAAR_III_LAYOUT)).toBe(107);
    expect(count(DWAAR_III_LAYOUT)).toBeGreaterThan(count(DWAAR_II_LAYOUT)); // 96
    expect(count(DWAAR_II_LAYOUT)).toBeGreaterThan(count(DWAAR_LAYOUT)); // 83 — the ladder keeps rising
  });

  it('carries LONG sightlines: the central row and column are fully open', () => {
    expect(DWAAR_III_LAYOUT[6]!.slice(1, 12)).toBe('...........');
    for (let y = 1; y < 12; y++) expect(DWAAR_III_LAYOUT[y]![6]).toBe('.');
  });

  it('walls are DOTTED hedge runs — no interior wall run longer than 2 cells', () => {
    // rows: no '###' anywhere off the border
    for (let y = 1; y < 12; y++) expect(DWAAR_III_LAYOUT[y]!.includes('###')).toBe(false);
    // columns: no three stacked wall cells anywhere off the border
    for (let x = 1; x < 12; x++)
      for (let y = 1; y < 10; y++)
        expect(
          DWAAR_III_LAYOUT[y]![x] === '#' &&
            DWAAR_III_LAYOUT[y + 1]![x] === '#' &&
            DWAAR_III_LAYOUT[y + 2]![x] === '#',
          `column ${x} rows ${y}..${y + 2}`,
        ).toBe(false);
  });

  it('all open cells are connected (BFS via maze bfsDistances)', () => {
    const { grid, open } = layoutGrid(DWAAR_III_LAYOUT);
    const entrance = open[0]!; // first open cell row-major = (1,1)
    const dist = bfsDistances(grid, entrance);
    const reached = Array.from(dist).filter((d) => d >= 0).length;
    expect(open.length).toBe(107);
    expect(reached).toBe(open.length); // every open cell reachable, walls sealed off
  });

  it('entrance/exit are derivable: (1,1) → farthest open cell (11,11), 20 steps', () => {
    const { grid, open } = layoutGrid(DWAAR_III_LAYOUT);
    const entrance = open[0]!;
    expect(entrance).toEqual({ x: 1, y: 1 });
    const dist = bfsDistances(grid, entrance);
    let best = 0;
    for (let i = 1; i < dist.length; i++) if (dist[i]! > dist[best]!) best = i;
    const exit: CellIndex = { x: best % 13, y: Math.floor(best / 13) };
    expect(exit).toEqual({ x: 11, y: 11 }); // bottom-right mirror of the entrance
    expect(dist[best]).toBe(20); // a real traverse of the garden
  });
});

describe('dwaarGrid floor 30', () => {
  it('derives the Dwaar III open-cell set from DWAAR_III_LAYOUT', () => {
    const g = dwaarGrid(TIER_THREE_FLOORS);
    expect(g.width).toBe(13);
    expect(g.height).toBe(13);
    expect(g.open.length).toBe(107);
    expect(g.open[0]).toEqual({ x: 1, y: 1 });
    for (const c of g.open) expect(DWAAR_III_LAYOUT[c.y]![c.x]).toBe('.');
    const seen = new Set(g.open.map((c) => `${c.x},${c.y}`));
    expect(seen.size).toBe(g.open.length); // no duplicates
    const sorted = [...g.open].sort((a, b) => a.y - b.y || a.x - b.x);
    expect(g.open).toEqual(sorted); // row-major order (entrance = first open cell)
  });
});

// T4/T1 — the Carnival of Faces ramp. ECHOES STEP DOWN from tier three's 6
// to 5 on every floor including Dwaar IV — a deliberate playability call:
// the tier's teeth are the THREE accumulated lethal Sentinels, not the echo
// count (the plan's Global Constraints ratify it).
describe('floorParams tier-four ramp (floors 31–40 pinned)', () => {
  // echoes = 5 on every floor (Dwaar IV fixed 5 too); beacons 4;
  // braid = 0.28 + 0.004*(f-31);
  // chhayaDelayMs = max(3200, 3800 - 60*(f-31)) (Dwaar IV 3000).
  const pinned: [number, number, number, number, number][] = [
    // floor, echoes, beacons, braid, chhayaDelayMs
    [31, 5, 4, 0.28, 3800],
    [32, 5, 4, 0.284, 3740],
    [33, 5, 4, 0.288, 3680],
    [34, 5, 4, 0.292, 3620],
    [35, 5, 4, 0.296, 3560],
    [36, 5, 4, 0.3, 3500],
    [37, 5, 4, 0.304, 3440],
    [38, 5, 4, 0.308, 3380],
    [39, 5, 4, 0.312, 3320],
    [40, 5, 4, 0.316, 3000],
  ];

  it('matches the pinned ramp for every tier-four floor', () => {
    expect(pinned.length).toBe(TIER_FOUR_FLOORS - TIER_THREE_FLOORS);
    for (const [floor, echoes, beacons, braid, delay] of pinned) {
      const p = floorParams(floor);
      expect(p.echoes, `floor ${floor} echoes`).toBe(echoes);
      expect(p.beacons, `floor ${floor} beacons`).toBe(beacons);
      expect(p.braid, `floor ${floor} braid`).toBeCloseTo(braid, 10);
      expect(p.chhayaDelayMs, `floor ${floor} chhayaDelayMs`).toBe(delay);
    }
  });

  it('echoes step DOWN from tier three: 5 on 31 vs 6 on 30 (the playability call)', () => {
    // three lethal Sentinels walk tier 4 (Taal + Gher + Aavart-to-come) —
    // the echoes yield the stage, documented and pinned.
    expect(floorParams(TIER_THREE_FLOORS).echoes).toBe(6);
    expect(floorParams(31).echoes).toBe(5);
    expect(floorParams(40).echoes).toBe(5); // Dwaar IV included — the hall's teeth are the Sentinels
  });

  it('delays never drop below the 3200 clamp on tier-four procedural floors', () => {
    for (let f = TIER_THREE_FLOORS + 1; f < TIER_FOUR_FLOORS; f++)
      expect(floorParams(f).chhayaDelayMs).toBeGreaterThanOrEqual(3200);
  });

  it('leaves every tier-one/three pin untouched (floors 1–30 are frozen)', () => {
    expect(floorParams(30)).toEqual({ echoes: 6, beacons: 4, braid: 0.276, chhayaDelayMs: 3400 });
    expect(floorParams(21)).toEqual({ echoes: 6, beacons: 4, braid: 0.24, chhayaDelayMs: 4200 });
    expect(floorParams(10)).toEqual({ echoes: 4, beacons: 4, braid: 0.21, chhayaDelayMs: 4000 });
  });
});

describe('DWAAR_IV_LAYOUT — the funhouse hall (floor 40, Act I closes)', () => {
  it('is 13 rows of 13 chars, walls and open cells only', () => {
    expect(DWAAR_IV_LAYOUT.length).toBe(13);
    for (const row of DWAAR_IV_LAYOUT) {
      expect(row.length).toBe(13);
      expect(row).toMatch(/^[#.]{13}$/);
    }
  });

  it('is symmetric under 180° rotation', () => {
    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 13; x++)
        expect(DWAAR_IV_LAYOUT[y]![x]).toBe(DWAAR_IV_LAYOUT[12 - y]![12 - x]);
  });

  it("holds 101 open cells — ~100+, the funhouse trades a little of the Gardens' air for the carousel", () => {
    const count = (layout: readonly string[]): number =>
      layout.reduce((n, row) => n + [...row].filter((c) => c === '.').length, 0);
    expect(count(DWAAR_IV_LAYOUT)).toBe(101);
    expect(count(DWAAR_IV_LAYOUT)).toBeGreaterThanOrEqual(100);
    expect(count(DWAAR_IV_LAYOUT)).toBeGreaterThan(count(DWAAR_II_LAYOUT)); // still airier than II
  });

  it('carries the central carousel: a ring of wall cells with EXACTLY 4 gaps at the compass midpoints', () => {
    const isOpen = (x: number, y: number): boolean => DWAAR_IV_LAYOUT[y]![x] === '.';
    // the Chebyshev-radius-2 ring around the center (6,6)
    const ring: Array<[number, number]> = [];
    for (let y = 4; y <= 8; y++)
      for (let x = 4; x <= 8; x++)
        if (Math.max(Math.abs(x - 6), Math.abs(y - 6)) === 2) ring.push([x, y]);
    expect(ring.length).toBe(16);
    const openRing = ring.filter(([x, y]) => isOpen(x, y));
    expect(openRing).toEqual([
      [6, 4],
      [4, 6],
      [8, 6],
      [6, 8],
    ]); // N, W, E, S gaps — the carousel's four doors
    // and the carousel's own center chamber stands fully open
    for (let y = 5; y <= 7; y++)
      for (let x = 5; x <= 7; x++) expect(isOpen(x, y), `center ${x},${y}`).toBe(true);
  });

  it('carries OFFSET alcoves: four single-pocket recesses, one per wall, staggered (never aligned)', () => {
    const isOpen = (x: number, y: number): boolean => DWAAR_IV_LAYOUT[y]![x] === '.';
    const openCells: Array<[number, number]> = [];
    DWAAR_IV_LAYOUT.forEach((row, y) => {
      for (let x = 0; x < 13; x++) if (row[x] === '.') openCells.push([x, y]);
    });
    // a pocket = an open cell whose four neighbors leave exactly one way out
    const DIRS: ReadonlyArray<readonly [number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const pockets = openCells.filter(
      ([x, y]) => DIRS.filter(([dx, dy]) => isOpen(x + dx, y + dy)).length === 1,
    );
    expect(pockets).toEqual([
      [4, 1],
      [11, 4],
      [1, 8],
      [8, 11],
    ]); // top / right / left / bottom — each rotated one wall on, the funhouse stagger
    // no two pockets share a wall and none sits on an axis midpoint (offset from the carousel gaps)
    for (const [x, y] of pockets) expect(x === 6 || y === 6).toBe(false);
  });

  it('all open cells are connected (BFS via maze bfsDistances)', () => {
    const { grid, open } = layoutGrid(DWAAR_IV_LAYOUT);
    const entrance = open[0]!; // first open cell row-major = (1,1)
    const dist = bfsDistances(grid, entrance);
    const reached = Array.from(dist).filter((d) => d >= 0).length;
    expect(open.length).toBe(101);
    expect(reached).toBe(open.length); // every open cell reachable, walls sealed off
  });

  it('entrance/exit are derivable: (1,1) → farthest open cell (11,11), 20 steps', () => {
    const { grid, open } = layoutGrid(DWAAR_IV_LAYOUT);
    const entrance = open[0]!;
    expect(entrance).toEqual({ x: 1, y: 1 });
    const dist = bfsDistances(grid, entrance);
    let best = 0;
    for (let i = 1; i < dist.length; i++) if (dist[i]! > dist[best]!) best = i;
    const exit: CellIndex = { x: best % 13, y: Math.floor(best / 13) };
    expect(exit).toEqual({ x: 11, y: 11 }); // bottom-right mirror of the entrance
    expect(dist[best]).toBe(20); // a real traverse of the funhouse
  });
});

describe('dwaarGrid floor 40', () => {
  it('derives the Dwaar IV open-cell set from DWAAR_IV_LAYOUT', () => {
    const g = dwaarGrid(TIER_FOUR_FLOORS);
    expect(g.width).toBe(13);
    expect(g.height).toBe(13);
    expect(g.open.length).toBe(101);
    expect(g.open[0]).toEqual({ x: 1, y: 1 });
    for (const c of g.open) expect(DWAAR_IV_LAYOUT[c.y]![c.x]).toBe('.');
    const seen = new Set(g.open.map((c) => `${c.x},${c.y}`));
    expect(seen.size).toBe(g.open.length); // no duplicates
    const sorted = [...g.open].sort((a, b) => a.y - b.y || a.x - b.x);
    expect(g.open).toEqual(sorted); // row-major order (entrance = first open cell)
  });
});

// T5/T1 — the Flood Halls ramp. Echoes step DOWN again (4 on every floor,
// Dwaar V alone carries 5 — the hall's teeth are the rising water and the
// first all-four-Sentinel duel, per the plan's Global Constraints; beacons
// hold at 4; braid keeps the +0.004 tread; the delay keeps its −60 slide
// toward the 3000 clamp, Dwaar V arriving early at 2900 — the sunken arena
// floods, Chhaya does not wait).
describe('floorParams tier-five ramp (floors 41–50 pinned)', () => {
  // echoes = 4 on every procedural floor (Dwaar V fixed 5); beacons 4;
  // braid = 0.30 + 0.004*(f-41);
  // chhayaDelayMs = max(3000, 3600 - 60*(f-41)) (Dwaar V 2900).
  const pinned: [number, number, number, number, number][] = [
    // floor, echoes, beacons, braid, chhayaDelayMs
    [41, 4, 4, 0.3, 3600],
    [42, 4, 4, 0.304, 3540],
    [43, 4, 4, 0.308, 3480],
    [44, 4, 4, 0.312, 3420],
    [45, 4, 4, 0.316, 3360],
    [46, 4, 4, 0.32, 3300],
    [47, 4, 4, 0.324, 3240],
    [48, 4, 4, 0.328, 3180],
    [49, 4, 4, 0.332, 3120],
    [50, 5, 4, 0.336, 2900],
  ];

  it('matches the pinned ramp for every tier-five floor', () => {
    expect(pinned.length).toBe(TIER_FIVE_FLOORS - TIER_FOUR_FLOORS);
    for (const [floor, echoes, beacons, braid, delay] of pinned) {
      const p = floorParams(floor);
      expect(p.echoes, `floor ${floor} echoes`).toBe(echoes);
      expect(p.beacons, `floor ${floor} beacons`).toBe(beacons);
      expect(p.braid, `floor ${floor} braid`).toBeCloseTo(braid, 10);
      expect(p.chhayaDelayMs, `floor ${floor} chhayaDelayMs`).toBe(delay);
    }
  });

  it('delays never drop below the 3000 clamp on tier-five procedural floors', () => {
    for (let f = TIER_FOUR_FLOORS + 1; f < TIER_FIVE_FLOORS; f++)
      expect(floorParams(f).chhayaDelayMs).toBeGreaterThanOrEqual(3000);
  });

  it('Dwaar V alone carries 5 echoes — the apex duel hall', () => {
    for (let f = TIER_FOUR_FLOORS + 1; f < TIER_FIVE_FLOORS; f++)
      expect(floorParams(f).echoes, `floor ${f}`).toBe(4);
    expect(floorParams(TIER_FIVE_FLOORS).echoes).toBe(5);
    expect(floorParams(TIER_FIVE_FLOORS).chhayaDelayMs).toBe(2900);
  });

  it('leaves every earlier tier pin untouched (floors 1–40 are frozen)', () => {
    // braid rides toBeCloseTo — 0.28 + 0.004*9 is not the literal 0.316 in
    // IEEE doubles; the ramp math itself is untouched, only its precision
    const p40 = floorParams(40);
    expect(p40.echoes).toBe(5);
    expect(p40.beacons).toBe(4);
    expect(p40.braid).toBeCloseTo(0.316, 10);
    expect(p40.chhayaDelayMs).toBe(3000);
    expect(floorParams(31)).toEqual({ echoes: 5, beacons: 4, braid: 0.28, chhayaDelayMs: 3800 });
    expect(floorParams(30)).toEqual({ echoes: 6, beacons: 4, braid: 0.276, chhayaDelayMs: 3400 });
    expect(floorParams(10)).toEqual({ echoes: 4, beacons: 4, braid: 0.21, chhayaDelayMs: 4000 });
  });
});

// T5/T1 — the sentinel ROTATION (spec §4.6 "escalate combinations", row 9
// "all four"): the ladder stops accumulating. Floors 41–49 hunt with Taal
// ALONE (Gher and Aavart rest — they were unreachable-code past 40 anyway);
// floor 50's Dwaar V is the first ALL-FOUR duel. Every floor 1–40 reads
// exactly as the bare >= gates did — the rotation only ever adds behavior
// where none existed.
describe('sentinel presence (the rotation)', () => {
  it('taalPresent: from floor 11 up, everywhere — unchanged by T5', () => {
    expect(taalPresent(1)).toBe(false);
    expect(taalPresent(5)).toBe(false); // his cameo is the TAAL_FLOOR gate, not presence
    expect(taalPresent(10)).toBe(false);
    expect(taalPresent(11)).toBe(true);
    expect(taalPresent(20)).toBe(true);
    expect(taalPresent(21)).toBe(true);
    expect(taalPresent(31)).toBe(true);
    expect(taalPresent(41)).toBe(true);
    expect(taalPresent(49)).toBe(true);
    expect(taalPresent(50)).toBe(true);
  });

  it('gherPresent: Gardens + Carnival as always (21–40, frozen) — resting on 41–49, dueling at 50', () => {
    expect(gherPresent(1)).toBe(false);
    expect(gherPresent(20)).toBe(false);
    expect(gherPresent(21)).toBe(true);
    expect(gherPresent(25)).toBe(true);
    expect(gherPresent(30)).toBe(true);
    // floors 1–40 are FROZEN: the Carnival keeps its three-Sentinel ladder
    // (T4's accumulation — the t4 e2e pins Gher on tier 4), the ratified
    // rest window is 41–49 ONLY
    expect(gherPresent(31)).toBe(true);
    expect(gherPresent(35)).toBe(true);
    expect(gherPresent(40)).toBe(true);
    expect(gherPresent(41)).toBe(false);
    expect(gherPresent(45)).toBe(false);
    expect(gherPresent(49)).toBe(false);
    expect(gherPresent(50)).toBe(true); // the all-four duel
  });

  it('aavartPresent: the Carnival (31–40) plus the Dwaar V duel — resting on 41–49', () => {
    expect(aavartPresent(1)).toBe(false);
    expect(aavartPresent(30)).toBe(false);
    expect(aavartPresent(31)).toBe(true);
    expect(aavartPresent(35)).toBe(true);
    expect(aavartPresent(40)).toBe(true);
    expect(aavartPresent(41)).toBe(false);
    expect(aavartPresent(45)).toBe(false);
    expect(aavartPresent(49)).toBe(false);
    expect(aavartPresent(50)).toBe(true); // the all-four duel
  });

  it('the truth table — floors 1–40 produce identical results to the bare >= gates', () => {
    // floor → [taal, gher, aavart]. Rows 1–40 ARE today's ladder (the t4
    // e2e pins 31 and 40 all-three; the ratified rest window is 41–49 only);
    // 41/45/49 are Taal-alone, 50 is the all-four duel.
    const table: [number, boolean, boolean, boolean][] = [
      [1, false, false, false],
      [5, false, false, false],
      [11, true, false, false],
      [20, true, false, false],
      [21, true, true, false],
      [30, true, true, false],
      [31, true, true, true],
      [40, true, true, true],
      [41, true, false, false],
      [45, true, false, false],
      [49, true, false, false],
      [50, true, true, true],
    ];
    for (const [f, taal, gher, aavart] of table) {
      expect(taalPresent(f), `floor ${f} taal`).toBe(taal);
      expect(gherPresent(f), `floor ${f} gher`).toBe(gher);
      expect(aavartPresent(f), `floor ${f} aavart`).toBe(aavart);
    }
  });
});

// T5/T1 — Dwaar V, the sunken arena (floor 50, the row-9 apex duel). 13×13
// like its elders, 101 open cells: CONCENTRIC RINGS — a broad outer ring
// corridor (two cells thick, like Dwaar II's promenade), a mid ring WALL
// with EXACTLY 4 gaps at the compass midpoints, an inner corridor circling
// the 3×3 inner sanctum (the flood pool's eye). No pillars — the arena floor
// stands clean where Dwaar II hung columns. Invariant under 180° rotation so
// the exit mirrors the entrance; all 101 open cells form one connected
// component — four Sentinels need the room to walk their beats.
describe('DWAAR_V_LAYOUT — the sunken arena (floor 50, Act II closes)', () => {
  const isOpen = (x: number, y: number): boolean => DWAAR_V_LAYOUT[y]![x] === '.';
  const cheb = (x: number, y: number): number => Math.max(Math.abs(x - 6), Math.abs(y - 6));

  it('is 13 rows of 13 chars, walls and open cells only', () => {
    expect(DWAAR_V_LAYOUT.length).toBe(13);
    for (const row of DWAAR_V_LAYOUT) {
      expect(row.length).toBe(13);
      expect(row).toMatch(/^[#.]{13}$/);
    }
  });

  it('is symmetric under 180° rotation', () => {
    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 13; x++) expect(DWAAR_V_LAYOUT[y]![x]).toBe(DWAAR_V_LAYOUT[12 - y]![12 - x]);
  });

  it('holds 101 open cells — in the ~95–105 band the plan targets', () => {
    const count = (layout: readonly string[]): number =>
      layout.reduce((n, row) => n + [...row].filter((c) => c === '.').length, 0);
    expect(count(DWAAR_V_LAYOUT)).toBe(101);
    expect(count(DWAAR_V_LAYOUT)).toBeGreaterThanOrEqual(95);
    expect(count(DWAAR_V_LAYOUT)).toBeLessThanOrEqual(105);
  });

  it('carries the concentric rings: open promenade, ONE mid ring wall, open sanctum', () => {
    // d ≥ 4 — the outer ring corridor, two cells thick, fully open (72 cells)
    for (let y = 1; y < 12; y++)
      for (let x = 1; x < 12; x++)
        if (cheb(x, y) >= 4) expect(isOpen(x, y), `outer ring ${x},${y}`).toBe(true);
    // d = 3 — the mid ring: a wall ring of 20 cells with EXACTLY 4 gaps at
    // the compass midpoints (N, E, S, W — the four doors into the arena)
    const ring: Array<[number, number]> = [];
    for (let y = 3; y <= 9; y++)
      for (let x = 3; x <= 9; x++) if (cheb(x, y) === 3) ring.push([x, y]);
    expect(ring.length).toBe(24);
    const openRing = ring.filter(([x, y]) => isOpen(x, y));
    expect(openRing).toEqual([
      [6, 3],
      [3, 6],
      [9, 6],
      [6, 9],
    ]); // N, W, E, S — the arena's four gates
    // d ≤ 2 — the inner corridor and the 3×3 sanctum, fully open (25 cells)
    for (let y = 4; y <= 8; y++)
      for (let x = 4; x <= 8; x++)
        if (cheb(x, y) <= 2) expect(isOpen(x, y), `inner ${x},${y}`).toBe(true);
    // and the sanctum itself is the exact 3×3 center
    for (let y = 5; y <= 7; y++)
      for (let x = 5; x <= 7; x++) expect(isOpen(x, y), `sanctum ${x},${y}`).toBe(true);
  });

  it('stands pillarless — the sunken arena is clean where Dwaar II hung columns', () => {
    expect(pillarCount(DWAAR_V_LAYOUT)).toBe(0);
  });

  it('all open cells are connected (BFS via maze bfsDistances)', () => {
    const { grid, open } = layoutGrid(DWAAR_V_LAYOUT);
    const entrance = open[0]!; // first open cell row-major = (1,1)
    const dist = bfsDistances(grid, entrance);
    const reached = Array.from(dist).filter((d) => d >= 0).length;
    expect(open.length).toBe(101);
    expect(reached).toBe(open.length); // every open cell reachable, walls sealed off
  });

  it('entrance/exit are derivable: (1,1) → farthest open cell (11,11), 20 steps', () => {
    const { grid, open } = layoutGrid(DWAAR_V_LAYOUT);
    const entrance = open[0]!;
    expect(entrance).toEqual({ x: 1, y: 1 });
    const dist = bfsDistances(grid, entrance);
    let best = 0;
    for (let i = 1; i < dist.length; i++) if (dist[i]! > dist[best]!) best = i;
    const exit: CellIndex = { x: best % 13, y: Math.floor(best / 13) };
    expect(exit).toEqual({ x: 11, y: 11 }); // bottom-right mirror of the entrance
    expect(dist[best]).toBe(20); // a real traverse of the arena
  });
});

describe('dwaarGrid floor 50', () => {
  it('derives the Dwaar V open-cell set from DWAAR_V_LAYOUT', () => {
    const g = dwaarGrid(TIER_FIVE_FLOORS);
    expect(g.width).toBe(13);
    expect(g.height).toBe(13);
    expect(g.open.length).toBe(101);
    expect(g.open[0]).toEqual({ x: 1, y: 1 });
    for (const c of g.open) expect(DWAAR_V_LAYOUT[c.y]![c.x]).toBe('.');
    const seen = new Set(g.open.map((c) => `${c.x},${c.y}`));
    expect(seen.size).toBe(g.open.length); // no duplicates
    const sorted = [...g.open].sort((a, b) => a.y - b.y || a.x - b.x);
    expect(g.open).toEqual(sorted); // row-major order (entrance = first open cell)
  });

  it('still defaults to Dwaar I and keeps every elder hall on its own floor', () => {
    expect(dwaarGrid().open.length).toBe(83); // Dwaar I unchanged
    expect(dwaarGrid(TIER_TWO_FLOORS).open.length).toBe(96);
    expect(dwaarGrid(TIER_THREE_FLOORS).open.length).toBe(107);
    expect(dwaarGrid(TIER_FOUR_FLOORS).open.length).toBe(101);
  });
});
