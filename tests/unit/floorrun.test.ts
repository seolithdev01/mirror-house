// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { FAIL_FREEZE_MS } from '../../src/engine/constants';
import {
  active,
  clearRun,
  createFloorRun,
  failRun,
  isAtExit,
  runElapsedMs,
  startRun,
  tickFail,
  EXIT_RADIUS,
} from '../../src/game/floorRun';

describe('GamePhase machine', () => {
  it('starts ready: simulation-live, zero elapsed, nothing to reset', () => {
    const p = createFloorRun();
    expect(p).toEqual({ kind: 'ready' });
    expect(active(p)).toBe(true); // ready || running — the floor is live
    expect(runElapsedMs(p, 5000)).toBe(0);
    expect(tickFail(p, 99999)).toEqual({ phase: p, shouldReset: false });
  });

  it('startRun: ready→running stamps startedAt; idempotent in every other phase', () => {
    const running = startRun(createFloorRun(), 4000);
    expect(running).toEqual({ kind: 'running', startedAt: 4000 });
    // already running — a later start must not move startedAt
    expect(startRun(running, 9000)).toEqual({ kind: 'running', startedAt: 4000 });
    // cleared keeps its original startedAt
    const cleared = clearRun(running, 6000);
    expect(startRun(cleared, 9000)).toBe(cleared);
  });

  it('failRun: running→failing stamps failedAt and resetAt = now + freeze (default FAIL_FREEZE_MS)', () => {
    const running = startRun(createFloorRun(), 1000);
    expect(failRun(running, 'caught', 4000)).toEqual({
      kind: 'failing',
      reason: 'caught',
      startedAt: 1000,
      failedAt: 4000,
      resetAt: 4000 + FAIL_FREEZE_MS,
    });
    // explicit freeze override
    expect(failRun(running, 'collapse', 4000, 250)).toEqual({
      kind: 'failing',
      reason: 'collapse',
      startedAt: 1000,
      failedAt: 4000,
      resetAt: 4250,
    });
  });

  it('failRun: ready→failing sets startedAt = failedAt (timer reads zero through the freeze)', () => {
    const failing = failRun(createFloorRun(), 'caught', 7000, 300);
    expect(failing).toEqual({
      kind: 'failing',
      reason: 'caught',
      startedAt: 7000,
      failedAt: 7000,
      resetAt: 7300,
    });
    expect(runElapsedMs(failing, 9000)).toBe(0);
  });

  it('failRun: re-fail during the freeze is a no-op — original reason, failedAt, resetAt kept', () => {
    const failing = failRun(startRun(createFloorRun(), 1000), 'caught', 4000, 1200);
    expect(failRun(failing, 'collapse', 5000, 9999)).toBe(failing); // same state back
  });

  it('THE race: failRun after clearRun is a no-op', () => {
    const cleared = clearRun(startRun(createFloorRun(), 1000), 5000);
    expect(failRun(cleared, 'caught', 5001)).toBe(cleared);
  });

  it('clearRun: running→cleared; no-op from ready, failing, and cleared', () => {
    const cleared = clearRun(startRun(createFloorRun(), 1000), 5000);
    expect(cleared).toEqual({ kind: 'cleared', startedAt: 1000, clearedAt: 5000 });
    expect(clearRun(cleared, 9999)).toBe(cleared); // idempotent — first clearedAt wins
    const ready = createFloorRun();
    expect(clearRun(ready, 5000)).toBe(ready); // never started — nothing to clear
    const failing = failRun(ready, 'caught', 2000);
    expect(clearRun(failing, 3000)).toBe(failing); // same-frame fail+clear must not award a clear
  });

  it('tickFail: resets exactly at resetAt, not one ms before; only from failing', () => {
    const failing = failRun(startRun(createFloorRun(), 0), 'caught', 1000, 1200); // resetAt 2200
    expect(tickFail(failing, 2199)).toEqual({ phase: failing, shouldReset: false });
    const at = tickFail(failing, 2200);
    expect(at.shouldReset).toBe(true);
    expect(at.phase).toEqual({ kind: 'ready' });
    // well past the boundary still resets (reset is checked every frame)
    expect(tickFail(failing, 5000).shouldReset).toBe(true);
    // non-failing phases never reset
    expect(tickFail(createFloorRun(), 99999).shouldReset).toBe(false);
    expect(tickFail(startRun(createFloorRun(), 0), 99999).shouldReset).toBe(false);
    expect(tickFail(clearRun(startRun(createFloorRun(), 0), 10), 99999).shouldReset).toBe(false);
  });

  it('runElapsedMs across the four phases', () => {
    const ready = createFloorRun();
    expect(runElapsedMs(ready, 5000)).toBe(0);
    const running = startRun(ready, 4000);
    expect(runElapsedMs(running, 9000)).toBe(5000); // live clock
    const failing = failRun(running, 'collapse', 6000);
    expect(runElapsedMs(failing, 12000)).toBe(2000); // pinned at failedAt
    const cleared = clearRun(running, 7000);
    expect(runElapsedMs(cleared, 12000)).toBe(3000); // pinned at clearedAt
  });

  it('active: true for ready and running (floor live), false for failing and cleared', () => {
    expect(active(createFloorRun())).toBe(true);
    expect(active(startRun(createFloorRun(), 0))).toBe(true);
    expect(active(failRun(startRun(createFloorRun(), 0), 'caught', 1))).toBe(false);
    expect(active(failRun(createFloorRun(), 'collapse', 1))).toBe(false);
    expect(active(clearRun(startRun(createFloorRun(), 0), 2))).toBe(false);
  });

  it('exit radius check', () => {
    expect(isAtExit(0, 0, 1, 0)).toBe(true);
    expect(isAtExit(0, 0, EXIT_RADIUS + 0.1, 0)).toBe(false);
  });
});
