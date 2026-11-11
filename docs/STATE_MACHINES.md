# State machines

**Policy.** Every stateful system in this game is an explicit machine: one
discriminated union tagged by `kind` or a string literal, pure transition
functions that return a new state, one owning module, and a row in this file.
New features add machines — not another boolean beside the last one.

**Why this exists.** Before this refactor, "is the floor live?" was spread over
`floorFailed`, `freezeUntil`, a `run.startedAt` pinned backwards to freeze the
timer, and three separate call sites; "is this door open?" was a `Set` plus an
array of animation start times, which could disagree. Every one of those is now
a single value with named transitions.

- **UX** — illegal states are unrepresentable. You cannot move behind the FAQ,
  Chhaya cannot linger beside a finished run, a door cannot be pushed twice, and
  a clear cannot be overwritten by a same-frame fail.
- **DX** — each machine is testable without three.js, the DOM or a clock. The
  suite is 777 unit tests + 42 Playwright tests, and the machine modules' own
  suites pin every transition table in this file.
- **AX** — an agent can read this file and know every legal transition, its
  owner, and what is derived rather than stored, instead of grepping for flags.

---

## The inventory

| #   | Machine            | States                                                                   | Owner                                                           | Kind                                                                                                                                        |
| --- | ------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **GamePhase**      | `ready` · `running` · `failing` · `cleared`                              | `src/game/floorRun.ts`                                          | Explicit (step 4)                                                                                                                           |
| 2   | **MirrorVisual**   | `clear` · `fogged` · `captured`                                          | `src/game/frost.ts`                                             | Explicit (step 5)                                                                                                                           |
| 3   | **DoorPhase**      | `closed` · `opening` · `open`                                            | `src/game/passages.ts`                                          | Explicit (step 5)                                                                                                                           |
| 4   | **Echo mode**      | `patrol` · `chase` · `confused`                                          | `src/game/echo.ts`                                              | Pure machine, now documented                                                                                                                |
| 5   | **Pending shards** | `pending` → `banked` \| `forfeited`                                      | `src/game/houseState.ts` + `meta.ts`                            | Lifecycle, documented                                                                                                                       |
| 6   | **InputMode**      | `keyboard` · `mouse` · `hybrid`                                          | `src/engine/input.ts` + `main.ts`                               | Configuration, not a lifecycle                                                                                                              |
| 7   | **Input gate**     | FAQ `closed` · `open` ∥ composer `closed` · `open` ∥ ViewMode `tactical` | `src/ui/faq.ts` + `src/ui/feedback.ts` + `src/game/viewMode.ts` | Three pauses gate the loop: the FAQ overlay, the 📮 feedback composer (step007/T2 — the FAQ's document-driven shape), and the tactical view |
| 8   | **ViewMode**       | `focus` · `quad` · `overhead` · `tactical`                               | `src/game/viewMode.ts`                                          | Pure machine (M3/T3); `tactical` is the pause view                                                                                          |
| 9   | **Aaina overlay**  | `closed` · `open{tab}`                                                   | `src/ui/aaina.ts`                                               | Diegetic panel — does **not** pause                                                                                                         |
| 10  | **AudioEngine**    | `idle` · `running`                                                       | `src/audio/engine.ts`                                           | Starts on first gesture; `muted` is a flag, not a state                                                                                     |
| 11  | **Campaign**       | data: `seedBase` · `floor` · `tierComplete`                              | `src/game/campaign.ts`                                          | Pure data + transitions (M4/T1, grown to 70 floors in t7/T1 — terminal there for now, Act II's first three tiers); the single `tierComplete` re-arms as each Dwaar is left |

---

## 1. GamePhase — `src/game/floorRun.ts`

The master machine. Everything else derives from it.

| From      | Event                                  | To                                                                         |
| --------- | -------------------------------------- | -------------------------------------------------------------------------- |
| `ready`   | `startRun(now)`                        | `running { startedAt }`                                                    |
| `ready`   | `failRun(reason, now)`                 | `failing { startedAt: now, failedAt: now, resetAt: now + FAIL_FREEZE_MS }` |
| `running` | `failRun`                              | `failing { startedAt, failedAt: now, resetAt: now + FAIL_FREEZE_MS }`      |
| `running` | `clearRun(now)`                        | `cleared { startedAt, clearedAt: now }`                                    |
| `failing` | `failRun`                              | `failing` — unchanged reference; the original freeze window is kept        |
| `failing` | `tickFail(now)` where `now >= resetAt` | `ready`, with `shouldReset: true`                                          |
| `cleared` | `failRun`                              | unchanged — a fail-after-clear race is unrepresentable                     |

**Invariants.** `cleared` is terminal. A re-fail during the freeze never extends
the freeze. `runElapsedMs` is pinned at `failedAt`/`clearedAt` once the run ends,
so the HUD clock can never tick on a corpse. Ratified decision (M3): the wall
clock runs under every pause (FAQ, tactical) — best times are pause-proof by
construction.

**Derived:** `active(p)` (ready or running) gates simulation and verbs;
`runElapsedMs(p, now)` is the only timer source.

---

## 2. MirrorVisual — `src/game/frost.ts`

Not a stored field: a **derivation** over `(captured, foggedUntil, now)`.

| Condition (in order)                         | Result                                                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `captured`                                   | `captured` — never lifts on its own; a floor reset (fail-retry) un-captures beacons and re-seals the exit (`resetFloor` re-inits the runtime) |
| `foggedUntil !== null && now <= foggedUntil` | `fogged`                                                                                                                                      |
| otherwise                                    | `clear`                                                                                                                                       |

`applyFog` is the only writer: a beacon sets `captured`; a standing mirror sets
`foggedUntil = now + duration` — the duration is **caller-owned** (t6/T2: `main.ts`
passes `fogDurationMs(campaign.floor)`, the base 25 s everywhere and half of it
in the Furnace Wings, so the machine itself stays floor- and heat-blind).
`isFogged` is defined as
`mirrorVisual(...) !== 'clear'`, so sight and display cannot disagree.

**Orthogonal:** `cracked` is damage, not sight. It tints the glass, does not
change what the glass shows or what can see through it, and survives a fog
lifting. It is deliberately not part of this union.

**T4 content note (the distorting mirrors, t4/T3).** The Carnival's bent rose
panes are **fogable standing-class glass**: `fogTarget`, `crackTarget` and
`applyFog` admit the `'distort'` kind exactly like `'standing'` (a fog lasts
the same 25 s and banks nothing — a distort pane is not a beacon), so the
derivation above is the whole story of their sight. The lie itself — the
player's **apparent position**, displaced by a pane's fixed per-id delta while
that pane sees them — is never stored: it is derived once per fixed step
(`distort.ts apparentPlayer`) and consumed by the echo sense/chase and the map
pings, a look-alike (below), not a machine.

---

## 3. DoorPhase — `src/game/passages.ts`

| From         | Event                        | To                                       |
| ------------ | ---------------------------- | ---------------------------------------- |
| `closed`     | `beginDoorSlide(d)`          | `opening { t: 0 }`                       |
| `opening`    | `stepDoor(d, dtS)`           | `opening { t + dtS·1000/DOOR_SLIDE_MS }` |
| `opening`    | `stepDoor` reaching `t >= 1` | `open { t: 1 }`                          |
| `open`       | anything                     | `open` — terminal                        |
| non-`closed` | `beginDoorSlide`             | unchanged (one push per door)            |

**Owner note.** `main.ts` keeps two maps: `doorStates` (the machine — the only
truth for "still pushable") and `doorById` (mesh binding for the animation).
The `open` state outlives `GamePhase` resets: the house remembers its secrets.

---

## 4. Echo mode — `src/game/echo.ts`

A pure machine: `updateEcho` returns a new `EchoState` and never mutates.

| From     | Condition                                                                                 | To                                                                                    |
| -------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| any      | ≥2 fogged eyes within `CONFUSE_FOGGED_R` **and** 0 clear eyes within `CONFUSE_UNFOGGED_R` | `confused` — chase memory is kept; `target`/`field` caches are dropped; heading spins |
| `patrol` | a sense check succeeds                                                                    | `chase` (memory `now + CHASE_MEMORY_MS`)                                              |
| `chase`  | `now >= loseMemoryAt`                                                                     | `patrol`                                                                              |

**Sub-state, not extra modes:** `target` + `field` are a cache invalidated when
the target cell changes; `lastSensedCell` + `loseMemoryAt` are the chase memory;
`nextSenseAt` throttles sensing to `SENSE_INTERVAL_MS`; `stuckAwarded` is a
one-shot latch set by `main.ts` the first time an echo is seen confused, so the
`SHARD_STUCK` bounty is paid once per run. The confusion override is evaluated
before sensing, so a confused echo does not refresh its memory that tick.

**The sense axis (t7/T2) — a second mode dimension, not a third mode:** every
echo carries `sense: 'glass' | 'ears'`, set once at spawn
(`initEchoes(..., sense)`; `main.ts` derives it with `echoSenseForFloor()` =
`venue === null && tierOf(floor) === 7 ? 'ears' : 'glass'` at all three spawn
sites — build, reset, and the Dwaar sport respawn; the default `'glass'` keeps
every pre-T7 call site byte-identical). An **ears** echo (the Whisper Library,
61–70) skips the confusion census and the mirror/lure eye logic entirely — it
cannot be confused and a clear pane tells it nothing; on the same
`SENSE_INTERVAL_MS` tick it reads the noise ring instead (the look-alike row
below): `loudestAt(noise, echo)` non-null → `chase` that cell with the SAME
`CHASE_MEMORY_MS`, quiet → `patrol`. A **glass** echo never reads the ring —
noise-immune, pinned by a unit test that lands a ping exactly on a tier-1
echo and watches it stay patrolling. Venue side-floors always behave tier-one.

---

## 5. Pending shards — `src/game/houseState.ts` + `meta.ts`

A lifecycle, not a state union, because the terminal states live in different
places:

| From      | Event           | To                                                                  |
| --------- | --------------- | ------------------------------------------------------------------- |
| —         | beacon captured | `pending` (`house.shards += SHARD_BEACON`)                          |
| `pending` | floor cleared   | **banked** — `awardShards(meta, pending + clear bonus)`, then saved |
| `pending` | floor failed    | **forfeited** — `resetFloor` re-inits `house`, pending returns to 0 |

**Invariant:** pending shards never reach `meta` except through a clear. There
is no path where a fail banks them.

---

## 6. InputMode — `src/engine/input.ts` + `main.ts`

`keyboard` | `mouse` | `hybrid`. A configuration with side effects, not a
lifecycle:

- `hybrid` requests pointer lock on canvas click; the other modes never do.
- Every change writes `meta.mode`; `meta.mode` is the boot value.
- Pointer lock itself is browser-owned; `InputCollector` only mirrors it by
  clearing held keys on `pointerlockchange`.
- **Dual-use key claims** (`withoutKey`, claimed per fixed step in `main.ts`):
  a key that also drives a verb yields only its movement share while the verb
  owns it — the aaina key (`I` by default, whatever her binding is after a
  remap) while Aaina is open (her toggle), E while the push hint shows
  (the door). The claim drops the key from the snapshot before
  `keysToMoveInput` sees it, so exactly that key's turn contribution
  disappears; mouse and every other key are untouched.

---

## 7. Input gate — `src/ui/faq.ts` + `src/ui/feedback.ts` + `src/game/viewMode.ts`

Three pauses, one gate. The FAQ overlay is two states derived from the element
(`open` when `root.hidden === false`), toggled by the HUD button, the `H` key,
the close button and a backdrop click. The 📮 feedback composer (step007/T2)
is the same document-driven dialog — `trapDialog` over `root.hidden`, no
machine of its own — and it pauses like the FAQ because its textarea must own
the keyboard. The tactical view (M3/T4) is a
`ViewMode` value (`focus` · `quad` · `overhead` · `tactical` — §8 below),
entered with `T` from overhead and left with `Esc` (after one Esc-clears
waypoints press) or any `[V]` press.

Together they are the input gate's second half:
`simActive = active(phase) && faqHidden && feedbackHidden && !isTactical(view)` — and the same
terms gate the verbs through `canAct` (frost, step-through, push). This
is the machine that used to be implicit and unread — the reason you could
walk the maze while reading the FAQ. Aaina's panel is deliberately outside
this gate (§9): she is diegetic, so the floor keeps running while she talks —
but her one dual-use key (her toggle, `I` by default since m5) is claimed per
fixed step exactly as §6 documents for the other shared keys.

---

## 8. ViewMode — `src/game/viewMode.ts`

How the floor is presented (M3/T3): `focus` · `quad` · `overhead` ·
`tactical`. A pure machine — `main.ts` owns the single `view` value, drives it
with `[V]` and the tactical exits, and `setViewMode` applies the side effects
(quad drops to pixel ratio 1, the map modes own the 2D canvas's visibility,
the HUD chip names the mode you landed in).

| From                  | Event (`[V]`, no repeat) | To                               |
| --------------------- | ------------------------ | -------------------------------- |
| `focus`               | `cycleView`              | `quad`                           |
| `quad`                | `cycleView`              | `overhead`                       |
| `overhead`            | `cycleView`              | `focus`                          |
| `tactical`            | `cycleView`              | `focus` — any V leaves           |
| `overhead`            | `T` keydown              | `tactical` (T4's pause)          |
| `tactical`            | `Esc` with waypoints     | `tactical` — marks cleared first |
| `tactical` (no marks) | `Esc` (`exitTactical`)   | `focus`                          |

The pause predicate is part of the input gate (§7), not a field: `isTactical`
is one of the three `canAct`/`simActive` terms. `showsOverhead` marks the two
map modes — `overhead` (walking map) and `tactical` (paused map) share T4's
canvas render with the fog of war, Chhaya pings and your waypoints.

---

## 9. Aaina overlay — `src/ui/aaina.ts`

The FAQ overlay's diegetic sister (M3/T2): `closed` or `open{tab}` with
`tab ∈ ask | hint | lore`, derived from `root.hidden` plus the tab value —
exactly the FAQ overlay's shape plus one tab axis. `toggle()` (her key — `I`
by default since m5, or the HUD 💬 button) always reopens at the `ask` tab;
the tab buttons, the close button, `Esc` and her key again close her. She is
**not** a pause: `canAct` deliberately
excludes her, so movement, echoes and Chhaya keep running while she talks —
she reads the floor per frame (`refreshAaina`) and the hint tab prices its
offer live (§5's shard economy; `hintCost(hintsUsed)` = 5, 10, 15 … per
floor). The lore tab gates on cleared floors, not shards.

---

## 10. AudioEngine — `src/audio/engine.ts`

`idle` → `running`, once, on the first user gesture — a keydown or a canvas
click (`{ once: true }` on both, plus an `audioGestureDone` flag in
`main.ts`; `start()` itself is idempotent, so there is no double-start path).
Everything sustained (drone, melody voice, pad, percussion filter) is built
exactly once inside `start`. There is no `running` → `idle`: the engine runs
until the tab dies. Under node/browserless the factory returns an inert stub
(the canvas-guard pattern), which is how the unit suite reaches the theory.

`muted` is a flag, not a state: it never pauses the scheduler — it zeroes the
master gain (`AUDIO_GAIN_CEILING` ↔ 0). Boot applies `meta.muted` before the
engine ever starts, so a muted boot stays silent; `[M]` and the HUD 🔊 button
toggle it and persist the choice. **Intensity is derived** (see look-alikes):
`main.ts` feeds `intensityFrom({ anger, chasing, failing, cleared })` every
frame; the scheduler smooths toward it (0.12 lerp per 50 ms wake-up).
(t7/T3: on the Whisper Library the feed multiplies the blend by
`TIER_SEVEN_INTENSITY_CEILING` 0.55 before handing it over — the whispered
ceiling that keeps the tier sparse, §11's tier-7 content note.)

---

## 11. Campaign — `src/game/campaign.ts`

Pure data, not a phase machine (M4/T1, grown to seven tiers — through Act II's
first three — in t7/T1): the spine
is `{ seedBase, floor, tierComplete }` and every transition returns a fresh
object — callers (`main.ts`) rebind their `campaign` binding; nothing mutates
in place.

| From                             | Event                                  | To                                                                               |
| -------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| —                                | `newCampaign(seedBase)`                | `{ seedBase, floor: 1, tierComplete: false }`                                    |
| `c.floor < 70`                   | `descend(c)` — the Stair Door was paid | `{ ...c, floor: floor + 1 }`; leaving a Dwaar also re-arms `tierComplete: false` |
| `c.floor >= 70`                  | `descend(c)`                           | **unchanged, by reference** — the campaign is TERMINAL at 70 (Act III's door)    |
| `isDwaar(c.floor)` (10/20/30/40/50/60/70) | `completeTier(c)` — Truth-Shard claim | `{ ...c, tierComplete: true }`                                                 |
| any other floor                  | `completeTier(c)`                      | unchanged, **by reference** — the shard is claimed in a hall only                |

**The tiers.** Floors 1–9, 11–19, 21–29, 31–39, 41–49, 51–59 and 61–69 are procedural —
`generateFloor` seeded by `floorSeed(c) = seedBase:floor`, braided and
stocked by `floorParams`; the seven threshold floors are fixed hand-authored
13×13 halls: floor 10 the `DWAAR_LAYOUT` Dwaar I, floor 20 the broader
`DWAAR_II_LAYOUT` (96 open cells — the Sentinel's beat needs the room), floor
30 the `DWAAR_III_LAYOUT` garden hall — the most open of the first three (107
open cells): dotted hedge runs, never a solid wall, with the central row and
column fully open so two 11-cell sightlines cross the hall (the
water-mirrors need the long view) — floor 40 the `DWAAR_IV_LAYOUT`
funhouse hall (101 open cells): four offset alcoves tucked one-per-wall
against the outer ring (each rotated one position on from the last — never
compass-aligned) around a central carousel — a radius-2 ring of 12 wall
cells with exactly four gaps at the compass midpoints and its 3×3 center
chamber standing open — and floor 50 the `DWAAR_V_LAYOUT` **sunken arena**
(101 open cells too, t5/T1): concentric rings — a two-cell-thick outer
promenade, a mid ring wall with exactly four gates at the compass midpoints,
and an inner corridor circling the 3×3 sanctum — invariant under 180°
rotation (the exit mirrors the entrance) and one connected component, because
four Sentinels need the room to walk their beats — and floor 60 the
`DWAAR_VI_LAYOUT` **crucible forge** (101 open cells too, t6/T1): twin
parallel forge corridors — two 3-wide halls (cols 1–3 and 9–11, rows 1–11,
33 cells each, the campaign's longest) joined at the ends by the open cross
runs and joined in the MIDDLE by a central 3×3 crucible chamber through
EXACTLY 4 connecting gaps (the only openings on its perimeter; the forge
mass stays wall) — invariant under 180° rotation (the exit mirrors the
entrance) and one connected component — and floor 70 the
`DWAAR_VII_LAYOUT` **library stacks** (95 open cells, t7/T1 — the quietest
hall in the house): four long parallel shelf-wall runs (rows 3/5/7/9, each
≥5 cells long) separated by fully-open single-cell aisles (rows 2/4/6/8/10)
— the reading room between the stacks — with four reading alcoves at the
shelf ends, one per shelf, each an open nook sandwiched between the shelf's
end and a stub wall, 180°-mirrored in pairs ((3,3)↔(9,9) and (9,5)↔(3,7)) —
invariant under 180° rotation (the exit mirrors the entrance) and one
connected component, because the duet needs the room to walk its beats and
the blind Echoes need stacks to listen past (`dwaarGrid()` derives any hall's
open cells, `maze.floorFromGrid` builds the grid).
`tierOf(floor)` maps 1–10 → 1, 11–20 → 2, 21–30 → 3, 31–40 → 4, 41–50 → 5,
51–60 → 6 and
61–70 → 7 —
the stage palette, music scale **and voice**, the echo sense axis (§4 —
tier 7's `'ears'`), portrait spawns (tier 2 only),
water spawns (tier 3 only), distort spawns (tier 4 only) and the Sentinels'
gates all read it — and `isDwaar(floor)` widens to 10, 20, 30, 40, 50, 60
and 70.
`floorParams` pins all seven ramps: tier 1 echoes `min(5, 2 + floor − 1)`
(Dwaar fixed 4), beacons 2,2,3,3,3,4,4,4,4,4, braid `0.12 + 0.01·(floor −
1)`, Chhaya `max(4500, 7000 − 300·(floor − 1))` (Dwaar 4000); tier 2 echoes
5,5,5,6,6,6,6,6,6,6 (Dwaar II fixed 5), beacons 4 throughout, braid
`0.22 + 0.005·(floor − 11)`, Chhaya `max(4000, 4500 − 50·(floor − 11))`
(Dwaar II 3800); tier 3 (t3/T1) echoes 6 on every floor (Dwaar III 6 too —
the water-mirrors are the tier's teeth, not the echo count), beacons 4
throughout, braid `0.24 + 0.004·(floor − 21)`, Chhaya `max(3600, 4200 −
60·(floor − 21))` (Dwaar III 3400); tier 4 (t4/T1) echoes **5 on every floor,
Dwaar IV included** — a deliberate step DOWN from tier three's 6 (the
ratified playability call: three lethal Sentinels walk tier 4, so the echoes
yield the stage) — beacons 4 throughout, braid `0.28 + 0.004·(floor − 31)`,
Chhaya `max(3200, 3800 − 60·(floor − 31))` (Dwaar IV 3000); tier 5 (t5/T1)
echoes **4 on every procedural floor, Dwaar V ALONE carrying 5** — the
row-9 apex duel, where the tier's teeth are the rising water, the decoys and
the all-four cast, not the echo count — beacons 4 throughout, braid
`0.30 + 0.004·(floor − 41)`, Chhaya `max(3000, 3600 − 60·(floor − 41))`
(Dwaar V 2900 — the sunken arena floods, Chhaya does not wait); tier 6
(t6/T1) echoes **4 on every procedural floor, Dwaar VI ALONE carrying 5** —
the four-Sentinel crucible duel is the tier's apex, its teeth are the heat
and the warden-guarded decoys, not the echo count — beacons 4 throughout,
braid `0.32 + 0.004·(floor − 51)`, Chhaya `max(2900, 3500 − 60·(floor −
51))` (Dwaar VI 2800 — the crucible burns, Chhaya does not wait); tier 7
(t7/T1) echoes **4 on every procedural floor, Dwaar VII ALONE carrying 5** —
the Taal+Gher duet is the tier's apex, its teeth are the hearing Echoes and
the noise economy, not the echo count — beacons 4 throughout, braid
`0.36 + 0.004·(floor − 61)`, Chhaya `max(2700, 3300 − 60·(floor − 61))`
(Dwaar VII 2600 — the stacks hush, Chhaya does not wait).

**Invariants.** `tierComplete` flips true only inside `completeTier` and only
on a Dwaar floor — the single flag always reads "the CURRENT tier's threshold
has been claimed", because `descend` re-arms it false the moment the player
LEAVES a Dwaar: the house continues past Dwaar I into the Hall of Ancestors,
past Dwaar II into the Gardens, past Dwaar III into the Carnival, past
Dwaar IV into the Flood Halls, past Dwaar V into the Furnace Wings and past
Dwaar VI into the Whisper Library, and
each new tier's floors pay their
first-clear bonus again on the re-armed flag. The Dwaar VII tier screen's
↻ Play again starts a `newCampaign` on a fresh random base instead of
reopening the house. `floor` lives in 1..`TIER_SEVEN_FLOORS` (the save
validator widened in the same t7/T1 commit — 71 is the first rejection;
round-trips pinned at 65 and 70),
`floorParams` clamps its input regardless, and **the campaign is TERMINAL at
70**: `descend()` there returns its input unchanged, no `descendAt` arms
below Dwaar VII, and the tier-complete screen is the end of the house until
tier 8 exists. (The T6-era terminus at 60 retired exactly as T5's did in t6:
60 → 61 is a real descent that re-arms the flag for tier seven.)

**The Sentinels accumulate — then rotate (spec §4.4, t3/T4 + t4/T2 + t5/T1 +
t6/T1 + t7/T1).**
The lethal Sentinels read `campaign.floor` in `main.ts` — spawn-side data,
not campaign state — through three presence functions (`taalPresent`,
`gherPresent`, `aavartPresent`; t5/T1 replaced the bare `>=` gates so the
rotation is one readable table, floors 1–40 pinned byte-identical by
truth-table tests, t6/T1 extending the table with rows 51/55/59/60, t7/T1
with 61/65/66/69/70 — and re-pinning row 60 `F,T,T`, Taal's rest extending
through the old crucible):

| Sentinel | Accumulation (tiers 1–4) | Tier 5 (floors 41–50)                        | Tier 6 (floors 51–60)                                        | Tier 7 (floors 61–70)                                                                 |
| -------- | ------------------------ | -------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Chhaya   | every floor from 1       | unchanged — she replays every path            | unchanged — she never rests at all                           | unchanged — she never rests at all                                                     |
| Taal     | every floor from 11      | **never rests** — `f >= 11`, Act II included | **rests 51–59** — his FIRST rest (t6); t7 extends it through 60 | **rests 51–65, returns 66** — `(11–50) ∥ f ≥ 66` (`TAAL_RETURN_FLOOR`); the beat in the silence |
| Gher     | every floor from 21      | **rests 41–49** — `21–40 ∥ 50` (Dwaar V)     | **walks the whole Wings** — `21–40 ∥ f >= 50`                | **rests 61–69** — keeps the Furnace (`21–40 ∥ 50–60`); joins ONLY at the Dwaar VII duet |
| Aavart   | every floor from 31      | **rests 41–49** — `31–40 ∥ 50` (Dwaar V)     | **walks the whole Wings** — `31–40 ∥ f >= 50`                | **rests all tier 7** — `(31–40) ∥ (50–60)`; returns in tier 8                          |

Taal: cameo on floor 5 (anger-only), Sentinel (`taalOutcome` → `'caught'`)
on **every floor from 11 down** — the gate was widened from "the tier-2
floors" to `floor ≥ TAAL_SENTINEL_FLOOR` so the ladder accumulates: he kept
his beat beside Gher and Aavart through the whole Carnival and walked the
Flood Halls alone — until t6/T1 gave him the rotation's first true rest
(the beat-water pairing was the Flood's gimmick, the
Furnace is Gher+Aavart's home and the heat re-tunes the fight) and t7/T1
LENGTHENED it — `taalPresent = (f >= TAAL_SENTINEL_FLOOR && f <=
TIER_FIVE_FLOORS) || f >= TAAL_RETURN_FLOOR`: the ratified net change on the
old floors is 60–65 gaining rest (the Dwaar VI crucible now replays as the
Gher+Aavart hall, its call-down deferred), and **floor 66 — mid-tier —
brings the beat back**: he walks 66–70, and in a house where the wardens
listen his every accent tick is a `NOISE_SPRINT_R` ping at his position —
noise he ignores and the ears echoes cannot refuse to chase, the bait you
cannot miss. Gher
(`src/game/gher.ts`, t3/T2) joined at 21
(`GHER_SENTINEL_FLOOR`) — his tier-3-only gate was widened in t4/T2 to every
floor from 21 down, the accumulation ratification found while wiring Aavart:
no sensing at all, a pure prediction machine (`interceptCell` reads the
player's commit against the BFS path to their nearest plausible goal;
`updateGher` glides a flow-field walk to the seal cell, retargeting every
`GHER_INTERCEPT_MS`). The counter is the feint: the moment the heading
leaves the path the prediction goes null and he holds. Aavart
(`src/game/avart.ts`, t4/T2) joined at 31 (`AVART_SENTINEL_FLOOR`) and walks
every floor of the Carnival beside them — the fourth and fastest (2.4 m/s,
he RUNS): a pure velocity-projection machine (`ambushCell` projects
`AVART_LEAD_S · speed/SPRINT_SPEED` seconds of travel along the heading onto
the BFS path to the player's nearest goal — sprint and the ambush lands ~3
cells ahead, stand still and it collapses onto their own next step; an
off-road projection sends him to the objective itself to wait —
`updateAavart` adopts a fresh read only every `AVART_INTERCEPT_MS`, so a
pace changed inside the window leaves him ambushing an empty road). The
counter is the pace change. On 41–49 the ramp hunts with Chhaya + Taal only
(t5/T1 — the rotation begins, the escalation rides the tier's water and
decoys instead of the cast), and at 50 `gherPresent`/`aavartPresent` call
both down again: **Dwaar V is the first all-four-Sentinel hall** — row 9's
apex (the Warden's Warrens) previewed at the close of Act II's opening
tier. On 51–59 the wheel turned the other way (t6/T1): **the Furnace Wings
hunt with Chhaya + Gher + Aavart — the tier's own teeth are the heat and
the guarded decoys — while Taal rests** (t7's extension now replays the
Dwaar VI crucible at 60 without him too — Chhaya + Gher + Aavart). On
61–65 the Library hunts with Chhaya + the hearing Echoes alone — the
quietest floors in the house; at 66 `taalPresent` brings the beat back
(66–70), at 70 `gherPresent` joins him for exactly one hall: **Dwaar VII is
the Taal+Gher duet in the stacks** — the third Sentinels' hall, NOT an
all-four apex; row 9's Warrens stay tier 9's, and Aavart rests until then.
All spawn at the patrol anchor FARTHEST from the player (t3/T4's
fairness fix — never an anchor-on-spawn catch).

**Tier-3 content, not new machines.** The Gardens dress by tier — palette,
the pastoral scale `[0,2,5,7,9]`, the sine (flute) melody voice — and the
standing water (2–4 pools a floor, rng-gated `params.water > 0` so tiers 1–2
draw nothing) rides the floor objects: pools are consumed by `sensesPlayer`
as unfogged eyes and by the overhead map as dots. Portraits stay tier-2
(`tier === 2`), which keeps the tier-1/3 rng streams clean. The water ripple
is a look-alike (below), not a machine.

**Tier-4 content, not new machines.** The Carnival dresses by tier — the
rose/magenta-on-night palette, the mischievous scale `[0,2,3,7,9]` (the Durga
frame with its third flattened), the melody voice back on the triangle (the
reed's wink after the Gardens' flute) — and the distorting mirrors (2–3 panes
a floor, rng-gated `params.distort > 0`, drawing LAST-LAST so the tier-1/2/3
streams stay byte-identical) ride the floor objects beside the water:
fogable standing-class glass (§2's content note) whose fixed per-id delta
(`distortDelta`) displaces the player's apparent position while a pane sees
them — derived per fixed step by `distort.ts apparentPlayer`, fed to the echo
sense/chase and the map pings. The displacement is a look-alike (below), not
a machine.

**Tier-5 content, not new machines (Act II, t5/T2–T4).** The Flood Halls
dress by tier — the drowned indigo-green palette, the dark pentatonic
`[0,3,5,7,10]` with the melody back on the triangle — and carry Act II's two
signature systems beside the rotation above:

- **The mirror-you decoys** (`src/game/decoy.ts`, t5/T2) — Act II's first
  form: the house sends glass copies of the Surveyor ahead. A copy spawns
  every `DECOY_SPAWN_EVERY_MS` (jittered 0.8–1.2×) at an open cell 8–12 BFS
  cells from the player, max `DECOY_MAX_ALIVE` unshattered at once, and
  flow-walks toward the EXIT at `DECOY_SPEED` forever (copies don't drown —
  the water is exempt from them, not them from the water). `DecoyState` is
  plain per-entity data (`{ id, x, y, born, shattered }`) in a list owned by
  `main.ts`'s sim, not a row above: the only state worth naming is the
  `shattered` one-shot gate, and the interesting behavior — an Echo reading
  the NEARER of player/copy as "the player" — lives in the echo sense (§4),
  not in a decoy mode. Touching a copy shatters it once for `DECOY_SHARD`
  shards (pending, forfeited with any fail like beacon shards). **"Protected
  by enemies" was deferred here** to the deeper Act II tiers (documented in
  spec §2.3) — this tier's copies were lures and
  piggy-banks, nothing more; the protection landed in tier 6 (the tier-6
  content note below). Mistaken-for-the-player stays deferred. The copy wears
  an exact `createDecoy(look)`
  clone of the player avatar; the overhead map tells them apart by shape
  (hollow gold ring vs your solid arrow), never by colour alone.
- **The rising water** (`src/game/waterLevel.ts`, t5/T3) — a look-alike
  (below), not a machine: the level is a pure derived function of the run
  clock.

**Tier-6 content, not new machines (the Furnace Wings, t6/T1–T4).** The Wings
dress by tier — the ember/copper-on-charcoal palette, the urgent
Phrygian-adjacent pentatonic `[0,1,5,7,8]` (the melody voice stays the
triangle) — and carry the tier's two signature systems beside the rotation
above:

- **The heat** (`src/game/heat.ts`, t6/T2) — a **derived modifier**, not a
  machine (the look-alike row below): `heatOn(floor)` = 51 ≤ floor ≤ 60,
  and everything the Furnace does hangs off that one derivation —
  `fogDurationMs(floor)` (25 s cool → 12.5 s hot, `main.ts` passes it into
  `applyFog`, which stays heat-blind — see §2) and `crackAngerFor(floor)`
  (15 cool → 25 hot, `main.ts` passes it into `applyCrack` on the
  sprint-crack path; Taal's +20 touch is anger, not a crack, and never
  routes here). The dressing — the warm charcoal scene haze, the one low
  ember point light, the static heat-shimmer gradient quad (reduced-flash
  safe by construction: nothing animates) — is set per `buildFloor`, never
  per frame, and re-derived from the stage palette first so leaving the
  Wings restores the stage exactly. Aaina gained a `heatNear` hint kind
  ("The furnace breathes — your frost melts fast, and every crack you leave
  burns wider."), slotted chhaya → heatNear → anger → stuck.
- **The warden guards the copies** (t6/T3) — Act II's decoy protection:
  `gherObjectives(base, decoys, grid)` extends the Encircler's objective
  candidate list (uncaptured beacons + stair door) with the ALIVE decoy
  cells, and the nearest-objective BFS decides as always — a copy crossing
  his sector pulls the seal onto it. `main.ts` feeds the list only where
  Gher walks AND copies spawn (21–40's feed is byte-identical: `decoys` is
  `[]` there; the live pairing is 50–60); `sealsDecoyCell` is the caption's
  eye — once per floor build (`gherCopyAnnounced`, cleared in `buildFloor`
  only, the `floodAnnounced` precedent), "The warden guards the copy." —
  and `gherSeal()` joined the debug faucet as the ward's live witness.
  Aavart keeps the bare objectives: the Ambusher reads the player, the
  Warden reads the house. The decoy stream itself widened to 41–60
  (`tierOf >= 5`; t7 keeps the `>= 5` gate — the copies walk the Library
  too); **the water did not** — `waterActiveFloor` stays
  `tierOf === 5`, the Furnace burns dry (a flooding furnace contradicts
  the heat).

**Tier-7 content, not new machines (the Whisper Library, t7/T1–T3).** The
Library dresses by tier — the moonlit lavender-grey palette (void
`0x0a0a12`, lavender glass, dusk rose, slate walls, the gold exit the one
warm note), the whispered set `[0,2,3,7,8]` with the melody back on the
sine (the Gardens' flute voice, here at a hush: the tier-7 audio feed
multiplies the intensity blend by `TIER_SEVEN_INTENSITY_CEILING` (0.55), so
a full chase tops out ≈ 0.52 and a calm floor sits ≈ 0.11 — the melody
stays sparse whatever the wardens do) — and carries the tier's signature
systems beside the rotation above:

- **The noise ring** (`src/game/noise.ts`, t7/T2) — a look-alike (the row
  below), not a machine: `NoiseEvent {x, y, r, at}` pings appended by
  `emit` and pruned by TTL, with `hears`/`loudestAt` as the ears echoes'
  whole sense. `main.ts` feeds it while the sim is live: sprint-moving
  rings `NOISE_SPRINT_R` (7 m) every fixed step, walk-moving rings
  `NOISE_WALK_R` (4 m) per `NOISE_WALK_EVERY_MS` (500 ms), standing and
  turning in place are silent, frost/push/step-through ring
  `NOISE_ACTION_R` (2.5 m) once at the action, and from floor 66 Taal's
  even-beat accent ticks ring `NOISE_SPRINT_R` at HIS position
  (edge-detected so ~30 fixed steps ring once). The ring resets in
  `buildFloor` and `resetFloor`; it is invisible by design — no map draws,
  no floorObjects changes (the rng streams stay pinned; the noise adds no
  draws) — the economy is audio and knowledge.
- **The hearing wardens** — §4's sense axis: `echoSenseForFloor()` marks
  the tier's echoes `'ears'` at spawn; they skip the glass census entirely
  and chase the nearest audible ping with the usual `CHASE_MEMORY_MS`, so
  the counterplay is pace, not frost. The FIRST noise-caused chase per
  floor speaks the caption "A shelf-warden heard you." (en/hi;
  `noiseChaseAnnounced`, the `floodAnnounced` precedent); ears echoes
  never speak the glass line. Aaina gained the `whisperNear` hint kind
  ("They are blind here — but they listen. Walk. Never run the
  stacks."), slotted after `avartNear`, before `chhaya` — the stacks' rule
  outranks the shadow. Tester hooks: `noise()` (the live ring's size) and
  `echoMode(i)` (the ears witness), additive.
- **Frost keeps its objective, loses its crowd** — on 61–70 a fog still
  captures beacons and blinds glass eyes (there are none that matter), but
  an ears echo cannot be CONFUSED: the ≥2-fogged-eyes census is glass-only
  (§4), so the fog's stall-and-spin power rests until tier 7 ends.

**Tier interstitials (t2/T5, t3/T1, t4/T1, t5/T1, t6/T1, t7/T1).** Every Dwaar clear claims
its Truth-Shard and banks it at once; what the player SEES splits by tier.
Dwaar I–VI raise a 1.8 s auto-dismiss banner (`✦ Truth-Shard
I/II/III/IV/V/VI
claimed — the house deepens…`) and the descent continues exactly as on any
ramp floor — the banner's hide clock is HUD-owned, so the 0.8 s descend hold
and the floor rebuild beneath it never cut the celebration short (t3/T1
moved Dwaar II here from the full screen; t4/T1 cascaded Dwaar III; t5/T1
cascaded Dwaar IV; t6/T1 cascaded Dwaar V; t7/T1 cascaded Dwaar VI — the
full screen belongs to the
TIER close now). Dwaar VII
raises the full tier screen (`✦ Truth-Shard VII claimed — Tier VII complete`,
floors and banked shards counted, Play again / Stay) — the campaign's
terminal close, the duet in the stacks' reward. ACT II itself announces with
the **opening banner**, not a screen: the FIRST floor-41 build of a session
raises `ACT II — THE DECEPTION` + `The house has begun copying you.` (en/hi)
for 3 s — once per session (the flag lives for the page's lifetime, never
the save; rebuilds of 41 stay quiet, venue floors never see it). The split
is presentation only — the campaign machinery above is byte-identical at all
seven thresholds.

**Derived:** `floorSeed`/`bestKey` (`seedBase:floor` — every floor is its own
best-time bucket), `tierOf`, `isDwaar`, the presence functions, the
`floorParams` ramp, and the HUD floor chip (`L02` on the tier-1 ramp,
`L14 · T2` in the Hall, `L24 · T3` in the Gardens, `L34 · T4` in the
Carnival, `L44 · T5` in the Flood Halls, `L54 · T6` in the Furnace Wings,
`L64 · T7` in the Whisper Library,
and the threshold floors naming
their Dwaar — `L10 · DWAAR I ✦`, `L20 · DWAAR II ✦`, `L30 · DWAAR III ✦`,
`L40 · DWAAR IV ✦`, `L50 · DWAAR V ✦`, `L60 · DWAAR VI ✦`,
`L70 · DWAAR VII ✦`, localized
`स्तर`/`द्वार` in Hindi).

---

## Look-alikes — deliberately _not_ machines

| Thing                                     | Why not                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Breath** (0..1)                         | A clamped resource with a continuous rate. No discrete states; `updateBreath` is arithmetic.                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Anger** (0..100)                        | A resource with a threshold. `isCollapse(h)` is the event; there is no state to be in.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Run timer**                             | Derived: `runElapsedMs(phase, now)`. Never stored.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **HUD hints**                             | Derived each frame by a precedence chain (step-through → push → sealed exit), not stored.                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Chhaya visibility**                     | Derived: visible iff a delayed path sample exists **and** the phase is active. She has no state of her own.                                                                                                                                                                                                                                                                                                                                                                                              |
| **Cracked glass**                         | Orthogonal damage flag on the runtime mirror; guarded once-per-mirror by `applyCrack`.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Audio intensity**                       | Derived per frame by `intensityFrom({ anger, chasing, failing, cleared })` (M3/T6); the engine only smooths toward the target.                                                                                                                                                                                                                                                                                                                                                                           |
| **`hintsUsed`**                           | A per-floor counter (0 at spawn, reset in `resetFloor`), not a state: it prices Aaina's next hint (`hintCost`), nothing more.                                                                                                                                                                                                                                                                                                                                                                            |
| **`visited` / pings**                     | Fog-of-war data (M3/T4): a `Set` of explored cells plus a decaying ping array (`pingOpacity`). Written by the fixed step, read by the map.                                                                                                                                                                                                                                                                                                                                                               |
| **Waypoints**                             | Tactical-view data: ivory cell marks (max `WAYPOINT_MAX`), click-toggled, first `Esc` cleared. A list with a cap, not a lifecycle.                                                                                                                                                                                                                                                                                                                                                                       |
| **Pointer lock**                          | Owned by the browser. We observe; we do not model.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Tester mode** (step007/T3)              | A session flag, not a machine: `?test=1` (parsed once at boot; `?test=0` the explicit off) gates the diagnostics hook's availability in production and mounts the TESTER chip + one-time banner. Never persisted, nothing transitions.                                                                                                                                                                                                                                                                   |
| **IDB save `v2`**                         | A versioning policy, not a machine (M4/T4, the meta-v1 row grown up): `validateSave` gates `v === 2` strictly — an imported or stored save is untrusted bytes until every field checks out, and a corrupt record reads as absent so boot falls through to defaults; `migrateMeta` maps the localStorage v1 era once (progress fresh, lang `en`); `mergeCampaign` is the campaign write-through; `idbGet`/`idbPut` degrade to null/no-op so storage never kills a boot.                                   |
| **⚙ Settings & the `a11y` block** (M5/T1) | A versioned configuration document, not a machine: `{ reducedFlash, captions, textScale, keyMap }` rides the IDB save — optional in `validateSave`, defaulted by `normalizeSave`, so an m4 save upgrades in place. The ⚙ overlay (`src/ui/settings.ts`) is pure chrome over the document: toggles apply at once and persist; consumers read flags, nothing transitions.                                                                                                                                  |
| **KeyMap** (M5/T2)                        | A versioned configuration document: action → `KeyboardEvent.code`. `rebind(map, action, code)` is a pure function returning a fresh map plus a `conflict` name (the guard refuses a key another action owns; only the default `turnR`/`push` pair may share `E`, resolved by context — the push hint — not by state). `actionFor(code, map)` is a reverse lookup, not a transition.                                                                                                                      |
| **`perf` preset** (M5/T4)                 | A versioned configuration document: `'auto' \| 'low' \| 'mid' \| 'high'` in the save. `autoPreset(fps, dpr)` is a pure grader with hysteresis fed by a rolling 5 s FPS average; `PROFILES` maps a preset to `{ pixelRatioCap, heroRt, heroRtSize, chhayaBob }` — applied live for pixel ratio, on the next floor build for hero RTs. A derivation feeding a document, not a lifecycle.                                                                                                                   |
| **Captions** (M5/T3)                      | Derived events, not a state: game moments push immutable `CaptionEvent`s into the pure `captionFeed` (dedupe by id within ttl, trim expired); `renderCaptions` shows the latest two, fading. With captions off nothing about the game differs — the bar observes the machines above, it never joins them.                                                                                                                                                                                                |
| **Water ripple** (t3/T3)                  | Derived TTL data over a timestamp, not a machine (MirrorVisual's fog contract, one tier down): each pool carries `rippledAt: number \| null`; `rippleState(at, now)` = `at !== null && now < at + WATER_RIPPLE_MS` (10 s, exclusive expiry). The trigger is a per-fixed-step proximity check (`rippleTrigger`), the dimmed 3D patch and the dimmed map dot both read the same derivation — sight and display cannot disagree. Standing in a pool past the TTL re-ripples it (the fog-refresh semantics). |
| **Distortion** (t4/T3)                    | The player's apparent position, not a machine: while the first unfogged distort pane in list order sees the player (within `SENSE_RANGE`, clear mirror↔player LOS), `distort.ts apparentPlayer` returns the true spot displaced by that pane's fixed per-id delta (`distortDelta`, ±`DISTORT_MAX_CELLS` axis-aligned cells); otherwise the truth. Derived once per fixed step and consumed by the echo sense check, the chase cell and the map pings — fog the seeing pane and the next step tells the truth again. The pane's fog state itself is MirrorVisual (§2), nothing more. |
| **Water level** (t5/T3)                   | A pure derived function of the run clock, not a machine: `waterLevel(runElapsedMs(phase, now))` = `min(WATER_MAX_M, elapsed/WATER_FULL_S · WATER_MAX_M)` from the run's first input (Dwaar V's sunken arena floods on the faster `DWAAR_V_WATER_S`; off the Flood Halls the level is pinned 0). Everything the flood does is one of three derivations over that number: `speedFactor` (everyone wades at ×`WATER_SLOW` past 0.6 m — main multiplies the movement dt; the decoys are exempt, copies don't drown), `eyeBlind` (a standing mirror stops being an Echo eye past `WATER_EYE_OFF_M` — `sensesPlayer` skips it), and `mirrorWaterScale` (the glass visibly sinks: `scale.y = max(0.4, 1 − level/2)`). The translucent flood plane rides `waterLevelNow`, refetched per frame; a fail/restart rewinds the clock, so the level never survives a floor. |
| **Heat** (t6/T2)                          | A derived modifier, not a machine — a look-alike in the water-level's exact shape, one tier down: `heatOn(floor)` = `51 ≤ floor ≤ 60` (`HEAT_FLOOR_START`..`TIER_SIX_FLOORS`) is the whole state, and nothing is stored anywhere. Every effect is one derivation over the floor number: `fogDurationMs(floor)` (the fog's stay — `FOG_DURATION_MS` cool, halved hot, passed INTO `applyFog` by `main.ts` so the MirrorVisual machine stays heat-blind, §2) and `crackAngerFor(floor)` (the sprint-crack's anger — `CRACK_ANGER` cool, `HEAT_CRACK_ANGER` 25 hot, passed INTO `applyCrack`). No transitions, no flags: a floor is hot or it is not, and the number follows. Taal's +20 touch is anger, not a crack — it never routes through here. The furnace dressing (haze colour, ember light, static shimmer quad) is per-`buildFloor` scene state, re-derived from `heatOn` each rebuild, never per frame. |
| **Noise ring** (t7/T2)                    | Derived events, not a machine — the captions-feed's shape wearing movement data: a plain `NoiseEvent[]` (`{x, y, r, at}`) owned by `main.ts`'s sim, appended by `emit(list, x, y, r, now)` (append + drop pings at or past `NOISE_TTL_MS` 1200 ms + drop-oldest past `NOISE_MAX_EVENTS` 24; never mutates its input) and pruned every fixed step, so standing still decays too. The readers are pure derivations: `hears(list, ex, ey)` = any ping with `dist ≤ r` (boundary inclusive) and `loudestAt(list, ex, ey)` = the NEAREST audible ping's position (tie → earlier), the ears echo's whole chase target (§4). Nothing transitions, nothing is stored on the echo — a ping is a timestamp with a radius, and silence is just an empty list. Invisible by design: no map draws, no floorObjects draws — the noise economy is audio and knowledge (Aaina's `whisperNear`), never pixels. |

---

## Adding a machine

1. Write the union with a `kind` tag; make illegal states unrepresentable.
2. Write pure transitions that return the input **by reference** when nothing
   changes — callers rely on identity to skip work.
3. Give it one owning module and no DOM/three.js imports.
4. Add the row to the table above and the section below it.
5. Unit-test every transition plus the no-op path.

## Verification

`npm run typecheck` clean · `npm run lint` clean · **777/777** unit ·
**42/42** Playwright (15 from m3 and earlier, 4 new for m4: manifest/SW
wiring, descend to floor 2, save round-trip resume, Hindi chrome via
`?lang=hi`; 5 for m5: rebind forward through the settings overlay, Space
toggles the focused ⚙ checkbox, `?perf=low` low path, export/import
round-trip through a real file, warp-caught restart within 2000 ms; 3 for m6:
venue demo floor, Escape peels one dialog layer, Aaina refuses hint sales on
a venue floor; 3 for step007: the ⓘ About panel, the 📮 feedback composer,
`?test=1` TESTER chip; 2 for t2: floor 11 loads tier two, sentinel Taal
catches while the floor-5 cameo stays anger-only; 2 for t3: floor 21 loads
the Gardens (both Sentinels, the water census, the flute), Gher catches on
contact; 2 for t4: floor 31 loads the Carnival (all three lethal Sentinels,
the distort census, the mischievous scale), Aavart catches and the carnival
glass displaces — `apparentPlayer()` reads the pane's exact lie until fogged;
2 for t5: floor 41 opens Act II (tier 5, the banner, the rotation — Gher and
Aavart null, Taal live), the water rises and a decoy walks to shatter for
shards; 2 for t6: floor 51 loads the furnace (tier 6, `taalPos()` NULL — the
rest — `gherPos()`/`avartPos()` live, `heat()` on with 12 500 ms fogs and
25-anger cracks, the `[0,1,5,7,8]` scale), a sprint-crack burns 25 anger and
`gherSeal()` lands on the guarded copy's cell; 2 for t7: floor 61 loads the
library (tier 7, the quiet rotation — taal/gher/avart all NULL — the
`[0,2,3,7,8]` scale on the sine at the hushed ≈ 0.11 intensity, `noise()`
rising under a held sprint), Taal's beat returns at 66 (`taalPos()` live
again, gher/avart still null) and a sprinting player flips a patrolling
ears echo to `chase` inside a sense tick — stand still and it patrols
again).

---

## Tunables

All timings and thresholds stay in `src/engine/constants.ts`:
`FAIL_FREEZE_MS`, `FOG_DURATION_MS`, `DOOR_SLIDE_MS`, `CHASE_MEMORY_MS`,
`SENSE_INTERVAL_MS`, `CHHAYA_DELAY_MS`, `CRACK_ANGER`, `ANGER_MAX`.
