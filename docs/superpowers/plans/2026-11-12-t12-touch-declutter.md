# T12: Touch Controls + Responsive Declutter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the game fully playable on touch screens (virtual move stick + drag-look + thumb actions) and de-clutter the HUD everywhere via a responsive layout that adapts panes/chips/plates to the device. Fixes the two user-reported defects: "not playable on touch screens" and "the screen is cluttered".

**Architecture:** `src/game/touch.ts` pure (stick vector → MoveInput, zone classification) + `src/engine/input.ts` extension (pointer-event tracking for two-zone touch, mode `'touch'` added to the InputMode union) + `src/ui/touchUi.ts` (virtual stick DOM: base ring + nub, PoD-styled) + responsive declutter (a `compact` layout mode driven by viewport/coarse-pointer, hiding keys bar and panes by default on small/touch screens, compact plate/dock, with dock/chip toggles to summon panes). Save: InputMode union widens `'touch'` — validateSave union list + tests updated SAME COMMIT (the enum-widening lesson: touch the validator in the same commit).

**Tech Stack:** unchanged; zero new dependencies. Playwright touch emulation (`hasTouch` context + `touchscreen`) covers e2e.

**Spec:** §5.3 (Touch: left virtual stick; right drag-look; frost/sprint/view as thumb buttons) — this tier IMPLEMENTS the spec line that shipped unimplemented. §5.5 (mobile declutter).

## Global Constraints

- No-break: 1004 unit + 50 e2e stay green (extended where specified); keyboard/mouse/hybrid behavior byte-identical (touch is additive); element ids preserved; PoD chrome language kept.
- InputMode union widens `'keyboard' | 'mouse' | 'hybrid' | 'touch'` — `save.ts:validateSave` mode list + i18n mode labels (en/hi: स्पर्श) + settings chip updated in the same commit as the union; auto-select: NEW saves on coarse-pointer devices default `'touch'` (existing saves keep their stored mode — no wipe).
- New constants: `TOUCH_STICK_RADIUS_PX = 56`, `TOUCH_NUB_RADIUS_PX = 24`, `TOUCH_DEADZONE = 0.18`, `TOUCH_LOOK_SENS = 0.0045` (rad/px), `COMPACT_BREAKPOINT_PX = 900`.
- TS strict; zero `any`; SPDX; no Math.random; conventional commits `feat(t12)/test(t12)/docs(t12)`. PORT RULE: previews 4199.
- A11y: touch UI elements are pointer surfaces (no keyboard focus requirement), aria-labels en/hi, reduced-flash keeps everything static.

---

### Task 1: Touch input plumbing (pure math + collector + mode)

**Files:** Create `src/game/touch.ts`; Modify `src/engine/input.ts` (InputMode +'touch'; `InputCollector` gains pointer tracking: pointerdown/move/up with `setPointerCapture`-less manual tracking — first touch starting in the LEFT 45% of the viewport = stick pointer (origin = touch point, vector = current−origin clamped to stick radius), touches in the RIGHT 55% = look pointer (movement deltas → yaw); `touchSnapshot()` exported; `keysToMoveInput` untouched), `src/game/save.ts` (InputMode union + validation list + tests), `src/engine/constants.ts` (touch constants), `src/ui/i18n.ts` (mode label स्पर्श), tests.

**Pure core:**

```ts
export interface TouchStick { active: boolean; dx: number; dy: number } // dx/dy normalized −1..1 from origin
export interface TouchLook { dx: number } // accumulated yaw delta px
export function stickToMove(s: TouchStick): { forward: number; strafe: number };
// forward = −dy, strafe = dx, deadzone TOUCH_DEADZONE, magnitude clamped ≤ 1 (analog speed!)
export function classifyZone(xPx: number, viewW: number): 'stick' | 'look';
// x < viewW * 0.45 → 'stick' else 'look'
```

Analog speed: stick magnitude scales movement (walk→sprint continuum) — `movePlayer` currently gates sprint on a boolean; pass `input.sprint = magnitude > 0.85` OR extend MoveInput with a speed scalar? **Decision: keep MoveInput shape unchanged** — `forward/strafe ∈ [−1,1]` are already analog multipliers of WALK_SPEED; sprint threshold maps magnitude > 0.85 to `sprint: true` for the full 6.0. Document: touch players get analog 3.5 m/s below the threshold.

- [ ] Tests (stickToMove deadzone/analog/clamp; classifyZone boundary; InputMode union widen: validateSave accepts 'touch', rejects 'teleport'; mode auto-select pure fn `defaultMode(hasCoarse, storedMode)`; keymap/rotation/floor pins untouched) → RED → implement → GREEN; gates + 50/50. Commit `feat(t12): touch plumbing — stick, look, mode`.

---

### Task 2: Touch UI — virtual stick, look zone, action buttons, declutter

**Files:** Create `src/ui/touchUi.ts` (stick DOM: base ring + nub, PoD ink plate + yellow nub, shown only in touch mode on touch devices; look zone invisible; handles pointer routing visually); Modify `index.html` (responsive CSS: ≤ COMPACT_BREAKPOINT_PX or coarse-pointer → `.compact` body class — keys bar hidden, minimap/motion panes hidden by default with MAP/MOTION chips summoning them, district plate compact, dock = 2×3 grid with 56px targets, chips row compact), `src/ui/hud.ts` (dock grid, pane-summon chips wired to existing toggles), `src/main.ts` (mode auto-select at boot for new saves; compact class), tests (visibility logic pure: `panesDefault(compact, touch)`).

**Declutter rules (compact mode):**
- HIDDEN: keys bar (no keys), motion pane, minimap (summon via MAP chip — it re-appears over the left column), noise/anger chips folded into one status plate, district plate shrinks to one line.
- KEPT: dock (bigger), captions, exit/beacon in-world cues, shards chip.
- Desktop unchanged (> 900 px + fine pointer): everything as shipped.

- [ ] Tests (panesDefault truth table; compact class logic pure fn) → RED → implement → GREEN; gates + 50/50. Commit `feat(t12): touch UI — stick, look, declutter`.

---

### Task 3: Touch e2e + docs + close-out

**Files:** `tests/e2e/touch.spec.ts` (NEW file — separate touch project/context with `hasTouch: true` + viewport 390×844 iPhone-ish; tests: stick drag moves the player, right-drag rotates heading, frost button tap captures/captures-attempt, MAP chip summons minimap, compact class present on coarse), `src/ui/i18n.ts` (any missing keys), docs: TEST-CASES +3 (touch cases), README (touch section — "playable on your phone"), STATE_MACHINES (InputMode union row update), FAQ +1 (play on your phone), plan ticks; full gates + 50/50 desktop + new touch spec.

- [ ] Implement → e2e 50/50 + touch spec → gates. Commit `test(t12): touch e2e + docs — playable on your phone`.

## Plan Self-Review

Coverage: "not playable on touch" → T1 plumbing + T2 UI ✓. "Screen is cluttered" → T2 declutter ✓. InputMode enum + validator same-commit (the lesson) ✓. Analog speed documented (no MoveInput shape change) ✓. e2e desktop suite untouched + new touch context ✓. No placeholders.
