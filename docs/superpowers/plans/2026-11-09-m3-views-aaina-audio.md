# M3: Views, Aaina v1, Audio Engine, Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the senses milestone: V-key view cycling (FOCUS → QUAD → OVERHEAD, TACTICAL pause via Esc/enter), Aaina the lantern guide with a working hint economy (shards buy contextual hints), the fully-original procedural Web Audio score (drone + raga melody + tabla-style percussion, threat-adaptive), and the deferred M2 polish items — all machines explicit per `docs/STATE_MACHINES.md`.

**Architecture:** `src/audio/theory.ts` (pure, node-testable music theory: scales, melody walk, beat patterns) + `src/audio/engine.ts` (WebAudio graph, gesture-gated start, intensity 0..1, mute). `src/game/viewMode.ts` (machine) + quad rendering via scissor viewports in main.ts + `src/ui/overhead.ts` (2D canvas map with fog-of-war, pings, tactical waypoints). `src/game/aaina.ts` (pure hint selection/economy) + `src/ui/aaina.ts` (dialogue overlay: Ask/Hint/Lore tabs, [Q] key + HUD button). Intensity derived from floor state; no new implicit machines — register ViewMode, Aaina overlay, AudioEngine in STATE_MACHINES.md.

**Tech Stack:** unchanged.

**Spec:** §5.1–5.2 (views/HUD), §2.2/§4.5 (Aaina, hint economy), §6 (audio identity), §13.2 M3.

## Global Constraints

