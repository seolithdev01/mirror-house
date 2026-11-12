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
  DWAAR_VI_LAYOUT,
  DWAAR_VII_LAYOUT,
  DWAAR_VIII_LAYOUT,
  DWAAR_IX_LAYOUT,
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
  ACT_III_FLOOR,
  BEAT_TICK_MS,
  DWAAR_FLOOR,
  TAAL_FLOOR,
  TAAL_RETURN_FLOOR,
  TIER_EIGHT_FLOORS,
  TIER_NINE_FLOORS,
  TIER_ONE_FLOORS,
  TIER_FIVE_FLOORS,
  TIER_FOUR_FLOORS,
  TIER_SEVEN_FLOORS,
  TIER_SIX_FLOORS,
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

  it('T6 — pins the tier-six campaign constant — 60 floors, Dwaar VI on the last (the Furnace Wings)', () => {
    expect(TIER_SIX_FLOORS).toBe(60);
  });

  it('T7 — pins the tier-seven campaign constant — 70 floors, Dwaar VII on the last (the Whisper Library)', () => {
    expect(TIER_SEVEN_FLOORS).toBe(70);
  });

  it('T7 — pins the beat-walker\u2019s return floor — Taal comes back mid-tier at 66', () => {
    expect(TAAL_RETURN_FLOOR).toBe(66);
  });

  it('T8 — pins the tier-eight campaign constant — 80 floors, Dwaar VIII on the last (the Frozen Atrium)', () => {
    expect(TIER_EIGHT_FLOORS).toBe(80);
  });

  it('T9 — pins the tier-nine campaign constant — 90 floors, Dwaar IX on the last (the Warden\u2019s Warrens)', () => {
    expect(TIER_NINE_FLOORS).toBe(90);
  });

  it('T9 — pins ACT_III_FLOOR — the Ground Door banner\u2019s floor is 81, the Warrens\u2019 first', () => {
    expect(ACT_III_FLOOR).toBe(81);
    expect(ACT_III_FLOOR).toBe(TIER_EIGHT_FLOORS + 1); // the first floor past the Atrium
    expect(ACT_III_FLOOR).toBeLessThan(TIER_NINE_FLOORS); // a ramp floor, never the Dwaar
    expect(isDwaar(ACT_III_FLOOR)).toBe(false); // the banner floor is procedural
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

  it('T6 — splits the campaign at floor 50: 51–60 → 6 (the Furnace Wings)', () => {
    expect(tierOf(51)).toBe(6);
    expect(tierOf(54)).toBe(6);
    expect(tierOf(58)).toBe(6);
    expect(tierOf(59)).toBe(6);
    expect(tierOf(60)).toBe(6);
    // 50 keeps its own tier — and 60 is a tier of its OWN too, never a
    // relabel of anything below (the dressing gates and the tier screens
    // read equality and must keep reading false)
    expect(tierOf(50)).toBe(5);
    expect(tierOf(60)).not.toBe(2);
    expect(tierOf(60)).not.toBe(3);
    expect(tierOf(60)).not.toBe(4);
    expect(tierOf(60)).not.toBe(5);
  });

  it('T6 — the tier-exclusive dressing gates stay put on the Furnace Wings too', () => {
    // the Furnace hangs no ancestor portraits, pools no water and mounts no
    // carnival glass — its heat is the modifier (T6/T2), and the floorObjects
    // rng streams stay pinned (no new draws on 51–60)
    for (let f = TIER_FIVE_FLOORS + 1; f <= TIER_SIX_FLOORS; f++) {
      expect(tierOf(f) === 2, `floor ${f} portraits gate`).toBe(false);
      expect(tierOf(f) === 3, `floor ${f} water gate`).toBe(false);
      expect(tierOf(f) === 4, `floor ${f} distort gate`).toBe(false);
    }
  });

  it('T7 — splits the campaign at floor 60: 61–70 → 7 (the Whisper Library)', () => {
    expect(tierOf(61)).toBe(7);
    expect(tierOf(64)).toBe(7);
    expect(tierOf(66)).toBe(7);
    expect(tierOf(69)).toBe(7);
    expect(tierOf(70)).toBe(7);
    // 60 keeps its own tier — and 70 is a tier of its OWN too, never a
    // relabel of anything below (the dressing gates and the tier screens
    // read equality and must keep reading false)
    expect(tierOf(60)).toBe(6);
    expect(tierOf(70)).not.toBe(2);
    expect(tierOf(70)).not.toBe(3);
    expect(tierOf(70)).not.toBe(4);
    expect(tierOf(70)).not.toBe(5);
    expect(tierOf(70)).not.toBe(6);
  });

  it('T7 — the tier-exclusive dressing gates stay put on the Whisper Library too', () => {
    // the Library hangs no ancestor portraits, pools no water and mounts no
    // carnival glass — its hearing Echoes are the tier's teeth (T7/T2), and
    // the floorObjects rng streams stay pinned (no new draws on 61–70)
    for (let f = TIER_SIX_FLOORS + 1; f <= TIER_SEVEN_FLOORS; f++) {
      expect(tierOf(f) === 2, `floor ${f} portraits gate`).toBe(false);
      expect(tierOf(f) === 3, `floor ${f} water gate`).toBe(false);
      expect(tierOf(f) === 4, `floor ${f} distort gate`).toBe(false);
    }
  });

  it('T8 — splits the campaign at floor 70: 71–80 → 8 (the Frozen Atrium)', () => {
    expect(tierOf(71)).toBe(8);
    expect(tierOf(74)).toBe(8);
    expect(tierOf(79)).toBe(8);
    expect(tierOf(80)).toBe(8);
    // 70 keeps its own tier — and 80 is a tier of its OWN too, never a
    // relabel of anything below (the dressing gates and the tier screens
    // read equality and must keep reading false)
    expect(tierOf(70)).toBe(7);
    expect(tierOf(80)).not.toBe(2);
    expect(tierOf(80)).not.toBe(3);
    expect(tierOf(80)).not.toBe(4);
    expect(tierOf(80)).not.toBe(5);
    expect(tierOf(80)).not.toBe(6);
    expect(tierOf(80)).not.toBe(7);
  });

  it('T8 — the tier-exclusive dressing gates stay put on the Frozen Atrium too', () => {
    // the Atrium hangs no ancestor portraits, pools no water and mounts no
    // carnival glass — its frozen mirrors are the tier's teeth (T8/T2), and
    // the floorObjects rng streams stay pinned (no new draws on 71–80)
    for (let f = TIER_SEVEN_FLOORS + 1; f <= TIER_EIGHT_FLOORS; f++) {
      expect(tierOf(f) === 2, `floor ${f} portraits gate`).toBe(false);
      expect(tierOf(f) === 3, `floor ${f} water gate`).toBe(false);
      expect(tierOf(f) === 4, `floor ${f} distort gate`).toBe(false);
    }
  });

  it('T9 — splits the campaign at floor 80: 81–90 → 9 (the Warden\u2019s Warrens)', () => {
    expect(tierOf(81)).toBe(9);
    expect(tierOf(84)).toBe(9);
    expect(tierOf(89)).toBe(9);
    expect(tierOf(90)).toBe(9);
    // 80 keeps its own tier — and 90 is a tier of its OWN too, never a
    // relabel of anything below (the dressing gates and the tier screens
    // read equality and must keep reading false)
    expect(tierOf(80)).toBe(8);
    expect(tierOf(90)).not.toBe(2);
    expect(tierOf(90)).not.toBe(3);
    expect(tierOf(90)).not.toBe(4);
    expect(tierOf(90)).not.toBe(5);
    expect(tierOf(90)).not.toBe(6);
    expect(tierOf(90)).not.toBe(7);
    expect(tierOf(90)).not.toBe(8);
  });

  it('T9 — the tier-exclusive dressing gates stay put on the Warrens too', () => {
    // the Warrens hang no ancestor portraits — and their texture is the T9/T2
    // ask (pool 2–3 water, mount 1–2 panes through the tier-NINE arm of the
    // builder's gates, never the tier-3/4 equality arms the older tiers
    // read): tierOf(81–90) is 9, so every tier ≤ 8 gate stays false here and
    // the floorObjects rng streams for floors 1–80 stay pinned (the tier-9
    // draws are new-floor-only; the floors 1–80 sweep in floorobjects.test.ts
    // pins them byte-for-byte)
    for (let f = TIER_EIGHT_FLOORS + 1; f <= TIER_NINE_FLOORS; f++) {
      expect(tierOf(f) === 2, `floor ${f} portraits gate`).toBe(false);
      expect(tierOf(f) === 3, `floor ${f} water gate (t3 arm)`).toBe(false);
      expect(tierOf(f) === 4, `floor ${f} distort gate (t4 arm)`).toBe(false);
      // T9/T2 — the widened builder gates: water draws on the t3 ∨ t9 arm,
      // distort on the t4 ∨ t9 arm, portraits still t2-only
      expect(tierOf(f) === 3 || tierOf(f) === 9, `floor ${f} water gate (t9 arm)`).toBe(true);
      expect(tierOf(f) === 4 || tierOf(f) === 9, `floor ${f} distort gate (t9 arm)`).toBe(true);
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

  it('T5 — the campaign walks straight through the old Act II terminus', () => {
    // the T5 no-op at 50 is RETIRED by T6: 50 → 51 is a real descent now
    // (the terminal floor moved to 60 — the Furnace Wings open and Dwaar V's
    // claim cascades to the interstitial), purity preserved
    const at50 = { seedBase: 'TTTT', floor: TIER_FIVE_FLOORS, tierComplete: true };
    const d = descend(at50);
    expect(d.floor).toBe(51);
    expect(d).not.toBe(at50);
    expect(at50.floor).toBe(50); // original untouched
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

  it('T6 — walks the whole campaign 1..60', () => {
    let c = newCampaign('CCCC');
    for (let i = 2; i <= TIER_SIX_FLOORS; i++) c = descend(c);
    expect(c.floor).toBe(TIER_SIX_FLOORS);
  });

  it('T6 — leaving Dwaar V re-arms the tier flag for tier six (the Furnace opens)', () => {
    // Dwaar V no longer CLOSES the campaign: the claim at 50 banks and the
    // stairs into the Furnace Wings clear the flag so tier-six floors pay
    // their first-clear bonus (the tier screen is Dwaar VI's now).
    const d = descend({ seedBase: 'DDDD', floor: TIER_FIVE_FLOORS, tierComplete: true });
    expect(d).toEqual({ seedBase: 'DDDD', floor: 51, tierComplete: false });
  });

  it('T6 — the T5 no-op at 50 is RETIRED: 50 → 51 is a real descent now', () => {
    // the terminal floor moved to 60 (Act III still does not exist, but the
    // Furnace does); purity preserved exactly as at the T4 terminus retirement
    const at50 = { seedBase: 'WWWW', floor: 50, tierComplete: false };
    const d = descend(at50);
    expect(d.floor).toBe(51);
    expect(d).not.toBe(at50);
    expect(at50.floor).toBe(50); // original untouched
  });

  it('T7 — walks the whole campaign 1..70', () => {
    let c = newCampaign('CCCC');
    for (let i = 2; i <= TIER_SEVEN_FLOORS; i++) c = descend(c);
    expect(c.floor).toBe(TIER_SEVEN_FLOORS);
  });

  it('T7 — leaving Dwaar VI re-arms the tier flag for tier seven (the Library opens)', () => {
    // the T7 ratification: Dwaar VI no longer CLOSES the campaign — the claim
    // at 60 banks and the stairs into the Whisper Library clear the flag so
    // tier-seven floors pay their first-clear bonus (the tier screen is
    // Dwaar VII's now).
    const d = descend({ seedBase: 'DDDD', floor: TIER_SIX_FLOORS, tierComplete: true });
    expect(d).toEqual({ seedBase: 'DDDD', floor: 61, tierComplete: false });
  });

  it('T7 — the T6 no-op at 60 is RETIRED: 60 → 61 is a real descent now', () => {
    // the terminal floor moved to 70 (Act III still does not exist, but the
    // Whisper Library does); purity preserved exactly as at every earlier
    // terminus retirement (40 in T5, 50 in T6)
    const at60 = { seedBase: 'VVVV', floor: TIER_SIX_FLOORS, tierComplete: true };
    const d = descend(at60);
    expect(d.floor).toBe(61);
    expect(d).not.toBe(at60);
    expect(at60.floor).toBe(60); // original untouched
    expect(d.tierComplete).toBe(false); // the descent re-arms the flag
  });

  it('T8 — the T7 no-op at 70 is RETIRED: 70 → 71 is a real descent now', () => {
    // the terminal floor moved to 80 (Act III still does not exist, but the
    // Frozen Atrium does); purity preserved exactly as at every earlier
    // terminus retirement (40 in T5, 50 in T6, 60 in T7)
    const at70 = { seedBase: 'XXXX', floor: TIER_SEVEN_FLOORS, tierComplete: true };
    const d = descend(at70);
    expect(d.floor).toBe(71);
    expect(d).not.toBe(at70);
    expect(at70.floor).toBe(70); // original untouched
    expect(d.tierComplete).toBe(false); // the descent re-arms the flag
  });

  it('T8 — walks the whole campaign 1..80', () => {
    let c = newCampaign('CCCC');
    for (let i = 2; i <= TIER_EIGHT_FLOORS; i++) c = descend(c);
    expect(c.floor).toBe(TIER_EIGHT_FLOORS);
  });

  it('T8 — leaving Dwaar VII re-arms the tier flag for tier eight (the Atrium opens)', () => {
    // the T8 ratification: Dwaar VII no longer CLOSES the campaign — the
    // claim at 70 banks and the stairs into the Frozen Atrium clear the flag
    // so tier-eight floors pay their first-clear bonus (the tier screen is
    // Dwaar VIII's now).
    const d = descend({ seedBase: 'DDDD', floor: TIER_SEVEN_FLOORS, tierComplete: true });
    expect(d).toEqual({ seedBase: 'DDDD', floor: 71, tierComplete: false });
  });

  it('T9 — the T8 no-op at 80 is RETIRED: 80 → 81 is a real descent now', () => {
    // the terminal floor moved to 90 (Act III EXISTS now — the Warden's
    // Warrens do); purity preserved exactly as at every earlier terminus
    // retirement (40 in T5, 50 in T6, 60 in T7, 70 in T8)
    const at80 = { seedBase: 'YYYY', floor: TIER_EIGHT_FLOORS, tierComplete: true };
    const d = descend(at80);
    expect(d.floor).toBe(81);
    expect(d).not.toBe(at80);
    expect(at80.floor).toBe(80); // original untouched
    expect(d.tierComplete).toBe(false); // the descent re-arms the flag
  });

  it('T9 — walks the whole campaign 1..90', () => {
    let c = newCampaign('CCCC');
    for (let i = 2; i <= TIER_NINE_FLOORS; i++) c = descend(c);
    expect(c.floor).toBe(TIER_NINE_FLOORS);
  });

  it('T9 — leaving Dwaar VIII re-arms the tier flag for tier nine (the Warrens open)', () => {
    // the T9 ratification: Dwaar VIII no longer CLOSES the campaign — the
    // claim at 80 banks and the stairs past the Atrium clear the flag so
    // tier-nine floors pay their first-clear bonus (the full screen is
    // Dwaar IX's now).
    const d = descend({ seedBase: 'DDDD', floor: TIER_EIGHT_FLOORS, tierComplete: true });
    expect(d).toEqual({ seedBase: 'DDDD', floor: 81, tierComplete: false });
  });

  it('T9 — descend at floor 90 is a NO-OP returning the same object (terminal until tier 10)', () => {
    // Dwaar IX closes the campaign's fifth act of floors: there is no floor
    // 91, so the stair door at 90 opens onto the tier screen and the descend
    // itself must refuse — the SAME object back, not a copy.
    const at90 = { seedBase: 'ZZZZ', floor: TIER_NINE_FLOORS, tierComplete: true };
    expect(descend(at90)).toBe(at90);
    expect(descend(at90)).toEqual({ seedBase: 'ZZZZ', floor: 90, tierComplete: true });
    // the flag survives the no-op untouched (no re-arm past the tier close)
    expect(at90.tierComplete).toBe(true);
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

  it('T6 — flags completion at Dwaar VI, the single flag set a sixth time at floor 60', () => {
    let c = newCampaign('DDDD');
    for (let i = 1; i < TIER_SIX_FLOORS; i++) c = descend(c);
    expect(c.floor).toBe(60);
    expect(c.tierComplete).toBe(false); // the descent from 50 re-armed it
    const done = completeTier(c);
    expect(done.tierComplete).toBe(true);
  });

  it('T6 — is a no-op on tier-six procedural floors 51..59', () => {
    for (const floor of [51, 55, 59]) {
      const c = { seedBase: 'JJJJ', floor, tierComplete: false };
      expect(completeTier(c), `floor ${floor}`).toEqual(c);
    }
  });

  it('T7 — flags completion at Dwaar VII, the single flag set a seventh time at floor 70', () => {
    let c = newCampaign('DDDD');
    for (let i = 1; i < TIER_SEVEN_FLOORS; i++) c = descend(c);
    expect(c.floor).toBe(70);
    expect(c.tierComplete).toBe(false); // the descent from 60 re-armed it
    const done = completeTier(c);
    expect(done.tierComplete).toBe(true);
  });

  it('T7 — is a no-op on tier-seven procedural floors 61..69', () => {
    for (const floor of [61, 65, 69]) {
      const c = { seedBase: 'KKKK', floor, tierComplete: false };
      expect(completeTier(c), `floor ${floor}`).toEqual(c);
    }
  });

  it('T8 — flags completion at Dwaar VIII, the single flag set an eighth time at floor 80', () => {
    let c = newCampaign('DDDD');
    for (let i = 1; i < TIER_EIGHT_FLOORS; i++) c = descend(c);
    expect(c.floor).toBe(80);
    expect(c.tierComplete).toBe(false); // the descent from 70 re-armed it
    const done = completeTier(c);
    expect(done.tierComplete).toBe(true);
  });

  it('T8 — is a no-op on tier-eight procedural floors 71..79', () => {
    for (const floor of [71, 75, 79]) {
      const c = { seedBase: 'LLLL', floor, tierComplete: false };
      expect(completeTier(c), `floor ${floor}`).toEqual(c);
    }
  });

  it('T9 — flags completion at Dwaar IX, the single flag set a ninth time at floor 90', () => {
    let c = newCampaign('DDDD');
    for (let i = 1; i < TIER_NINE_FLOORS; i++) c = descend(c);
    expect(c.floor).toBe(90);
    expect(c.tierComplete).toBe(false); // the descent from 80 re-armed it
    const done = completeTier(c);
    expect(done.tierComplete).toBe(true);
  });

  it('T9 — is a no-op on tier-nine procedural floors 81..89', () => {
    for (const floor of [81, 85, 89]) {
      const c = { seedBase: 'MMMM', floor, tierComplete: false };
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
    expect(isDwaar(51)).toBe(false); // a Furnace ramp floor — procedural, never a Dwaar
  });

  it('T6 — Dwaar VI joins the set at floor 60; 51..59 stay procedural', () => {
    expect(isDwaar(TIER_SIX_FLOORS)).toBe(true);
    expect(isDwaar(60)).toBe(true);
    for (const floor of [51, 55, 59]) expect(isDwaar(floor), `floor ${floor}`).toBe(false);
    expect(isDwaar(61)).toBe(false); // a Library ramp floor — procedural, never a Dwaar
  });

  it('T7 — Dwaar VII joins the set at floor 70; 61..69 stay procedural', () => {
    expect(isDwaar(TIER_SEVEN_FLOORS)).toBe(true);
    expect(isDwaar(70)).toBe(true);
    for (const floor of [61, 65, 69]) expect(isDwaar(floor), `floor ${floor}`).toBe(false);
    expect(isDwaar(71)).toBe(false); // a tier-eight ramp floor — procedural, never a Dwaar
  });

  it('T8 — Dwaar VIII joins the set at floor 80; 71..79 stay procedural', () => {
    expect(isDwaar(TIER_EIGHT_FLOORS)).toBe(true);
    expect(isDwaar(80)).toBe(true);
    for (const floor of [71, 75, 79]) expect(isDwaar(floor), `floor ${floor}`).toBe(false);
    expect(isDwaar(81)).toBe(false); // a Warrens ramp floor — procedural, never a Dwaar
  });

  it('T9 — Dwaar IX joins the set at floor 90; 81..89 stay procedural', () => {
    expect(isDwaar(TIER_NINE_FLOORS)).toBe(true);
    expect(isDwaar(90)).toBe(true);
    for (const floor of [81, 85, 89]) expect(isDwaar(floor), `floor ${floor}`).toBe(false);
    expect(isDwaar(91)).toBe(false); // past the tier close — never a Dwaar
    // and every elder Dwaar keeps its seat — all nine thresholds in one set
    for (const floor of [10, 20, 30, 40, 50, 60, 70, 80, 90])
      expect(isDwaar(floor), `floor ${floor}`).toBe(true);
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

  it('clamps floors past the campaign to the terminal floor (T9: Dwaar IX)', () => {
    // T3 pinned this to the Dwaar III values; T4 moved it to Dwaar IV's row;
    // T5 to Dwaar V's; T6 to Dwaar VI's; T7 to Dwaar VII's; T8 to Dwaar
    // VIII's; T9 widens the campaign to 90 — the clamp lands on Dwaar IX's row.
    expect(floorParams(99)).toEqual(floorParams(TIER_NINE_FLOORS));
    expect(floorParams(99)).not.toEqual(floorParams(TIER_EIGHT_FLOORS));
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

// T6/T1 — the Furnace Wings ramp. Echoes hold at tier five's 4 (Dwaar VI
// ALONE carrying 5 — the four-Sentinel crucible duel is the tier's apex);
// beacons hold at 4; braid keeps the +0.004 tread from a 0.32 base; the delay
// keeps its −60 slide toward the 2900 clamp, Dwaar VI arriving early at 2800
// — the crucible is hot and Chhaya does not wait.
describe('floorParams tier-six ramp (floors 51–60 pinned)', () => {
  // echoes = 4 on every procedural floor (Dwaar VI fixed 5); beacons 4;
  // braid = 0.32 + 0.004*(f-51);
  // chhayaDelayMs = max(2900, 3500 - 60*(f-51)) (Dwaar VI 2800).
  const pinned: [number, number, number, number, number][] = [
    // floor, echoes, beacons, braid, chhayaDelayMs
    [51, 4, 4, 0.32, 3500],
    [52, 4, 4, 0.324, 3440],
    [53, 4, 4, 0.328, 3380],
    [54, 4, 4, 0.332, 3320],
    [55, 4, 4, 0.336, 3260],
    [56, 4, 4, 0.34, 3200],
    [57, 4, 4, 0.344, 3140],
    [58, 4, 4, 0.348, 3080],
    [59, 4, 4, 0.352, 3020],
    [60, 5, 4, 0.356, 2800],
  ];

  it('matches the pinned ramp for every tier-six floor', () => {
    expect(pinned.length).toBe(TIER_SIX_FLOORS - TIER_FIVE_FLOORS);
    for (const [floor, echoes, beacons, braid, delay] of pinned) {
      const p = floorParams(floor);
      expect(p.echoes, `floor ${floor} echoes`).toBe(echoes);
      expect(p.beacons, `floor ${floor} beacons`).toBe(beacons);
      expect(p.braid, `floor ${floor} braid`).toBeCloseTo(braid, 10);
      expect(p.chhayaDelayMs, `floor ${floor} chhayaDelayMs`).toBe(delay);
    }
  });

  it('delays never drop below the 2900 clamp on tier-six procedural floors', () => {
    for (let f = TIER_FIVE_FLOORS + 1; f < TIER_SIX_FLOORS; f++)
      expect(floorParams(f).chhayaDelayMs).toBeGreaterThanOrEqual(2900);
  });

  it('Dwaar VI alone carries 5 echoes — the crucible duel hall', () => {
    for (let f = TIER_FIVE_FLOORS + 1; f < TIER_SIX_FLOORS; f++)
      expect(floorParams(f).echoes, `floor ${f}`).toBe(4);
    expect(floorParams(TIER_SIX_FLOORS).echoes).toBe(5);
    expect(floorParams(TIER_SIX_FLOORS).chhayaDelayMs).toBe(2800);
  });

  it('leaves every earlier tier pin untouched (floors 1–50 are frozen)', () => {
    // braid rides toBeCloseTo — 0.3 + 0.004*9 is not the literal 0.336 in
    // IEEE doubles (the T5 suite's documented pitfall); the ramp math itself
    // is untouched, only its precision
    const p50 = floorParams(50);
    expect(p50.echoes).toBe(5);
    expect(p50.beacons).toBe(4);
    expect(p50.braid).toBeCloseTo(0.336, 10);
    expect(p50.chhayaDelayMs).toBe(2900);
    expect(floorParams(41)).toEqual({ echoes: 4, beacons: 4, braid: 0.3, chhayaDelayMs: 3600 });
    const p40 = floorParams(40);
    expect(p40.echoes).toBe(5);
    expect(p40.beacons).toBe(4);
    expect(p40.braid).toBeCloseTo(0.316, 10);
    expect(p40.chhayaDelayMs).toBe(3000);
    expect(floorParams(10)).toEqual({ echoes: 4, beacons: 4, braid: 0.21, chhayaDelayMs: 4000 });
  });
});

// T7/T1 — the Whisper Library ramp. Echoes hold at the Furnace's 4 (Dwaar VII
// ALONE carrying 5 — the Taal+Gher duet is the tier's apex); beacons hold at
// 4; braid keeps the +0.004 tread from a 0.36 base; the delay keeps its −60
// slide toward the 2700 clamp, Dwaar VII arriving early at 2600 — the stacks
// hush and Chhaya does not wait.
describe('floorParams tier-seven ramp (floors 61–70 pinned)', () => {
  // echoes = 4 on every procedural floor (Dwaar VII fixed 5); beacons 4;
  // braid = 0.36 + 0.004*(f-61);
  // chhayaDelayMs = max(2700, 3300 - 60*(f-61)) (Dwaar VII 2600).
  const pinned: [number, number, number, number, number][] = [
    // floor, echoes, beacons, braid, chhayaDelayMs
    [61, 4, 4, 0.36, 3300],
    [62, 4, 4, 0.364, 3240],
    [63, 4, 4, 0.368, 3180],
    [64, 4, 4, 0.372, 3120],
    [65, 4, 4, 0.376, 3060],
    [66, 4, 4, 0.38, 3000],
    [67, 4, 4, 0.384, 2940],
    [68, 4, 4, 0.388, 2880],
    [69, 4, 4, 0.392, 2820],
    [70, 5, 4, 0.396, 2600],
  ];

  it('matches the pinned ramp for every tier-seven floor', () => {
    expect(pinned.length).toBe(TIER_SEVEN_FLOORS - TIER_SIX_FLOORS);
    for (const [floor, echoes, beacons, braid, delay] of pinned) {
      const p = floorParams(floor);
      expect(p.echoes, `floor ${floor} echoes`).toBe(echoes);
      expect(p.beacons, `floor ${floor} beacons`).toBe(beacons);
      expect(p.braid, `floor ${floor} braid`).toBeCloseTo(braid, 10);
      expect(p.chhayaDelayMs, `floor ${floor} chhayaDelayMs`).toBe(delay);
    }
  });

  it('delays never drop below the 2700 clamp on tier-seven procedural floors', () => {
    for (let f = TIER_SIX_FLOORS + 1; f < TIER_SEVEN_FLOORS; f++)
      expect(floorParams(f).chhayaDelayMs).toBeGreaterThanOrEqual(2700);
  });

  it('Dwaar VII alone carries 5 echoes — the duet hall', () => {
    for (let f = TIER_SIX_FLOORS + 1; f < TIER_SEVEN_FLOORS; f++)
      expect(floorParams(f).echoes, `floor ${f}`).toBe(4);
    expect(floorParams(TIER_SEVEN_FLOORS).echoes).toBe(5);
    expect(floorParams(TIER_SEVEN_FLOORS).chhayaDelayMs).toBe(2600);
  });

  it('leaves every earlier tier pin untouched (floors 1–60 are frozen)', () => {
    // braid rides toBeCloseTo — 0.32 + 0.004*9 is not the literal 0.356 in
    // IEEE doubles (the T5/T6 suites' documented pitfall); the ramp math
    // itself is untouched, only its precision
    const p60 = floorParams(60);
    expect(p60.echoes).toBe(5);
    expect(p60.beacons).toBe(4);
    expect(p60.braid).toBeCloseTo(0.356, 10);
    expect(p60.chhayaDelayMs).toBe(2800);
    expect(floorParams(51)).toEqual({ echoes: 4, beacons: 4, braid: 0.32, chhayaDelayMs: 3500 });
    const p50 = floorParams(50);
    expect(p50.echoes).toBe(5);
    expect(p50.beacons).toBe(4);
    expect(p50.braid).toBeCloseTo(0.336, 10);
    expect(p50.chhayaDelayMs).toBe(2900);
    expect(floorParams(10)).toEqual({ echoes: 4, beacons: 4, braid: 0.21, chhayaDelayMs: 4000 });
  });
});

// T8/T1 — the Frozen Atrium ramp. Echoes hold at the Library's 4 (Dwaar VIII
// ALONE carrying 5 — the all-four-Sentinel duel is the tier's apex); beacons
// hold at 4; braid keeps the +0.004 tread from a 0.38 base; the delay keeps
// its −60 slide toward the 2600 clamp, Dwaar VIII arriving early at 2500 —
// the atrium freezes and Chhaya does not wait.
describe('floorParams tier-eight ramp (floors 71–80 pinned)', () => {
  // echoes = 4 on every procedural floor (Dwaar VIII fixed 5); beacons 4;
  // braid = 0.38 + 0.004*(f-71);
  // chhayaDelayMs = max(2600, 3200 - 60*(f-71)) (Dwaar VIII 2500).
  const pinned: [number, number, number, number, number][] = [
    // floor, echoes, beacons, braid, chhayaDelayMs
    [71, 4, 4, 0.38, 3200],
    [72, 4, 4, 0.384, 3140],
    [73, 4, 4, 0.388, 3080],
    [74, 4, 4, 0.392, 3020],
    [75, 4, 4, 0.396, 2960],
    [76, 4, 4, 0.4, 2900],
    [77, 4, 4, 0.404, 2840],
    [78, 4, 4, 0.408, 2780],
    [79, 4, 4, 0.412, 2720],
    [80, 5, 4, 0.416, 2500],
  ];

  it('matches the pinned ramp for every tier-eight floor', () => {
    expect(pinned.length).toBe(TIER_EIGHT_FLOORS - TIER_SEVEN_FLOORS);
    for (const [floor, echoes, beacons, braid, delay] of pinned) {
      const p = floorParams(floor);
      expect(p.echoes, `floor ${floor} echoes`).toBe(echoes);
      expect(p.beacons, `floor ${floor} beacons`).toBe(beacons);
      expect(p.braid, `floor ${floor} braid`).toBeCloseTo(braid, 10);
      expect(p.chhayaDelayMs, `floor ${floor} chhayaDelayMs`).toBe(delay);
    }
  });

  it('delays never drop below the 2600 clamp on tier-eight procedural floors', () => {
    for (let f = TIER_SEVEN_FLOORS + 1; f < TIER_EIGHT_FLOORS; f++)
      expect(floorParams(f).chhayaDelayMs).toBeGreaterThanOrEqual(2600);
  });

  it('Dwaar VIII alone carries 5 echoes — the all-four duel hall', () => {
    for (let f = TIER_SEVEN_FLOORS + 1; f < TIER_EIGHT_FLOORS; f++)
      expect(floorParams(f).echoes, `floor ${f}`).toBe(4);
    expect(floorParams(TIER_EIGHT_FLOORS).echoes).toBe(5);
    expect(floorParams(TIER_EIGHT_FLOORS).chhayaDelayMs).toBe(2500);
  });

  it('leaves every earlier tier pin untouched (floors 1–70 are frozen)', () => {
    // braid rides toBeCloseTo — 0.36 + 0.004*9 is not the literal 0.396 in
    // IEEE doubles (the elder suites' documented pitfall); the ramp math
    // itself is untouched, only its precision
    const p70 = floorParams(70);
    expect(p70.echoes).toBe(5);
    expect(p70.beacons).toBe(4);
    expect(p70.braid).toBeCloseTo(0.396, 10);
    expect(p70.chhayaDelayMs).toBe(2600);
    expect(floorParams(61)).toEqual({ echoes: 4, beacons: 4, braid: 0.36, chhayaDelayMs: 3300 });
    const p60 = floorParams(60);
    expect(p60.echoes).toBe(5);
    expect(p60.beacons).toBe(4);
    expect(p60.braid).toBeCloseTo(0.356, 10);
    expect(p60.chhayaDelayMs).toBe(2800);
    expect(floorParams(10)).toEqual({ echoes: 4, beacons: 4, braid: 0.21, chhayaDelayMs: 4000 });
  });
});

// T9/T1 — the Warden's Warrens ramp. Echoes hold at the Atrium's 4 on the
// procedural floors (Dwaar IX ALONE carrying 6 — one MORE than every elder
// duel carried: the all-four apex duel is the campaign's hardest room, the
// warren is the tier's teeth and the echo swarm is its breath); beacons hold
// at 4; braid keeps the +0.004 tread from a 0.40 base; the delay keeps its
// −60 slide toward the 2400 clamp, Dwaar IX arriving early at 2300 — the
// Warden's own halls, and Chhaya does not wait.
describe('floorParams tier-nine ramp (floors 81–90 pinned)', () => {
  // echoes = 5 on every procedural floor (Dwaar IX fixed 6); beacons 4;
  // braid = 0.40 + 0.004*(f-81);
  // chhayaDelayMs = max(2400, 3000 - 60*(f-81)) (Dwaar IX 2300).
  const pinned: [number, number, number, number, number][] = [
    // floor, echoes, beacons, braid, chhayaDelayMs
    [81, 5, 4, 0.4, 3000],
    [82, 5, 4, 0.404, 2940],
    [83, 5, 4, 0.408, 2880],
    [84, 5, 4, 0.412, 2820],
    [85, 5, 4, 0.416, 2760],
    [86, 5, 4, 0.42, 2700],
    [87, 5, 4, 0.424, 2640],
    [88, 5, 4, 0.428, 2580],
    [89, 5, 4, 0.432, 2520],
    [90, 6, 4, 0.436, 2300],
  ];

  it('matches the pinned ramp for every tier-nine floor', () => {
    expect(pinned.length).toBe(TIER_NINE_FLOORS - TIER_EIGHT_FLOORS);
    for (const [floor, echoes, beacons, braid, delay] of pinned) {
      const p = floorParams(floor);
      expect(p.echoes, `floor ${floor} echoes`).toBe(echoes);
      expect(p.beacons, `floor ${floor} beacons`).toBe(beacons);
      expect(p.braid, `floor ${floor} braid`).toBeCloseTo(braid, 10);
      expect(p.chhayaDelayMs, `floor ${floor} chhayaDelayMs`).toBe(delay);
    }
  });

  it('delays never drop below the 2400 clamp on tier-nine procedural floors', () => {
    for (let f = TIER_EIGHT_FLOORS + 1; f < TIER_NINE_FLOORS; f++)
      expect(floorParams(f).chhayaDelayMs).toBeGreaterThanOrEqual(2400);
  });

  it('Dwaar IX alone carries 6 echoes — one MORE than every elder duel hall', () => {
    for (let f = TIER_EIGHT_FLOORS + 1; f < TIER_NINE_FLOORS; f++)
      expect(floorParams(f).echoes, `floor ${f}`).toBe(5);
    expect(floorParams(TIER_NINE_FLOORS).echoes).toBe(6);
    expect(floorParams(TIER_NINE_FLOORS).chhayaDelayMs).toBe(2300);
    // and the elder apex duel halls all carried 5 — IX is the escalation
    for (const dwaar of [50, 60, 70, 80])
      expect(floorParams(dwaar).echoes, `Dwaar floor ${dwaar}`).toBe(5);
  });

  it('leaves every earlier tier pin untouched (floors 1–80 are frozen)', () => {
    // braid rides toBeCloseTo — 0.38 + 0.004*9 is not the literal 0.416 in
    // IEEE doubles (the elder suites' documented pitfall); the ramp math
    // itself is untouched, only its precision
    const p80 = floorParams(80);
    expect(p80.echoes).toBe(5);
    expect(p80.beacons).toBe(4);
    expect(p80.braid).toBeCloseTo(0.416, 10);
    expect(p80.chhayaDelayMs).toBe(2500);
    expect(floorParams(71)).toEqual({ echoes: 4, beacons: 4, braid: 0.38, chhayaDelayMs: 3200 });
    const p70 = floorParams(70);
    expect(p70.echoes).toBe(5);
    expect(p70.beacons).toBe(4);
    expect(p70.braid).toBeCloseTo(0.396, 10);
    expect(p70.chhayaDelayMs).toBe(2600);
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

  it('T6 — taalPresent RESTS on 51–59, the first rest of his career', () => {
    // the rotation's second turn: the beat-water pairing was the FLOOD's
    // gimmick (tier five); the Furnace is Gher+Aavart's home and the heat
    // re-tunes the fight — the beat-walker sits 51–59 out
    for (const floor of [51, 54, 58, 59]) expect(taalPresent(floor), `floor ${floor}`).toBe(false);
    // he keeps the T5 apex duel he has always walked...
    expect(taalPresent(50)).toBe(true);
    // T7 — the rest EXTENDS through the Dwaar VI crucible (60) and the
    // Library's first five floors (61–65): the ratified net change on the
    // old floors is 60–65 gaining rest. The T6 "crucible calls him back"
    // pin retires with the tier screen itself (now Dwaar VII's).
    expect(taalPresent(60)).toBe(false);
  });

  it('T6 — gher/aavart RETURN from rest: they walk every Furnace floor 51–60', () => {
    for (const floor of [51, 54, 58, 59, 60]) {
      expect(gherPresent(floor), `floor ${floor} gher`).toBe(true);
      expect(aavartPresent(floor), `floor ${floor} aavart`).toBe(true);
    }
  });

  it('T6 — the truth table extends: 51–59 are Gher+Aavart (no Taal), 60 is Gher+Aavart', () => {
    // rows 1–50 above are UNTOUCHED — the extension appends the Furnace only.
    // Chhaya walks every floor as always (she has no presence gate).
    // T7 — floor 60's taal cell flips to rest (the ratified net change on the
    // old floors: Taal's rest extends 60–65); Gher and Aavart KEEP the
    // Furnace they have always walked — their T7 rest starts at 61.
    const table: [number, boolean, boolean, boolean][] = [
      [51, false, true, true],
      [55, false, true, true],
      [59, false, true, true],
      [60, false, true, true],
    ];
    for (const [f, taal, gher, aavart] of table) {
      expect(taalPresent(f), `floor ${f} taal`).toBe(taal);
      expect(gherPresent(f), `floor ${f} gher`).toBe(gher);
      expect(aavartPresent(f), `floor ${f} aavart`).toBe(aavart);
    }
  });

  it('T7 — taalPresent RETURNS at 66 — the beat in the silence', () => {
    // the rotation's third turn: the rest extends 51–65 (60–65 newly resting,
    // see the T6 row above) and the beat-walker walks the Library's last five
    // floors — his ticks are noise HE ignores but you cannot miss (T7/T2)
    for (const floor of [61, 64, 65]) expect(taalPresent(floor), `floor ${floor}`).toBe(false);
    for (const floor of [66, 67, 69, 70]) expect(taalPresent(floor), `floor ${floor}`).toBe(true);
  });

  it('T7 — gherPresent rests 61–69 and joins ONLY at the Dwaar VII duet (70)', () => {
    // the Furnace stays his home tier (50–60, untouched by T7); the quiet
    // stacks give him the whole tier off except the duet — the ratified
    // Encircler cameo, Taal + Gher in the library
    for (const floor of [61, 64, 65, 66, 69]) expect(gherPresent(floor), `floor ${floor}`).toBe(
      false,
    );
    expect(gherPresent(70)).toBe(true);
    // and every floor ≤ 60 reads exactly as the T6 rotation did
    for (const floor of [50, 51, 55, 59, 60]) expect(gherPresent(floor), `floor ${floor}`).toBe(
      true,
    );
    for (const floor of [41, 45, 49]) expect(gherPresent(floor), `floor ${floor}`).toBe(false);
  });

  it('T7 — aavartPresent rests ALL of tier 7 (61–70) — he returns in tier 8', () => {
    for (const floor of [61, 64, 65, 66, 69, 70])
      expect(aavartPresent(floor), `floor ${floor}`).toBe(false);
    // and every floor ≤ 60 reads exactly as the T6 rotation did
    for (const floor of [50, 51, 55, 59, 60]) expect(aavartPresent(floor), `floor ${floor}`).toBe(
      true,
    );
    for (const floor of [41, 45, 49]) expect(aavartPresent(floor), `floor ${floor}`).toBe(false);
  });

  it('T7 — the truth table extends: 61–65 are EMPTY, 66–69 Taal alone, 70 the duet', () => {
    // rows 1–60 above stay as pinned (the ONE ratified flip is Taal's 60 cell,
    // re-pinned above). The quiet library: nobody walks 61–65; Taal's beat
    // enters the silence at 66; Dwaar VII is the Taal+Gher duet (Aavart rests).
    const table: [number, boolean, boolean, boolean][] = [
      [61, false, false, false],
      [65, false, false, false],
      [66, true, false, false],
      [69, true, false, false],
      [70, true, true, false],
    ];
    for (const [f, taal, gher, aavart] of table) {
      expect(taalPresent(f), `floor ${f} taal`).toBe(taal);
      expect(gherPresent(f), `floor ${f} gher`).toBe(gher);
      expect(aavartPresent(f), `floor ${f} aavart`).toBe(aavart);
    }
  });

  it('T8 — taalPresent RESTS on 71–79, his beat returning ONLY for the Dwaar VIII duel (80)', () => {
    // the rotation's fourth turn: the atrium belongs to the Ambusher's
    // ambush and the frozen glass — the beat-walker sits 71–79 out and is
    // called down for the all-four close
    for (const floor of [71, 74, 79]) expect(taalPresent(floor), `floor ${floor}`).toBe(false);
    // he keeps the shipped t7 rows he has always walked (66–70 — the
    // beat in the silence and the duet) ...
    for (const floor of [66, 67, 69, 70]) expect(taalPresent(floor), `floor ${floor}`).toBe(true);
    // ... and takes the apex duel floor
    expect(taalPresent(80)).toBe(true);
  });

  it('T8 — gherPresent rests 71–79 and joins ONLY at the Dwaar VIII duel (80)', () => {
    // the same rest-to-the-duel shape his tier-7 cameo took: the Encircler
    // sits the atrium out, the frozen floors belong to Chhaya and Aavart
    for (const floor of [71, 74, 79]) expect(gherPresent(floor), `floor ${floor}`).toBe(false);
    // and every floor ≤ 70 reads exactly as the shipped t7 rotation did
    for (const floor of [50, 55, 59, 60, 70]) expect(gherPresent(floor), `floor ${floor}`).toBe(
      true,
    );
    for (const floor of [41, 45, 49, 61, 65, 69]) expect(gherPresent(floor), `floor ${floor}`).toBe(
      false,
    );
    expect(gherPresent(80)).toBe(true);
  });

  it('T8 — aavartPresent RETURNS: the Ambusher walks the whole Atrium (71–80)', () => {
    // his gate was bare-`>= 31` shaped in the tier-7 era only through his
    // explicit 50–60 bound — tier 7 rested him by OMISSION. The atrium
    // calls him back: 71–80 all walk, and his shipped rows 61–70 stay rest
    for (const floor of [71, 74, 79, 80]) expect(aavartPresent(floor), `floor ${floor}`).toBe(true);
    // and every floor ≤ 70 reads exactly as the shipped t7 rotation did
    for (const floor of [50, 55, 59, 60]) expect(aavartPresent(floor), `floor ${floor}`).toBe(true);
    for (const floor of [41, 45, 49, 61, 65, 69, 70])
      expect(aavartPresent(floor), `floor ${floor}`).toBe(false);
  });

  it('T8 — the truth table extends: 71–79 are Aavart ALONE, 80 the all-four duel — rows 1–70 IDENTICAL to shipped t7', () => {
    // the shipped t7 rotation, frozen INTO this test as the identity oracle:
    // every row 1–70 must read EXACTLY as it did the day the Library closed.
    const shippedT7 = (f: number): [boolean, boolean, boolean] => {
      const taal = (f >= 11 && f <= 50) || f >= 66;
      const gher = (f >= 21 && f <= 40) || (f >= 50 && f <= 60) || f === 70;
      const aavart = (f >= 31 && f <= 40) || (f >= 50 && f <= 60);
      return [taal, gher, aavart];
    };
    for (let f = 1; f <= 70; f++) {
      const [taal, gher, aavart] = shippedT7(f);
      expect(taalPresent(f), `floor ${f} taal (shipped t7 row)`).toBe(taal);
      expect(gherPresent(f), `floor ${f} gher (shipped t7 row)`).toBe(gher);
      expect(aavartPresent(f), `floor ${f} aavart (shipped t7 row)`).toBe(aavart);
    }
    // the extension: 71–79 Chhaya+Aavart walk the Atrium (Taal and Gher
    // rest); Dwaar VIII is the campaign's second all-four duel (Chhaya has
    // no gate — she walks every floor as always)
    const table: [number, boolean, boolean, boolean][] = [
      [71, false, false, true],
      [75, false, false, true],
      [79, false, false, true],
      [80, true, true, true],
    ];
    for (const [f, taal, gher, aavart] of table) {
      expect(taalPresent(f), `floor ${f} taal`).toBe(taal);
      expect(gherPresent(f), `floor ${f} gher`).toBe(gher);
      expect(aavartPresent(f), `floor ${f} aavart`).toBe(aavart);
    }
  });

  it('T9 — the APEX: all four hunt on every Warrens floor, rows 1–80 IDENTICAL to shipped t8', () => {
    // the apex turn (spec §4.6 row 9, "all four hunt together", delivered as
    // the tier itself): every rest ENDS at 81. Taal's duel-floor equality
    // (80) widens to open-ended ≥80, Gher's the same, Aavart's shipped `> 70`
    // already walked the apex untouched — and Chhaya has no gate, as always.
    // The shipped t8 rotation, frozen INTO this test as the identity oracle:
    // every row 1–80 must read EXACTLY as it did the day the Atrium closed.
    const shippedT8 = (f: number): [boolean, boolean, boolean] => {
      const taal = (f >= 11 && f <= 50) || (f >= 66 && f <= 70) || f === 80;
      const gher = (f >= 21 && f <= 40) || (f >= 50 && f <= 60) || f === 70 || f === 80;
      const aavart = (f >= 31 && f <= 40) || (f >= 50 && f <= 60) || f > 70;
      return [taal, gher, aavart];
    };
    for (let f = 1; f <= 80; f++) {
      const [taal, gher, aavart] = shippedT8(f);
      expect(taalPresent(f), `floor ${f} taal (shipped t8 row)`).toBe(taal);
      expect(gherPresent(f), `floor ${f} gher (shipped t8 row)`).toBe(gher);
      expect(aavartPresent(f), `floor ${f} aavart (shipped t8 row)`).toBe(aavart);
    }
    // the apex extension: 81–90 are ALL-FOUR floors — Taal's beat, Gher's
    // circle and Aavart's ambush beside Chhaya's shadow on every one of them,
    // Dwaar IX included. The rests end; the rotation reaches its summit.
    const table: [number, boolean, boolean, boolean][] = [
      [81, true, true, true],
      [85, true, true, true],
      [89, true, true, true],
      [90, true, true, true],
    ];
    for (const [f, taal, gher, aavart] of table) {
      expect(taalPresent(f), `floor ${f} taal`).toBe(taal);
      expect(gherPresent(f), `floor ${f} gher`).toBe(gher);
      expect(aavartPresent(f), `floor ${f} aavart`).toBe(aavart);
    }
  });

  it('T2 — the spawn wiring confirms the apex: taal/gher/aavart walk EVERY floor 81–90, decoys armed (tier ≥ 5)', () => {
    // buildFloor's spawn gates read these fns directly (taal/gher/aavart =
    // initTaal/initGher/initAavart when present, null otherwise), and the
    // decoy clock arms wherever tierOf ≥ 5 — so presence-all-90 + tier 9 IS
    // the wiring: all four hunt (Chhaya has no gate) and the mirror-you
    // copies spawn beside them, Dwaar IX included. The texture stack rides
    // the same floors (T9/T2).
    for (let f = TIER_EIGHT_FLOORS + 1; f <= TIER_NINE_FLOORS; f++) {
      expect(taalPresent(f), `floor ${f} taal walks`).toBe(true);
      expect(gherPresent(f), `floor ${f} gher walks`).toBe(true);
      expect(aavartPresent(f), `floor ${f} aavart walks`).toBe(true);
      expect(tierOf(f) >= 5, `floor ${f} decoys armed`).toBe(true);
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

// T6/T1 — Dwaar VI, the crucible forge (floor 60, the four-Sentinel duel
// where Taal returns from rest). 13×13 like its elders, 101 open cells: TWIN
// PARALLEL FORGE CORRIDORS — two long 3-wide halls (cols 1–3 and 9–11,
// rows 1–11) run the forge's length, joined at the ends by the open cross
// runs and joined in the MIDDLE by a central 3×3 CRUCIBLE CHAMBER through
// EXACTLY 4 connecting gaps (the W/E pair pairs (4,5)/(8,7) and (4,7)/(8,5),
// 180° mirrors — the only openings on the crucible's perimeter). The forge's
// chimneys stand as wall blocks on the cross runs (rows 2/10) and as single
// studs on rows 1/11. Invariant under 180° rotation so the exit mirrors the
// entrance; all 101 open cells form one connected component — four Sentinels
// need the room to walk their beats.
describe('DWAAR_VI_LAYOUT — the crucible forge (floor 60, the campaign closes)', () => {
  const isOpen = (x: number, y: number): boolean => DWAAR_VI_LAYOUT[y]![x] === '.';
  const count = (layout: readonly string[]): number =>
    layout.reduce((n, row) => n + [...row].filter((c) => c === '.').length, 0);

  it('is 13 rows of 13 chars, walls and open cells only', () => {
    expect(DWAAR_VI_LAYOUT.length).toBe(13);
    for (const row of DWAAR_VI_LAYOUT) {
      expect(row.length).toBe(13);
      expect(row).toMatch(/^[#.]{13}$/);
    }
  });

  it('is symmetric under 180° rotation', () => {
    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 13; x++)
        expect(DWAAR_VI_LAYOUT[y]![x]).toBe(DWAAR_VI_LAYOUT[12 - y]![12 - x]);
  });

  it('holds 101 open cells — the ~100 the plan targets, in the elder band', () => {
    expect(count(DWAAR_VI_LAYOUT)).toBe(101);
    expect(count(DWAAR_VI_LAYOUT)).toBeGreaterThanOrEqual(95);
    expect(count(DWAAR_VI_LAYOUT)).toBeLessThanOrEqual(105);
    expect(count(DWAAR_VI_LAYOUT)).toBeGreaterThan(count(DWAAR_II_LAYOUT)); // 96 — still airy
  });

  it('carries the TWIN parallel forge corridors: cols 1–3 and 9–11 stand open, rows 1–11', () => {
    // two long 3-wide halls, each 33 cells, the whole campaign's longest
    // corridors — the forge's work floors
    for (let y = 1; y <= 11; y++)
      for (const x of [1, 2, 3, 9, 10, 11])
        expect(isOpen(x, y), `corridor cell ${x},${y}`).toBe(true);
  });

  it('carries the central 3×3 crucible joined by EXACTLY 4 connecting gaps', () => {
    // the chamber itself stands fully open at the exact center
    for (let y = 5; y <= 7; y++)
      for (let x = 5; x <= 7; x++) expect(isOpen(x, y), `crucible ${x},${y}`).toBe(true);
    // its 12 perimeter cells hold exactly 4 openings — the W/E pairs
    // (4,5)/(8,7) and (4,7)/(8,5), each bridging corridor to crucible; the
    // N/S faces and the W/E middles stay wall (the forge mass)
    const perimeter: Array<[number, number]> = [];
    for (let x = 5; x <= 7; x++) perimeter.push([x, 4], [x, 8]);
    for (let y = 5; y <= 7; y++) perimeter.push([4, y], [8, y]);
    expect(perimeter.length).toBe(12);
    expect(perimeter.filter(([x, y]) => isOpen(x, y))).toEqual([
      [4, 5],
      [8, 5],
      [4, 7],
      [8, 7],
    ]);
  });

  it('carries the forge chimneys: wall blocks on the cross runs, studs on rows 1/11', () => {
    // rows 2 and 10 carry the three-wide chimney blocks; rows 1 and 11 a
    // single stud each — the forge's smoke, 180°-mirrored
    for (const y of [2, 10]) {
      for (const x of [5, 6, 7]) expect(isOpen(x, y), `chimney ${x},${y}`).toBe(false);
    }
    for (const y of [1, 11]) expect(isOpen(6, y), `stud ${6},${y}`).toBe(false);
  });

  it('all open cells are connected (BFS via maze bfsDistances)', () => {
    const { grid, open } = layoutGrid(DWAAR_VI_LAYOUT);
    const entrance = open[0]!; // first open cell row-major = (1,1)
    const dist = bfsDistances(grid, entrance);
    const reached = Array.from(dist).filter((d) => d >= 0).length;
    expect(open.length).toBe(101);
    expect(reached).toBe(open.length); // every open cell reachable, walls sealed off
  });

  it('entrance/exit are derivable: (1,1) → farthest open cell (11,11), 20 steps', () => {
    const { grid, open } = layoutGrid(DWAAR_VI_LAYOUT);
    const entrance = open[0]!;
    expect(entrance).toEqual({ x: 1, y: 1 });
    const dist = bfsDistances(grid, entrance);
    let best = 0;
    for (let i = 1; i < dist.length; i++) if (dist[i]! > dist[best]!) best = i;
    const exit: CellIndex = { x: best % 13, y: Math.floor(best / 13) };
    expect(exit).toEqual({ x: 11, y: 11 }); // bottom-right mirror of the entrance
    expect(dist[best]).toBe(20); // a real traverse of the forge
  });
});

describe('dwaarGrid floor 60', () => {
  it('derives the Dwaar VI open-cell set from DWAAR_VI_LAYOUT', () => {
    const g = dwaarGrid(TIER_SIX_FLOORS);
    expect(g.width).toBe(13);
    expect(g.height).toBe(13);
    expect(g.open.length).toBe(101);
    expect(g.open[0]).toEqual({ x: 1, y: 1 });
    for (const c of g.open) expect(DWAAR_VI_LAYOUT[c.y]![c.x]).toBe('.');
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
    expect(dwaarGrid(TIER_FIVE_FLOORS).open.length).toBe(101);
  });
});

// T7/T1 — Dwaar VII, the reading room (floor 70, the Taal+Gher duet where the
// beat-walker returns from rest). 13×13 like its elders, 95 open cells: LONG
// PARALLEL SHELF-WALLS — four long wall runs (the stacks) laid across the
// hall on rows 3/5/7/9, each row a run (or a run pair) with single-cell gaps,
// separated by fully-open single-cell aisles (rows 2/4/6/8/10) — and four
// READING ALCOVES at the shelf ends, one per shelf, each an open nook
// sandwiched between the shelf's end and a stub wall (180°-mirrored pairs).
// Invariant under 180° rotation so the exit mirrors the entrance; all 95
// open cells form one connected component — the duet needs the room to walk
// its beats, and the blind Echoes need stacks to listen past.
describe('DWAAR_VII_LAYOUT — the reading room (floor 70, the campaign closes)', () => {
  const isOpen = (x: number, y: number): boolean => DWAAR_VII_LAYOUT[y]![x] === '.';
  const count = (layout: readonly string[]): number =>
    layout.reduce((n, row) => n + [...row].filter((c) => c === '.').length, 0);

  it('is 13 rows of 13 chars, walls and open cells only', () => {
    expect(DWAAR_VII_LAYOUT.length).toBe(13);
    for (const row of DWAAR_VII_LAYOUT) {
      expect(row.length).toBe(13);
      expect(row).toMatch(/^[#.]{13}$/);
    }
  });

  it('is symmetric under 180° rotation', () => {
    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 13; x++)
        expect(DWAAR_VII_LAYOUT[y]![x]).toBe(DWAAR_VII_LAYOUT[12 - y]![12 - x]);
  });

  it('holds 95 open cells — the ~95 the plan targets', () => {
    expect(count(DWAAR_VII_LAYOUT)).toBe(95);
    expect(count(DWAAR_VII_LAYOUT)).toBeGreaterThanOrEqual(90);
    expect(count(DWAAR_VII_LAYOUT)).toBeLessThanOrEqual(105);
  });

  it('carries four long parallel shelf-walls on rows 3/5/7/9', () => {
    // each shelf row holds a contiguous wall RUN of at least 5 cells — the
    // stacks — with rows 2/4/6/8/10 standing fully open between them (the
    // single-cell aisles a reader walks)
    const longestRun = (y: number): number => {
      let best = 0;
      let run = 0;
      for (let x = 1; x < 12; x++) {
        run = isOpen(x, y) ? 0 : run + 1;
        best = Math.max(best, run);
      }
      return best;
    };
    for (const y of [3, 5, 7, 9]) expect(longestRun(y), `shelf row ${y}`).toBeGreaterThanOrEqual(5);
    for (const y of [2, 4, 6, 8, 10]) {
      for (let x = 1; x < 12; x++) expect(isOpen(x, y), `aisle ${x},${y}`).toBe(true);
    }
  });

  it('carries four reading alcoves at the shelf ends (180°-mirrored pairs)', () => {
    // an alcove = an open cell tucked between walls on its E and W sides and
    // open to the aisles N and S — a nook at a shelf's end; away from the
    // outer corridor columns (x stays interior, 2..10)
    const alcoves: Array<[number, number]> = [];
    for (let y = 1; y < 12; y++)
      for (let x = 2; x < 11; x++)
        if (
          isOpen(x, y) &&
          !isOpen(x - 1, y) &&
          !isOpen(x + 1, y) &&
          isOpen(x, y - 1) &&
          isOpen(x, y + 1)
        )
          alcoves.push([x, y]);
    expect(alcoves.sort((a, b) => a[1] - b[1] || a[0] - b[0])).toEqual([
      [3, 3],
      [9, 5],
      [3, 7],
      [9, 9],
    ]); // (3,3)↔(9,9) and (9,5)↔(3,7) — the 180° pairs
  });

  it('all open cells are connected (BFS via maze bfsDistances)', () => {
    const { grid, open } = layoutGrid(DWAAR_VII_LAYOUT);
    const entrance = open[0]!; // first open cell row-major = (1,1)
    const dist = bfsDistances(grid, entrance);
    const reached = Array.from(dist).filter((d) => d >= 0).length;
    expect(open.length).toBe(95);
    expect(reached).toBe(open.length); // every open cell reachable, walls sealed off
  });

  it('entrance/exit are derivable: (1,1) → farthest open cell (11,11), 20 steps', () => {
    const { grid, open } = layoutGrid(DWAAR_VII_LAYOUT);
    const entrance = open[0]!;
    expect(entrance).toEqual({ x: 1, y: 1 });
    const dist = bfsDistances(grid, entrance);
    let best = 0;
    for (let i = 1; i < dist.length; i++) if (dist[i]! > dist[best]!) best = i;
    const exit: CellIndex = { x: best % 13, y: Math.floor(best / 13) };
    expect(exit).toEqual({ x: 11, y: 11 }); // bottom-right mirror of the entrance
    expect(dist[best]).toBe(20); // a real traverse of the stacks
  });
});

describe('dwaarGrid floor 70', () => {
  it('derives the Dwaar VII open-cell set from DWAAR_VII_LAYOUT', () => {
    const g = dwaarGrid(TIER_SEVEN_FLOORS);
    expect(g.width).toBe(13);
    expect(g.height).toBe(13);
    expect(g.open.length).toBe(95);
    expect(g.open[0]).toEqual({ x: 1, y: 1 });
    for (const c of g.open) expect(DWAAR_VII_LAYOUT[c.y]![c.x]).toBe('.');
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
    expect(dwaarGrid(TIER_FIVE_FLOORS).open.length).toBe(101);
    expect(dwaarGrid(TIER_SIX_FLOORS).open.length).toBe(101);
  });
});

// T8/T1 — Dwaar VIII, the frozen atrium (floor 80, the all-four duel where
// the campaign's fourth act of floors closes). 13×13 like its elders, 97 open
// cells: a GRAND CENTRAL RING — the chebyshev-radius-3 wall ring (24 cells)
// around a fully-open 5×5 inner court, broken by EXACTLY 4 gaps at the
// compass midpoints (the atrium's four gates) — plus 4 RADIAL GALLERIES: one
// gallery wall on each ring-corner→hall-corner diagonal, whose flanks form
// the narrow corner galleries a walker takes toward the entrance/exit
// corners. Nothing else is wall: the atrium floor stands grand where the
// Library crowded its stacks. Invariant under 180° rotation so the exit
// mirrors the entrance; all 97 open cells form one connected component —
// four Sentinels need the room to walk their beats.
describe('DWAAR_VIII_LAYOUT — the frozen atrium (floor 80, the campaign closes)', () => {
  const isOpen = (x: number, y: number): boolean => DWAAR_VIII_LAYOUT[y]![x] === '.';
  const count = (layout: readonly string[]): number =>
    layout.reduce((n, row) => n + [...row].filter((c) => c === '.').length, 0);
  const cheb = (x: number, y: number): number => Math.max(Math.abs(x - 6), Math.abs(y - 6));

  it('is 13 rows of 13 chars, walls and open cells only', () => {
    expect(DWAAR_VIII_LAYOUT.length).toBe(13);
    for (const row of DWAAR_VIII_LAYOUT) {
      expect(row.length).toBe(13);
      expect(row).toMatch(/^[#.]{13}$/);
    }
  });

  it('is symmetric under 180° rotation', () => {
    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 13; x++)
        expect(DWAAR_VIII_LAYOUT[y]![x]).toBe(DWAAR_VIII_LAYOUT[12 - y]![12 - x]);
  });

  it('holds 97 open cells — ~100 open, in the elder band', () => {
    expect(count(DWAAR_VIII_LAYOUT)).toBe(97);
    expect(count(DWAAR_VIII_LAYOUT)).toBeGreaterThanOrEqual(95);
    expect(count(DWAAR_VIII_LAYOUT)).toBeLessThanOrEqual(105);
    expect(count(DWAAR_VIII_LAYOUT)).toBeGreaterThan(count(DWAAR_VII_LAYOUT)); // 95 — the stacks gave back their air
  });

  it('carries the grand central ring: a wall ring with EXACTLY 4 compass gaps', () => {
    // the chebyshev-radius-3 ring — 24 cells — opens at the compass
    // midpoints ONLY: the atrium's four gates into its open inner court
    const ring: Array<[number, number]> = [];
    for (let y = 3; y <= 9; y++)
      for (let x = 3; x <= 9; x++) if (cheb(x, y) === 3) ring.push([x, y]);
    expect(ring.length).toBe(24);
    expect(ring.filter(([x, y]) => isOpen(x, y))).toEqual([
      [6, 3],
      [3, 6],
      [9, 6],
      [6, 9],
    ]); // N, W, E, S — the atrium's four gates
    // and the ring's 5×5 inner court stands fully open
    for (let y = 4; y <= 8; y++)
      for (let x = 4; x <= 8; x++) expect(isOpen(x, y), `court ${x},${y}`).toBe(true);
  });

  it('carries 4 radial galleries — one wall on each ring-corner → hall-corner diagonal, and NOTHING ELSE is wall', () => {
    // the gallery walls, 180°-mirrored in pairs ((2,2)↔(10,10) and
    // (10,2)↔(2,10)); each sits strictly between a ring corner and the
    // matching hall corner, and its flanks form the narrow corner galleries
    const galleries: Array<[number, number]> = [
      [2, 2],
      [10, 2],
      [2, 10],
      [10, 10],
    ];
    for (const [x, y] of galleries) {
      expect(isOpen(x, y), `gallery ${x},${y}`).toBe(false);
      expect(cheb(x, y), `gallery ${x},${y} sits off the ring`).toBe(4);
    }
    // and beyond the ring the galleries are the ONLY interior walls — the
    // atrium stays grand (no stacks, no alcoves, no chimneys)
    let otherWalls = 0;
    for (let y = 1; y < 12; y++)
      for (let x = 1; x < 12; x++) if (!isOpen(x, y) && cheb(x, y) !== 3) otherWalls++;
    expect(otherWalls).toBe(4);
  });

  it('all open cells are connected (BFS via maze bfsDistances)', () => {
    const { grid, open } = layoutGrid(DWAAR_VIII_LAYOUT);
    const entrance = open[0]!; // first open cell row-major = (1,1)
    const dist = bfsDistances(grid, entrance);
    const reached = Array.from(dist).filter((d) => d >= 0).length;
    expect(open.length).toBe(97);
    expect(reached).toBe(open.length); // every open cell reachable, walls sealed off
  });

  it('entrance/exit are derivable: (1,1) → farthest open cell (11,11), 20 steps', () => {
    const { grid, open } = layoutGrid(DWAAR_VIII_LAYOUT);
    const entrance = open[0]!;
    expect(entrance).toEqual({ x: 1, y: 1 });
    const dist = bfsDistances(grid, entrance);
    let best = 0;
    for (let i = 1; i < dist.length; i++) if (dist[i]! > dist[best]!) best = i;
    const exit: CellIndex = { x: best % 13, y: Math.floor(best / 13) };
    expect(exit).toEqual({ x: 11, y: 11 }); // bottom-right mirror of the entrance
    expect(dist[best]).toBe(20); // a real traverse of the atrium
  });
});

describe('dwaarGrid floor 80', () => {
  it('derives the Dwaar VIII open-cell set from DWAAR_VIII_LAYOUT', () => {
    const g = dwaarGrid(TIER_EIGHT_FLOORS);
    expect(g.width).toBe(13);
    expect(g.height).toBe(13);
    expect(g.open.length).toBe(97);
    expect(g.open[0]).toEqual({ x: 1, y: 1 });
    for (const c of g.open) expect(DWAAR_VIII_LAYOUT[c.y]![c.x]).toBe('.');
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
    expect(dwaarGrid(TIER_FIVE_FLOORS).open.length).toBe(101);
    expect(dwaarGrid(TIER_SIX_FLOORS).open.length).toBe(101);
    expect(dwaarGrid(TIER_SEVEN_FLOORS).open.length).toBe(95);
  });
});

// T9/T1 — Dwaar IX, the Warden's Warrens (floor 90, where the campaign's
// fifth act of floors closes on the all-four apex duel). The warren INVERTS
// the elder halls' grandeur: the same 13×13 frame as its eight elders, but
// the tightest, most personal room in the house — 85 open cells (fewer than
// every hall but Dwaar I's 83), no lane wider than five cells, NOT ONE 2×2
// widening, and a nearly-solid WALL BAND across the middle row with exactly
// three doors (the warren's waist: (5,6)/(6,6)/(7,6), the center sanctum
// cell seated between its two flanks). Twelve dead ends (six 180°-mirrored
// cache pairs) turn every hunt into a reading exercise; the elder halls
// opened rooms, the Warrens close them. Invariant under 180° rotation so
// the exit mirrors the entrance; all 85 open cells form one connected
// component, and the exit itself is the farthest cell from the entrance
// (11,11) UNIQUELY at 20 steps — four Sentinels in a maze of narrow
// aisles, no grand court to kite in.
describe('DWAAR_IX_LAYOUT — the Warden\u2019s Warrens (floor 90, the apex duel)', () => {
  const isOpen = (x: number, y: number): boolean => DWAAR_IX_LAYOUT[y]![x] === '.';
  const count = (layout: readonly string[]): number =>
    layout.reduce((n, row) => n + [...row].filter((c) => c === '.').length, 0);

  it('is 13 rows of 13 chars, walls and open cells only', () => {
    expect(DWAAR_IX_LAYOUT.length).toBe(13);
    for (const row of DWAAR_IX_LAYOUT) {
      expect(row.length).toBe(13);
      expect(row).toMatch(/^[#.]{13}$/);
    }
  });

  it('is symmetric under 180° rotation', () => {
    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 13; x++)
        expect(DWAAR_IX_LAYOUT[y]![x]).toBe(DWAAR_IX_LAYOUT[12 - y]![12 - x]);
  });

  it('holds 85 open cells — the LOW count the warren targets, tighter than every elder but Dwaar I', () => {
    expect(count(DWAAR_IX_LAYOUT)).toBe(85);
    expect(count(DWAAR_IX_LAYOUT)).toBeLessThan(count(DWAAR_VII_LAYOUT)); // 95 — the stacks were airier
    expect(count(DWAAR_IX_LAYOUT)).toBeLessThan(count(DWAAR_VIII_LAYOUT)); // 97 — the atrium grander
    expect(count(DWAAR_IX_LAYOUT)).toBeGreaterThan(count(DWAAR_LAYOUT)); // 83 — but Dwaar I stays tightest
  });

  it('carries the warren waist: a near-solid wall band across the middle, EXACTLY 3 doors', () => {
    // the middle row is the Warden's screen — wall everywhere except the
    // three-door waist (5,6)/(6,6)/(7,6), the center sanctum cell seated
    // between its two flanks
    expect(DWAAR_IX_LAYOUT[6]).toBe('#####...#####');
    const middleOpen: Array<[number, number]> = [];
    for (let x = 1; x < 12; x++) if (isOpen(x, 6)) middleOpen.push([x, 6]);
    expect(middleOpen).toEqual([
      [5, 6],
      [6, 6],
      [7, 6],
    ]); // W flank, the sanctum, E flank — the warren's waist
  });

  it('is CLAUSTROPHOBIC: no 3×3 open room, NOT ONE 2×2 widening, no lane wider than 5', () => {
    // no 3×3 block stands fully open — the elder courts and carousels are gone
    let rooms = 0;
    for (let y = 1; y <= 10; y++)
      for (let x = 1; x <= 10; x++) {
        let all = true;
        for (let yy = y; yy <= y + 2; yy++)
          for (let xx = x; xx <= x + 2; xx++) if (!isOpen(xx, yy)) all = false;
        if (all) rooms++;
      }
    expect(rooms).toBe(0);
    // and no 2×2 either — every aisle stays one cell thin, wall-to-wall;
    // even Dwaar I's lattice kept zero and the warren keeps the discipline
    let squares = 0;
    for (let y = 1; y <= 11; y++)
      for (let x = 1; x <= 11; x++) {
        let all = true;
        for (let yy = y; yy <= y + 1; yy++)
          for (let xx = x; xx <= x + 1; xx++) if (!isOpen(xx, yy)) all = false;
        if (all) squares++;
      }
    expect(squares).toBe(0);
    // no open run — horizontal or vertical — runs longer than five cells:
    // every lane is broken, the aisles stay narrow
    let maxRun = 0;
    for (let y = 0; y < 13; y++) {
      let run = 0;
      for (let x = 0; x < 13; x++) {
        run = isOpen(x, y) ? run + 1 : 0;
        maxRun = Math.max(maxRun, run);
      }
    }
    for (let x = 0; x < 13; x++) {
      let run = 0;
      for (let y = 0; y < 13; y++) {
        run = isOpen(x, y) ? run + 1 : 0;
        maxRun = Math.max(maxRun, run);
      }
    }
    expect(maxRun).toBe(5);
  });

  it('is TWISTY: twelve dead ends (six mirrored cache pairs), a modest junction count', () => {
    // a dead end = an open cell with exactly one open neighbor — the warren's
    // caches; the elder halls kept 0–4, the Warrens hide 12 (six 180° pairs)
    const DIRS: ReadonlyArray<readonly [number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const deadEnds: Array<[number, number]> = [];
    const junctions: Array<[number, number]> = [];
    for (let y = 1; y < 12; y++)
      for (let x = 1; x < 12; x++) {
        if (!isOpen(x, y)) continue;
        const n = DIRS.filter(([dx, dy]) => isOpen(x + dx, y + dy)).length;
        if (n === 1) deadEnds.push([x, y]);
        if (n >= 3) junctions.push([x, y]);
      }
    expect(deadEnds.length).toBe(12);
    for (const [x, y] of deadEnds)
      expect(isOpen(12 - x, 12 - y), `cache mirror ${x},${y}`).toBe(true);
    expect(junctions.length).toBe(26); // Dwaar I's lattice sat at 20; the warren reads the same
  });

  it('all open cells are connected (BFS via maze bfsDistances)', () => {
    const { grid, open } = layoutGrid(DWAAR_IX_LAYOUT);
    const entrance = open[0]!; // first open cell row-major = (1,1)
    const dist = bfsDistances(grid, entrance);
    const reached = Array.from(dist).filter((d) => d >= 0).length;
    expect(open.length).toBe(85);
    expect(reached).toBe(open.length); // every open cell reachable, walls sealed off
  });

  it('entrance/exit are derivable: (1,1) → farthest open cell (11,11), 20 steps', () => {
    const { grid, open } = layoutGrid(DWAAR_IX_LAYOUT);
    const entrance = open[0]!;
    expect(entrance).toEqual({ x: 1, y: 1 });
    const dist = bfsDistances(grid, entrance);
    let best = 0;
    for (let i = 1; i < dist.length; i++) if (dist[i]! > dist[best]!) best = i;
    const exit: CellIndex = { x: best % 13, y: Math.floor(best / 13) };
    expect(exit).toEqual({ x: 11, y: 11 }); // bottom-right mirror of the entrance
    expect(dist[best]).toBe(20); // a real traverse of the warren
  });
});

describe('dwaarGrid floor 90', () => {
  it('derives the Dwaar IX open-cell set from DWAAR_IX_LAYOUT', () => {
    const g = dwaarGrid(TIER_NINE_FLOORS);
    expect(g.width).toBe(13);
    expect(g.height).toBe(13);
    expect(g.open.length).toBe(85);
    expect(g.open[0]).toEqual({ x: 1, y: 1 });
    for (const c of g.open) expect(DWAAR_IX_LAYOUT[c.y]![c.x]).toBe('.');
    const seen = new Set(g.open.map((c) => `${c.x},${c.y}`));
    expect(seen.size).toBe(g.open.length); // no duplicates
    const sorted = [...g.open].sort((a, b) => a.y - b.y || a.x - b.x);
    expect(g.open).toEqual(sorted); // row-major order (entrance = first open cell)
  });

  it('still defaults to Dwaar I and keeps every hall on its own floor — all nine', () => {
    expect(dwaarGrid().open.length).toBe(83); // Dwaar I unchanged
    expect(dwaarGrid(TIER_TWO_FLOORS).open.length).toBe(96);
    expect(dwaarGrid(TIER_THREE_FLOORS).open.length).toBe(107);
    expect(dwaarGrid(TIER_FOUR_FLOORS).open.length).toBe(101);
    expect(dwaarGrid(TIER_FIVE_FLOORS).open.length).toBe(101);
    expect(dwaarGrid(TIER_SIX_FLOORS).open.length).toBe(101);
    expect(dwaarGrid(TIER_SEVEN_FLOORS).open.length).toBe(95);
    expect(dwaarGrid(TIER_EIGHT_FLOORS).open.length).toBe(97);
  });
});
