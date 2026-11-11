# T7: Whisper Library — Floors 61–70, Hearing Echoes, Noise Economy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Tier 7 per spec §4.6 row 7: floors 61–70 — **Echoes go blind and grow ears**: mirror-sight is gone on tier 7; Echoes track NOISE (sprint rings loud, walk rings soft, stand is silent, frost/push/step ping, Taal's beat ticks). The movement-noise economy becomes the whole fight: creep past stacks, sprint only in bursts. Taal returns mid-tier (66) — his beat ticks are noise he himself ignores but you can't miss. Dwaar VII at floor 70 (Taal + Gher duet in the library stacks), `✦ Truth-Shard VII`. Palette: moonlit lavender-grey; music: sparse whispered slow sine.

**Architecture:** The proven tier pattern: campaign to 70 (+`DWAAR_VII_LAYOUT` library stacks — long parallel shelf-walls with reading-alcove gaps); `src/game/noise.ts` pure noise-event ring (emit + hear check); echo.ts gains a per-floor sense mode (tier 7 echoes: `hearing` — no mirror eyes at all; senses = noise events only); rotation gates change: Taal rests 51–65 and **returns at 66** (mid-tier), Gher joins at Dwaar VII only (rest 61–69), Aavart rests through 61–70 (returns tier 8); validator widens to `TIER_SEVEN_FLOORS = 70` same-commit (×6).

**Tech Stack:** unchanged; zero new dependencies.

**Spec:** §4.6 row 7 (sound-based Echoes hear-not-see; sparse whispered music), §4.4 (ladder rotation; row-9 apex stays tier 9), §2.3 (Act II continues), §13.1.

## Global Constraints

