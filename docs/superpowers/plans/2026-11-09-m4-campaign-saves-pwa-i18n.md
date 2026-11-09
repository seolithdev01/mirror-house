# M4: Tier-1 Campaign, Save Chain, PWA, i18n — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn single floors into the Tier-1 campaign: floors 1–9 with a difficulty ramp, floor 10 = handcrafted Dwaar I (Chhaya's threshold hall, tier-complete + Truth-Shard #1), a Taal cameo on floor 5, the IndexedDB save chain with export/import, installable offline PWA, and English/Hindi UI chrome.

**Architecture:** Pure campaign model (`campaign.ts`: base seed + floor index → per-floor params/seeds; floor 10 fixed layout). Boot becomes save-driven: async load (IDB, migrating localStorage meta v1 once) → resume campaign unless URL overrides. Exit-after-clear becomes descend-to-next-floor (replacing the victory freeze). Taal is a beat-pulsing cameo entity (wall-clock phase; works muted). `save.ts` = ~40-line hand-rolled IDB wrapper (no new deps) + pure validate/migrate logic. `sw.js` hand-rolled runtime-cache service worker, PROD-only. `i18n.ts` string tables for UI chrome only (FAQ/Aaina copy stays English — content pipeline, flagged).

**Tech Stack:** unchanged; zero new dependencies.

**Spec:** §2.3 (Dwaar/Truth-Shards), §4.4 (Taal), §4.6 (tier ladder), §7.6 (saves), §7.7 (PWA), §8 (i18n), §13.2 M4.

## Global Constraints

