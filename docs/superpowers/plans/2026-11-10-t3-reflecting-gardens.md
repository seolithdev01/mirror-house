# T3: Reflecting Gardens — Floors 21–30, Gher, Water-Mirrors — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Tier 3 per spec §4.6: floors 21–30 — **Gher the Encircler** (predicts your heading and moves to seal the corridor ahead; lethal; feint to beat him), **water-mirrors** (standing-water tiles that are Echo eyes you CANNOT fog — cross or approach to ripple them blind for a while), the Gardens palette (green/water-teal/ivory), the pastoral third scale with a flute-lead melody voice, Dwaar III at floor 30, Truth-Shard III.

**Architecture:** The T2 pattern extended: `campaign.ts` to 30 (+`DWAAR_III_LAYOUT` garden hall); `gher.ts` — a new sentinel entity (flow-field to an intercept cell recomputed on a tick; pure movement fn; reuses taal's spawn/teardown plumbing); water: a new floor-object class `water: Array<{x,y}>` (cells; NOT mirrors — a parallel eye-source consumed by `sensesPlayer` and the overhead map; ripple state per cell with TTL; ripples auto-trigger on player adjacency); palette tier 3 + `TIER_THREE_SCALE [0,2,5,7,9]` + melody voice switches to sine (flute) for tier 3 via `engine.setVoice`.

**Tech Stack:** unchanged; zero new dependencies.

**Spec:** §4.4 (Gher: intercept/seal, counter = feint + fog door-side glass), §4.6 row 3, §6.1 (pastoral flute).

## Global Constraints

- **THE T2 LESSON (binding):** wherever the campaign range extends, the save validator widens IN THE SAME COMMIT — `validateProgress` bounds to `TIER_THREE_FLOORS`, the pinning test updates (31 = first rejection), and the serialize→validate round-trip regression extends (floor 25 + 30). Grep validators for stale bounds before declaring done.
- No-break: 416 unit + 32 e2e stay green (extended where specified); tier-1/2 experience unchanged (tier ramp rows 1–20 pinned already); hook additive-only.
- Tier-3 ramp (floors 21–30): echoes 6 all (Dwaar III 6); beacons 4; braid `0.24 + 0.004·(f−21)`; chhayaDelay `max(3600, 4200 − 60·(f−21))` (Dwaar III 3400); portraits 0 (Gardens have water, not ancestors — portrait placement gated `tier === 2`).
- New constants: `TIER_THREE_FLOORS = 30`, `GHER_SENTINEL_FLOOR = 21`, `GHER_INTERCEPT_MS = 1000`, `WATER_RIPPLE_MS = 10000`, `WATER_RIPPLE_RADIUS = 1.4` (world m), water counts (2–4 pools/floor via rng).
- TS strict; zero `any`; SPDX; no Math.random; conventional commits `feat(t3)/test(t3)/docs(t3)`.
- PORT RULE: previews on 4199; never kill processes on 4173/5173 uninvited.

---

### Task 1: Campaign to 30 — ramp, Dwaar III, validator widened

**Files:** `src/game/campaign.ts` (TIER_THREE_FLOORS, tierOf→1|2|3, isDwaar 10/20/30, ramp 21–30, `DWAAR_III_LAYOUT` — 13×13 garden hall: OPEN hedge rows, long sightlines, symmetric+connected), `src/game/save.ts` (validateProgress → TIER_THREE_FLOORS), constants, main.ts/hud chips (`L24 · T3`, `DWAAR III ✦`, `✦ Truth-Shard III claimed — Tier III complete`), tests (ramp 21–30 pinned; layout predicates; tierOf; **validator: 25/30 valid, 31 rejected; round-trip floor 25 + 30**).

- [x] Tests → RED → implement → GREEN; gates + 32/32. Commit `feat(t3): campaign to floor 30 — tier ramp, dwaar iii, validator widened`.

### Task 2: Gher the Encircler

**Files:** Create `src/game/gher.ts`; Modify `src/game/avatar.ts` (`createGher()` — silhouette, moss-green coat 0x2f4a3a, still-water glass 0x7fd4c4, layer 0), `src/main.ts` (spawn floors 21–30, teardown via floorDisposers, contact → caught), aaina hint (`gherNear`: "He does not chase — he closes the road ahead. Feint, then go the other way." slotted beside taalSentinel), tests.

**Gher movement (pure core):**

```ts
export interface GherState { x: number; y: number; heading: number; interceptAt: CellIndex | null; nextTickAt: number }
export function interceptCell(player: {x,y,heading}, grid, objectives: ReadonlyArray<CellIndex>): CellIndex | null;
// the cell ~3 ahead along the player's heading if it lies on/near a BFS path (player cell → nearest objective);
// else the player's next path cell. Null when player heading off-path (the feint window!).
export function updateGher(g: GherState, intercept: CellIndex | null, grid, now: number, dtS: number): GherState;
// flow-field walk toward intercept at GHER_SPEED = 1.9 m/s; retarget on tick (GHER_INTERCEPT_MS); no sensing — pure prediction
```

- [x] Tests (intercept math: on-path ahead-cell, off-path → null; updateGher walk + retarget cadence) → RED → implement + wire + hint → GREEN; gates + 32/32. Commit `feat(t3): gher the encircler — predicts and seals`.

### Task 3: Water-mirrors — ripple, don't fog

**Files:** Modify `src/game/floorObjects.ts` (`water: Array<{x:number;y:number}>` cells, 2–4/floor tier 3 only, rng-gated `params.water > 0` so tiers 1–2 streams untouched), `src/game/echo.ts` (sensesPlayer: unfogged water cells within SENSE_RANGE with both LOS count as eyes — same shape as mirror eyes; ripple state consulted), `src/game/water.ts` (NEW pure: `rippleState(at: number, now: number): boolean` TTL logic; `rippleTrigger(playerX, playerY, pools): number[]` — indices of pools within WATER_RIPPLE_RADIUS), `src/main.ts` (pools render: flat translucent water-teal plane patches at pool cells + gentle opacity shimmer (static under reduced-flash); ripple → dim + caption; overhead map: pool dots), captions + FAQ copy, tests (TTL boundaries; trigger radius; sensesPlayer with water eye + rippled-blind case; placement counts).

- [x] Tests → RED → implement → GREEN; gates + 32/32. Commit `feat(t3): water-mirrors — eyes you ripple, not fog`.

### Task 4: Palette + pastoral flute + e2e

**Files:** `src/game/palette.ts` (TIER_THREE_PALETTE: void 0x081410, floorBase 0x1e3226, floorLines 0x2a4432, teal→water-teal 0x3fae9a, ivory 0xeff2e4, gold 0xc9b458, rose→leaf 0x6fae6f, wallTop 0x7f937f, wallBottom 0x3e4a3e, lantern 0xfff2cf, entrance 0x3fae9a, exit 0x6fae6f), `src/audio/theory.ts` (TIER_THREE_SCALE [0,2,5,7,9]), `src/audio/engine.ts` (`setVoice(kind: 'triangle' | 'sine')` — tier 3 melody = sine/flute), main wiring (paletteForTier 3; setScale+setVoice at buildFloor; venue → tier-1 scale AND voice), hook (`tier(): 1|2|3`, `gherPos()`, `mirrors().water` count), e2e 32→34: (a) `t3: floor 21 loads the gardens` — tier 3, chip, gherPos non-null, water ≥ 2, palette check via a `paletteAccent()` hook field or canvas sample — simplest: assert `mirrors().water >= 2` + `tier() === 3`; (b) `t3: gher catches on contact` — warp onto gherPos → house().failed during freeze (T2's pattern).

- [x] Tests (palette/scale/voice) → implement → e2e 34/34 → gates. Commit `feat(t3): gardens palette, pastoral flute, tier-three e2e`.

### Task 5: Close-out

Spec §4.6 row 3 delivered; STATE_MACHINES (Campaign 30 floors; Gher + water registered as content under Campaign section notes, no new machines — water ripple = derived TTL data, look-alike line); README/CHANGELOG/FAQ (+3: Gardens, Gher's feint, water ripples); plan ticks; full gates + 34/34; bundle check.

- [x] Docs → gates → commit `docs(t3): delivery marks, how to read the gardens`.

## Plan Self-Review

Coverage vs §4.6 row 3: setting (palette) ✓, mechanic (water) ✓, Sentinel (Gher intercept AI) ✓, mood (pastoral flute scale+voice) ✓. The T2 validator lesson is a binding constraint in T1. Types: GherState/interceptCell pinned T2→wired same task; water consumed by echo senses with an explicit pure core; hook additive. No placeholders. Portraits gated tier-2 keeps rng streams for tiers 1/3 clean (pinned).
