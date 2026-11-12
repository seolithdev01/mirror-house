// SPDX-License-Identifier: Apache-2.0
//
// T6/T2 — the Furnace Wings' heat. Pure derivation tests: the heat flag by
// floor, the halved fog duration, and the widened crack anger — the three
// numbers the tier's whole fight re-tunes around. T9/T1 — the heat RETURNS
// on the apex: the Warrens (81–90) burn like the Furnace did, the first
// mastered mechanic back as thin texture (the plan's Global Constraints).
import { describe, expect, it } from 'vitest';
import {
  CRACK_ANGER,
  FOG_DURATION_MS,
  TIER_NINE_FLOORS,
  TIER_SIX_FLOORS,
} from '../../src/engine/constants';
import {
  crackAngerFor,
  fogDurationMs,
  heatOn,
  HEAT_CRACK_ANGER,
  HEAT_FLOOR_RETURN,
  HEAT_FLOOR_START,
  HEAT_FOG_FACTOR,
} from '../../src/game/heat';

describe('heat constants', () => {
  it('pins the Global Constraints numbers — start 51, fog factor 0.5, crack anger 25', () => {
    expect(HEAT_FLOOR_START).toBe(51);
    expect(HEAT_FLOOR_START).toBe(TIER_SIX_FLOORS - 9); // the tier's first ramp floor
    expect(HEAT_FOG_FACTOR).toBe(0.5);
    expect(HEAT_CRACK_ANGER).toBe(25);
    expect(HEAT_CRACK_ANGER).toBeGreaterThan(CRACK_ANGER); // wider, never narrower
  });

  it('T9 — pins the heat\u2019s return floor — 81, the Warrens\u2019 first ramp floor', () => {
    expect(HEAT_FLOOR_RETURN).toBe(81);
    expect(HEAT_FLOOR_RETURN).toBe(TIER_NINE_FLOORS - 9); // the tier's first ramp floor
  });
});

describe('heatOn', () => {
  it('is OFF below the Furnace — 1 and 50 stay cool', () => {
    for (const floor of [1, 10, 25, 40, 49, 50]) {
      expect(heatOn(floor), `floor ${floor}`).toBe(false);
    }
  });
  it('is ON for every Furnace floor 51–60, inclusive at both ends', () => {
    for (let floor = 51; floor <= 60; floor++) {
      expect(heatOn(floor), `floor ${floor}`).toBe(true);
    }
    expect(heatOn(51)).toBe(true);
    expect(heatOn(60)).toBe(true);
  });
  it('T8-era floors stay OFF — the Library and the Atrium never burned', () => {
    expect(heatOn(61)).toBe(false);
    expect(heatOn(80)).toBe(false); // the last cool floor before the Warrens
  });
  it('T9 — is ON for every Warrens floor 81–90, inclusive at both ends', () => {
    for (let floor = 81; floor <= 90; floor++) {
      expect(heatOn(floor), `floor ${floor}`).toBe(true);
    }
    expect(heatOn(81)).toBe(true);
    expect(heatOn(90)).toBe(true); // the Warden's own forge burns hottest
  });
  it('is OFF past the campaign — 91 is not a floor, and never hot', () => {
    expect(heatOn(91)).toBe(false);
    expect(heatOn(99)).toBe(false);
  });
});

describe('fogDurationMs', () => {
  it('is FOG_DURATION_MS wherever the heat is off', () => {
    for (const floor of [1, 20, 41, 50, 61, 80, 91]) {
      expect(fogDurationMs(floor), `floor ${floor}`).toBe(FOG_DURATION_MS);
    }
  });
  it('is FOG_DURATION_MS × HEAT_FOG_FACTOR on 51–60 — frost melts in half the time', () => {
    for (const floor of [51, 55, 60]) {
      expect(fogDurationMs(floor), `floor ${floor}`).toBe(FOG_DURATION_MS * HEAT_FOG_FACTOR);
    }
    expect(fogDurationMs(51)).toBe(12_500);
    expect(fogDurationMs(60)).toBe(12_500);
  });
  it('T9 — is halved on 81–90 too — the lantern thins in the Warden\u2019s air', () => {
    for (const floor of [81, 85, 90]) {
      expect(fogDurationMs(floor), `floor ${floor}`).toBe(FOG_DURATION_MS * HEAT_FOG_FACTOR);
    }
    expect(fogDurationMs(81)).toBe(12_500);
    expect(fogDurationMs(90)).toBe(12_500);
  });
});

describe('crackAngerFor', () => {
  it('is CRACK_ANGER (15) wherever the heat is off', () => {
    for (const floor of [1, 20, 41, 50, 61, 80, 91]) {
      expect(crackAngerFor(floor), `floor ${floor}`).toBe(CRACK_ANGER);
    }
  });
  it('is HEAT_CRACK_ANGER (25) on 51–60 — every crack you leave burns wider', () => {
    for (const floor of [51, 55, 60]) {
      expect(crackAngerFor(floor), `floor ${floor}`).toBe(HEAT_CRACK_ANGER);
    }
    expect(crackAngerFor(51)).toBe(25);
    expect(crackAngerFor(60)).toBe(25);
  });
  it('T9 — is 25 on 81–90 too — the warren\u2019s walls crack just as wide', () => {
    for (const floor of [81, 85, 90]) {
      expect(crackAngerFor(floor), `floor ${floor}`).toBe(HEAT_CRACK_ANGER);
    }
    expect(crackAngerFor(81)).toBe(25);
    expect(crackAngerFor(90)).toBe(25);
  });
});
