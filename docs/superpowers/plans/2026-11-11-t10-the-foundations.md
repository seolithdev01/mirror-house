# T10: The Foundations — Floors 91–100, the Glazier, the Ground Door — THE FINALE — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** The finale (spec §4.6 row 10 + §2.3 close): floors 91–99 — **no mirrors at all** (every mechanic stripped; pure mazes in near-black stone; Chhaya alone walks with you — even the Echo roster thins to silence) — then floor 100: **the Glazier's Ground**, where the house's master himself hunts (teleport-walker, unblindable, unlurable) and the four beacons are the last pedestals. Clearing floor 100 opens **the Ground Door**: `ACT III COMPLETE — THE GROUND DOOR OPENS` finale screen with the full-campaign stats and the line the whole descent earned. The 100-floor spec from the original brief is complete.

**Architecture:** The proven tier pattern: campaign to 100 (+`GROUND_LAYOUT` finale floor, 13×13 pure maze — NO special rooms, no gimmicks: the Glazier built the foundations plainly); `glazier.ts` — the last entity (teleport-walker: every GLAZIER_TELEPORT_S he relocates to the open cell farthest from the player, then walks toward the player at GLAZIER_SPEED until the next teleport; contact = caught; spawns floor 100 only; no mirrors exist so no sense system at all — pure pursuit); `campaign.ts` floor-91+ has zero mirror kinds (floorObjects places beacons + echoes only); `paletteForTier` 10 (near-black stone) + `TIER_TEN_SCALE [0,5,7]` (three notes — the sparsest music in the game) + sine voice; **finale screen** at floor-100 clear: `ACT III COMPLETE — THE GROUND DOOR OPENS` + the full-campaign stats + the closing line. Validator widens to `TIER_TEN_FLOORS = 100` same-commit (×9).

**Tech Stack:** unchanged; zero new dependencies.

**Spec:** §4.6 row 10 (the Glazier himself, no mirrors), §2.3 (Act III close — the Ground Door), §13.1, and the original brief: *"a 100 storied building where each and every floor is a 3D room with well defined maze."*

## Global Constraints

