# T11: Pac-Minimap + Motion Pane — always-on guidance panes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Two always-visible guidance panes, PoD-styled: (1) a **Pac-Man-style minimap** — the full maze layout with walls, beacons, exit, player arrow and live Sentinel dots — no fog, it's the guide; (2) a **motion pane** — a robotic humanoid figure that mirrors the player's current motion live (walk cycle, direction lean, sprint, frost pose, heading compass) with a motion-state label. Both toggleable, on by default.

**Architecture:** `src/ui/minimap.ts` (compact canvas renderer — own light draw, decoupled from overhead's fog-of-war) + `src/ui/motionPane.ts` (canvas figure + pure pose helpers). Pure helpers unit-pinned: `fitScale`, `walkPhase`, `poseFor`. Wiring in `main.ts` frame loop: minimap re-render throttled (~150 ms), motion pane per frame. Toggles: KeyN (minimap), dock button + KeyB (motion pane); session-only visibility, default ON. No save-schema change. No SW change (no new assets).

**Tech Stack:** unchanged; zero new dependencies.

**Spec:** guidance UX gap ("otherwise it's not fun" — the maze layout was hidden behind view switching); §5.1 views remain unchanged.

## Global Constraints

- No-break: 965 unit + 48 e2e stay green (extended where specified); element ids additive; PoD chrome styling kept (panes are PoD dark plates with display-font labels); reduced-flash respected (no added flashing; static figure + label fallback under body.mh-reduced-flash).
- New constants: `MINIMAP_SIZE_PX = 176`, `MINIMAP_REPAINT_MS = 150`, `MOTION_W = 132`, `MOTION_H = 168`, `WALK_CYCLE_LEN = 1.6` (meters per full cycle), `KEY_MAP map` gains `map: 'KeyN'`, `body: 'KeyB'` (validateKeyMap exact-count test updated 15→17 actions; i18n keys for both, en/hi).
- TS strict; zero `any`; SPDX; no Math.random; conventional commits `feat(t11)/test(t11)/docs(t11)`. PORT RULE: previews 4199.

---

### Task 1: Minimap — the Pac-Man guide

**Files:** Create `src/ui/minimap.ts`; Modify `src/main.ts` (canvas mount, throttled render, KeyN toggle + `#mh-map` dock button), `src/ui/hud.ts` (dock button), `index.html` (styles), `src/engine/constants.ts`, `src/engine/input.ts` (KeyN in keymap — see T5 keymap pattern: `map:'KeyN'` + validateKeyMap count 15→16), `src/game/save.ts` (keymap count test), tests (pure helpers).

**Pure helpers (unit-pinned):**

```ts
export function fitScale(wPx: number, hPx: number, grid: { width: number; height: number }): number;
// min(wPx/(width*CELL_SIZE), hPx/(height*CELL_SIZE)) — the maze fits the pane with 6px padding
export function minimapLayout(...): // internal
```

**Draw (compact, fog-free — the Pac-Man guide):** full wall layout (all segments, steel ink), beacons as dots (uncaught = pulsing-free solid teal; captured = dim), exit door dot (gold; dim while locked), player as gold arrow rotated by heading, Sentinels as live dots (red — Taal/Gher/Aavart; Chhaya violet) shown whenever they walk this floor, decoys as hollow dots, visited-cell dim overlay OFF (reveal-all is the point), pools as teal squares if present. Redraw throttled MINIMAP_REPAINT_MS; hidden when toggled off.

- [ ] Tests (fitScale; render smoke via tiny canvas stub if trivial — else fitScale + toggle-state pure fn only) → RED → implement → GREEN; gates + 48/48. Commit `feat(t11): pac-minimap — the maze as a guide`.

---

### Task 2: Motion pane — the robotic mirror

**Files:** Create `src/ui/motionPane.ts`; Modify `src/main.ts` (per-frame render from latest inputFrame + player; KeyB toggle + `#mh-motion` dock button), `src/ui/hud.ts` (dock button), `index.html` (styles), constants (MOTION_*), `src/engine/input.ts` (keymap + count), tests.

**Pure helpers (unit-pinned):**

```ts
export interface MotionSnapshot { moving: boolean; mx: number; my: number; sprint: boolean; frost: boolean; step: boolean; headingDeg: number; walkPhaseM: number }
export function walkPhase(distanceMovedM: number): number; // distance / WALK_CYCLE_LEN mod 1 → 0..1 cycle
export function poseFor(s: MotionSnapshot): { lean: number; stride: number; armFrost: number; label: string };
// labels: 'SPRINT' | 'WALK' | 'STRIDE' | 'STILL' | 'FROST' | 'STEP' — precedence FROST > STEP > SPRINT > WALK > STILL
```

**Draw (robotic figure, back view):** head + torso + two legs (stride swing by sin(walkPhase·2π)), two arms (opposite swing), frost arm raised when frost active (brief), step-through = whole figure flash-forward pose (static), lean forward ∝ sprint, lateral tilt ∝ strafe; heading compass ring with N/E/S/W ticks rotating −headingDeg; motion-state label under the figure (display font). Reduced-flash: figure static in the pose, label only.

- [ ] Tests (walkPhase period/membership; poseFor precedence + stride math) → RED → implement → GREEN; gates + 48/48. Commit `feat(t11): motion pane — the robotic mirror`.

---

### Task 3: Wiring, i18n, e2e + docs

**Files:** `src/main.ts` (both panes' toggles + labels en/hi i18n keys `pane.map` / `pane.motion` / aria-labels; dock buttons `#mh-map`, `#mh-motion`), `src/ui/i18n.ts` (keys + hi), `src/engine/input.ts` (validateKeyMap count 17), `tests/unit/save.test.ts` (keymap count), e2e 48→50: (a) `t11: minimap guides by default` — canvas `#mh-minimap` visible on load, KeyN hides/shows; (b) `t11: motion pane mirrors you` — canvas `#mh-motion` present, hold W+Shift → label SPRINT visible, release → WALK/STILL; docs: TEST-CASES +2, README panes note, STATE_MACHINES look-alike rows (minimap/motion = derived renderers), FAQ +1.

- [ ] Tests → e2e 50/50 → gates. Commit `test(t11): panes e2e + docs` (may fold into T3 commits as coherent pairs).

## Plan Self-Review

Coverage: both asks ✓ (minimap = UC-49, motion pane = UC-50 — append to USE-CASES.md in T3/T4). Validator untouched (no ramp change — no widening needed; keymap count IS touched → tests updated same task). Reduced-flash ✓. No save change ✓. No placeholders.
