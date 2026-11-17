# T12b: Device Detection Ladder — touch → keyboard → mouse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** The app detects the device and auto-selects the input mode by priority: **touch devices (phone/iPad/tablet/touchscreen) → touch; keyboard devices → keyboard; mouse devices → mouse.** Two mechanisms: (1) the boot ladder probes pointer/hover/touch hardware and picks by priority; (2) **first-input lock** — on a fresh save (no stored mode), the first modality that actually fires locks the mode and persists it (a tap locks touch, a keypress locks keyboard; mouse-move alone is ambiguous so it never locks — the ladder's keyboard preference stands). Existing saves with a stored mode are untouched (stored always wins — no wipes).

**Architecture:** `src/engine/input.ts`: replace `defaultMode(hasCoarse, stored)` with `detectMode(s: DeviceSignals): InputMode` (pure, full ladder) + keep the old export as a wrapper for back-compat if referenced; `src/main.ts` boot: compute `DeviceSignals` from matchMedia + `navigator.maxTouchPoints`, apply to fresh saves, and add the **first-input lock** — a module-level `modeLocked` flag (persisted on lock) plus three one-shot listeners (pointerdown with pointerType 'touch' → lock 'touch'; keydown → lock 'keyboard'; mousedown → does NOT lock, per ladder priority). Settings ⚙ switch remains the manual override and sets `modeLocked = true` implicitly (stored mode = locked). e2e: fresh-context mode assertions.

**Tech Stack:** unchanged; zero new dependencies.

**Spec:** §5.3 (modes), the user's priority ladder: "switch to default touch for mobile/ipad/tablet and touchscreen devices, second keyboard and thirdly mouse."

## Global Constraints

- No-break: 1043 unit + 53 e2e stay green (extended where specified); stored-mode-wins invariant preserved (no save wipes — the recurring lesson); ⚙ manual switch unchanged.
- Signals: `coarse = matchMedia('(pointer: coarse)').matches`; `anyCoarse = matchMedia('(any-pointer: coarse)').matches`; `touchCapable = navigator.maxTouchPoints > 0`; `fine = matchMedia('(any-pointer: fine)').matches`; `hover = matchMedia('(any-hover: hover)').matches`.
- Ladder (pure, test-pinned):
  1. `touchCapable && anyCoarse` → **'touch'** (phones, tablets, touchscreen laptops/monitors)
  2. else `!anyCoarse && !touchCapable` → **'keyboard'** (no touch at all → a keyboard is present on anything that runs a browser UI)
  3. else `touchCapable && !anyCoarse` → **'keyboard'** (fine-primary device that happens to have touch — desktop with touchscreen monitor: keyboard priority per the ladder)
  4. else `fine && hover` → **'mouse'** (fine pointer with hover and no touch — the mouse-only kiosk)
  5. else → **'hybrid'**
- First-input lock (fresh saves only, `modeLocked === false`): touch pointerdown → lock 'touch'; keydown (non-modifier) → lock 'keyboard'; mousedown → no lock (ambiguous — ladder stands). Once locked → persisted via the existing persist path; never re-locked.
- TS strict; zero `any`; SPDX; conventional commits `feat(t12b)/test(t12b)`. PORT RULE: previews 4199.

---

### Task 1: Detection ladder + first-input lock

**Files:** Modify `src/engine/input.ts` (`DeviceSignals`, `detectMode(s)` — replaces/refines `defaultMode(hasCoarse, stored)` keeping a back-compat wrapper; `modeLocked` state + `lockMode(mode)` export consumed by main), `src/main.ts` (signals computation; fresh-save lock listeners; persist on lock), `src/game/save.ts` (no change — mode storage exists; `modeLocked` is session-level until persisted through the existing persist() call on lock), tests (`defaultMode` tests replaced by ladder truth table incl. iPad-with-keyboard / Surface / mouse-kiosk rows; lock reducer tests), e2e (+1: fresh context, keypress locks 'keyboard' persisting across reload).

- [x] Ladder truth table (pure, test-pinned): `touchCapable` → 'touch' (phones, tablets, touchscreen laptops/monitors — touchscreen wins per the priority order); `!touchCapable` → 'keyboard' (every non-touch device that runs a browser UI has a keyboard; 'mouse' stays reachable via ⚙ — a mouse-only kiosk is undetectable, documented in code + FAQ). `hover`/`fine` signals are carried in `DeviceSignals` for completeness and future tuning but the shipped ladder is the two-arm one. PIN IT.)
- [x] Implement + lock wiring. Gates + 53/53. Commit `feat(t12b): device detection ladder — touch, keyboard, mouse + first-input lock`.


> **Ratified deviation (controller, post-review):** the desktop arm boots
> **`hybrid`**, not keys-only `keyboard` — the user's "keyboard second, mouse
> third" keeps BOTH on a desktop (hybrid IS keyboard+mouse; keys-only killed
> the pointer-lock mouse look). Ladder: `touchCapable` → 'touch', else
> 'hybrid'; the keydown lock claims 'hybrid' too. Landed `11acef2` (ladder +
> lock) and `bb2e429` (hybrid fix); e2e 54/54 with every desktop leg passing
> unchanged.

---

### Task 2: Docs + close-out

README modes note (auto-detect ladder), FAQ +1 ("how does the game pick my controls?"), TEST-CASES +1, plan ticks, gates.

- [x] Docs → gates. Commit `docs(t12b): auto-detect ladder docs — touch, hybrid, and the gear tab`.

## Plan Self-Review

The user's ladder implemented: touch → keyboard → mouse (mouse reachable via ⚙; auto-detect never picks it over keyboard because a mouse without a keyboard is undetectable — documented honestly in code + FAQ). Stored-mode-wins preserved. Lock persists through the existing persist() path. No placeholders.
