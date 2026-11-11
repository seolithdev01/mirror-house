// SPDX-License-Identifier: Apache-2.0
//
// T6/T2 — the Furnace Wings' heat. Pure derivation tests: the heat flag by
// floor, the halved fog duration, and the widened crack anger — the three
// numbers the tier's whole fight re-tunes around.
import { describe, expect, it } from 'vitest';
import { CRACK_ANGER, FOG_DURATION_MS, TIER_SIX_FLOORS } from '../../src/engine/constants';
import {
  crackAngerFor,
  fogDurationMs,
  heatOn,
  HEAT_CRACK_ANGER,
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
  it('is OFF past the campaign — 61 is not a floor, and never hot', () => {
    expect(heatOn(61)).toBe(false);
    expect(heatOn(99)).toBe(false);
  });
});

describe('fogDurationMs', () => {
  it('is FOG_DURATION_MS wherever the heat is off', () => {
    for (const floor of [1, 20, 41, 50, 61]) {
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
});

describe('crackAngerFor', () => {
  it('is CRACK_ANGER (15) wherever the heat is off', () => {
    for (const floor of [1, 20, 41, 50, 61]) {
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
});
