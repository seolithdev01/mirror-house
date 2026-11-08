// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { createFloorRun, isAtExit, runElapsedMs, EXIT_RADIUS } from '../../src/game/floorRun';

describe('floorRun', () => {
  it('timer starts at 0, runs after start, freezes after clear', () => {
    const r = createFloorRun('AAAA');
    expect(runElapsedMs(r, 5000)).toBe(0);
    const started = { ...r, startedAt: 4000 as number | null };
    expect(runElapsedMs(started, 9000)).toBe(5000);
    expect(runElapsedMs({ ...started, clearedAt: 6000 }, 9000)).toBe(2000);
  });
  it('exit radius check', () => {
    expect(isAtExit(0, 0, 1, 0)).toBe(true);
    expect(isAtExit(0, 0, EXIT_RADIUS + 0.1, 0)).toBe(false);
  });
});
