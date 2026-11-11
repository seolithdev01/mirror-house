// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { ANGER_MAX } from '../../src/engine/constants';
import {
  HINTS,
  HINT_COST_GROWTH,
  hintCost,
  LORE,
  loreUnlockedCount,
  nextHint,
  SHARD_HINT_BASE,
  type HintContext,
  type HintKind,
} from '../../src/game/aaina';
import { defaultMeta, spendShards } from '../../src/game/meta';

/** A calm, nothing-special floor — override one field at a time. */
const ctx = (over: Partial<HintContext> = {}): HintContext => ({
  beaconsLeft: 0,
  anger: 0,
  chhayaNear: false,
  chasing: 0,
  taalPresent: false,
  taalSentinelNear: false,
  gherNear: false,
  avartNear: false,
  whisperNear: false,
  heatNear: false,
  exitUnlocked: false,
  hintsUsed: 0,
  ...over,
});

describe('aaina — nextHint priority chain', () => {
  it('selects each of the twelve kinds in priority order (hand-built contexts)', () => {
    const cases: Array<{ name: string; c: HintContext; want: HintKind }> = [
      // 1. beacons: left to capture and the house is not collapsing — wins over everything
      {
        name: 'beacons beat chase, sentinel, chhaya and anger',
        c: ctx({ beaconsLeft: 3, chasing: 4, taalSentinelNear: true, chhayaNear: true, anger: 59 }),
        want: 'beacons',
      },
      // 2. exit: every beacon captured — wins over chase and chhaya
      {
        name: 'exit beats chase and chhaya',
        c: ctx({ exitUnlocked: true, chasing: 2, chhayaNear: true }),
        want: 'exit',
      },
      // 3. chase: an echo is hunting — wins over taal, the sentinel, chhaya and anger
      {
        name: 'chase beats taal, the sentinel, chhaya and anger',
        c: ctx({
          chasing: 1,
          taalPresent: true,
          taalSentinelNear: true,
          chhayaNear: true,
          anger: 90,
        }),
        want: 'chase',
      },
      // 4. taal (M4/T3): the cameo floor's beat-walker — wins over chhaya/anger
      {
        name: 'taal beats chhaya and anger',
        c: ctx({ taalPresent: true, chhayaNear: true, anger: 90 }),
        want: 'taal',
      },
      // 5. taalSentinel (T2): the LETHAL beat-walker is close — wins over chhaya/anger
      {
        name: 'taalSentinel beats chhaya and anger',
        c: ctx({ taalSentinelNear: true, chhayaNear: true, anger: 90 }),
        want: 'taalSentinel',
      },
      // 6. gherNear (T3): the Encircler is close — slotted beside the
      // Sentinel rule; the beat outranks the glide, the feint outranks chhaya
      {
        name: 'gherNear beats chhaya and anger',
        c: ctx({ gherNear: true, chhayaNear: true, anger: 90 }),
        want: 'gherNear',
      },
      {
        name: 'taalSentinel beats gherNear — the Sentinels rank beside each other',
        c: ctx({ taalSentinelNear: true, gherNear: true }),
        want: 'taalSentinel',
      },
      // 7. avartNear (T4): the Ambusher is close — the fourth keeper, slotted
      // beside the other Sentinel rules; the pace rule outranks chhaya/anger
      {
        name: 'avartNear beats chhaya and anger',
        c: ctx({ avartNear: true, chhayaNear: true, anger: 90 }),
        want: 'avartNear',
      },
      {
        name: 'gherNear beats avartNear — the Sentinels rank beside each other',
        c: ctx({ gherNear: true, avartNear: true }),
        want: 'gherNear',
      },
      // 7.5 whisperNear (T7/T2): the Library's standing rule — blind wardens,
      //    loud footsteps — slotted BEFORE the shadow, after the Sentinels
      {
        name: 'whisperNear beats chhaya, heat and anger',
        c: ctx({ whisperNear: true, chhayaNear: true, heatNear: true, anger: 90 }),
        want: 'whisperNear',
      },
      {
        name: 'avartNear beats whisperNear — the Sentinels outrank the tier note',
        c: ctx({ whisperNear: true, avartNear: true }),
        want: 'avartNear',
      },
      // 8. chhaya: the shadow is close — wins over the heat and the anger
      { name: 'chhaya beats anger', c: ctx({ chhayaNear: true, anger: 90 }), want: 'chhaya' },
      // 9. heatNear (T6/T2): a Furnace floor — the tier's standing advice
      //    outranks the temper threshold but never the Sentinels or the shadow
      {
        name: 'heatNear beats anger and stuck',
        c: ctx({ heatNear: true, anger: 60 }),
        want: 'heatNear',
      },
      {
        name: 'avartNear beats heatNear — the Sentinels outrank the tier note',
        c: ctx({ avartNear: true, heatNear: true }),
        want: 'avartNear',
      },
      { name: 'heatNear below the Furnace never fires', c: ctx(), want: 'stuck' },
      // 10. anger: at ≥60 (and beacons blocked at ANGER_MAX) she talks temper
      {
        name: 'anger at threshold with beacons blocked by collapse',
        c: ctx({ beaconsLeft: 2, anger: ANGER_MAX }),
        want: 'anger',
      },
      { name: 'anger at exactly 60', c: ctx({ anger: 60 }), want: 'anger' },
      // 10. stuck: nothing special — general fog-what-sees-you advice
      { name: 'stuck when nothing else applies', c: ctx(), want: 'stuck' },
    ];
    for (const { name, c, want } of cases) {
      const hint = nextHint(c);
      expect(hint.kind, name).toBe(want);
      expect(hint.text, name).toBe(HINTS[want]);
    }
  });

  it('boundary checks: anger 59 is not anger-hinted, chasing 0 is not chase, anger < ANGER_MAX keeps beacons', () => {
    expect(nextHint(ctx({ anger: 59 })).kind).toBe('stuck'); // below the temper threshold
    expect(nextHint(ctx({ beaconsLeft: 1, anger: ANGER_MAX - 1 })).kind).toBe('beacons'); // collapse not imminent
    expect(nextHint(ctx({ exitUnlocked: true, beaconsLeft: 1 })).kind).toBe('beacons'); // beacons outrank exit
  });

  it('HINTS covers all twelve kinds with non-empty in-voice lines', () => {
    const kinds: HintKind[] = [
      'exit',
      'beacons',
      'chhaya',
      'chase',
      'taal',
      'taalSentinel',
      'gherNear',
      'avartNear',
      'whisperNear',
      'heatNear',
      'anger',
      'stuck',
    ];
    for (const k of kinds) {
      expect(HINTS[k], k).toBeTruthy();
      expect(HINTS[k].length, k).toBeGreaterThan(20);
    }
  });

  it("pins the Library's line — the whisper rule, exactly (T7/T2)", () => {
    expect(HINTS.whisperNear).toBe(
      'They are blind here — but they listen. Walk. Never run the stacks.',
    );
  });

  it("pins the Furnace's line — the heat rule, exactly (T6/T2)", () => {
    expect(HINTS.heatNear).toBe(
      'The furnace breathes — your frost melts fast, and every crack you leave burns wider.',
    );
  });

  it("pins the sentinel's line — the crossing rule, exactly (T2)", () => {
    expect(HINTS.taalSentinel).toBe('He walks the beat — cross when the lantern dims.');
  });

  it("pins the Encircler's line — the feint rule, exactly (T3)", () => {
    expect(HINTS.gherNear).toBe(
      'He does not chase — he closes the road ahead. Feint, then go the other way.',
    );
  });

  it("pins the Ambusher's line — the pace rule, exactly (T4)", () => {
    expect(HINTS.avartNear).toBe(
      'He leaps where you are GOING — the faster you run, the further he reaches. Change your pace.',
    );
  });
});

