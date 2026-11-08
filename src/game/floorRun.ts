// SPDX-License-Identifier: Apache-2.0
export const EXIT_RADIUS = 1.6;

export interface FloorRun {
  seed: string;
  startedAt: number | null;
  clearedAt: number | null;
}

export function createFloorRun(seed: string): FloorRun {
  return { seed, startedAt: null, clearedAt: null };
}

export function isAtExit(px: number, py: number, exitCx: number, exitCy: number): boolean {
  return Math.hypot(px - exitCx, py - exitCy) <= EXIT_RADIUS;
}

export function runElapsedMs(run: FloorRun, now: number): number {
  if (run.startedAt === null) return 0;
  return (run.clearedAt ?? now) - run.startedAt;
}