- No-break: 174 unit + 15 e2e stay green (existing e2e extended only where a task says so); debug hook additive-only (existing names/semantics preserved — note `seed` becomes the base+floor composite string; keep `seed()` returning the CURRENT floor's full seed, add `campaign(): { base, floor, tierComplete }`); gameplay feel outside listed changes untouched.
- Machines explicit per policy: Campaign is data (base+floor) with transitions `descend/complete` — model as a small pure machine in `campaign.ts` and register in STATE_MACHINES.md; save-load is a versioned document (policy row), not a machine.
- TS strict + noUncheckedIndexedAccess; zero `any`; SPDX; no Math.random; conventional commits `feat(m4)/test(m4)/docs(m4)/chore(m4)`.
- New constants: `TIER_ONE_FLOORS = 10`, `DWaar_FLOOR = 10`, `TAAL_FLOOR = 5`, `BEAT_TICK_MS = 250`, `SAVE_DB = 'mirror-house'`, `SAVE_KEY = 'main'`, `SAVE_VERSION = 2`, `SW_CACHE = 'mh-v4'` (bump on release).
- Saves: IndexedDB only after migration; export/import validates strictly (reject, never execute); the daily/streak/best logic moves into save v2 (meta.ts functions stay pure and are reused on SaveData fields).
- PWA registration PROD-only (`import.meta.env.PROD`); SW must never intercept the dev server.
- i18n: `?lang=hi` > saved lang > `navigator.language` prefix; key-parity enforced by test.

---

### Task 1: Campaign model (pure)

**Files:**
- Create: `src/game/campaign.ts`
- Modify: `src/engine/constants.ts` (TIER_ONE_FLOORS, DWAAR_FLOOR, TAAL_FLOOR, BEAT_TICK_MS)
- Test: `tests/unit/campaign.test.ts`

**Interfaces:**

```ts
export interface Campaign { seedBase: string; floor: number; tierComplete: boolean }
export function newCampaign(seedBase: string): Campaign;                       // floor 1
export function floorSeed(c: Campaign): string;                                 // `${seedBase}:${floor}`
export function descend(c: Campaign): Campaign;                                  // floor+1 (tierComplete only via complete)
export function completeTier(c: Campaign): Campaign;                             // tierComplete=true (only at DWAAR_FLOOR)
export function isDwaar(floor: number): boolean;                                 // floor === DWAAR_FLOOR
export function floorParams(floor: number): { echoes: number; beacons: number; braid: number; chhayaDelayMs: number };
// ramp: echoes = min(5, 2 + floor - 1) for floors 1..9 (Dwaar fixed 4); beacons = 2,2,3,3,3,4,4,4,4,4;
// braid = 0.12 + 0.01*(floor-1); chhayaDelayMs = max(4500, 7000 - 300*(floor-1)) (Dwaar 4000)
export function bestKey(c: Campaign): string;                                    // floorSeed(c)
export const DWAAR_LAYOUT: readonly string[];                                    // 13 rows × 13 chars, '#'=wall cell, '.'=open — symmetric hall (see below)
export function dwaarGrid(): { width: number; height: number; open: ReadonlyArray<{ x: number; y: number }> };
```

DWAAR_LAYOUT (hand-authored symmetric threshold hall — outer ring corridor, central sanctum with four approaches, inner mirrored shrine):
```
#############
#...........#
#.##.#.#.##.#
#.#.......#.#
#.#.##.##.#.#
#....#.#....#
#.##.#.#.##.#
#....#.#....#
#.#.##.##.#.#
#.#.......#.#
#.##.#.#.##.#
#...........#
#############
```
(`dwaarGrid` derives open cells; a FloorGrid built from it opens edges between adjacent open cells only.)

- [x] **Step 1: Failing tests** — ramp values pinned for all 10 floors; floorSeed/descend/completeTier/bestKey; isDwaar; DWAAR_LAYOUT: 13×13, symmetric under 180° rotation, all open cells connected (BFS), entrance/exit pickable (top-left-ish open cell far from bottom-right-ish via the existing `farthestCell` logic in maze.ts — export reuse or re-BFS here).
- [x] **Step 2: RED → implement → GREEN. Step 3: Gates. Step 4: Commit** — `feat(m4): campaign model — floor ramp, dwaar hall layout, tier completion`

---

### Task 2: Floor progression + Dwaar I

**Files:**
- Modify: `src/game/maze.ts` (accept a prebuilt-grid path: `floorFromGrid(grid, entrance, exit)` reusing bfs farthest), `src/main.ts` (campaign boot, descend flow, per-floor params applied to M2_PARAMS overrides + chhaya delay constant override, floor chip `L02 · DWAAR I`, tier-complete screen + Truth-Shard #1 toast, saved-campaign resume), `src/ui/hud.ts` (floor chip, descend overlay, tier-complete overlay), `index.html` (CSS for new overlays)
- Test: `tests/unit/campaign.test.ts` (already), extend as needed

**Flow changes (the sanctioned behavior deltas):**
1. Boot: campaign = URL `?seed=` (base, floor 1; `&floor=N` DEV jump) || saved progress || `newCampaign(randomSeed())`.
2. Floor build: floors 1–9 via `generateFloor({...TIER_ONE, seed: floorSeed(c), braid: floorParams.braid, ...M2 object-count overrides})`; floor 10 = grid from `dwaarGrid()` + entrance (first open cell row-major) + exit = farthest; objects placed by existing `generateFloorObjects` (Dwaar params: 4 beacons, 4 echoes, anchors from open cells).
3. Clear no longer freezes: the exit becomes the Stair Door — walking in shows `descending…` overlay (0.8s), then `descend(c)`, rebuild floor, reset per-floor state (runtime/echoes/chhaya/house/visited/pings/hintsUsed/best-context), timer re-arms. On Dwaar clear: `completeTier` → tier-complete screen (`✦ Truth-Shard I claimed — Tier I complete` for beta) with a final stats line (time total optional — keep: floors cleared, shards banked) and a `Play again` button (new random base) + `Stay` (free walk).
4. Chhaya delay per floor from `floorParams` (override the CHHAYA_DELAY_MS default at call site — `sampleDelayed(path, now, delayMs)` already takes delay param; Dwaar 4000).
5. HUD floor chip `L02 · DWAAR I` (tier label; Dwaar floor shows `DWAAR I ✦`); `campaign()` hook added (DEV).

- [x] **Step 1: Implement maze floorFromGrid + main/hud wiring (tests: campaign unit already pins model; add `floorFromGrid` test — connectivity + entrance/exit determinism).**
- [x] **Step 2: Gates + e2e 15/15 (existing tests run floor 1 by default — URL seed now means base; verify no existing e2e depended on `seed()` returning bare base... the win-flow test asserts `bestFor(seed)` — hook `seed()` returns current floor seed which equals `${base}:1`; the test's `bestFor(h.seed)` pattern still works).**
- [x] **Step 3: Commit** — `feat(m4): descend the house — floor progression, dwaar I, truth-shard`

---

### Task 3: Taal cameo (floor 5)

**Files:**
- Create: `src/game/taal.ts`
- Modify: `src/main.ts`, `src/game/avatar.ts` (`createTaal()` — avatar silhouette, obsidian coat 0x1a1a22, gold lantern glass, layer 0), constants (TAAL_FLOOR, BEAT_TICK_MS)
- Test: `tests/unit/taal.test.ts`

**Interfaces:**

```ts
export const TAAL_BASE_SPEED = 1.6;
export interface TaalState { x: number; y: number; anchorIdx: number; active: boolean }
export function initTaal(anchors: ReadonlyArray<{ x: number; y: number }>): TaalState | null; // null when no anchors
export function beatPulse(nowMs: number): number; // 8-tick cycle via BEAT_TICK_MS: tick = floor(nowMs / BEAT_TICK_MS) % 8; pulse = tick % 2 === 0 ? 2.2 : 0.3 (lurch on even ticks — matches theory.beatAccents low ticks 0/4 by parity)
export function updateTaal(t: TaalState, anchors: ReadonlyArray<{ x: number; y: number }>, grid: FloorGrid, nowMs: number, dtS: number): TaalState;
// walks anchor-loop like patrol echoes, speed = TAAL_BASE_SPEED * beatPulse(nowMs); wall-following = same cell-center pathing as echo patrol (reuse flowField or simple BFS next-step — reuse buildFlowField toward anchor like echo.ts does; do NOT copy — import)
```

Rules: spawns only on `campaign.floor === TAAL_FLOOR`; contact (< CONTACT_RADIUS) → `applyCrack`-style anger **+20** (no death, no shard); cooldown 1.5s per contact; visible gold lantern pulse synced to `beatPulse`. He is a teaser, not a killer — FAQ copy says so later.

- [x] **Step 1: Failing tests** — beatPulse cycle pinned at several timestamps incl. wrap; updateTaal advances toward anchor with pulsing speed (seeded dt steps, assert position monotone toward anchor on even ticks, near-frozen on odd); contact cooldown logic (pure fn `taalTouch(cooldownUntil, now)` gate).
- [x] **Step 2: RED → implement → GREEN; wire (spawn on floor 5, anger contact, lantern emissive pulse).**
- [x] **Step 3: Gates + e2e 15/15. Step 4: Commit** — `feat(m4): taal cameo — the beat-walker tests floor 5`

---

### Task 4: Save chain — IDB v2, migration, export/import

**Files:**
- Create: `src/game/save.ts`
- Modify: `src/main.ts` (async boot: load save → migrate → apply look/mode/muted/lang/shards/streak/best/progress; write-through triggers: floor clear/descend/tier-complete/settings change/purchase), `src/ui/hud.ts` (💾 export / 📂 import buttons), `index.html` (CSS)
- Test: `tests/unit/save.test.ts` (pure parts with injected storage stubs)

**Interfaces:**

```ts
export interface SaveData { v: 2; lookName: string; mode: InputMode; muted: boolean; lang: 'en' | 'hi';
  shards: number; best: Record<string, number>; streak: { count: number; lastDay: string };
  progress: { seedBase: string; floor: number; tierComplete: boolean } }
export function defaultSave(): SaveData;
export function validateSave(raw: unknown): SaveData | null;   // strict: v===2, field types, records of number, bounded strings; null otherwise
export function migrateMeta(rawMeta: unknown): SaveData;        // meta v1 JSON → SaveData (progress fresh, muted false, lang 'en'); invalid → defaultSave()
export function mergeCampaign(s: SaveData, c: Campaign): SaveData; // progress update
// IDB wrapper (browser-only; node stub via typeof indexedDB guard returning rejected-ish inert { get: async () => null, put: async () => {} } )
export function idbGet(): Promise<SaveData | null>;
export function idbPut(s: SaveData): Promise<void>;
export function serializeSave(s: SaveData): string;             // JSON with trailing newline
```

Export: 💾 button → File System Access API `showSaveFilePicker` when available, else `<a download="mirror-house-save.json">`; Import: 📂 → `showOpenFilePicker`/`<input type=file>` → text → `validateSave` → `idbPut` → `location.reload()`. Import failure → HUD hint `Save file rejected`. Boot order: URL params override save; migration runs when IDB null && localStorage `mirrorhouse.meta.v1` present (then LEAVE localStorage untouched — belt and braces).

- [x] **Step 1: Failing tests** — validateSave accepts good/hates malformed (wrong v, negative shards, proto junk `{"__proto__":...}` as plain obj — JSON.parse never yields proto, assert type checks); migrateMeta maps every field; mergeCampaign immutability; serializeSave round-trips through validateSave.
- [x] **Step 2: RED → implement → GREEN; wire boot + buttons + write-throughs.**
- [x] **Step 3: Gates + e2e 15/15 (boot is now async — hook registration must happen after save load; keep `waitForFunction` working). Step 4: Commit** — `feat(m4): save chain — IDB v2, v1 migration, export/import`

---

### Task 5: PWA — manifest, icons, service worker

**Files:**
- Create: `public/manifest.webmanifest`, `public/icon.svg` (lantern glyph: gold lantern on indigo, simple paths), `public/sw.js`
- Modify: `index.html` (manifest + theme-color + favicon links + apple-touch), `src/main.ts` (PROD-only `navigator.serviceWorker.register('/sw.js')` after first frame)

sw.js (hand-rolled, ~50 lines): `CACHE = 'mh-v4'`; install → precache `['/', '/index.html', '/manifest.webmanifest', '/icon.svg']` + `skipWaiting`; activate → delete caches ≠ CACHE + `clients.claim`; fetch → same-origin GET only: `/assets/` → cache-first; navigations → network-first, fallback cache '/' ; else pass through. No eval, no remote.

- [x] **Step 1: Manifest (name, short_name, start_url '/', display standalone, background/theme #0b1026, icons: icon.svg any+maskable 512x512 purpose) + icon.svg + sw.js.**
- [x] **Step 2: Wire registration (PROD only). Step 3: New e2e** — `m4: offline reload serves from SW`: build+preview server (Playwright webServer currently runs dev — add a second config or run `npm run preview` on port 4173 in the test via `process` — simplest: this test spawns nothing new; use `page.context().setOffline(true)` after load on the DEV server… SW doesn't register in dev. Pragmatic: e2e asserts `manifest.webmanifest` linked + SW registration guarded (eval `navigator.serviceWorker` present, registration null in dev); the REAL offline test is a manual acceptance step. Record honestly.) Gates + e2e.
- [x] **Step 4: Commit** — `feat(m4): pwa — manifest, icon, runtime-cache service worker`

---

### Task 6: i18n — en/hi UI chrome

**Files:**
- Create: `src/ui/i18n.ts`
- Modify: `src/ui/hud.ts`, `src/ui/aaina.ts` (tab labels only), `src/main.ts` (lang resolution + apply; hint/fail/clear/descend/tier strings via t())
- Test: `tests/unit/i18n.test.ts`

**Interfaces:**

```ts
export type Lang = 'en' | 'hi';
export const STRINGS: Record<Lang, Record<string, string>>; // ~34 keys: modes(focus/quad/overhead/tactical), buttons(frost/faq/daily/aaina/mute/export/import), chips(streak/best/timer/shards/beacons/floor), overlays(fail-caught/fail-collapse/cleared/descending/tier-complete/truth-shard), hints(step-through/push/exit-locked), misc(close/play-again/stay)
export function resolveLang(saved: Lang | undefined, url: string | null, nav: string | undefined): Lang; // url ?lang= > saved > nav startsWith 'hi' > 'en'
export function t(lang: Lang, key: string): string; // en fallback for missing hi keys (test enforces parity — no fallback needed in practice)
```

Hindi: proper Devanagari (e.g., streak `लय`, best `सर्वश्रेष्ठ`, timer `समय`, shards `शीशे के टुकड़े`→ too long, use `कौर`? Keep short: shards `◆`, label `बचे शार्ड`… author carefully, chip labels stay compact). Apply everywhere listed; language switch: `?lang=hi` demo + saved on change via a small 🌐 button cycling en/hi.

- [x] **Step 1: Failing tests** — key parity (every en key exists in hi, same count), resolveLang priority cases, t() lookup + en-fallback path.
- [x] **Step 2: RED → implement tables + apply. Step 3: Gates + e2e 15/15 (+ quick manual note on hi render). Step 4: Commit** — `feat(m4): i18n — hindi + english ui chrome`

---

### Task 7: M3 backlog fold-in + progression e2e

**Files:**
- Modify: `src/main.ts` + `src/ui/hud.ts` (shards chip `banked (+pending)` unified display — compute `meta/save.shards` + pending house.shards, show `◆ 15 (+10)`; single writer fn), `src/main.ts` (entering overhead/tactical calls `document.exitPointerLock()`), `tests/e2e/smoke.spec.ts`

**New e2e (15 → 18):**
1. `m4: descend to floor 2` — clear floor 1 (warp+frost beacons, warp exit) → wait for descend overlay → `campaign().floor === 2`, floor chip shows L02, new maze loaded (player at a fresh spawn).
2. `m4: save round-trip persists progress` — after descending, `page.reload()` → hook `campaign().floor === 2` (resumed from IDB, no URL seed).
3. `m4: hindi chrome via ?lang=hi` — goto `/?lang=hi&seed=...` → HUD mode button text contains Devanagari (`दोनों` or per table), chips rendered; then `?lang=en` default unaffected.

- [x] **Step 1: Chip + pointer-lock fixes. Step 2: Tests. Step 3: e2e 18/18 + gates. Step 4: Commit** — `fix(m4): unified shards chip, pointer-lock exit on map, progression e2e`

---

### Task 8: Close-out — registry, spec, docs

**Files:**
- Modify: `docs/STATE_MACHINES.md` (Campaign machine row §11: states data+flags, descend/completeTier transitions, owner campaign.ts; save = versioned document policy note), spec §13.2 M4 → delivered, `README.md` (campaign, save/export, offline install, नमस्ते note), `src/ui/faq.ts` (+3: floors & descending; where data lives/export; offline/install + languages), plan ticks

- [x] **Step 1:** docs from shipped source; **Step 2:** gates + 18/18 + bundle check (<3MB gz); **Step 3: Commit** — `docs(m4): machines registry, spec delivery, how to descend`

## Plan Self-Review

- Coverage vs M4 (§13.2 "Tier 1 content (10 floors + Dwaar I), saves, PWA, i18n; playtest gate"): floors+Dwaar T1–T2, Taal cameo (§13.1 beta scope) T3, saves+export T4, PWA T5, i18n T6, backlog+e2e T7, docs T8. The "5 strangers playtest" human gate recorded as manual/deferred in T8 acceptance. ✓
- Placeholders: none — Dwaar layout authored, ramp values pinned, save shape complete, SW behavior specified, i18n key list enumerated. ✓
- Type consistency: `Campaign` consumed T2/T4/T7; `SaveData` T4→T6 (lang) →T7; hook `campaign()` named once; `floorParams` used by T2/T3 wiring. ✓
- Machine policy: Campaign registered; save documented as versioned document (like meta v1 row). ✓
