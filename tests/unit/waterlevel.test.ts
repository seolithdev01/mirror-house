// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  DWAAR_V_WATER_S,
  WATER_EYE_OFF_M,
  WATER_FULL_S,
  WATER_MAX_M,
  WATER_SLOW,
} from '../../src/engine/constants';
import { eyeBlind, mirrorWaterScale, speedFactor, waterLevel } from '../../src/game/waterLevel';
import { mirrorEyeBlind } from '../../src/game/frost';

// T5/T3 — the rising water's pure core. The level is a DERIVED time function
// of the run clock (no state, no reset anywhere): 0 at the first input, 1.2 m
// at WATER_FULL_S (180 s), clamped forever after. Dwaar V (the sunken arena)
// fills on DWAAR_V_WATER_S (120 s) — the duel against the clock. Everyone
// slows ×WATER_SLOW past 0.6 m; the glass goes eye-blind past WATER_EYE_OFF_M
// (0.9 m); the panes sink as mirrorWaterScale shortens them — floored at 0.4
// (they drown but never vanish).
describe('waterLevel — the flood curve', () => {
  it('pins the binding constants', () => {
    expect(WATER_FULL_S).toBe(180);
    expect(WATER_MAX_M).toBe(1.2);
    expect(WATER_SLOW).toBe(0.85);
    expect(WATER_EYE_OFF_M).toBe(0.9);
    expect(DWAAR_V_WATER_S).toBe(120);
  });

  it('starts at 0 with no elapsed time', () => {
    expect(waterLevel(0)).toBe(0);
    expect(waterLevel(0, true)).toBe(0);
  });

  it('rises linearly: half the clock, half the depth', () => {
    expect(waterLevel(90_000)).toBeCloseTo(0.6, 10); // 90 s of 180 → 0.6 m
    expect(waterLevel(45_000)).toBeCloseTo(0.3, 10);
  });

  it('reaches WATER_MAX_M exactly at WATER_FULL_S and clamps there forever', () => {
    expect(waterLevel(180_000)).toBeCloseTo(1.2, 10);
    expect(waterLevel(300_000)).toBeCloseTo(1.2, 10);
    expect(waterLevel(3_600_000)).toBeCloseTo(1.2, 10);
  });

  it('Dwaar V fills on DWAAR_V_WATER_S — 1.5× the speed of the ramp', () => {
    expect(waterLevel(60_000, true)).toBeCloseTo(0.6, 10); // 60 s of 120 → 0.6 m
    expect(waterLevel(90_000, true)).toBeCloseTo(0.9, 10);
    expect(waterLevel(120_000, true)).toBeCloseTo(1.2, 10);
    expect(waterLevel(90_000, false)).toBeCloseTo(0.6, 10); // the same moment, un-flooded ramp
  });

  it('negative time is still dry (the pure fn clamps at 0)', () => {
    expect(waterLevel(-5_000)).toBe(0);
    expect(waterLevel(-5_000, true)).toBe(0);
  });
});

describe('speedFactor — everyone slows past 0.6 m', () => {
  it('full speed at and below the threshold', () => {
    expect(speedFactor(0)).toBe(1);
    expect(speedFactor(0.3)).toBe(1);
    expect(speedFactor(0.6)).toBe(1); // the boundary is inclusive — 0.6 m still walks free
  });

  it('×WATER_SLOW above the threshold', () => {
    expect(speedFactor(0.6 + 1e-9)).toBe(WATER_SLOW);
    expect(speedFactor(0.9)).toBe(WATER_SLOW);
    expect(speedFactor(1.2)).toBe(WATER_SLOW);
  });
});

describe('eyeBlind — the glass drowns past WATER_EYE_OFF_M', () => {
  it('sees below the threshold', () => {
    expect(eyeBlind(0)).toBe(false);
    expect(eyeBlind(0.6)).toBe(false);
    expect(eyeBlind(WATER_EYE_OFF_M)).toBe(false); // exactly 0.9 m: the eye is still open
  });

  it('blind above the threshold (strict)', () => {
    expect(eyeBlind(WATER_EYE_OFF_M + 1e-9)).toBe(true);
    expect(eyeBlind(1.2)).toBe(true);
  });

  it('frost re-exports the same threshold as mirrorEyeBlind (fog stays untouched)', () => {
    expect(mirrorEyeBlind(0)).toBe(false);
    expect(mirrorEyeBlind(WATER_EYE_OFF_M)).toBe(false);
    expect(mirrorEyeBlind(WATER_EYE_OFF_M + 1e-9)).toBe(true);
    expect(mirrorEyeBlind(1.2)).toBe(true);
  });
});

describe('mirrorWaterScale — the panes shorten as the water rises', () => {
  it('scale 1 on dry glass', () => {
    expect(mirrorWaterScale(0)).toBe(1);
  });

  it('shrinks linearly: 1 − level/2', () => {
    expect(mirrorWaterScale(0.6)).toBeCloseTo(0.7, 10);
    expect(mirrorWaterScale(1.0)).toBeCloseTo(0.5, 10);
  });

  it('never sinks below 0.4 — drowned, not vanished', () => {
    expect(mirrorWaterScale(1.2)).toBe(0.4);
    expect(mirrorWaterScale(3)).toBe(0.4);
    expect(mirrorWaterScale(100)).toBe(0.4);
  });

  it('stays within [0.4, 1] across the whole flood', () => {
    for (let ms = 0; ms <= 200_000; ms += 1_000) {
      const s = mirrorWaterScale(waterLevel(ms));
      expect(s).toBeGreaterThanOrEqual(0.4);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});
