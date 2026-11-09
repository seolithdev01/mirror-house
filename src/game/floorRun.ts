// SPDX-License-Identifier: Apache-2.0
import { FAIL_FREEZE_MS } from '../engine/constants';

export const EXIT_RADIUS = 1.6;

/** Why a run failed: touched by an echo/Chhaya, or the house collapsed at ANGER_MAX. */
export type FailReason = 'caught' | 'collapse';

/**
 * The master game-phase machine — the single owner of the run lifecycle
 * (start, fail + freeze, clear, reset). Every other system derives from the
 * current `kind`: `active()` gates simulation and verbs, `runElapsedMs` is the
 * HUD clock (pinned at `failedAt`/`clearedAt` once the run is over), and
 * `tickFail` drives the freeze→reset handoff. Transitions are pure — a no-op
 * transition returns the input state unchanged (same reference).
 */
export type GamePhase =
  | { kind: 'ready' }
  | { kind: 'running'; startedAt: number }
  | { kind: 'failing'; reason: FailReason; startedAt: number; failedAt: number; resetAt: number }
  | { kind: 'cleared'; startedAt: number; clearedAt: number };

export function createFloorRun(): GamePhase {
  return { kind: 'ready' };
}

/** ready || running — the floor is live: simulation runs and verbs are accepted. */
export function active(p: GamePhase): boolean {
  return p.kind === 'ready' || p.kind === 'running';
}

export function startRun(p: GamePhase, now: number): GamePhase {
  return p.kind === 'ready' ? { kind: 'running', startedAt: now } : p;
}

export function failRun(
  p: GamePhase,
  reason: FailReason,
  now: number,
  freezeMs: number = FAIL_FREEZE_MS,
): GamePhase {
  switch (p.kind) {
    case 'ready':
      // never started (an echo reached the idle player): zero-length run
      return { kind: 'failing', reason, startedAt: now, failedAt: now, resetAt: now + freezeMs };
    case 'running':
      return {
        kind: 'failing',
        reason,
        startedAt: p.startedAt,
        failedAt: now,
        resetAt: now + freezeMs,
      };
    case 'failing':
      return p; // re-fail during the freeze: keep the ORIGINAL freeze window
    case 'cleared':
      return p; // fail-after-clear race: unrepresentable, ignore
  }
}

export function clearRun(p: GamePhase, now: number): GamePhase {
  return p.kind === 'running' ? { kind: 'cleared', startedAt: p.startedAt, clearedAt: now } : p;
}

/** Each frame while failing: at/after resetAt the floor re-arms (ready). */
export function tickFail(p: GamePhase, now: number): { phase: GamePhase; shouldReset: boolean } {
  if (p.kind === 'failing' && now >= p.resetAt)
    return { phase: createFloorRun(), shouldReset: true };
  return { phase: p, shouldReset: false };
}

/** The run clock: 0 before start, live while running, pinned once it ends. */
export function runElapsedMs(p: GamePhase, now: number): number {
  switch (p.kind) {
    case 'ready':
      return 0;
    case 'running':
      return now - p.startedAt;
    case 'failing':
      return p.failedAt - p.startedAt;
    case 'cleared':
      return p.clearedAt - p.startedAt;
  }
}

export function isAtExit(px: number, py: number, exitCx: number, exitCy: number): boolean {
  return Math.hypot(px - exitCx, py - exitCy) <= EXIT_RADIUS;
}
