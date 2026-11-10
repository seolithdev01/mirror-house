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
  suite is 487 unit tests + 34 Playwright tests, and the machine modules' own
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
| 11  | **Campaign**       | data: `seedBase` · `floor` · `tierComplete`                              | `src/game/campaign.ts`                                          | Pure data + transitions (M4/T1, grown to 30 floors in T3); the single `tierComplete` re-arms as each Dwaar is left                          |

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
`foggedUntil = now + FOG_DURATION_MS`. `isFogged` is defined as
`mirrorVisual(...) !== 'clear'`, so sight and display cannot disagree.

**Orthogonal:** `cracked` is damage, not sight. It tints the glass, does not
change what the glass shows or what can see through it, and survives a fog
lifting. It is deliberately not part of this union.

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

---

## 11. Campaign — `src/game/campaign.ts`

Pure data, not a phase machine (M4/T1, grown to three tiers in t3/T1): the spine
is `{ seedBase, floor, tierComplete }` and every transition returns a fresh
object — callers (`main.ts`) rebind their `campaign` binding; nothing mutates
in place.

| From                          | Event                                  | To                                                                               |
| ----------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| —                             | `newCampaign(seedBase)`                | `{ seedBase, floor: 1, tierComplete: false }`                                    |
| any                           | `descend(c)` — the Stair Door was paid | `{ ...c, floor: floor + 1 }`; leaving a Dwaar also re-arms `tierComplete: false` |
| `isDwaar(c.floor)` (10/20/30) | `completeTier(c)` — Truth-Shard claim  | `{ ...c, tierComplete: true }`                                                   |
| any other floor               | `completeTier(c)`                      | unchanged, **by reference** — the shard is claimed in a hall only                |

