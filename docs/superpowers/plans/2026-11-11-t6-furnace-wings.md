# T6: Furnace Wings — Floors 51–60, Heat, Gher+Aavart Return — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Tier 6 per spec §4.6 row 6: floors 51–60 — **heat** halves frost utility (fog evaporates in half the time) and widens cracks (each crack costs +25 anger), **Gher + Aavart return from rest** (Taal's rotation rest begins; Chhaya always), the furnace palette (ember/copper on charcoal) + the urgent Phrygian-adjacent scale, Dwaar VI at floor 60 (all four Sentinels in the crucible), and the Act II decoy escalation deferred from t5: **enemies protect decoys** — Gher intercepts toward an alive decoy's cell when it's nearer than your objective, making decoy-shard farming genuinely risky.

**Architecture:** The proven tier pattern: campaign to 60 (+`DWAAR_VI_LAYOUT` twin forge corridors + central crucible); `heat.ts` pure (fog/crack modifiers + heat flag by floor); rotation gates move into campaign.ts presence functions (`taalPresent (11–50)||60` — Taal's rest begins; gher/aavart `≥21/≥31` unchanged — they walk 21–60); decoy escalation lands in gher.ts (intercept objective list gains alive decoys). Palette tier 6 + `TIER_SIX_SCALE [0,1,5,7,8]`.

**Tech Stack:** unchanged; zero new dependencies.

**Spec:** §4.6 row 6 (heat fogs mirrors at range but cracks spread faster), §4.4 (ladder; row-9 apex stays tier 9), §2.3 (Act II continues), §13.1.

## Global Constraints

- **BINDING (×4 held, ×5 now):** save validator widens to `TIER_SIX_FLOORS = 60` in the SAME commit as the ramp (pinning: 61 = first rejection; round-trips 55 + 60). Grep validators before declaring done.
- No-break: 652 unit + 38 e2e stay green (extended where specified); floors 1–50 behavior unchanged except ratified: (a) Taal rests on 51–59 (rotation — his beat gimmick was the Flood pairing; the Furnace is Gher/Aavart's home and heat re-tunes the fight), (b) Dwaar V joins the interstitial cascade, (c) t5 minors rider in T5.
- Tier-6 ramp (51–60): echoes 4 all (Dwaar VI 5); beacons 4; braid `0.32 + 0.004·(f−51)`; chhayaDelay `max(2900, 3500 − 60·(f−51))` (Dwaar VI 2800); distort stays tier-4-only; portraits t2-only; pools t3-only; decoys ≥41 (streams pinned — heat adds NO floorObjects draws).
- New constants: `TIER_SIX_FLOORS = 60`, `HEAT_FLOOR_START = 51`, `HEAT_FOG_FACTOR = 0.5`, `HEAT_CRACK_ANGER = 25`.
- TS strict; zero `any`; SPDX; no Math.random; conventional commits `feat(t6)/test(t6)/docs(t6)`. PORT RULE: previews 4199.

---

### Task 1: Campaign to 60 — ramp, Dwaar VI, rotation, validator

**Files:** `src/game/campaign.ts` (TIER_SIX_FLOORS, tierOf→6, isDwaar +60, ramp 51–60, `DWAAR_VI_LAYOUT` 13×13 furnace — twin parallel forge corridors joined by a central crucible chamber, 180°-symmetric+connected, ~100 open; presence fns: `taalPresent (f>=11 && f<=50) || f===60`, gher/aavart `>= 21/31` unchanged), `src/game/save.ts` (→ 60 same commit + tests: 55/60 round-trip, 61 rejected), constants, main/hud (chips `L54 · T6` / `DWAAR VI ✦`; `✦ Truth-Shard VI claimed — Tier VI complete` full screen; Dwaar V cascades to interstitial `✦ Truth-Shard V`), tests (ramp 51–60 pinned; layout predicates; tierOf 6; validator 55/60+61; **rotation truth table extended: 50→T/T/T, 51→F/F/T? NO — Chhaya always: 51→C+G+A = taalPresent FALSE, gher TRUE, aavart TRUE; 60→all TRUE; 49→taal T, gher F, aavart F; pins for 5/11/21/31/40/41/49/50/51/59/60**; descend-no-op-at-60).

- [x] Tests → RED → implement → GREEN; gates + 38/38. Commit `feat(t6): campaign to floor 60 — furnace wings, taal rests, validator widened`.

---

### Task 2: Heat — frost halves, cracks widen

**Files:** Create `src/game/heat.ts`; Modify `src/game/frost.ts` (fog duration via `heat.ts` helper when floor ≥ 51), `src/game/houseState.ts` (`applyCrack` anger amount param — main passes HEAT_CRACK_ANGER=25 on 51–60, 15 otherwise; OR heat.ts exports `crackAngerFor(floor)` and main routes), `src/main.ts` (heat wiring + furnace dressing: scene fog shifts warm 0x1a0e06, one ember-glow point light low near floor, static heat-shimmer = slow sine opacity on an overlay plane — reduced-flash: static gradient instead), captions/FAQ later, tests.

**Heat core (pure):**

```ts
export const HEAT_FOG_FACTOR = 0.5;
export const HEAT_CRACK_ANGER = 25;
export function heatOn(floor: number): boolean;       // floor >= HEAT_FLOOR_START && floor <= TIER_SIX_FLOORS
export function fogDurationMs(floor: number): number; // heatOn ? FOG_DURATION_MS * HEAT_FOG_FACTOR : FOG_DURATION_MS
export function crackAngerFor(floor: number): number; // heatOn ? HEAT_CRACK_ANGER : CRACK_ANGER
```

Call sites: frost.ts `applyFog` takes duration (main passes `fogDurationMs(campaign.floor)`); crack paths pass `crackAngerFor(floor)` (Taals' anger-touch on heat floors? Taal rests on 51–59 — only Dwaar VI has him; his touch there uses the standard 20 — heat crack applies to PLAYER sprint-cracks only). Aaina hint `heatNear` (floors 51–60): "The furnace breathes — your frost melts fast, and every crack you leave burns wider."

- [x] Tests (heatOn bounds incl. 50/51/60/61; fogDuration/crackAnger both branches; frost uses passed duration — update frost signature + tests) → RED → implement → GREEN; gates + 38/38. Commit `feat(t6): heat — frost melts in half the time, cracks burn wider`.

---

### Task 3: Decoy protection — the house guards its copies

**Files:** Modify `src/game/gher.ts` (`interceptCell` objective list gains alive decoy cells when any decoy is nearer to Gher's target logic — precise rule: Gher's objective candidates = uncaptured beacons + exit + ALIVE DECOY CELLS; the nearest-objective BFS decides — so a decoy crossing his sector pulls his seal onto it), `src/main.ts` (pass decoy cells into Gher's objective feed; caption once per floor when Gher first seals a decoy's cell: "The warden guards the copy."), tests (objective list includes decoy cells; Gher walks to a decoy's cell when it's nearest; player still primary when nearer).

- [x] Tests → RED → implement → GREEN; gates + 38/38. Commit `feat(t6): the house guards its copies — gher seals decoys`.

---

### Task 4: Furnace palette + urgent scale + e2e

**Files:** `src/game/palette.ts` (TIER_SIX_PALETTE per plan Task 4: void 0x140a06, floorBase 0x241610, floorLines 0x322016, teal→ember 0xd9743a, ivory 0xe8d8c8, gold 0xd9a441, rose→copper 0xb87333, wallTop 0x7a5c4a, wallBottom 0x3c2c1e, lantern 0xffd0a0, entrance 0xd9743a, exit 0xb87333), `src/audio/theory.ts` (TIER_SIX_SCALE [0,1,5,7,8]), main wiring (paletteForTier 6; setScale at buildFloor; heat dressing from T2), hook (`tier()`→6, `heat(): { on: boolean; fogMs: number; crackAnger: number }`), e2e 38→40: (a) `t6: floor 51 loads the furnace` — `?seed=T6RUN&floor=51` → tier 6, chip `L51 · T6`, taalPos() NULL + gherPos()/avartPos() non-null (rotation pinned), heat().on true + fogMs 12500; (b) `t6: heat cracks burn wider + aavart ambush` — addAnger-crack… simplest honest leg: sprint-crack a mirror near the player (warp + sprint into a standing mirror) → anger() jumps 25 (not 15); then warp onto avartPos → house().failed.

- [x] Tests (palette/scale/heat fns) → implement → e2e 40/40 → gates; live :4199 check (floor 51 furnace look + urgent scale + frost evaporation ~12.5s; floor 41 flood unchanged; floor 1 unchanged). Commit `feat(t6): furnace palette, urgent scale, tier-six e2e`.

---

### Task 5: Close-out

Spec §4.6 row 6 delivered + §2.3 Act II progress + §4.4 rotation note (Taal rests 51–59, returns at Dwaar VI); STATE_MACHINES (Campaign@60, rotation table extension, heat = derived modifier look-alike); README (Tier 6), CHANGELOG `[t6]`, FAQ +2 (the Furnace; decoys are guarded now); plan ticks; full gates + 40/40; bundle check.

- [x] Docs → gates → commit `docs(t6): delivery marks, how to survive the furnace`.

## Plan Self-Review

Coverage vs §4.6 row 6: mechanic (heat: fog-at-range... spec wording "heat fogs mirrors at range" = mirrors self-haze; implemented as fog duration halved + furnace dressing — document the modeling choice in T2) ✓, cracks wider ✓ (+25), rotation ✓ (Taal rests 51–59 — the first REST, spec-consistent with row-9 apex), palette/scale ✓, decoy protection (Act II escalation deferred from t5) ✓. Validator binding honored T1. Types: heat.ts pure consumed by frost/houseState/main; rotation truth table pinned. No placeholders.
