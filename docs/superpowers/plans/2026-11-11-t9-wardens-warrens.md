# T9: Warden's Warrens — Floors 81–90, All Four Hunt, Act III Opens — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Tier 9, the spec's reserved apex (§4.6 row 9: "all four hunt together"): floors 81–90 — **Chhaya, Taal, Gher, and Aavart hunt simultaneously on every procedural floor**, and every mastered mechanic returns as thin texture (heat: fog ×0.5 + 25-anger cracks; 2–3 water pools; 1–2 distort panes). **Act III — The Ground Door** opens with its banner on floor 81. Dwaar IX at floor 90: the Warden's own warren — the hardest duel, all four in a tight maze.

**Architecture:** The proven tier pattern: campaign to 90 (+`DWAAR_IX_LAYOUT` tight warren, 11×11, low braid — small, twisty, personal); **rotation widens to the apex**: `taalPresent (11–50) || ≥66 || ≥81`, gher `((21–40) || 50 || ≥70) || ≥81`, aavart `((31–40) || 50 || ≥71) || ≥81` — i.e. `≥81` short-circuits every rest; heat extends `(51–60) || (81–90)`; pools/distort placement gains tier-9 counts (rng streams for 1–80 pinned — new draws are new-floor-only); palette tier 9 (iron/steel) + `TIER_NINE_SCALE [0,1,3,7,8]` + sawtooth voice; **ACT III banner** on floor-81 entry (`ACT III — THE GROUND DOOR` + `The door is real. So is what guards it.`).

**Tech Stack:** unchanged; zero new dependencies.

**Spec:** §4.6 row 9 (all four apex), §2.3 (Act III opens), §4.4, §13.1.

## Global Constraints

- **BINDING (×7 held, ×8 now):** save validator widens to `TIER_NINE_FLOORS = 90` in the SAME commit as the ramp (pinning: 91 = first rejection; round-trips 85 + 90). Grep validators before declaring done.
- No-break: 839 unit + 44 e2e stay green (extended where specified); floors 1–80 unchanged EXCEPT ratified-by-design: floors 81–90 are new territory (their rng draws are new-floor-only; every tier mechanic gate extended to 81–90 keeps 1–80 pinned).
- Tier-9 ramp (81–90): echoes 5 all (Dwaar IX 6); beacons 4; braid `0.40 + 0.004·(f−81)`; chhayaDelay `max(2400, 3000 − 60·(f−81))` (Dwaar IX 2300); water pools 2–3 (tier-9); distort 1–2 (tier-9); portraits/pools/distort placement orders pinned (new counts append AFTER existing draws per kind, streams for 1–80 byte-identical).
- New constants: `TIER_NINE_FLOORS = 90`, `DWAAR_IX chhayaDelay 2300` (ramp row), `ACT_III_FLOOR = 81`.
- TS strict; zero `any`; SPDX; no Math.random; conventional commits `feat(t9)/test(t9)/docs(t9)`. PORT RULE: previews 4199.

---

### Task 1: Campaign to 90 — ramp, Dwaar IX, rotation apex, validator, Act III banner

**Files:** `src/game/campaign.ts` (TIER_NINE_FLOORS, tierOf→9, isDwaar +90, ramp 81–90, `DWAAR_IX_LAYOUT` 11×11 tight warren — twisty low-braid personal maze, 180°-symmetric+connected, ~85 open, presence fns widened `≥81` short-circuit all rests, `ACT_III_FLOOR`), `src/game/save.ts` (→ 90 same commit + tests: 85/90 round-trip, 91 rejected), constants, main/hud (chips `L84 · T9` / `DWAAR IX ✦`; `✦ Truth-Shard IX claimed — Tier IX complete` full screen; Dwaar VIII cascades to interstitial; **Act III banner** on first floor-81 build: `ACT III — THE GROUND DOOR` + `The door is real. So is what guards it.` en/hi 3s), heat extension (heat.ts heatOn `(51–60) || (81–90)` — heat.ts is pure floor fn; extend + pins; heatActiveFloor in main benefits automatically), tests (ramp 81–90; layout predicates; tierOf 9; validator 85/90+91; rotation rows 81/85/89/90 all-present + 1–80 identical; descend-no-op-at-90; heat bounds 80/81/90/91).

- [ ] Tests → RED → implement → GREEN; gates + 44/44. Commit `feat(t9): campaign to floor 90 — all four hunt, act iii opens, validator widened`.

---

### Task 2: Texture stack — heat/pools/distort return on the apex

**Files:** Modify `src/game/floorObjects.ts` (tier-9: pools 2–3 + distort 1–2 placement — new rng draws appended AFTER existing kind draws so floors 1–90-before-81 streams pinned; verify with byte-identity tests for floors 1–80), `src/main.ts` (all-four wiring verified on 81–90: taalPos/gherPos/avartPos all non-null — taal needs his spawn gate widened `f >= 81` too; heat dressing auto-flows via heatActiveFloor), tests (tier-9 object counts; floors 1–80 stream pins; all-four position hook test in e2e T4).

- [ ] Tests → RED → implement → GREEN; gates + 44/44. Commit `feat(t9): the apex texture stack — heat, pools, distort return`.

---

### Task 3: Iron palette + warren scale + Act III banner + e2e

**Files:** `src/game/palette.ts` (TIER_NINE_PALETTE: void 0x0a0c0e, floorBase 0x1a1e22, floorLines 0x262c30, teal→warden-steel 0x5a9a9a, ivory 0xd8dde0, gold 0xd9a441, rose→iron-red 0x9a4a4a, wallTop 0x565e66, wallBottom 0x2a3036, lantern 0xe8f0f0, entrance 0x5a9a9a, exit 0xd9a441), `src/audio/theory.ts` (TIER_NINE_SCALE [0,1,3,7,8]), `paletteForTier` 9, voice map {8: sawtooth, 9: sawtooth}, main (Act III banner from T1 verified visible; scale/voice/palette wiring), hook (`tier()`→9), e2e 44→46: (a) `t9: floor 81 opens act three` — `?seed=T9RUN&floor=81` → tier 9, chip `L81 · T9`, act banner once, ALL FOUR positions non-null, heat on, pools ≥ 2, distort ≥ 1; (b) `t9: the warren catches` — `?seed=T9DUEL&floor=90` → warp onto avartPos → house().failed.

- [ ] Tests → implement → e2e 46/46 → gates; live :4199 check (floor 81 iron look + all-four + textures; floors 71/61/1 unchanged). Commit `feat(t9): iron warrens, act three banner, tier-nine e2e`.

---

### Task 4: Close-out

Spec §4.6 row 9 delivered + §4.4 (apex reached — row 9 of the ladder) + §2.3 Act III opened; STATE_MACHINES (Campaign@90, rotation apex note, heat-extension row); README (Tier 9), CHANGELOG `[t9]`, FAQ +2 (the Warrens; all four at once — "you will not out-fight them. Out-think them, or die in the iron."), plan ticks; full gates + 46/46; bundle check.

- [ ] Docs → gates → commit `docs(t9): delivery marks, the apex duels`.

## Plan Self-Review

Coverage vs §4.6 row 9 (all four apex): ✓ rotation, ✓ texture stack (heat/pools/distort — thin, per plan), ✓ Act III banner. Validator binding honored T1 (×8). Streams pinned for 1–80 (new draws are tier-9-only, appended last). No placeholders. Balance: 5 echoes + all-four + heat + texture noise on every floor is the apex — hard but fair (every sentinel has a pinned counter; TACTICAL pause exists; beacons 4 standard).
