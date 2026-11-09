# M5: Accessibility, Perf Presets, Beta Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the spec §5.5 accessibility table stakes (reduced-flash, key remapping, captions, text scale), quality presets (auto + manual), the beta-hardening documents (PRIVACY/PROVENANCE/PLAYTEST), Lighthouse a11y ≥ 90, machine-proven export round-trip + restart-speed criteria, and the M3/M4 review backlog.

**Architecture:** A11y/perf state extends SaveData additively (`a11y: { reducedFlash, captions, textScale, keyMap }`, `perf: 'auto' | 'low' | 'mid' | 'high'`); a Settings overlay (⚙) owns the UI; the input layer grows a code→action KeyMap (default = current bindings); captions are derived events fed to a caption bar; perf presets centralize renderer/pixelRatio/RT decisions in one `quality.ts`. No new machines (configurations + derived events — registry notes them).

**Tech Stack:** unchanged; zero new dependencies.

**Spec:** §5.5 (a11y), §13.2/§13.3 (M5 + exit criteria), §10/§11.4 (privacy/provenance).

## Global Constraints

- No-break: 242 unit + 19 e2e stay green (extended only where specified); hook additive-only; default experience byte-identical when settings are default.
- Machine policy: settings/keymap/perf are configuration documents, captions are derived events — register as look-alikes/notes, not machines.
- TS strict + noUncheckedIndexedAccess; zero `any`; SPDX; no Math.random; conventional commits `feat(m5)/fix(m5)/test(m5)/docs(m5)`.
- Save compat: `validateSave` must accept old v2 saves WITHOUT the new fields (defaults applied post-load via a `normalizeSave` step — new fields optional in validation, defaulted after; export still emits full shape).
- Reduced-flash is a first-class mode, not a nicety: with it on, nothing on screen may pulse/flash faster than ~1 Hz in luminance — audit Taal lantern, beacon emissive, mirror RT swaps, overlay appearances.

---

### Task 1: Settings foundation — a11y fields, ⚙ overlay, reduced-flash, text scale

**Files:**
- Create: `src/ui/settings.ts`
- Modify: `src/game/save.ts` (optional fields + `normalizeSave`), `src/main.ts` (⚙ button, apply textScale via CSS var `--mh-text-scale` on body; reducedFlash flag consulted by all pulse sites), `src/game/taal.ts`+`src/game/avatar.ts` (pulse sites), `src/ui/hud.ts` (overlay show/hide swaps fade instead of instant when reducedFlash), `index.html` (CSS var default 1; overlay styles)

**Interfaces:**

```ts
// save.ts — additive, optional-in-validation, defaulted in normalizeSave
export interface A11ySettings { reducedFlash: boolean; captions: boolean; textScale: 1 | 1.25 | 1.5; keyMap: KeyMap }
export type KeyMap = Readonly<Record<string, string>>; // action -> KeyboardEvent.code, defaults exported
export const DEFAULT_KEYMAP: KeyMap; // {forward:'KeyW', back:'KeyS', left:'KeyA', right:'KeyD', sprint:'ShiftLeft', turnL:'KeyQ', turnR:'KeyE', frost:'KeyF', view:'KeyV', aaina:'KeyQ'? — CONFLICT: Q is turnL AND aaina.
```

**KeyMap conflict resolution (authoritative):** Aaina moves to its own default key — **`KeyI`** (info), keeping Q/E pure turning. Update FAQ/README copy + the Q-suppression logic dies (aaina opens on its map key; keep suppression pattern generalized via the existing `withoutKey` claim when the aaina overlay is open, on the aaina key). Defaults: `forward KeyW, back KeyS, left KeyA, right KeyD, sprint ShiftLeft, turnL KeyQ, turnR KeyE, frost KeyF, view KeyV, aaina KeyI, push KeyE-push stays contextual (action `push: 'KeyE'` — E remains dual with the door-claim), stepThrough Space, faq KeyH, mute KeyM, tactical KeyT`.

Settings overlay (⚙ next to 🌐): sections Display (text scale 1/1.25/1.5 radio), Access (reduced-flash toggle, captions toggle — wired T3), Performance (auto/low/mid/high — wired T4), Controls (list + "press to rebind" — wired T2; this task renders the section with the default map read-only + a coming-soon note is NOT allowed — instead defer the Controls section entirely to T2). Toggles apply instantly + persist (debounced persist fine; flush on overlay close).

Reduced-flash effects (this task): Taal lantern + beacon emissive pulses become static values; overlay show/hide uses CSS opacity transition ≥ 300ms; mirror fog/capture material swaps keep transitions. Text scale: `document.body.style.setProperty('--mh-text-scale', s)`; all HUD/overlay font sizes move to `calc(... * var(--mh-text-scale, 1))`.

