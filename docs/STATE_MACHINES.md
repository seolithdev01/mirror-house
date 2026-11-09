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
  suite is 316 unit tests + 23 Playwright tests, and the machine modules' own
  suites pin every transition table in this file.
- **AX** — an agent can read this file and know every legal transition, its
  owner, and what is derived rather than stored, instead of grepping for flags.

---

## The inventory

| #   | Machine            | States                                      | Owner                                    | Kind                                                            |
| --- | ------------------ | ------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| 1   | **GamePhase**      | `ready` · `running` · `failing` · `cleared` | `src/game/floorRun.ts`                   | Explicit (step 4)                                               |
| 2   | **MirrorVisual**   | `clear` · `fogged` · `captured`             | `src/game/frost.ts`                      | Explicit (step 5)                                               |
| 3   | **DoorPhase**      | `closed` · `opening` · `open`               | `src/game/passages.ts`                   | Explicit (step 5)                                               |
| 4   | **Echo mode**      | `patrol` · `chase` · `confused`             | `src/game/echo.ts`                       | Pure machine, now documented                                    |
| 5   | **Pending shards** | `pending` → `banked` \| `forfeited`         | `src/game/houseState.ts` + `meta.ts`     | Lifecycle, documented                                           |
| 6   | **InputMode**      | `keyboard` · `mouse` · `hybrid`             | `src/engine/input.ts` + `main.ts`        | Configuration, not a lifecycle                                  |
| 7   | **Input gate**     | FAQ `closed` · `open` ∥ ViewMode `tactical` | `src/ui/faq.ts` + `src/game/viewMode.ts` | Two pauses gate the loop: the FAQ overlay and the tactical view |
| 8   | **ViewMode**       | `focus` · `quad` · `overhead` · `tactical`  | `src/game/viewMode.ts`                   | Pure machine (M3/T3); `tactical` is the pause view              |
| 9   | **Aaina overlay**  | `closed` · `open{tab}`                      | `src/ui/aaina.ts`                        | Diegetic panel — does **not** pause                             |
| 10  | **AudioEngine**    | `idle` · `running`                          | `src/audio/engine.ts`                    | Starts on first gesture; `muted` is a flag, not a state         |
| 11  | **Campaign**       | data: `seedBase` · `floor` · `tierComplete` | `src/game/campaign.ts`                   | Pure data + transitions (M4/T1); `tierComplete` terminal for beta |

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

## 7. Input gate — `src/ui/faq.ts` + `src/game/viewMode.ts`

Two pauses, one gate. The FAQ overlay is two states derived from the element
(`open` when `root.hidden === false`), toggled by the HUD button, the `H` key,
the close button and a backdrop click. The tactical view (M3/T4) is a
`ViewMode` value (`focus` · `quad` · `overhead` · `tactical` — §8 below),
entered with `T` from overhead and left with `Esc` (after one Esc-clears
waypoints press) or any `[V]` press.

Together they are the input gate's second half:
`simActive = active(phase) && faqHidden && !isTactical(view)` — and the same
three terms gate the verbs through `canAct` (frost, step-through, push). This
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

Pure data, not a phase machine (M4/T1): the spine is
`{ seedBase, floor, tierComplete }` and every transition returns a fresh
object — callers (`main.ts`) rebind their `campaign` binding; nothing mutates
in place.

| From                    | Event                                     | To                                                                          |
| ----------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| —                       | `newCampaign(seedBase)`                   | `{ seedBase, floor: 1, tierComplete: false }`                                |
| any                     | `descend(c)` — the Stair Door was paid    | `{ ...c, floor: floor + 1 }` — `tierComplete` is never touched here          |
| `floor === DWAAR_FLOOR` | `completeTier(c)` — Truth-Shard claim     | `{ ...c, tierComplete: true }`                                               |
| any other floor         | `completeTier(c)`                         | unchanged, **by reference** — the shard is claimed in the hall only          |

**The tier.** Floors 1–9 are procedural — `generateFloor` seeded by
`floorSeed(c) = seedBase:floor`, braided and stocked by `floorParams`; floor
10 is fixed: the hand-authored 13×13 `DWAAR_LAYOUT` threshold hall
(`dwaarGrid()` derives its open cells, `maze.floorFromGrid` builds the grid).
`floorParams` pins the whole ramp: echoes `min(5, 2 + floor − 1)` with the
Dwaar fixed at 4; beacons 2, 2, 3, 3, 3, 4, 4, 4, 4, 4; braid
`0.12 + 0.01·(floor − 1)`; Chhaya delay `max(4500, 7000 − 300·(floor − 1))`,
Dwaar 4000.

**Invariants.** `tierComplete` flips true only inside `completeTier` and only
on the Dwaar floor; nothing ever clears it (terminal for the beta — the tier
screen's ↻ Play again starts a `newCampaign` on a fresh random base instead of
reopening the tier). `floor` lives in 1..`TIER_ONE_FLOORS`: the Dwaar floor
completes the tier rather than descending, and `floorParams` clamps its input
regardless. Taal's floor-5 cameo reads `campaign.floor` in `main.ts` — he is
spawn-side data, not campaign state.

