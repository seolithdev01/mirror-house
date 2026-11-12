// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  bfsDistances,
  floorFromGrid,
  generateFloor,
  TIER_ONE,
  type Floor,
} from '../../src/game/maze';
import { mirrorSpots } from '../../src/game/mirror';
import {
  generateFloorObjects,
  mirrorSpotFor,
  M2_PARAMS,
  textureParamsForTier,
} from '../../src/game/floorObjects';
import { dwaarGrid, floorParams, floorSeed, isDwaar, tierOf } from '../../src/game/campaign';

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

// ---------------------------------------------------------------------------
// T9/T2 — the tier→texture ask. The pure mapping the floor builder spreads:
// which rng-gated kinds draw on which tier's floors. T9 widens it for the
// first time since T4 — the Warrens pool 2–3 water (the Gardens' roll thinned
// to int(2)) and hang 1–2 carnival panes (one coin on the floor of 1) — while
// tiers 1–8 read exactly as shipped.
// ---------------------------------------------------------------------------
describe('textureParamsForTier — the tier→texture ask (T9/T2)', () => {
  it('tiers 1–8 read exactly as the shipped builder gates did', () => {
    const shipped = (tier: number): { portraits: number; water: number; distort: number } => ({
      portraits: tier === 2 ? 2 : 0,
      water: tier === 3 ? 2 : 0,
      distort: tier === 4 ? 2 : 0,
    });
    for (let tier = 1; tier <= 8; tier++) {
      const p = textureParamsForTier(tier);
      expect(p, `tier ${tier}`).toEqual({ ...shipped(tier), waterRoll: 3 });
    }
  });

  it('T9 — the Warrens pool 2–3 water (waterRoll 2, not the Gardens\u2019 3) and hang 1–2 panes', () => {
    expect(textureParamsForTier(9)).toEqual({ portraits: 0, water: 2, waterRoll: 2, distort: 1 });
  });

  it('the ask drives the counts on real floors — tier-9 floors pool 2–3 and hang 1–2, tier-3 pools 2–4', () => {
    // one warren floor and one Gardens floor, real campaign seeds
    const warren = campaignFloor(81);
    const t9 = generateFloorObjects(warren, { ...M2_PARAMS, ...textureParamsForTier(9) });
    expect(t9.water.length).toBeGreaterThanOrEqual(2);
    expect(t9.water.length).toBeLessThanOrEqual(3);
    expect(t9.mirrors.filter((m) => m.kind === 'distort').length).toBeGreaterThanOrEqual(1);
    expect(t9.mirrors.filter((m) => m.kind === 'distort').length).toBeLessThanOrEqual(2);
    const gardens = campaignFloor(21); // any campaign floor seed — 21 is tier 3
    const t3 = generateFloorObjects(gardens, { ...M2_PARAMS, ...textureParamsForTier(3) });
    expect(t3.water.length).toBeGreaterThanOrEqual(2);
    expect(t3.water.length).toBeLessThanOrEqual(4); // the Gardens' wider int(3) roll
  });
});

// ---------------------------------------------------------------------------
// T9/T2 — the apex texture stack leaves floors 1–80 byte-identical. The
// Warrens' draws are NEW-FLOOR-ONLY (81–90): for every shipped floor the
// builder's old inline gates and the textureParamsForTier map must produce
// the exact same FloorObjects — same mirrors in the same order, same pools,
// same spawns. The identity oracle below replicates the shipped gates
// verbatim (pre-T9: water only on tier 3 with the int(3) roll, distort only
// on tier 4).
// ---------------------------------------------------------------------------
/** One real campaign floor (procedural on the tier's braid, Dwaar halls from
 *  their layouts), seeded per-floor like the builder does. */
const campaignFloor = (f: number): Floor => {
  const seed = floorSeed({ seedBase: 'PIN80', floor: f, tierComplete: false });
  const fp = floorParams(f);
  return isDwaar(f)
    ? floorFromGrid(dwaarGrid(f), seed)
    : generateFloor({ ...TIER_ONE, seed, braid: fp.braid });
};

describe('the apex texture stack — floors 1–80 stay byte-identical (T9/T2)', () => {
  it('every floor 1–80 generates byte-identical objects under the tier-nine texture map', () => {
    for (let f = 1; f <= 80; f++) {
      const tier = tierOf(f);
      const fp = floorParams(f);
      const floor = campaignFloor(f); // any campaign floor — the seeds here are pins, not play
      const common = { ...M2_PARAMS, beacons: fp.beacons, echoes: fp.echoes };
      // the shipped pre-T9 builder mapping, verbatim (waterRoll 3 via M2_PARAMS)
      const shipped = generateFloorObjects(floor, {
        ...common,
        portraits: tier === 2 ? 2 : 0,
        water: tier === 3 ? 2 : 0,
        distort: tier === 4 ? 2 : 0,
      });
      const now = generateFloorObjects(floor, { ...common, ...textureParamsForTier(tier) });
      expect(now, `floor ${f} objects`).toEqual(shipped);
    }
  });

  it('pools draw only on the Gardens (21–30), panes only on the Carnival (31–40), portraits only on the Hall (11–20)', () => {
    for (let f = 1; f <= 80; f++) {
      const tier = tierOf(f);
      const o = generateFloorObjects(campaignFloor(f), {
        ...M2_PARAMS,
        beacons: floorParams(f).beacons,
        echoes: floorParams(f).echoes,
        ...textureParamsForTier(tier),
      });
      const water = o.water.length;
      const panes = o.mirrors.filter((m) => m.kind === 'distort').length;
      const faces = o.mirrors.filter((m) => m.kind === 'portrait').length;
      if (tier === 3) {
        expect(water >= 2 && water <= 4, `floor ${f} pools ${water}`).toBe(true);
      } else expect(water, `floor ${f} pools`).toBe(0);
      if (tier === 4) {
        expect(panes >= 2 && panes <= 3, `floor ${f} panes ${panes}`).toBe(true);
      } else expect(panes, `floor ${f} panes`).toBe(0);
      if (tier === 2) {
        expect(faces >= 2 && faces <= 3, `floor ${f} portraits ${faces}`).toBe(true);
      } else expect(faces, `floor ${f} portraits`).toBe(0);
    }
  });
});