- No-break: 130 unit + 11 e2e stay green (existing e2e may only be extended per task spec); every debug-hook field preserved (additive only); gameplay feel outside the listed changes untouched.
- State-machine policy (spec §7.1 + STATE_MACHINES.md): every new lifecycle is an explicit machine; register rows; look-alikes (intensity, hints-used, fog-of-war set are derived/stored data — document, don't machine-ify).
- TS strict + noUncheckedIndexedAccess; zero `any`; SPDX; no Math.random (audio uses `createRng(seed)`; audio may use `performance.now()` for scheduling only); conventional commits `feat(m3)/test(m3)/docs(m3)/chore(m3)`.
- New constants: `SHARD_HINT_BASE = 5`, `HINT_COST_GROWTH = 5`, `AAINA_KEY = 'KeyQ'`, `VIEW_KEY = 'KeyV'`, `MUTE_KEY = 'KeyM'`, quad pane pixel-ratio cap 1.
- Audio: starts ONLY after first user gesture (autoplay policy); total gain ≤ 0.5; mute persists in meta (`muted?: boolean`).
- Perf: QUAD side panes render on alternate frames; OVERHEAD is 2D canvas (never a 3D render); budget still < 3 MB gz.

---

### Task 1: Audio theory (pure) + engine (WebAudio)

**Files:**

- Create: `src/audio/theory.ts`, `src/audio/engine.ts`
- Modify: `src/engine/constants.ts` (audio constants: `AUDIO_ROOT_HZ = 110`, `AUDIO_GAIN_CEILING = 0.5`)
- Test: `tests/unit/theory.test.ts`

**Interfaces:**

```ts
// theory.ts — pure, deterministic given rng
export const TIER_ONE_SCALE: readonly number[]; // semitone offsets, Ahir-Bhairav-inspired: [0,1,4,5,7,8,11]
export const TIER_TWO_SCALE: readonly number[]; // Durga-inspired pentatonic: [0,2,4,7,9]
export function midiToHz(semi: number): number; // 440 * 2^((semi-69)/12)
export function nextMelodySemi(
  rng: Rng,
  scale: readonly number[],
  prevSemi: number,
  intensity: number,
  octave: number,
): number;
// weighted walk: step −2..+2 scale degrees, wider leaps at higher intensity; clamps inside [octave, octave+12]
export function beatAccents(tickIndex: number, intensity: number): { low: boolean; high: boolean };
// 8-tick cycle (teental-ish): low (dhin) on ticks 0,4 (+2 at intensity>0.6); high (ta) on odd ticks scaled by intensity
export function intensityFrom(input: {
  anger: number;
  chasing: number;
  failing: boolean;
  cleared: boolean;
}): number;
// cleared→0.1; failing→1; else min(0.95, 0.2 + anger/ANGER_MAX*0.4 + chasing*0.2)
```

```ts
// engine.ts — browser-only; node-safe stubs (typeof window guard returns inert engine)
export interface AudioEngine {
  start(): void; // idempotent; resumes/creates AudioContext (call on first gesture)
  setIntensity(x: number): void; // 0..1, clamped, smoothed internally
  setMuted(m: boolean): void;
  readonly started: boolean;
  readonly muted: boolean;
}
export function createAudioEngine(seed: string): AudioEngine;
```

Engine internals (keep compact): scheduler `setInterval` 50ms with 120ms lookahead scheduling from `theory` via `createRng(seed + ':audio')`; drone = two detuned triangle oscillators at root/2 through a lowpass, constant; melody = triangle osc with exponential envelope + portamento (`frequency.linearRampToValueAtTime`) — a note per ~0.45s at low intensity, ~0.22s at high; percussion = filtered noise burst (high) + sine thump (low); pad = two detuned saws through lowpass + slow LFO, gain rises with intensity. Master gain `AUDIO_GAIN_CEILING`, mute = master gain 0. All nodes created once at start.

- [ ] **Step 1: Failing tests** (`tests/unit/theory.test.ts`): scales' exact semitones; `midiToHz(69)===440`; melody walk determinism (same rng seed ⇒ same 16 notes), stays within octave span, wider average leap at intensity 0.9 vs 0.2 (statistical, seeded); `beatAccents` cycle pinned at both intensities; `intensityFrom` all four branches + clamp.
- [ ] **Step 2: RED → implement theory + engine (+ node inert stub) → GREEN.**
- [ ] **Step 3: Gates. Commit** — `feat(m3): procedural audio — raga-mood theory + WebAudio engine`

---

### Task 2: Aaina v1 — pure hint economy + dialogue overlay

**Files:**

- Create: `src/game/aaina.ts`, `src/ui/aaina.ts`
- Modify: `src/main.ts` (wire: [Q], HUD 💬 button, shard spends, floor-state feed), `src/ui/hud.ts` (Aaina button), `src/game/meta.ts` (`spendShards(m, n): MetaSave | null` — null when insufficient), `index.html` (CSS reuses FAQ overlay styles — new ids `mh-aaina-*`)
- Test: `tests/unit/aaina.test.ts`

**Interfaces:**

```ts
// aaina.ts — pure
export interface HintContext {
  beaconsLeft: number;
  anger: number;
  chhayaNear: boolean;
  chasing: number;
  exitUnlocked: boolean;
  hintsUsed: number;
}
export type HintKind = 'exit' | 'beacons' | 'chhaya' | 'chase' | 'anger' | 'stuck';
export interface Hint {
  kind: HintKind;
  text: string;
}
export const HINTS: Record<HintKind, string>; // in-voice guidance lines, one per kind
export function nextHint(ctx: HintContext): Hint;
// priority: beaconsLeft>0 && anger<ANGER_MAX → beacons; exitUnlocked → exit; chasing>0 → chase;
// chhayaNear → chhaya; anger ≥ 60 → anger; else stuck (general "fog what sees you")
export function hintCost(hintsUsed: number): number; // SHARD_HINT_BASE + HINT_COST_GROWTH * hintsUsed
export function loreUnlockedCount(bestSeeds: number): number; // 0→0, ≥1→2, ≥3→4, ≥6→6 of LORE.length
export const LORE: readonly string[]; // 6 short lore paragraphs (the Glazier, Aaina's origin, the Echoes, Chhaya, the Sentinels, the Ground Door)
```

Overlay (`src/ui/aaina.ts`): like the FAQ overlay (`createElement` only): three tabs — **Ask** (renders the existing `FAQ` array from `src/ui/faq.ts` — import and reuse), **Hint** (shows `nextHint` preview KIND only until purchased — e.g. "I can tell you about: _the beacons_ — cost ◆ 10" + Buy button; disabled when unaffordable; on buy: reveals text, spends shards, increments `hintsUsed`), **Lore** (LORE entries, locked ones show "🔒 Clears floors to hear more"). State machine: closed/open with tab — closed→open(tab: ask)→open(tab: hint)…→closed. [Q] or HUD button toggles; opening pauses nothing (unlike FAQ it is diegetic — the lantern talks while you walk; do NOT gate simulation).

- [ ] **Step 1: Failing tests** (`tests/unit/aaina.test.ts`): priority chain all six orderings (hand-built contexts); escalating cost (0→5, 1→10, 3→20); `spendShards` success/insufficient(null); lore unlock thresholds 0/1/3/6.
- [ ] **Step 2: RED → implement → GREEN. Step 3: wire main.ts** (context from live state: `beaconsLeft()`, `anger()`, chhayaNear = active sample within 6m, chasing = echo count mode==='chase', exitUnlocked; hint purchase → `meta = spendShards(...)` + saveMeta + HUD shards chip; `hintsUsed` per-floor, reset in `resetFloor`).
- [ ] **Step 4: Gates + e2e 11/11. Commit** — `feat(m3): aaina v1 — dialogue overlay + shard hint economy + lore unlocks`

---

### Task 3: ViewMode machine + QUAD view

**Files:**

- Create: `src/game/viewMode.ts`
- Modify: `src/main.ts` (V key cycle; scissor quad render), `tests/unit/` new `viewmode.test.ts`, `src/ui/hud.ts` (view chip)

**Interfaces:**

```ts
export type ViewMode = 'focus' | 'quad' | 'overhead' | 'tactical';
export function cycleView(v: ViewMode): ViewMode; // focus→quad→overhead→focus; tactical→focus
export function exitTactical(v: ViewMode): ViewMode; // tactical→focus; others unchanged
export function isTactical(v: ViewMode): boolean; // pauses simulation
export function showsOverhead(v: ViewMode): boolean; // overhead | tactical
```

QUAD rendering (main.ts): keep the existing full render for 'focus'; for 'quad' use `renderer.setScissorTest(true)` with four rects — front = top-left half, left = top-right, right = bottom-left, back = bottom-right (each pane `w/2 × h/2`); front pane renders every frame; the other three on alternate frames (`frameIndex % 3 !== paneIndex % 3` skip). Cameras: three additional `PerspectiveCamera` clones sharing aspect 1 (square panes), yaw offsets: left = heading − π/2, right = +π/2, back = π — camera mapping stays `rotation.y = -yaw`. Side cams see layer 0 (avatar only via mirrors, as designed). Pixel ratio capped at 1 for 'quad'. V keydown (no repeat) cycles; HUD chip shows the mode name.

- [ ] **Step 1: Tests** (viewmode transitions + tactical pause predicate). **Step 2: RED → implement → GREEN.**
- [ ] **Step 3: Wire quad + V key + chip; gates + e2e 11/11.**
- [ ] **Step 4: Commit** — `feat(m3): view mode machine + QUAD scissor viewports`

---

### Task 4: OVERHEAD map + TACTICAL pause

**Files:**

- Create: `src/ui/overhead.ts`
- Modify: `src/main.ts` (visited-cell tracking, ping feed, wiring), `src/engine/constants.ts` (`PING_TTL_MS = 4000`)

**Interfaces:**

```ts
// overhead.ts — 2D canvas, browser-only
export interface OverheadDrawInput {
  grid: FloorGrid;
  visited: ReadonlySet<number>;
  player: { x: number; y: number; heading: number };
  mirrors: Array<{ x: number; z: number; kind: string; captured: boolean }>;
  exit: { cx: number; cy: number; unlocked: boolean };
  entrance: { cx: number; cy: number };
  pings: Array<{ x: number; y: number; at: number }>;
  chhaya: { x: number; y: number } | null;
  waypoints: ReadonlyArray<{ x: number; y: number }>;
  now: number;
}
export function createOverhead(canvas: HTMLCanvasElement): {
  draw(input: OverheadDrawInput): void;
  clear(): void;
  cellAtEvent(e: MouseEvent, grid: FloorGrid): { x: number; y: number } | null; // for waypoints
};
```

Rules: cells not in `visited` are near-black (fog of war — `visited` = cells the player has occupied, tracked in the fixed-step loop, reset in `resetFloor`); walls drawn as `#2a3560` lines on visited cells; player = gold arrow rotated by heading; beacons teal (filled when captured), exit gold ring (dim red when locked), entrance dim teal; pings = fading red dots (`opacity = 1 − (now−at)/PING_TTL_MS`, dropped after) fed when an echo's sense check succeeds (reuse the T4 sense cadence — main already computes it; record ping at echo position) and for Chhaya (ping every 2s while her sample exists); waypoints = small ivory dots (click toggles nearest cell ±0.5 cell, max 8, Esc clears — TACTICAL only). Canvas is `#overhead` (new element, sized full-viewport, `display:none` unless `showsOverhead(viewMode)`); drawn each visible frame.

TACTICAL: `simActive` gains `&& !isTactical(viewMode)` (movement/enemies/Chhaya paused; verbs too — `canAct` already central, extend it). Entering: from OVERHEAD via `Space`... no — Space is step-through. Enter tactical with `T` while in overhead (hint chip says so); Esc exits to focus. Update STATE_MACHINES.md input-gate row (FAQ + tactical).

- [ ] **Step 1:** no new unit tests for canvas drawing (browser-only) — pure parts are viewMode (T3) and ping decay: add `pingOpacity(at: number, now: number): number | null` pure fn + test (in overhead.ts, exported).
- [ ] **Step 2: Implement + wire; gates + e2e 11/11.**
- [ ] **Step 3: Commit** — `feat(m3): overhead tactical map — fog of war, pings, waypoints, pause`

---

### Task 5: M3 polish wave (deferred M2 findings)

**Files:**

- Modify: `src/game/frost.ts` + `src/game/passages.ts` + `src/game/echo.ts` + `src/engine/input.ts` + `src/main.ts` + tests

Exactly four fixes:

1. **Frost LOS** (M2 final review Minor 1): `fogTarget(mirrors, player, grid)` gains `losClear(player → mirror center)` (signature change — update call sites + tests; kind/range/cone unchanged).
2. **In-cell echo pursuit** (Minor 3): in `updateEcho` chase mode, when the echo's cell === target cell, move toward the PLAYER's exact position (not cell center) while memory is alive — pass player pos through (already a param).
3. **E-key dual-use** (Minor): when the door hint is showing (`hint` text === push-hint), suppress that keydown's turn contribution — implement in main.ts by consuming the event: `if (doorHintActive && e.code === 'KeyE') { pushDoor(); return; }` before the input collector sees it... input is polled, not event-driven — instead: in the fixed step, when `doorHintActive`, zero out `inputFrame.turn`'s KeyE share by... simplest honest fix: `keysToMoveInput` can't know; do it in main: if doorHintActive, recompute turn without keyTurn for that step. Implement minimal: `if (doorHintActive) inputFrame = { ...inputFrame, turn: inputFrame.turn < 0 ? Math.max(0, inputFrame.turn + KEY_TURN_PER_STEP) : inputFrame.turn };` — no: turn is mouseDx + keyTurn combined. Cleaner: when doorHintActive and KeyE is held, subtract KEY_TURN_PER_STEP once per step from turn. Document in STATE_MACHINES input row.
4. **Prettier sweep** (chore): `npx prettier --write .` on the repo, single commit — no functional changes; verify gates + e2e after.

- [ ] **Step 1: Tests first for 1–3** (frost-through-wall now null; echo closes to player position — hand-built grid; E-suppression pure helper if extracted). **Step 2: Implement. Step 3: Gates + e2e 11/11. Step 4: Commits** — `fix(m3): frost LOS, in-cell pursuit, E-key door nudge` then `chore(m3): prettier sweep`

---

### Task 6: Audio + views + Aaina wiring, e2e, hook

**Files:**

- Modify: `src/main.ts` (audio intensity feed + gesture start + [M] mute + meta.muted persist; V/T keys; overhead wiring), `tests/e2e/smoke.spec.ts`, `src/ui/hud.ts` (🔊 button)

**Hook additions (additive, exact names):** `viewMode(): ViewMode`, `audioState(): { started: boolean; muted: boolean; intensity: number }`, `grantShards(n: number): void` (dev), `aaina(): { open: boolean; hintCost: number; lastHint: string | null }`, `visitedCount(): number`.

**New e2e (11 → 15):**

1. `m3: V cycles views and T pauses` — press V twice → viewMode quad → overhead; T → tactical + `getPlayer()` frozen while holding W (position unchanged 500ms); Esc → focus + movement resumes.
2. `m3: audio starts on gesture and mutes` — press any key → `audioState().started === true`; [M] → muted true; again → false. (No audio-output assertion — state only; console-clean.)
3. `m3: aaina hint economy` — `grantShards(20)` → open aaina ([Q]) → Hint tab → buy (cost 5) → `aaina().lastHint` non-null and shards 15; buy again (cost 10) → 5.
4. `m3: overhead fog of war + pings exist` — warp to a far cell → `visitedCount()` grows; `enemyPos` chase… keep simple: assert `visitedCount() > 1` after walking and overhead canvas visible in overhead mode.

- [ ] **Step 1: Hook + wiring. Step 2: Tests. Step 3: `npm run e2e` → 15/15 (fix only genuine regressions; report flakiness honestly). Step 4: Gates.**
- [ ] **Step 5: Commit** — `test(m3): e2e — views, audio gesture/mute, aaina economy, fog of war`

---

### Task 7: Close-out — docs, machines registry, acceptance

**Files:**

- Modify: `docs/STATE_MACHINES.md` (rows: ViewMode machine with pause predicate in the input gate; Aaina overlay closed/open(tab); AudioEngine idle→running(→muted as flag); look-alikes: intensity (derived), hintsUsed (per-floor counter), visited/pings (data), waypoints), `docs/superpowers/specs/2026-11-08-mirror-house-design.md` (§13.2 M3 → delivered), `README.md` (views, Aaina, audio, new keys), `src/ui/faq.ts` (2 new entries: view modes; Aaina/hints)

- [ ] **Step 1:** registry + spec + README + FAQ; verify STATE_MACHINES rows against shipped source (no aspirational rows — the step005 lesson).
- [ ] **Step 2:** acceptance checklist: gates + 15/15 e2e; bundle < 3 MB gz; manual/deferred notes (audio mix feel, quad perf on real GPU).
- [ ] **Step 3: Commit** — `docs(m3): machines registry, spec delivery marks, how to play`

## Plan Self-Review

- Coverage vs M3 (§13.2 "views + HUD + Aaina v1 + audio, acceptance: views ≤ budget; hint economy works"): views T3/T4, HUD chips/buttons across tasks, Aaina+economy T2 (economy machine-proven in T6 e2e), audio T1 wired T6 (gesture-start = acceptance), budgets honored (scissor quad alternate frames, 2D overhead). Polish backlog: all four M2-deferred items in T5. ✓
- Placeholders: none — engine internals specified node-for-node; overlay/tab behavior fully specified.
- Type consistency: `ViewMode` defined once (T3) consumed T4/T6; `spendShards` in T2 consumed by main; hook names T6 match wiring; `canAct` extension in T4 builds on T1–T3 shapes. ✓
- Machine policy: 3 new machines registered (T7); derived values documented as look-alikes. ✓