- [x] **Step 1: Failing tests** — save: normalizeSave defaults missing a11y; validateSave accepts old-shape v2; DEFAULT_KEYMAP has exactly the 15 actions, unique codes except the sanctioned E-dual (turnR+push share KeyE — `push` is contextual, allow duplicate there only). **Step 2: RED → implement → GREEN.** **Step 3: Wire overlay + CSS var + reducedFlash sites; gates + e2e 19/19 (default experience unchanged; aaina key change → update the ONE e2e that presses KeyQ for aaina + FAQ/README copy).** **Step 4: Commit** — `feat(m5): settings foundation — a11y fields, reduced-flash, text scale, aaina to I`

---

### Task 2: Key remapping

**Files:**
- Modify: `src/ui/settings.ts` (Controls section live), `src/engine/input.ts` (`keysToMoveInput(snap, mode, keymap)` — codes resolved through the map; mouseOnly unaffected), `src/main.ts` (all action keydown handlers route through `actionFor(e.code, keymap)`; rebinding capture UI), tests

**Interfaces:**

```ts
export function actionFor(code: string, map: KeyMap): string | null; // reverse lookup (first action whose code matches; E returns 'push' when door-hint active else 'turnR' — CONTEXT: implement as pure actionFor returning both? SIMPLEST: actionFor returns the LAST-defined action for duplicate codes, and main checks contextual keys first (push hint) — spell this in code)
export function rebind(map: KeyMap, action: string, code: string): { map: KeyMap; conflict: string | null }; // conflict = other action already on code (except sanctioned self/E-dual); caller warns
```

Rebind UI: click an action row → "press a key…" → next keydown captures (Escape cancels) → rebind + persist; conflicts show inline warning and refuse (except remapping onto the E pair replaces both? No — refuse with message; keep simple). Reset-to-defaults button.

- [x] **Step 1: Failing tests** — actionFor lookups incl. E-dual ordering; rebind success/conflict/immutability; keysToMoveInput with a remapped forward key (KeyP behaves as forward). **Step 2: RED → implement → GREEN.** **Step 3: Wire capture UI + all handlers; gates + e2e 19/19.** **Step 4: Commit** — `feat(m5): full key remapping with conflict guard`

---

### Task 3: Captions + shape/color identity audit

**Files:**
- Create: `src/ui/captions.ts`
- Modify: `src/main.ts` (event feeds), `src/ui/hud.ts` (caption bar element), `docs/A11Y.md` (new), `src/ui/faq.ts` (+1 entry)

**Interfaces:**

```ts
export interface CaptionEvent { id: string; text: string; at: number; ttlMs: number }
export function captionFeed(events: readonly CaptionEvent[], ev: CaptionEvent, now: number): CaptionEvent[]; // dedupe by id within ttl; trim expired
export function renderCaptions(el: HTMLElement, events: readonly CaptionEvent[], now: number): void; // latest 2 lines, fade
```

Events wired (when `a11y.captions`): echo sense-success ("The glass sees you — an Echo stirs"), chase start ("An Echo gives chase"), confusion ("An Echo wanders, blinded"), Chhaya appears/sample-expiry ("Your shadow is Xs behind"), Taal contact ("Taal's lantern flares — the house's temper rises"), anger thresholds 60/90, fail/clear/descend/tier, hint purchased, audio started/muted. Entity identity audit → `docs/A11Y.md`: Echoes (translucent glass pane silhouette, teal-white), Chhaya (solid dark coat, rose lantern), Taal (solid obsidian, GOLD lantern + beat lurch) — distinguishable by silhouette + motion + caption, not color alone; document each + the reduced-flash/captions/text-scale/remap modes.

- [x] **Step 1: Failing tests** — feed dedupe/trim; render shows ≤2. **Step 2: Implement + wire all events.** **Step 3: A11Y.md from shipped code; FAQ entry. Gates + e2e 19/19.** **Step 4: Commit** — `feat(m5): caption events + entity identity audit`

---

### Task 4: Perf presets

**Files:**
- Create: `src/game/quality.ts`
- Modify: `src/main.ts` (renderer pixel ratio, RT mirror construction, resize), `src/game/mirror.ts` (RT resolution param + no-RT mode → reflective fake material for standing mirrors; heroes keep RT on mid/high only), `src/ui/settings.ts` (Performance section live)

**Interfaces:**

```ts
export type PerfPreset = 'low' | 'mid' | 'high';
export interface QualityProfile { pixelRatioCap: number; heroRt: boolean; heroRtSize: 256 | 512; chhayaBob: boolean }
export const PROFILES: Record<PerfPreset, QualityProfile>; // low: cap 1, heroRt false, 256, bob false; mid: 1.5, true, 256, true; high: 2, true, 512, true
export function autoPreset(fps: number, dpr: number): PerfPreset; // fps < 45 sustained → low; dpr ≥ 2 && fps ≥ 55 → high; else mid (rolling 5s average fed by main)
```

Auto mode: FPS monitor (existing diagnostics counter) feeds a rolling average; preset changes apply live (pixelRatio instant; heroRt toggle requires mirror rebuild — apply on next floor build, note in settings UI "applies on next floor"). `perf: 'auto'` default. Manual override persists.