**The tiers.** Floors 1–9, 11–19 and 21–29 are procedural — `generateFloor`
seeded by `floorSeed(c) = seedBase:floor`, braided and stocked by
`floorParams`; the three threshold floors are fixed hand-authored 13×13 halls:
floor 10 the `DWAAR_LAYOUT` Dwaar I, floor 20 the broader `DWAAR_II_LAYOUT`
(96 open cells — the Sentinel's beat needs the room), floor 30 the
`DWAAR_III_LAYOUT` garden hall — the most open of the three (107 open cells):
dotted hedge runs, never a solid wall, with the central row and column fully
open so two 11-cell sightlines cross the hall (the water-mirrors need the
long view; `dwaarGrid()` derives any hall's open cells, `maze.floorFromGrid`
builds the grid). `tierOf(floor)` maps 1–10 → 1, 11–20 → 2 and 21–30 → 3 —
the stage palette, music scale **and voice**, portrait spawns (tier 2 only)
and the Sentinels' gates all read it — and `isDwaar(floor)` widens to 10, 20
and 30. `floorParams` pins all three ramps: tier 1 echoes `min(5, 2 + floor −
1)` (Dwaar fixed 4), beacons 2,2,3,3,3,4,4,4,4,4, braid `0.12 + 0.01·(floor −
1)`, Chhaya `max(4500, 7000 − 300·(floor − 1))` (Dwaar 4000); tier 2 echoes
5,5,5,6,6,6,6,6,6,6 (Dwaar II fixed 5), beacons 4 throughout, braid
`0.22 + 0.005·(floor − 11)`, Chhaya `max(4000, 4500 − 50·(floor − 11))`
(Dwaar II 3800); tier 3 (t3/T1) echoes 6 on every floor (Dwaar III 6 too —
the water-mirrors are the tier's teeth, not the echo count), beacons 4
throughout, braid `0.24 + 0.004·(floor − 21)`, Chhaya `max(3600, 4200 −
60·(floor − 21))` (Dwaar III 3400).

**Invariants.** `tierComplete` flips true only inside `completeTier` and only
on a Dwaar floor — the single flag always reads "the CURRENT tier's threshold
has been claimed", because `descend` re-arms it false the moment the player
LEAVES a Dwaar: Act I continues past Dwaar I into the Hall of Ancestors, Act
II past Dwaar II into the Gardens, and each new tier's floors pay their
first-clear bonus again on the re-armed flag. The tier screen's ↻ Play again
(Dwaar III's) starts a `newCampaign` on a fresh random base instead of
reopening the tier. `floor` lives in 1..`TIER_THREE_FLOORS`, and
`floorParams` clamps its input regardless.

**The Sentinels accumulate (spec §4.4, t3/T4).** Both Sentinels read
`campaign.floor` in `main.ts` — spawn-side data, not campaign state. Taal:
cameo on floor 5 (anger-only), Sentinel (`taalOutcome` → `'caught'`) on
**every floor from 11 down** — the gate was widened from "the tier-2 floors"
to `floor ≥ TAAL_SENTINEL_FLOOR` so the ladder accumulates: he keeps his beat
beside Gher throughout the Gardens. Gher (`src/game/gher.ts`, t3/T2) joins at
21 (`GHER_SENTINEL_FLOOR`) and walks every tier-3 floor: no sensing at all —
a pure prediction machine (`interceptCell` reads the player's commit against
the BFS path to their nearest plausible goal; `updateGher` glides a flow-field
walk to the seal cell, retargeting every `GHER_INTERCEPT_MS`). The counter is
the feint: the moment the heading leaves the path the prediction goes null
and he holds. Both spawn at the patrol anchor FARTHEST from the player
(t3/T4's fairness fix — never an anchor-on-spawn catch).

**Tier-3 content, not new machines.** The Gardens dress by tier — palette,
the pastoral scale `[0,2,5,7,9]`, the sine (flute) melody voice — and the
standing water (2–4 pools a floor, rng-gated `params.water > 0` so tiers 1–2
draw nothing) rides the floor objects: pools are consumed by `sensesPlayer`
as unfogged eyes and by the overhead map as dots. Portraits stay tier-2
(`tier === 2`), which keeps the tier-1/3 rng streams clean. The water ripple
is a look-alike (below), not a machine.

**Tier interstitials (t2/T5, t3/T1).** Every Dwaar clear claims its
Truth-Shard and banks it at once; what the player SEES splits by tier. Dwaar
I and Dwaar II raise a 1.8 s auto-dismiss banner (`✦ Truth-Shard I/II claimed
— the house deepens…`) and the descent continues exactly as on any ramp floor
— the banner's hide clock is HUD-owned, so the 0.8 s descend hold and the
floor rebuild beneath it never cut the celebration short (t3/T1 moved Dwaar
II here from the full screen: Act II continues into the Gardens). Dwaar III
raises the full tier-complete screen (Play again / Stay). The split is
presentation only — the campaign machinery above is byte-identical at all
three thresholds.

**Derived:** `floorSeed`/`bestKey` (`seedBase:floor` — every floor is its own
best-time bucket), `tierOf`, `isDwaar`, the `floorParams` ramp, and the HUD
floor chip (`L02` on the tier-1 ramp, `L14 · T2` in the Hall, `L24 · T3` in
the Gardens, and the threshold floors naming their Dwaar — `L10 · DWAAR I ✦`,
`L20 · DWAAR II ✦`, `L30 · DWAAR III ✦`, localized `स्तर`/`द्वार` in Hindi).

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

---

## Adding a machine

1. Write the union with a `kind` tag; make illegal states unrepresentable.
2. Write pure transitions that return the input **by reference** when nothing
   changes — callers rely on identity to skip work.
3. Give it one owning module and no DOM/three.js imports.
4. Add the row to the table above and the section below it.
5. Unit-test every transition plus the no-op path.

## Verification

`npm run typecheck` clean · `npm run lint` clean · **487/487** unit ·
**34/34** Playwright (15 from m3 and earlier, 4 new for m4: manifest/SW
wiring, descend to floor 2, save round-trip resume, Hindi chrome via
`?lang=hi`; 5 for m5: rebind forward through the settings overlay, Space
toggles the focused ⚙ checkbox, `?perf=low` low path, export/import
round-trip through a real file, warp-caught restart within 2000 ms; 3 for m6:
venue demo floor, Escape peels one dialog layer, Aaina refuses hint sales on
a venue floor; 3 for step007: the ⓘ About panel, the 📮 feedback composer,
`?test=1` TESTER chip; 2 for t2: floor 11 loads tier two, sentinel Taal
catches while the floor-5 cameo stays anger-only; 2 for t3: floor 21 loads
the Gardens (both Sentinels, the water census, the flute), Gher catches on
contact).

---

## Tunables

All timings and thresholds stay in `src/engine/constants.ts`:
`FAIL_FREEZE_MS`, `FOG_DURATION_MS`, `DOOR_SLIDE_MS`, `CHASE_MEMORY_MS`,
`SENSE_INTERVAL_MS`, `CHHAYA_DELAY_MS`, `CRACK_ANGER`, `ANGER_MAX`.