- **BINDING (×5 held, ×6 now):** save validator widens to `TIER_SEVEN_FLOORS = 70` in the SAME commit as the ramp (pinning: 71 = first rejection; round-trips 65 + 70). Grep validators before declaring done.
- No-break: 652→(t6)715 unit + 40 e2e stay green (extended where specified); floors 1–60 behavior unchanged EXCEPT ratified: (a) Taal rests 51–65 then returns 66–70 (extends his 51–50-only rest — floors 51–59 CHANGE: he was already resting there in t6; 51–65 resting vs t6's 51–59 = net change is floors 60→65 gaining rest, all within already-resting 51–59 PLUS newly-built 60–65 — document), (b) Gher rests 61–69 joining only at Dwaar VII, (c) Aavart rests all tier 7, (d) hearing echoes replace mirror-sight echoes on 61–70.
- Tier-7 ramp (61–70): echoes 4 all (Dwaar VII 5); beacons 4; braid `0.36 + 0.004·(f−61)`; chhayaDelay `max(2700, 3300 − 60·(f−61))` (Dwaar VII 2600); portraits t2 / pools t3 / distort t4 / decoys ≥41 / water flood t5-only / heat t6-only (streams pinned; noise adds NO floorObjects draws).
- New constants: `TIER_SEVEN_FLOORS = 70`, `NOISE_SPRINT_R = 7`, `NOISE_WALK_R = 4`, `NOISE_ACTION_R = 2.5`, `NOISE_WALK_EVERY_MS = 500`, `TAAL_RETURN_FLOOR = 66`.
- TS strict; zero `any`; SPDX; no Math.random; conventional commits `feat(t7)/test(t7)/docs(t7)`. PORT RULE: previews 4199.

---

### Task 1: Campaign to 70 — ramp, Dwaar VII, rotation, validator

**Files:** `src/game/campaign.ts` (TIER_SEVEN_FLOORS, tierOf→7, isDwaar +70, ramp 61–70, `DWAAR_VII_LAYOUT` 13×13 library — long parallel shelf-walls (full-height wall runs with single-cell gaps like stack aisles) + reading alcoves, 180°-symmetric+connected, ~95 open), `src/game/save.ts` (→ 70 same commit + tests: 65/70 round-trip, 71 rejected), constants, main/hud (chips `L64 · T7` / `DWAAR VII ✦`; `✦ Truth-Shard VII claimed — Tier VII complete` full screen; Dwaar VI cascades to interstitial), presence fns (taal `(11–50) || ≥66`; gher `((21–40)||50||70)` → simplify `((21–40) || f === 50 || f === 70)`; aavart `(31–40)||50` — rests all tier 7; chhaya always), tests (ramp 61–70; layout predicates; tierOf 7; validator 65/70+71; rotation truth table rows 5/11/21/31/40/41/49/50/51/60/61/65/66/69/70/71-validator; descend-no-op-at-70).

- [ ] Tests → RED → implement → GREEN; gates + 40/40. Commit `feat(t7): campaign to floor 70 — whisper library, taal returns at 66, validator widened`.

---

### Task 2: Noise economy + hearing echoes

**Files:** Create `src/game/noise.ts`; Modify `src/game/echo.ts` (hearing mode: tier-7 echoes skip mirror-sight entirely — `sense: 'glass' | 'ears'` field set at spawn by `tierOf(floor) === 7`; hearing = noise events within their radius), `src/main.ts` (emit sprint noise every fixed step while sprint-moving; walk noise every NOISE_WALK_EVERY_MS while walk-moving; frost/push/step single pings; feed echo hearing; captions/Aaina hint `whisperNear` on floor ≥61: "They are blind here — but they listen. Walk. Never run the stacks."), constants, tests.

**Noise core (pure):**

```ts
export interface NoiseEvent { x: number; y: number; r: number; at: number }
export function emit(list: NoiseEvent[], x: number, y: number, r: number, now: number): NoiseEvent[]; // append + drop events older than 1200ms
export function hears(list: readonly NoiseEvent[], ex: number, ey: number): boolean; // any event with dist ≤ r
export function loudestAt(list: readonly NoiseEvent[], ex: number, ey: number): { x: number; y: number } | null; // position of the closest event echo can hear — chase target
```

Echo hearing semantics (tier 7): sense tick unchanged (SENSE_INTERVAL_MS); on tick, `hears(noise, echo)` → chase `loudestAt(...)` position with CHASE_MEMORY_MS as today; no noise → patrol. Frost/push/step emit single NOISE_ACTION_R pings; sprint emits NOISE_SPRINT_R each fixed step; walk emits NOISE_WALK_R per NOISE_WALK_EVERY_MS. Reduced-flash: noise events are invisible by design (map shows nothing — the ECONOMY is audio/knowledge).

- [ ] Tests (emit cap/eviction; hears radius boundaries; loudestAt nearest; tier-7 echo patrol-without-noise → chase-with-noise → memory-expiry; tier-1 echo unaffected by noise — sight-only pin) → RED → implement → GREEN; gates + 40/40. Commit `feat(t7): noise economy — the echoes listen`.

---

### Task 3: Moonlit palette + whispered voice + Dwaar VII duet + e2e

**Files:** `src/game/palette.ts` (TIER_SEVEN_PALETTE per plan Task 3: void 0x0a0a12, floorBase 0x181824, floorLines 0x242436, teal→lavender 0x8a8ab8, ivory 0xe4e4f0, gold 0xd9a441, rose→dusk 0x6a6a9a, wallTop 0x5c5c78, wallBottom 0x2e2e44, lantern 0xe8e8ff, entrance 0x8a8ab8, exit 0xd9a441), `src/audio/theory.ts` (TIER_SEVEN_SCALE [0,2,3,7,8]; whisper = sine voice + intensity ceiling 0.55 on tier 7 — melody stays sparse), `paletteForTier` 7, main wiring (scale/voice at buildFloor; Dwaar VII duo wiring — taal + gher spawn at 70 via rotation gates already), hook (`tier()`→7, `noise(): number` — live noise-event count), e2e 40→42: (a) `t7: floor 61 loads the library` — `?seed=T7RUN&floor=61` → tier 7, chip `L61 · T7`, taalPos() NULL + gherPos()/avartPos() NULL (quiet library pinned); (b) `t7: echoes hear noise` — `&floor=66` → taalPos() non-null (return pinned); spawn hearing check via hook: `noise()` count rises while sprinting, and an echo within earshot flips to chase (warp echo adjacent via `enemyPos` + sprint 500ms → `house()`/mode evidence — expose `echoMode(i)` in the tester hook, additive).

- [ ] Tests (palette/scale/voice/noise wiring) → implement → e2e 42/42 → gates; live :4199 check (floor 61 moonlit look, sprint → chase, creep → quiet; floor 66 Taal's beat; floor 1 unchanged). Commit `feat(t7): moonlit library, whispered flute, tier-seven e2e`.

---

### Task 4: Close-out

Spec §4.6 row 7 delivered; §4.4 rotation note (Taal rests 51–65, returns 66; Gher Dwaar-VII-only; Aavart rests all tier 7 — returns tier 8); STATE_MACHINES (Campaign@70, noise = derived events look-alike, rotation table); README (Tier 7), CHANGELOG `[t7]`, FAQ +2 (the Library — walk, don't run; the quiet wardens); plan ticks; full gates + 42/42; bundle check.

- [ ] Docs → gates → commit `docs(t7): delivery marks, how to walk the stacks`.

## Plan Self-Review

Coverage vs §4.6 row 7: mechanic (hearing Echoes/noise economy) ✓, mood (sparse whispered) ✓, rotation ✓ (Taal returns mid-tier per design; Gher duet at Dwaar VII; Aavart rests), palette ✓. Validator binding honored T1 (×6). Types: NoiseEvent pinned T2→echo/main; hook additive. Streams pinned (noise adds no floorObjects draws). No placeholders. Tier-1..6 immutability: hearing gated by echo sense-mode set from tierOf at spawn; all earlier tiers keep glass sight (pinned).
