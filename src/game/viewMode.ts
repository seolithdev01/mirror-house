// SPDX-License-Identifier: Apache-2.0
//
// ViewMode (M3/T3): how the floor is presented. Pure machine — main.ts owns
// the single `view` value, drives it with the view action's bound key
// (M5/T2: [V] by default, via actionFor on the keymap) and the tactical
// exits, and switches the renderer between the focus render, the QUAD scissor
// viewports, and (T4) the overhead 2D canvas.
//
// Transitions:
//   cycleView:     focus → quad → overhead → focus; tactical → focus
//   exitTactical:  tactical → focus; everything else unchanged
//
// `tactical` is the pause: isTactical gates the fixed-step simulation (the
// same way the FAQ overlay does). showsOverhead marks the two map modes —
// overhead (walking map) and tactical (paused map) share T4's canvas render.

/** QUAD renders four panes at pixel ratio 1 — the perf budget for 4 viewports. */
export const QUAD_PIXEL_RATIO = 1;

export type ViewMode = 'focus' | 'quad' | 'overhead' | 'tactical';

/** [V]: the walking cycle; a tactical pause leaves on any press. */
export function cycleView(v: ViewMode): ViewMode {
  if (v === 'focus') return 'quad';
  if (v === 'quad') return 'overhead';
  return 'focus'; // overhead and tactical both fall back to the eyes
}

/** Leaving the pause: tactical → focus; every other mode was never paused. */
export function exitTactical(v: ViewMode): ViewMode {
  return v === 'tactical' ? 'focus' : v;
}

/** True only in tactical — the one view that pauses the simulation. */
export function isTactical(v: ViewMode): boolean {
  return v === 'tactical';
}

/** True for the map views (overhead walking, tactical paused) — T4's canvas. */
export function showsOverhead(v: ViewMode): boolean {
  return v === 'overhead' || v === 'tactical';
}
