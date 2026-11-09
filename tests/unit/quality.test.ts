// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { autoPreset, PROFILES, type PerfPreset } from '../../src/game/quality';

describe("quality — PROFILES (the plan's exact table)", () => {
  it('low: pixel-ratio cap 1, hero RT off (256 reserved), no Chhaya bob', () => {
    expect(PROFILES.low).toEqual({
      pixelRatioCap: 1,
      heroRt: false,
      heroRtSize: 256,
      chhayaBob: false,
    });
  });

  it('mid: cap 1.5, hero RT on at 256, bob on', () => {
    expect(PROFILES.mid).toEqual({
      pixelRatioCap: 1.5,
      heroRt: true,
      heroRtSize: 256,
      chhayaBob: true,
    });
  });

  it('high: cap 2, hero RT on at 512, bob on', () => {
    expect(PROFILES.high).toEqual({
      pixelRatioCap: 2,
      heroRt: true,
      heroRtSize: 512,
      chhayaBob: true,
    });
  });

  it('the ladder is ordered — cap rises low→mid→high; RT size only 256|512', () => {
    expect(PROFILES.low.pixelRatioCap).toBeLessThan(PROFILES.mid.pixelRatioCap);
    expect(PROFILES.mid.pixelRatioCap).toBeLessThan(PROFILES.high.pixelRatioCap);
    for (const p of Object.values(PROFILES)) expect([256, 512]).toContain(p.heroRtSize);
  });

  it('every preset names all three keys (Record<PerfPreset, …> is total)', () => {
    expect(Object.keys(PROFILES).sort()).toEqual(['high', 'low', 'mid']);
  });
});

describe('quality — autoPreset(fps, dpr) decision table', () => {
  const cases: ReadonlyArray<readonly [number, number, PerfPreset]> = [
    // the drop line: a rolling average under 45 is LOW on every screen
    [0, 3, 'low'], // dead stop — the floor fell out
    [30, 1, 'low'],
    [44.9, 3, 'low'], // one tick under the line drops
    // 45 exactly is NOT low (the boundary is exclusive) — mid territory
    [45, 1, 'mid'],
    [45, 3, 'mid'],
    // the rise line: HIGH needs fps ≥ 55 AND a dpr ≥ 2 screen
    [54.9, 3, 'mid'], // fast but under the rise line
    [55, 2, 'high'], // the boundary itself rises
    [60, 2, 'high'],
    [144, 3, 'high'],
    // fps alone never buys high on a dpr < 2 screen (the extra pixels are
    // not there to spend — mid is the honest ceiling)
    [60, 1, 'mid'],
    [60, 1.5, 'mid'],
    [144, 1.75, 'mid'],
    // a struggling dpr≥2 screen lands mid between the two lines
    [50, 2, 'mid'],
  ];
  for (const [fps, dpr, want] of cases) {
    it(`fps ${fps} · dpr ${dpr} → ${want}`, () => {
      expect(autoPreset(fps, dpr)).toBe(want);
    });
  }

  it('the two thresholds are separated (hysteresis: 45..55 is a dead mid band)', () => {
    // nothing between the drop line and the rise line can leave mid
    for (let fps = 45; fps < 55; fps += 0.5)
      for (const dpr of [1, 1.5, 2, 3]) expect(autoPreset(fps, dpr)).toBe('mid');
  });
});
