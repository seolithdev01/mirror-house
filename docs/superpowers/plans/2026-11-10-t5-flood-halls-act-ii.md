# T5: Act II Opens — The Flood Halls (41–50), Mirror-You Decoys, Rising Water — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Open Act II — The Deception (spec §2.3): floors 41–50 in the Flood Halls. Two new systems: **mirror-you decoys** (the house sends glass copies of you ahead — they lure Echoes and shatter for shards) and **rising water** (the run floods over 3 minutes; submerged mirrors stop being eyes; everyone slows) — plus the tier-5 palette/scale and the **first all-four-Sentinel duel** at Dwaar V. Dwaar II/III cascade to interstitials like their predecessors.

**Architecture:** The proven tier pattern: campaign to 50 (+`DWAAR_V_LAYOUT` sunken arena); `decoy.ts` (spawn timer, BFS-to-exit walkers, pure core); water level = derived time function in `src/game/waterLevel.ts` consumed by main + frost + echo senses; palette tier 5 (drowned indigo-green) + scale [0,3,5,7,10] (dark pentatonic); **sentinel rotation begins** (§4.6 "escalate combinations" + row 9 "all four": floors 41–49 hunt with Chhaya+Taal only — Gher/Aavart rest; floor 50 Dwaar V = all four in the duel hall; presence functions replace the bare >= gates, floors 1–40 pinned unchanged). t4 minors ride T5.

**Tech Stack:** unchanged; zero new dependencies.

**Spec:** §2.3 (Act II opens), §4.6 row 5 (Flood Halls: rising water halves mirror height), §4.4 (ladder/row-9 apex), §13.1.

## Global Constraints