describe('aaina — hint economy', () => {
  it('cost escalates: 0→5, 1→10, 3→20 (base 5, growth 5)', () => {
    expect(SHARD_HINT_BASE).toBe(5);
    expect(HINT_COST_GROWTH).toBe(5);
    expect(hintCost(0)).toBe(5);
    expect(hintCost(1)).toBe(10);
    expect(hintCost(2)).toBe(15);
    expect(hintCost(3)).toBe(20);
    expect(hintCost(6)).toBe(35);
  });

  it('spendShards: success at and below balance, never negative', () => {
    const m = { ...defaultMeta(), shards: 12 };
    expect(spendShards(m, 10)).toMatchObject({ shards: 2 });
    expect(spendShards(m, 12)).toMatchObject({ shards: 0 }); // exact balance → 0, not −1
    expect(spendShards(m, 0)).toMatchObject({ shards: 12 }); // free spend is a no-op success
  });

  it('spendShards: insufficient → null, absent shards count as 0', () => {
    const m = { ...defaultMeta(), shards: 12 };
    expect(spendShards(m, 13)).toBeNull();
    expect(spendShards(defaultMeta(), 5)).toBeNull(); // older save without the field
  });

  it('spendShards is immutable — the input save is untouched', () => {
    const m = { ...defaultMeta(), shards: 12 };
    const next = spendShards(m, 10)!;
    expect(next).not.toBe(m);
    expect(m.shards).toBe(12);
    expect(next.shards).toBe(2);
  });
});

describe('aaina — lore unlocks', () => {
  it('thresholds: 0→0, ≥1→2, ≥3→4, ≥6→6', () => {
    expect(loreUnlockedCount(0)).toBe(0);
    expect(loreUnlockedCount(1)).toBe(2);
    expect(loreUnlockedCount(2)).toBe(2);
    expect(loreUnlockedCount(3)).toBe(4);
    expect(loreUnlockedCount(5)).toBe(4);
    expect(loreUnlockedCount(6)).toBe(6);
    expect(loreUnlockedCount(9)).toBe(6);
    expect(loreUnlockedCount(12)).toBe(6); // can never exceed the six she knows
  });

  it('LORE is six non-empty paragraphs', () => {
    expect(LORE).toHaveLength(6);
    for (const p of LORE) expect(p.length).toBeGreaterThan(40);
  });
});
