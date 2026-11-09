// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { pingOpacity } from '../../src/ui/overhead';

// The one node-testable part of the overhead map (M3/T4): everything else in
// overhead.ts is 2D-canvas drawing, browser-only. Pings fade linearly over
// PING_TTL_MS and are dropped (null) once the TTL is spent.
describe('pingOpacity', () => {
  it('a fresh ping is fully opaque', () => {
    expect(pingOpacity(1000, 1000)).toBe(1);
  });

  it('fades linearly — half the TTL spent is half opacity', () => {
    expect(pingOpacity(1000, 3000)).toBeCloseTo(0.5, 10);
  });

  it('fades linearly — a quarter of the TTL spent', () => {
    expect(pingOpacity(0, 1000)).toBeCloseTo(0.75, 10);
  });

  it('is still alive (near zero) one ms before the TTL', () => {
    expect(pingOpacity(0, 3999)).toBeCloseTo(1 / 4000, 10);
  });

  it('is null exactly at the TTL (dropped after)', () => {
    expect(pingOpacity(1000, 1000 + 4000)).toBeNull();
  });

  it('is null past the TTL', () => {
    expect(pingOpacity(0, 100_000)).toBeNull();
  });

  it('a clock-skewed future ping clamps to full opacity, never above 1', () => {
    expect(pingOpacity(2000, 1000)).toBe(1);
  });
});