- **BINDING (held ×3, now ×4):** save validator widens to `TIER_FIVE_FLOORS = 50` in the SAME commit as the ramp (pinning test: 51 = first rejection; round-trips 45 + 50). Grep validators before declaring done.
- No-break: 562 unit + 36 e2e stay green (extended where specified); floors 1–40 behavior unchanged EXCEPT ratified: (a) Gher/Aavart now rest on 41–49 (they were unreachable-code anyway — 41–50 didn't exist), (b) Dwaar III/IV join the interstitial cascade, (c) t4 minors listed in T5.
- Tier-5 ramp (41–50): echoes 4 all (Dwaar V 5); beacons 4; braid `0.30 + 0.004·(f−41)`; chhayaDelay `max(3000, 3600 − 60·(f−41))` (Dwaar V 2900); portraits tier-2-only; pools tier-3-only; distort tier-4-only (streams pinned).
- New constants: `TIER_FIVE_FLOORS = 50`, `DECOY_SPAWN_EVERY_MS = 45000`, `DECOY_MAX_ALIVE = 2`, `DECOY_SHARD = 5`, `WATER_FULL_S = 180`, `WATER_MAX_M = 1.2`, `WATER_SLOW = 0.85`, `WATER_EYE_OFF_M = 0.9`, `DWAAR_V_WATER_S = 120`.
- Decoy rules (Act II first form, documented): looks exactly like the player avatar; spawns at an open cell with BFS dist 8–12 from the player; walks BFS toward the EXIT; Echoes target the NEARER of player/decoy; touching a decoy shatters it (+DECOY_SHARD once); decoys never harm the player; water does not affect decoys (copies don't drown); max DECOY_MAX_ALIVE alive.
- Water rules: level = `min(1, elapsed / WATER_FULL_S) * WATER_MAX_M` from run start (Dwaar V: /DWAAR_V_WATER_S); while level > 0.6 everyone's speed ×WATER_SLOW; a mirror is EYE-BLIND while level > WATER_EYE_OFF_M (visually: all mirrors scale.y = max(0.4, 1 − level/2)); frost still works on dry mirrors; decoys exempt.
- TS strict; zero `any`; SPDX; no Math.random; conventional commits `feat(t5)/test(t5)/docs(t5)`. PORT RULE: previews 4199.

---

### Task 1: Campaign to 50 — ramp, Dwaar V, validator, Act II banner

**Files:** `src/game/campaign.ts` (TIER_FIVE_FLOORS, tierOf→5, isDwaar 10/20/30/40/50, ramp 41–50, `DWAAR_V_LAYOUT` 13×13 sunken arena — concentric rings, 180°-symmetric+connected, ~100 open), `src/game/save.ts` (→ 50 same commit + tests: 45/50 round-trip, 51 rejected), constants, `src/main.ts` (chips `L44 · T5` / `DWAAR V ✦`; `✦ Truth-Shard V`; **Act II banner** on first floor-41 build per session: `ACT II — THE DECEPTION` + `The house has begun copying you.` en/hi, 3s), sentinel presence functions (`taalPresent/Gher/aavart` in campaign.ts: taal `f>=11`, gher `(21–30)||50`, aavart `(31–40)||50` — floors 1–40 pinned identical), tests (ramp 41–50; layout predicates; tierOf 5; validator 45/50+51; presence fn truth table incl. 20/21/30/31/40/41/49/50 pins).

- [ ] Tests → RED → implement → GREEN; gates + 36/36. Commit `feat(t5): campaign to floor 50 — flood halls, sentinel rotation, act ii opens`.

---

### Task 2: Mirror-you decoys

**Files:** Create `src/game/decoy.ts`; Modify `src/game/avatar.ts` (`createDecoy(look)` — exact avatar clone), `src/game/echo.ts` (`sensesPlayer` targets nearer of player/decoys — echo already takes player pos; add `decoys` param), `src/main.ts` (spawn timer in sim, teardown, shatter contact, captions, hook `decoys(): Array<{x,y}>`), captions + FAQ entry, tests.

**Decoy core (pure):**

```ts
export interface DecoyState { id: number; x: number; y: number; born: number; shattered: boolean }
export function spawnDecoy(decoys: DecoyState[], player: {x,y}, grid: FloorGrid, rng: Rng, id: number, now: number): DecoyState | null;
// open cell with BFS dist 8..12 from player; null if none/MAX_ALIVE
export function updateDecoys(decoys: DecoyState[], grid: FloorGrid, exit: CellIndex, dtS: number): DecoyState[];
// each unshattered decoy flow-walks toward exit at DECOY_SPEED = 2.0
export function nearestDecoy(decoys: DecoyState[], x: number, y: number): DecoyState | null; // unshattered only
```

- [ ] Tests (spawn dist window + max-alive; walk toward exit; nearest; shatter-once) → RED → implement → GREEN; gates + 36/36. Commit `feat(t5): mirror-you decoys — the house copies you`.

---

### Task 3: Rising water

**Files:** Create `src/game/waterLevel.ts`; Modify `src/game/frost.ts` (fog unchanged — but `mirrorEyeBlind(level)` helper exported: `level > WATER_EYE_OFF_M`), `src/game/echo.ts` (`sensesPlayer` skips eye-blind mirrors), `src/game/player.ts` + echo/taal/gher/aavart speed application (main applies `WATER_SLOW` to dtS effectively — cleanest: main multiplies dtS passed to movement by WATER_SLOW when level > 0.6; decoys exempt), `src/game/floorScene.ts` (mirror scale.y + water plane mesh added to scene: translucent teal-green plane at y = level, updated per frame), `src/main.ts` (level feed, plane, captions `The halls are flooding…` once at 0.3), overhead (water tint line), tests (level curve incl. Dwaar V fast; eye-blind threshold; slow factor; mirror scale bounds).

- [ ] Tests → RED → implement → GREEN; gates + 36/36. Commit `feat(t5): rising water — the mirrors drown, the copies don't`.

---

### Task 4: Palette + dark pentatonic + e2e

**Files:** `src/game/palette.ts` (TIER_FIVE_PALETTE: void 0x0a1414, floorBase 0x16281e, floorLines 0x1e3628, teal 0x3fae9a (water kin), ivory 0xdce8dc, gold 0xd9a441, rose→moss 0x5a8a6a, wallTop 0x6a8a7a, wallBottom 0x2c3e34, lantern 0xd8ffe8, entrance 0x3fae9a, exit 0x5a8a6a), `src/audio/theory.ts` (TIER_FIVE_SCALE [0,3,5,7,10]), voice stays triangle; hook (`tier()`→5, `waterLevel(): number`, `decoys()` from T2); e2e 36→38: (a) `t5: floor 41 opens act two` — `?seed=T5RUN&floor=41` → tier 5, chip `L41 · T5`, act banner text once, gherPos()/avartPos() NULL (rotation), taalPos() non-null; (b) `t5: water rises and decoy walks` — wait 15s → waterLevel() > 0; walk 10s → decoys() ≥ 1 eventually (spawn timer ~45s: use `spawnDecoy` dev faucet? add DEV faucet `forceDecoy()` — simplest, disclosed); warp onto decoy → shards +5.

- [ ] Tests → implement → e2e 38/38 → gates; live :4199 check (flood visuals, decoy resemblance, Dwaar V four-sentinel duel reachable at floor 50). Commit `feat(t5): flood palette, dark pentatonic, tier-five e2e`.

---

### Task 5: Close-out + t4 minors rider

**Files:** Spec §4.6 row 5 delivered + §2.3 Act II opened + §13.4 (playtest INVITED 2026-11-10); STATE_MACHINES (Campaign@50, rotation table, decoys = Act II content note, water = derived); README (Tier 5 + Act II), CHANGELOG `[t5]` (+ t4 minors: creep→"stand still or change pace" relabel in FAQ/A11Y copy, e2e CELL_SIZE literal → import, Stay label → "Stay — walk the hall"); FAQ +3 (Act II/decoys; flooding; the rotation — "the house rotates its wardens"); plan ticks; full gates + 38/38.

- [ ] Docs → gates → commit `docs(t5): act ii opens — delivery marks, how to survive the flood`.

## Plan Self-Review

Coverage vs §4.6 row 5 (Flood Halls, rising water halves mirror height) + §2.3 Act II open: rising water ✓ (T3, height-shrink + eye-blind + slow), decoys (Act II signature, first form: lures + shatter shards; "protected by enemies" deferred to tier 6 — documented) ✓, palette/scale ✓, Dwaar V all-four duel ✓ (row-9 apex preview), rotation ✓ (row-9 consistency: rows 5–8 don't have all four). Validator binding honored T1. Types: DecoyState pinned T2→main; waterLevel consumed T3→T4 hook. Ports: previews 4199.
