# T4: Carnival of Faces — Floors 31–40, Aavart, Distorting Mirrors — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Tier 4 per spec §4.6: floors 31–40 — **Aavart the Ambusher** (projects your destination from direction AND speed — sprint and he ambushes far ahead; creep and he has almost no lead; lethal), **distorting mirrors** (carnival glass that displaces your APPARENT position in enemy mirror-sight — enemies chase where you appear to be; the deception is visible as displaced pings on the tactical map), the carnival palette (rose/magenta on night), the mischievous fourth scale, Dwaar IV at floor 40 — and the **close of Act I** (§2.3: floors 1–40, "the house keeps people by copying them") with a proper act-completion screen teasing Act II.

**Architecture:** The proven tier pattern: `campaign.ts` to 40 (`DWAAR_IV_LAYOUT` funhouse hall — alcoves + a central carousel ring); `avart.ts` — third sentinel (pure `ambushCell` velocity-projection intercept; glide; lethal; spawns ≥31; Taal+Gher accumulate); distorting mirrors — new MirrorRef kind `'distort'` (2–3/floor tier-4-only, rng-gated LAST keeping all prior streams pinned): fogable like standing, BUT while UNfogged, `sensesPlayer` reads the player's position displaced by the mirror's fixed delta (per-id deterministic offset, ±2 cells axis-aligned); pings render at the displaced spot; visual = bent-plane warped glass. Palette/scale/voice tier-4 map; act-complete screen at Dwaar IV.

**Tech Stack:** unchanged; zero new dependencies.

**Spec:** §2.3 (Act I close), §4.4 (Aavart: speed+direction prediction, corner-cut; counter = change pace / True Mirrors / Chhaya bait), §4.6 row 4, §6.1 (playful groove).

## Global Constraints

