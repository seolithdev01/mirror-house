# T2: Hall of Ancestors — Floors 11–20, Taal the Sentinel, Portraits — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Extend the campaign through Tier 2 (§4.6): floors 11–20 in the Hall of Ancestors — Taal promoted from floor-5 cameo to a LETHAL beat-walking Sentinel present on every tier-2 floor, ancestor portrait mirrors (dim figures in the glass, fogable eyes like any standing mirror), the tier-2 art palette (amber/brown/deep-teal), Dwaar II at floor 20 (Taal's hall, new layout), and the audio engine finally playing the tier-2 Durga pentatonic (`TIER_TWO_SCALE`, exported and unused since M3).

**Architecture:** All existing machines intact — this is content + tuning: `campaign.ts` extends its ramp to 20 and gains `tierOf(floor)` + `DWAAR_II_LAYOUT`; `taal.ts` gains an outcome flag (cameo → anger vs sentinel → caught) chosen by tier; `floorObjects.ts` places `portrait` mirrors on tier-2 floors; `floorScene`/`palette` gain `TIER_TWO_PALETTE` selected by floor; `audio engine` grows `setScale(scale)`. Aaina gains a taal-lethal hint. No new state machines (register nothing; update the Campaign section).

**Tech Stack:** unchanged; zero new dependencies.

**Spec:** §2.3 (Act I continues), §4.4 (Sentinel ladder — Tier 2 = Taal), §4.6 (tier table row 2), §6.1 (tier mood), §13.1 (beta scope was Tier 1 — this is the first post-beta content milestone).

## Global Constraints

- No-break: 366 unit + 30 e2e stay green (extended where specified); tester hook additive-only; tier-1 experience (floors 1–10) byte-identical.
- New constants: `TIER_TWO_FLOORS = 20`; tier-2 ramp values pinned below; portrait counts; `TAAL_SENTINEL_FLOOR = 11`.
- tier-2 ramp (floors 11–20): echoes `5,5,5,6,6,6,6,6,6,6` (Dwaar II: 5); beacons `4` all; braid `0.22 + 0.005·(f−11)`; chhayaDelay `max(4000, 4500 − 50·(f−11))` (Dwaar II 3800).
- TS strict; zero `any`; SPDX; no Math.random; conventional commits `feat(t2)/test(t2)/docs(t2)`.

---

### Task 1: Campaign to 20 — ramp, tiers, Dwaar II

**Files:** `src/game/campaign.ts` (+`tierOf(floor): 1|2`, `DWAAR_II_LAYOUT` new 13×13, `isDwaar` → `floor === 10 || floor === 20`, ramp table 11–20 per constraints, `TIER_TWO_FLOORS`), constants, main.ts (floor chip `L14 · T2`, Dwaar II chip `DWAAR II ✦`, tier-complete at 20 → `✦ Truth-Shard II — Act I halfway`… no: keep tier-2 completion text `✦ Truth-Shard II claimed — Tier II complete`; Play again/Stay reuse), tests extended (ramp pinned 11–20; DWAAR_II_LAYOUT symmetric+connected like T1's checks; tierOf; isDwaar(10/20)).

- [x] Tests → RED → implement → GREEN; gates + 30/30. Commit `feat(t2): campaign to floor 20 — tier ramp, dwaar ii layout`.

### Task 2: Taal the Sentinel + portrait mirrors

**Files:** `src/game/taal.ts` (`taalOutcome(floor): 'anger' | 'caught'` pure + contact paths in main route by it; beat behavior unchanged), `src/game/floorObjects.ts` (tier-2 spawns: Taal present every floor 11–20 alongside echoes — spawn count bookkeeping; portraits: 2–3 per tier-2 floor, kind `'portrait'`, fogable eye, wall-mounted like standing), `src/game/mirror.ts` + `textures.ts` (portrait visual: standing-mirror fake-reflective base + a dim procedural ancestor silhouette canvas baked per-portrait-seed; fogged swaps matte as usual), main.ts wiring, aaina hint (`taalSentinel` kind when floor ≥ 11 && taal within 8m: "He walks the beat — cross when the lantern dims"), tests (outcome by floor; portrait placement counts; silhouette determinism).

- [x] Tests → RED → implement → GREEN; gates + 30/30. Commit `feat(t2): taal the sentinel, ancestor portraits`.

### Task 3: Tier-2 palette + audio scale

**Files:** `src/game/palette.ts` (`TIER_TWO_PALETTE`: void 0x120d08, floorBase 0x2a2018, floorLines 0x3a2c1c, teal→amber 0xc98a3d, ivory 0xe8dcc8, gold 0xb8860b→keep 0xd9a441, rose→deep-teal 0x2f6f6a, wallTop 0x8a7a5c, wallBottom 0x4a3f2c, lantern 0xffe0b0, entrance 0xc98a3d, exit 0x2f6f6a), `floorScene` (palette chosen by `tierOf(campaign.floor)` — pass through buildFloor), `src/audio/engine.ts` (+`setScale(scale: readonly number[])` — swaps the melody walker's scale live; drone root unchanged), main.ts (calls engine.setScale at buildFloor), tests (palette values; tier selection fn; setScale behavior via engine test seam).

- [x] Tests → RED → implement → GREEN; gates + 30/30. Commit `feat(t2): hall of ancestors palette, durga pentatonic wiring`.

### Task 4: e2e + hook

**Files:** hook `tier(): 1|2`, `taalPos(): {x,y}|null` (tester additions); e2e (30→32): (1) `t2: floor 11 loads tier two` — `&floor=11` → tier()===2, chip contains `T2`, taalPos non-null, portrait mirrors present in `mirrors()` snapshot (add kind count); (2) `t2: sentinel taal catches` — warp onto taalPos → attempts++ (outcome 'caught') — and floor-5 cameo still anger-only (assert via addAnger path? keep to the floor-11 catch assertion).

- [x] Implement → e2e 32/32 → gates. Commit `test(t2): tier-two e2e — load, sentinel catch`.

### Task 5: Close-out

Spec §4.6 row 2 annotated delivered; CHANGELOG; README (Tier 2 section); FAQ +3 (Tier 2/Hall of Ancestors; Taal is lethal now — beat-crossing; portraits); STATE_MACHINES Campaign section refresh (floors 1–20, two Dwaars); plan ticks; full gates + 32/32.

- [x] Docs → gates → commit `docs(t2): delivery marks, how to survive the ancestors`.

## Plan Self-Review

Coverage vs §4.6 row 2: setting ✓ (palette), new mechanic (portraits) ✓, Sentinel (Taal, tier-2 lethal) ✓, music mood (Durga) ✓. Ramp/layout values pinned; no placeholders. Types: `tierOf` consumed in T2/T3; hook additions match T4. Campaign machine untouched structurally (floors extend, `isDwaar` widens — tests pin 10 & 20).