- [x] **Step 1: Failing tests** — autoPreset hysteresis table; PROFILES values. **Step 2: Implement + wire.** **Step 3: Gates + e2e 19/19 + a low-preset smoke (build with ?perf=low DEV param — mirrors render fake material, no crash).** **Step 4: Commit** — `feat(m5): quality presets — auto-detect, manual override, low-end path`

---

### Task 5: Backlog fix wave

**Files:**
- Modify: `src/game/mirror.ts` (dispose materials), `src/main.ts` (import reloads to `location.pathname`; Dwaar re-clear banking gate: on floor-10 clear, bank clear-bonus only when `!save.progress.tierComplete` at entry — beacon pending shards still bank normally), `public/manifest.webmanifest` + `src/game/aaina.ts` + `src/ui/faq.ts` (six-second copy → "your shadow, seconds behind — faster the deeper you go")

- [x] **Step 1: Tests** — banking gate unit test (tierComplete entry → no perfect/stuck bonus on re-clear; beacons still bank); dispose covered by existing leak note (manual verify via renderer.info in soak T6). **Step 2: Implement all four fixes.** **Step 3: Gates + e2e 19/19.** **Step 4: Commit** — `fix(m5): mirror dispose, import path, dwaar re-clear gate, shadow copy`

---

### Task 6: Beta hardening — docs, round-trip e2e, restart timing, soak, aria fixes

**Files:**
- Create: `PRIVACY.md`, `PROVENANCE.md`, `PLAYTEST.md`, `scripts/soak.mjs`
- Modify: `src/ui/hud.ts` + `src/ui/settings.ts` + `src/ui/faq.ts` + `src/ui/aaina.ts` (aria-labels on ALL icon-only buttons; role=dialog + aria-modal on overlays; focus trap on settings), `index.html` (`lang` attr updates with 🌐), `tests/e2e/smoke.spec.ts` (+2: export/import round-trip via Playwright download + setInputFiles; floor-restart < 2000ms timing assertion on warp-caught), README

soak.mjs: node script (Playwright lib) — loads preview build, plays a scripted loop (walk/frost/warp-caught cycle) for N minutes (default 10), samples `performance.memory` + hook state every 30s, reports; run once locally in-task, results into the report. (The 2h criterion: script supports `--minutes 120`; recorded as RUNBOOK step for the human/agent to launch pre-beta; 10-min evidence this task.)

- [x] **Step 1: Write docs** — PRIVACY.md (no accounts/cookies/telemetry; IDB+localStorage on device; export file contains gameplay data only; CSP), PROVENANCE.md (all code/assets original/procedural; deps list w/ licenses: three/vite/vitest/playwright/eslint/prettier MIT), PLAYTEST.md (5-stranger kit: how to run a session, what to watch, feedback form questions, seed-of-the-day).
- [x] **Step 2: Aria/lang/focus fixes; two new e2e (19→21).** **Step 3: soak run (10 min) — paste memory trend.** **Step 4: Gates.** **Step 5: Commit** — `feat(m5): beta hardening — privacy/provenance/playtest, a11y aria, round-trip + timing e2e, soak`

---

### Task 7: Close-out — exit criteria, registry notes, Lighthouse

**Files:**
- Modify: spec §13.2 M5 delivered + §13.3 checklist annotated with evidence (per criterion: green/deferred), STATE_MACHINES.md (config look-alike rows: settings/keymap/perf; captions derived), README, plan ticks

**Controller runs Lighthouse** (chrome-devtools MCP `lighthouse_audit`, desktop+mobile) against the local preview of this branch BEFORE merge; findings ≥ Critical/serious fixed in-task; scores recorded in the plan checklist. Target: a11y ≥ 90 (both device modes).

- [x] **Step 1:** docs + checklist with evidence. **Step 2:** Lighthouse runs + fixes. **Step 3:** Gates + 21/21. **Step 4: Commit** — `docs(m5): exit criteria evidence, registry notes, lighthouse scores`

> **T7 close-out note (2026-11-09).** Docs, checklist evidence and registry notes landed as `docs(m5): exit criteria evidence, registry notes, how to play for everyone`; gates green (316 unit + 23/23 e2e, bundle 635 kB min / 168 kB gzip). **Lighthouse (desktop + mobile) pending controller audit** — see spec §13.3's open line; record both a11y scores here when run, fix anything ≥ Critical/serious in-task.

## Plan Self-Review

- Coverage vs §13.3 exit criteria: soak (10-min machine + 2h runbook — honest split), restart <2s (e2e T6), export round-trip (e2e T6), offline install (verified M4 + runbook), reduced-flash (T1), playtest (OPEN — kit T6), Lighthouse ≥90 (T7), privacy/license/provenance (T6). §5.5 a11y: reduced-flash ✓, colorblind identity ✓ (T3), captions ✓ (T3), remap ✓ (T2), text scale ✓ (T1), one-handed scheme (mouse-only mode = the one-handed answer — document in A11Y.md), no QTEs (none). ✓
- Placeholders: none; KeyMap conflict resolution and E-dual semantics specified authoritatively.
- Type consistency: KeyMap/A11ySettings defined T1 consumed T2–T4; QualityProfile T4; hook untouched (settings via existing overlays).
