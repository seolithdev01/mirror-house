# T13: Start Screen + Pause/Resume — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** (1) Opening the link shows a **start screen** — PoD poster composition with a PLAY/CONTINUE button — instead of dropping straight into the world; (2) a **PAUSE/RESUME control** (dock button + KeyP) that freezes the world mid-run with a PoD pause plate. Both en/hi, all a11y machinery intact, e2e green.

**Architecture:** `src/ui/startScreen.ts` (full-screen overlay, shown after the boot poster fades, dismissed by PLAY/CONTINUE → the already-built campaign floor is live behind it in `ready`); pause = a session `paused` flag composing into the existing `simActive` gate (exactly like tactical does — no machine change), dock toggle `#mh-pause` + KeyP (keymap 17→18 — validateKeyMap migration list gains 'pause', tests updated same task), PAUSED plate + resume. Timer/water keep running under pause (the established pause-proof rule, stated on the plate). Start screen choices: fresh save → `BEGIN THE DESCENT`; stored campaign → `CONTINUE — FLOOR N` primary + `NEW HOUSE` secondary (new random seed). PLAY dismiss = the world behind is already correct (boot resume logic unchanged).

**Tech Stack:** unchanged; zero new dependencies.

**Spec:** §5.1/§5.2 (HUD/session UX), PoD language continuation (the reskin's boot poster becomes interactive).

## Global Constraints

- No-break: 1070 unit + 54 e2e stay green (extended where specified); ids additive; PoD language; a11y machinery intact (aria, focus trap on the start screen while visible, text-scale, reduced-flash: static poster, no pulse); i18n en/hi parity (new keys both langs).
- Keymap 17→18: `pause: 'KeyP'` — validateKeyMap migration list gains 'pause' (rebinds-win softening applies), exact-count tests updated same task.
- Pause semantics: world frozen (Echoes/sentinels/decoys/water/noise all gated), **timer + water clock keep running** (the established pause-proof rule — stated on the PAUSED plate: "the clock keeps counting — the house doesn't wait"), pending shards survive pause (pause ≠ fail), fails cannot fire while paused.
- TS strict; zero `any`; SPDX; conventional commits `feat(t13)/test(t13)`. PORT RULE: previews 4199.

---

### Task 1: Start screen

**Files:** Create `src/ui/startScreen.ts`; Modify `index.html` (styles), `src/main.ts` (mount after boot poster fade; dismiss on click), `src/ui/i18n.ts` (keys en/hi), `src/ui/hud.ts` (nothing — standalone overlay), tests (pure: button-visibility logic `choicesFor(hasProgress, floorN)`; overlay dismiss state).

**Composition (PoD boot language):** kicker `MIRROR` (yellow display) / giant `HOUSE` (cream) / tagline / primary button: fresh → `BEGIN THE DESCENT`; stored campaign (floor > 1 or tierComplete) → `CONTINUE — FLOOR N` primary + `NEW HOUSE` ghost secondary; mini-stats line (streak · shards · best) when a save exists; credits footer line. Focus: PLAY/CONTINUE button focused on show (focus trap); Escape does NOT dismiss (this screen gates the session); role=dialog aria-modal.

Dismiss = overlay removed (display:none) — the campaign behind was already built at boot (fresh: new random seed floor 1; stored: resumed) — `phase` stays `ready`, first input arms the timer as shipped.

- [ ] Tests (choicesFor truth table: fresh → one primary BEGIN; stored → CONTINUE N + NEW HOUSE) → RED → implement → GREEN. **Task gate:** 1070 unit + 54 e2e + live :4199 (start screen on load, PLAY dismisses, keyboard still arms the timer). Commit `feat(t13): start screen — the poster becomes the door`.

---

### Task 2: Pause / resume

**Files:** Modify `src/engine/input.ts` (keymap `pause: 'KeyP'` + count 17→18 + migration entry), `src/game/save.ts` (keymap count tests), `src/main.ts` (`paused` session flag → `simActive` composition + dock button #mh-pause + KeyP handler + PAUSED plate), `src/ui/hud.ts` (dock button + pause plate + label swap PAUSE⇄RESUME), `src/ui/i18n.ts` (en/hi), `index.html` (styles), `src/game/constants.ts` (nothing new — reuses FAIL-style plate), STATE_MACHINES.md (input-gate row + paused note), tests (keymap migration 'pause'; sim-gate composition is main-level — e2e covers).

**Semantics:** paused gates EVERYTHING simActive gated (Echoes, sentinels, decoys, water, noise, Chhaya) — **but the timer/water clock keep running** (pause-proof bests; the plate says so: "the clock keeps counting — the house doesn't wait."). Fails cannot fire while paused. Pause works in ready/running (not during fail-freeze/cleared). Dock label swaps PAUSE⇄RESUME (aria-pressed synced). KeyP toggles. The PAUSED plate has RESUME.

- [ ] Tests (keymap migration 'pause' entry; count 18) → RED → implement → GREEN. **Task gate:** 1070+ unit + 54/54 e2e + live :4199 (PAUSE freezes a sprinting Echo mid-chase; RESUME releases; clock visibly keeps counting). Commit `feat(t13): pause/resume — the house doesn't wait`.

---

### Task 3: e2e + docs + close-out

**Files:** `tests/e2e/session.spec.ts` (NEW: start screen visible on load → CONTINUE/BEGIN dismisses → keyboard arms timer; PAUSE button freezes a walking Echo mid-chase → RESUME releases; KeyP parity; fresh-desktop boots hybrid — the t12b ladder pin), `docs/TEST-CASES.md` (+4), `README.md` (start screen + pause), `STATE_MACHINES.md` (paused in the input-gate row + start-screen note), `docs/USE-CASES.md` (+2: UC-49 start screen, UC-50 pause/resume), FAQ +2, plan ticks; full gates + e2e total.

- [ ] e2e + docs → gates. Commit `test(t13): session e2e + docs — the front door and the pause`.

## Plan Self-Review

Both asks covered (start screen ✓ pause/resume ✓). Timer-keeps-running is the ratified pause-proof rule, stated on the plate. Keymap widening migration same-commit. Start screen focus-trapped, Escape-proof (it gates the session). No placeholders.
