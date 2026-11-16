// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { SPRINT_SPEED, WALK_CYCLE_LEN, WALK_SPEED } from '../../src/engine/constants';
import {
  MOTION_MAX_LEAN,
  poseFor,
  walkPhase,
  type MotionSnapshot,
} from '../../src/ui/motionPane';

// T11/T2 — the motion pane's pure core. Everything else in motionPane.ts is
// 2D-canvas drawing (browser-only, the minimap.ts precedent); the walk-cycle
// phase and the pose/label table are the pieces the figure's honesty rides
// on, so they are unit-pinned here.

const snap = (over: Partial<MotionSnapshot> = {}): MotionSnapshot => ({
  moving: false,
  mx: 0,
  my: 0,
  sprint: false,
  frost: false,
  step: false,
  headingDeg: 0,
  walkPhaseM: 0,
  ...over,
});

describe('walkPhase (T11 motion pane)', () => {
  it('starts at 0 and advances one cycle per WALK_CYCLE_LEN meters', () => {
    expect(walkPhase(0)).toBe(0);
    expect(walkPhase(WALK_CYCLE_LEN / 4)).toBeCloseTo(0.25, 12);
    expect(walkPhase(WALK_CYCLE_LEN / 2)).toBeCloseTo(0.5, 12);
    expect(walkPhase(WALK_CYCLE_LEN * 0.75)).toBeCloseTo(0.75, 12);
  });

  it('is periodic — every full WALK_CYCLE_LEN wraps back to the same phase', () => {
    for (const d of [0, 0.3, 0.9, 1.3, 2.7]) {
      expect(walkPhase(d + WALK_CYCLE_LEN)).toBeCloseTo(walkPhase(d), 12);
      expect(walkPhase(d + WALK_CYCLE_LEN * 5)).toBeCloseTo(walkPhase(d), 12);
    }
  });

  it('always lands in [0, 1) — huge and negative distances included', () => {
    for (const d of [0, 0.1, WALK_CYCLE_LEN, 16, 160, 1e6, -0.8, -16]) {
      const p = walkPhase(d);
      expect(p, `${d}m`).toBeGreaterThanOrEqual(0);
      expect(p, `${d}m`).toBeLessThan(1);
    }
    expect(walkPhase(-0.8)).toBeCloseTo(0.5, 12); // half a cycle backwards wraps forward
  });
});

describe('poseFor precedence (T11 motion pane)', () => {
  it('STILL — nothing pressed: zero lean/stride/arm, the STILL label', () => {
    const p = poseFor(snap());
    expect(p.label).toBe('STILL');
    expect(p.lean).toBe(0);
    expect(p.stride).toBe(0);
    expect(p.armFrost).toBe(0);
  });

  it('sprint alone moves nothing — STILL, never SPRINT', () => {
    expect(poseFor(snap({ sprint: true })).label).toBe('STILL');
    expect(poseFor(snap({ sprint: true })).lean).toBe(0);
  });

  it('WALK — moving without sprint; lean takes the walk-speed share of the max', () => {
    const p = poseFor(snap({ moving: true, my: 1 }));
    expect(p.label).toBe('WALK');
    expect(p.stride).toBe(1);
    expect(p.lean).toBeCloseTo((WALK_SPEED / SPRINT_SPEED) * MOTION_MAX_LEAN, 12);
    expect(p.lean).toBeGreaterThan(0);
  });

  it('SPRINT — moving + sprint beats WALK and leans the full max', () => {
    const p = poseFor(snap({ moving: true, my: 1, sprint: true }));
    expect(p.label).toBe('SPRINT');
    expect(p.lean).toBeCloseTo(MOTION_MAX_LEAN, 12);
    expect(p.lean).toBeGreaterThan(poseFor(snap({ moving: true })).lean);
    expect(p.stride).toBe(1);
  });

  it('STEP — the step-through hold beats SPRINT and WALK (cycle frozen, stride 0)', () => {
    const p = poseFor(snap({ moving: true, my: 1, sprint: true, step: true }));
    expect(p.label).toBe('STEP');
    expect(p.stride).toBe(0);
    expect(p.armFrost).toBe(0);
    // and it beats plain WALK too
    expect(poseFor(snap({ moving: true, step: true })).label).toBe('STEP');
  });

  it('FROST — the raised arm tops every state, even a sprinting step-through', () => {
    const p = poseFor(snap({ moving: true, my: 1, sprint: true, step: true, frost: true }));
    expect(p.label).toBe('FROST');
    expect(p.armFrost).toBe(1);
    // frost is an ARM state, not a movement state — legs keep striding, and
    // it names the label even while standing still
    expect(poseFor(snap({ moving: true, frost: true })).stride).toBe(1);
    expect(poseFor(snap({ frost: true })).label).toBe('FROST');
  });

  it('lateral strafe changes no label — mx rides to the draw as tilt', () => {
    expect(poseFor(snap({ moving: true, mx: 1 })).label).toBe('WALK');
    expect(poseFor(snap({ moving: true, mx: -1 })).label).toBe('WALK');
    expect(poseFor(snap({ moving: true, mx: 0.5 }))).toEqual(
      poseFor(snap({ moving: true, mx: -0.5 })),
    );
  });
});