- **Binding (the pattern):** save validator widens to `TIER_FOUR_FLOORS = 40` in the SAME commit as the ramp (pinning test: 41 = first rejection; round-trips floors 35 + 40).
- No-break: 487 unit + 34 e2e stay green (extended where specified); floors 1–30 behavior unchanged except ratified notes; hook additive-only.
- Tier-4 ramp (floors 31–40): echoes **5** all incl. Dwaar IV (three lethal Sentinels are the stars — echoes step DOWN from tier 3's 6, documented as a deliberate playability call); beacons 4; braid `0.28 + 0.004·(f−31)`; chhayaDelay `max(3200, 3800 − 60·(f−31))` (Dwaar IV 3000); portraits tier-2-only, water tier-3-only (streams pinned); distort 2–3/floor tier-4-only.
- New constants: `TIER_FOUR_FLOORS = 40`, `AVART_SENTINEL_FLOOR = 31`, `AVART_INTERCEPT_MS = 1200`, `AVART_LEAD_S = 1.8` (projection seconds at sprint), `DISTORT_MAX_CELLS = 2`.
- Campaign terminal at 40: descend() at floor 40 is a no-op returning the same object (pinned) — the act screen is the end until Act II exists.
- TS strict; zero `any`; SPDX; no Math.random; conventional commits `feat(t4)/test(t4)/docs(t4)`. PORT RULE: previews 4199.

---

### Task 1: Campaign to 40 — ramp, Dwaar IV, validator, Act I close

**Files:** `src/game/campaign.ts` (TIER_FOUR_FLOORS, tierOf 1|2|3|4, isDwaar +30→40 set, ramp per constraints, `DWAAR_IV_LAYOUT` 13×13 funhouse — offset alcoves + central ring, 180°-symmetric + connected + entrance/exit predicates, ~100+ open), `src/game/save.ts` (→ TIER_FOUR_FLOORS same commit + tests 35/40 round-trip, 41 rejected), constants, main/hud (chips `L34 · T4`, `DWAAR IV ✦`; interstitial `✦ Truth-Shard IV`; **act screen at Dwaar IV clear**: `ACT I COMPLETE — The Trap` with campaign stats line (floors cleared 40, shards banked) + `Act II: The Deception — the house will start copying you…` + Play again/Stay — reuse tier-complete overlay with act styling), tests.

- [ ] Tests → RED → implement → GREEN; gates + 34/34. Commit `feat(t4): campaign to floor 40 — act i closes, validator widened`.

### Task 2: Aavart the Ambusher

**Files:** Create `src/game/avart.ts`; Modify `src/game/avatar.ts` (`createAavart()` — silhouette, magenta coat 0x5c2a4a, candle-flame glass 0xffb347, layer 0), `src/main.ts` (spawn ≥31, teardown, contact → caught, objectives feed), aaina hint (`avartNear`: "He leaps where you are GOING — the faster you run, the further he reaches. Change your pace." beside the other sentinel hints), tests.

**Aavart core (pure):**

```ts
export interface AvartState { x: number; y: number; heading: number; ambushAt: CellIndex | null; nextTickAt: number }
export function ambushCell(player: { x: number; y: number; heading: number; speed: number }, grid: FloorGrid, objectives: ReadonlyArray<CellIndex>): CellIndex | null;
// project: lead = AVART_LEAD_S * (speed / SPRINT_SPEED) seconds of travel along heading → world point P;
// BFS path player-cell → nearest objective; pick the path cell nearest to P's cell (the corner-cut);
// if P's cell is off-path or beyond the path end → the path's LAST cell (he waits at the objective);
// speed ≈ 0 (creep) → lead ≈ 0 → picks the player's own next path cell (minimal lead)
export function updateAvart(a: AvartState, ambush: CellIndex | null, grid, now: number, dtS: number): AvartState;
// glide at AVART_SPEED = 2.4 m/s (fastest sentinel — he RUNS), retarget on AVART_INTERCEPT_MS tick
```

- [ ] Tests (ambushCell: sprint projects far ahead onto path; walk mid; creep ≈ next cell; off-path heading → objective-end cell; updateAvart cadence) → RED → implement + wire + hint → GREEN; gates + 34/34. Commit `feat(t4): aavart the ambusher — reads your speed`.

### Task 3: Distorting mirrors — the house lies about you

**Files:** Modify `src/game/floorObjects.ts` (kind `'distort'` 2–3/floor tier-4-only, `distortDx/distortDy` per-id deterministic ±DISTORT_MAX_CELLS axis-aligned; rng draws LAST-LAST, streams pinned), `src/game/echo.ts` (sensesPlayer: compute apparent player position — if any UNFOGGED distort mirror has both-LOS (echo↔mirror, mirror↔player), apply THAT mirror's delta to the player position used for the range check + return the apparent position alongside; chases then target the apparent cell), `src/main.ts` (echo chase targets apparent cell; PINGS render at the apparent position — the deception visible on the map; capture/frost work on distort like standing — fogging one restores truth for its area; visual: bent plane via slight vertex offset on the fake-reflective material + rose tint), overhead (distort mirrors marked, warped glyph), captions + FAQ, tests (placement; determinism; displacement vector bounds; sensesPlayer displaced-range case; fog restores truth; ping-at-apparent).

- [ ] Tests → RED → implement → GREEN; gates + 34/34. Commit `feat(t4): distorting mirrors — enemies chase where you appear`.

### Task 4: Palette + groove + e2e

**Files:** `src/game/palette.ts` (TIER_FOUR_PALETTE: void 0x140812, floorBase 0x2e1a26, floorLines 0x402233, teal→magenta 0xc2548a, ivory 0xf2e4ee, gold 0xd9a441, rose→candle 0xffb347, wallTop 0x8a6a7a, wallBottom 0x46303c, lantern 0xffd4c0, entrance 0xc2548a, exit 0xffb347), `src/audio/theory.ts` (TIER_FOUR_SCALE [0,2,3,7,9] — the mischievous one), engine voice map (tier 4 = 'triangle' + slightly faster note-rate via existing intensity path — no engine change needed if voice map covers it; if setVoice map in main: {1:triangle,2:triangle,3:sine,4:triangle}), hook (`avartPos()`, `mirrors().distort`, tier→4), e2e 34→36: (a) `t4: floor 31 loads the carnival` — tier 4, chip, avartPos non-null, mirrors().distort ≥ 2, ALL THREE sentinel positions non-null (accumulation pinned); (b) `t4: aavart catches + distortion displaces` — warp onto avartPos → failed; then the distortion leg: seed with known distort mirror, warp player to a spot seen through it, assert an echo ping/chase target computed at the displaced position (expose `apparentPlayer()` in the tester hook — additive — and assert it ≠ player while in view, = player after fogging that mirror).

- [ ] Tests (palette/scale) → implement → e2e 36/36 → gates; live :4199 check (carnival look; sprint → Aavart leaps far ahead, creep → he shadows you; distorted pings on the map). Commit `feat(t4): carnival palette, mischievous groove, tier-four e2e`.

### Task 5: Close-out

Spec §4.6 row 4 delivered + §2.3 Act I closed note; §4.4 ladder note (Taal ≥11, Gher ≥21, Aavart ≥31 — all four walk by tier 4); STATE_MACHINES (Campaign@40, act screen, distort = MirrorVisual-adjacent content note); README (Tier 4 + Act I complete), CHANGELOG `[t4]`, FAQ +2 (the Carnival; Aavart's pace trick), plan ticks; full gates + 36/36; bundle check.

- [ ] Docs → gates → commit `docs(t4): act i closes — delivery marks, how to run the carnival`.

## Plan Self-Review

Coverage vs §4.6 row 4: setting (carnival palette) ✓, mechanic (distorting mirrors displace apparent position — enemy-facing deception per spec) ✓, Sentinel (Aavart speed+direction) ✓, mood (mischievous scale) ✓, Act I close (§2.3) ✓. The validator-binding honored in T1. Ladder accumulation pinned by e2e (three sentinels on 31). Types: AvartState pinned T2→wired; distort delta lives on MirrorRef (T3 touches placement + senses); hook additive. Counter-play verified from constants: creep lead ≈ 0.035·1.8·6 ≈ 0.4 cells; sprint ≈ 1.8 cells ahead. No placeholders.