- **BINDING (×8 held, ×9 now — the last widening):** save validator widens to `TIER_TEN_FLOORS = 100` in the SAME commit as the ramp (pinning: 101 = first rejection; round-trips 95 + 100). Grep validators before declaring done.
- No-break: 900 unit + 46 e2e stay green (extended where specified); floors 1–90 unchanged except ratified: (a) Dwaar IX joins the interstitial cascade, (b) floor-100 tier screen is REPLACED by the Ground Door finale screen (Truth-Shard X line folded into it), (c) t6 minors rider in T4.
- Tier-10 ramp (91–99): echoes 6 all; beacons 4; braid `0.10 + 0.002·(f−91)` (the tightest tiers in the game — the Foundations are plain and hard); chhayaDelay `max(2300, 2900 − 50·(f−91))` (floor 99: 2450); **floor 100**: echoes 6, beacons 4 (the pedestals), braid 0.08 (the Glazier's Ground is open — he IS the difficulty), chhayaDelay 2200.
- Floors 91–100 have **zero mirrors of any kind** (no standing/beacon-portraits/true/pools/distort/decoys/water/heat — pinned per floor).
- New constants: `TIER_TEN_FLOORS = 100`, `ACT_III_FLOOR = 91` (chip tier label `T10`, Foundations begin), `GLAZIER_TELEPORT_S = 12`, `GLAZIER_SPEED = 2.0`, `GLAZIER_FLOOR = 100`, `GROUND_CLEAR` strings.
- TS strict; zero `any`; SPDX; no Math.random; conventional commits `feat(t10)/test(t10)/docs(t10)`. PORT RULE: previews 4199.

---

### Task 1: Campaign to 100 — ramp, the Ground, rotation end, validator, finale wiring

**Files:** `src/game/campaign.ts` (TIER_TEN_FLOORS, tierOf→10, ramp 91–99 + floor 100 row, **`isFinale(floor) = floor === 100`**, presence fns: chhaya always; taal/gher/aavart ALL rest on 91–99 (the Foundations are walked alone — the house holds its breath) and ALL return on floor 100 (the Glazier is never alone — wait: design decision: floor 100 = the Glazier SOLO. The four Sentinels rest 91–100 entirely; the Foundations are you, the Echoes, and floor 100 the Glazier. Simpler, lonelier, truer to the ending. Pin: presence fns FALSE for 91–100.), `GROUND_LAYOUT` 13×13 plain maze (braid 0.08 generation, no special rooms — verify: 180°-symmetric NOT required for the Ground (the Glazier built it plainly) — instead predicates: connected, ~95 open, entrance (1,1), exit (11,11) unique-farthest ≥ 18)), `src/game/save.ts` (→ 100 same commit + tests: 95/100 round-trip, 101 rejected), constants, main/hud (chips `L94 · T10` / `L100 · THE GROUND`; floor-100 tier label `THE GROUND`; descend-no-op-at-100 terminal-forever pin; tier-10 floors place NO mirrors — floorObjects gate `tier >= 10 → beacons + echoes only` pinned), tests.

- [ ] Tests → RED → implement → GREEN; gates + 46/46. Commit `feat(t10): campaign to floor 100 — the foundations, the glazier's ground, the last validator`.

---

### Task 2: The Glazier

**Files:** Create `src/game/glazier.ts`; Modify `src/game/avatar.ts` (`createGlazier()` — the master: tall silhouette, pale stone coat 0xc8ccd4, lantern 0xffffff full-white, layer 0 — he is the only pure-white thing in the game), `src/main.ts` (spawn floor 100 only, teleport/walk/contact wiring, captions `The Glazier walks his Foundations.` first teleport, `He is here.` on approach ≤ 3m), tests.

**Glazier core (pure):**

```ts
export const GLAZIER_TELEPORT_S = 12;
export const GLAZIER_SPEED = 2.0;
export interface GlazierState { x: number; y: number; heading: number; nextTeleportAt: number }
export function initGlazier(grid: FloorGrid, player: { x: number; y: number }, now: number): GlazierState;
// spawns at the open cell with MAX bfs-dist from the player
export function glazierTarget(grid: FloorGrid, player: { x: number; y: number }): CellIndex | null;
// the open cell with MAX bfs-dist from the player (his next perch)
export function updateGlazier(g: GlazierState, grid: FloorGrid, player: { x: number; y: number }, now: number, dtS: number): GlazierState;
// if now >= nextTeleportAt: relocate to glazierTarget cell center, reset nextTeleportAt = now + GLAZIER_TELEPORT_S*1000
// else: flow-walk toward the player at GLAZIER_SPEED
```

Contact < CONTACT_RADIUS → caught (standard fail). He is never lured, never blinded, never slowed — the Foundations have nothing to fog and he IS the fog. One implementation note: reuse `bfsDistances` for max-dist spawn/target (gher/glazier share the pattern).

- [ ] Tests (init max-dist; teleport relocation resets clock; walk toward player; contact-radius gate pure) → RED → implement → GREEN; gates + 46/46. Commit `feat(t10): the glazier — the last warden walks his foundations`.

---

### Task 3: Stone palette + three-note scale + the Ground Door finale + e2e

**Files:** `src/game/palette.ts` (TIER_TEN_PALETTE per plan Task 3: void 0x050508, floorBase 0x101216, floorLines 0x181c22, teal→pale-stone 0x8a94a0, ivory 0xe8ecf0, gold 0xd9a441, rose→ash 0x6a7280, wallTop 0x3e4650, wallBottom 0x1c2228, lantern 0xf0f4ff, entrance 0x8a94a0, exit 0xd9a441), `src/audio/theory.ts` (TIER_TEN_SCALE [0,5,7]), `paletteForTier` 10, voice map sine (the Ground is quiet — sine at intensity ceiling 0.4, the sparsest), main wiring (finale screen at floor-100 clear: `ACT III COMPLETE — THE GROUND DOOR OPENS` + campaign stats (floors 100, shards total via save) + the closing line `One hundred floors. One door. You walked out.` + Play again/Stay), hook (`tier()`→10, `glazierPos()`), e2e 46→48: (a) `t10: floor 91 enters the foundations` — `?seed=T10RUN&floor=91` → tier 10, chip, **mirrors().total === 0 pinned** (the promise), glazierPos() NULL (he's floor 100); (b) `t10: the glazier hunts and the door opens` — `?seed=T10END&floor=100` → glazierPos() non-null; warp onto him → house().failed; then capture 4 beacons (warp+frost legs) + warp to exit → the finale screen text `GROUND DOOR OPENS` visible, campaign terminal.

- [ ] Tests → implement → e2e 48/48 → gates; live :4199 check (floor 91 stone-black look + silence; floor 100 the Glazier's white figure + teleport rhythm witnessed + finale screen). Commit `feat(t10): the ground door — finale screen, tier-ten e2e`.

---

### Task 4: Close-out — the 100-floor spec complete

**Files:** Spec §4.6 row 10 delivered + §2.3 **`THE 100-FLOOR SPEC IS COMPLETE`** header note + §13.1 @ t10; STATE_MACHINES (Campaign@100 TERMINAL — the machine's final state; glazier = content entity note; no new machines); README (Tier 10 + THE FINALE section — "the 100-floor building from the first blueprint, delivered floor by floor"), CHANGELOG `[t10]`, FAQ +2 (the Foundations; the Ground Door — what happens after: "You walked out. The house keeps its copies. Act IV, someday, is theirs."), plan ticks; **t6 minors rider:** heat() faucet consistency note (docs line); full gates + 48/48; bundle check.

- [ ] Docs + rider → gates → commit `docs(t10): the 100-floor house is complete — delivery marks, the ground door`.

## Plan Self-Review

Coverage vs §4.6 row 10 (the Glazier himself, no mirrors) + §2.3 (Act III close: the Ground Door): pure floors ✓, Glazier ✓, finale ✓, validator ×9 (LAST) ✓. Design decisions pinned: Sentinels rest 91–100 (the loneliest tier); Glazier teleport-walk solo; Ground layout plain (he IS the gimmick); finale screen replaces tier screen. Types: GlazierState pure T2→wired same task; hook additive. No placeholders.