**Derived:** `floorSeed`/`bestKey` (`seedBase:floor` — every floor is its own
best-time bucket), `isDwaar(floor)`, the `floorParams` ramp, and the HUD floor
chip (`L02` on the ramp; the threshold floor names the tier — `L10 · DWAAR I
✦`, localized `स्तर`/`द्वार` in Hindi).

---

## Look-alikes — deliberately _not_ machines

| Thing                 | Why not                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Breath** (0..1)     | A clamped resource with a continuous rate. No discrete states; `updateBreath` is arithmetic.                                               |
| **Anger** (0..100)    | A resource with a threshold. `isCollapse(h)` is the event; there is no state to be in.                                                     |
| **Run timer**         | Derived: `runElapsedMs(phase, now)`. Never stored.                                                                                         |
| **HUD hints**         | Derived each frame by a precedence chain (step-through → push → sealed exit), not stored.                                                  |
| **Chhaya visibility** | Derived: visible iff a delayed path sample exists **and** the phase is active. She has no state of her own.                                |
| **Cracked glass**     | Orthogonal damage flag on the runtime mirror; guarded once-per-mirror by `applyCrack`.                                                     |
| **Audio intensity**   | Derived per frame by `intensityFrom({ anger, chasing, failing, cleared })` (M3/T6); the engine only smooths toward the target.             |
| **`hintsUsed`**       | A per-floor counter (0 at spawn, reset in `resetFloor`), not a state: it prices Aaina's next hint (`hintCost`), nothing more.              |
| **`visited` / pings** | Fog-of-war data (M3/T4): a `Set` of explored cells plus a decaying ping array (`pingOpacity`). Written by the fixed step, read by the map. |
| **Waypoints**         | Tactical-view data: ivory cell marks (max `WAYPOINT_MAX`), click-toggled, first `Esc` cleared. A list with a cap, not a lifecycle.         |
| **Pointer lock**      | Owned by the browser. We observe; we do not model.                                                                                         |
| **IDB save `v2`**     | A versioning policy, not a machine (M4/T4, the meta-v1 row grown up): `validateSave` gates `v === 2` strictly — an imported or stored save is untrusted bytes until every field checks out, and a corrupt record reads as absent so boot falls through to defaults; `migrateMeta` maps the localStorage v1 era once (progress fresh, lang `en`); `mergeCampaign` is the campaign write-through; `idbGet`/`idbPut` degrade to null/no-op so storage never kills a boot. |
| **⚙ Settings & the `a11y` block** (M5/T1) | A versioned configuration document, not a machine: `{ reducedFlash, captions, textScale, keyMap }` rides the IDB save — optional in `validateSave`, defaulted by `normalizeSave`, so an m4 save upgrades in place. The ⚙ overlay (`src/ui/settings.ts`) is pure chrome over the document: toggles apply at once and persist; consumers read flags, nothing transitions. |
| **KeyMap** (M5/T2)    | A versioned configuration document: action → `KeyboardEvent.code`. `rebind(map, action, code)` is a pure function returning a fresh map plus a `conflict` name (the guard refuses a key another action owns; only the default `turnR`/`push` pair may share `E`, resolved by context — the push hint — not by state). `actionFor(code, map)` is a reverse lookup, not a transition. |
| **`perf` preset** (M5/T4) | A versioned configuration document: `'auto' \| 'low' \| 'mid' \| 'high'` in the save. `autoPreset(fps, dpr)` is a pure grader with hysteresis fed by a rolling 5 s FPS average; `PROFILES` maps a preset to `{ pixelRatioCap, heroRt, heroRtSize, chhayaBob }` — applied live for pixel ratio, on the next floor build for hero RTs. A derivation feeding a document, not a lifecycle. |
| **Captions** (M5/T3)  | Derived events, not a state: game moments push immutable `CaptionEvent`s into the pure `captionFeed` (dedupe by id within ttl, trim expired); `renderCaptions` shows the latest two, fading. With captions off nothing about the game differs — the bar observes the machines above, it never joins them. |

---

## Adding a machine

1. Write the union with a `kind` tag; make illegal states unrepresentable.
2. Write pure transitions that return the input **by reference** when nothing
   changes — callers rely on identity to skip work.
3. Give it one owning module and no DOM/three.js imports.
4. Add the row to the table above and the section below it.
5. Unit-test every transition plus the no-op path.

## Verification

`npm run typecheck` clean · `npm run lint` clean · **316/316** unit ·
**23/23** Playwright (15 from m3 and earlier, 4 new for m4: manifest/SW
wiring, descend to floor 2, save round-trip resume, Hindi chrome via
`?lang=hi`; 4 new for m5: rebind forward through the settings overlay,
`?perf=low` low path, export/import round-trip through a real file,
warp-caught restart within 2000 ms).

---

## Tunables

All timings and thresholds stay in `src/engine/constants.ts`:
`FAIL_FREEZE_MS`, `FOG_DURATION_MS`, `DOOR_SLIDE_MS`, `CHASE_MEMORY_MS`,
`SENSE_INTERVAL_MS`, `CHHAYA_DELAY_MS`, `CRACK_ANGER`, `ANGER_MAX`.
