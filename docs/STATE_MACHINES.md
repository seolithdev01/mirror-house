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
  suite is 169 unit tests + 11 Playwright tests, and the machine modules' own
  suites pin every transition table in this file.
- **AX** — an agent can read this file and know every legal transition, its
  owner, and what is derived rather than stored, instead of grepping for flags.

---

## The inventory

| # | Machine | States | Owner | Kind |
|---|---|---|---|---|
| 1 | **GamePhase** | `ready` · `running` · `failing` · `cleared` | `src/game/floorRun.ts` | Explicit (step 4) |
| 2 | **MirrorVisual** | `clear` · `fogged` · `captured` | `src/game/frost.ts` | Explicit (step 5) |
| 3 | **DoorPhase** | `closed` · `opening` · `open` | `src/game/passages.ts` | Explicit (step 5) |
| 4 | **Echo mode** | `patrol` · `chase` · `confused` | `src/game/echo.ts` | Pure machine, now documented |
| 5 | **Pending shards** | `pending` → `banked` \| `forfeited` | `src/game/houseState.ts` + `meta.ts` | Lifecycle, documented |
| 6 | **InputMode** | `keyboard` · `mouse` · `hybrid` | `src/engine/input.ts` + `main.ts` | Configuration, not a lifecycle |
| 7 | **Input gate** | FAQ `closed` · `open`; view `focus` · `quad` · `overhead` · `tactical` | `src/ui/faq.ts` + `src/game/viewMode.ts` | Two pauses gate the loop: the FAQ overlay and the tactical view |

---

## 1. GamePhase — `src/game/floorRun.ts`

The master machine. Everything else derives from it.

| From | Event | To |
|---|---|---|
| `ready` | `startRun(now)` | `running { startedAt }` |
| `ready` | `failRun(reason, now)` | `failing { startedAt: now, failedAt: now, resetAt: now + FAIL_FREEZE_MS }` |
| `running` | `failRun` | `failing { startedAt, failedAt: now, resetAt: now + FAIL_FREEZE_MS }` |
| `running` | `clearRun(now)` | `cleared { startedAt, clearedAt: now }` |
| `failing` | `failRun` | `failing` — unchanged reference; the original freeze window is kept |
| `failing` | `tickFail(now)` where `now >= resetAt` | `ready`, with `shouldReset: true` |
| `cleared` | `failRun` | unchanged — a fail-after-clear race is unrepresentable |

**Invariants.** `cleared` is terminal. A re-fail during the freeze never extends
the freeze. `runElapsedMs` is pinned at `failedAt`/`clearedAt` once the run ends,
so the HUD clock can never tick on a corpse.

**Derived:** `active(p)` (ready or running) gates simulation and verbs;
`runElapsedMs(p, now)` is the only timer source.

---

## 2. MirrorVisual — `src/game/frost.ts`

Not a stored field: a **derivation** over `(captured, foggedUntil, now)`.

| Condition (in order) | Result |
|---|---|
| `captured` | `captured` — never lifts on its own; a floor reset (fail-retry) un-captures beacons and re-seals the exit (`resetFloor` re-inits the runtime) |
| `foggedUntil !== null && now <= foggedUntil` | `fogged` |
| otherwise | `clear` |

`applyFog` is the only writer: a beacon sets `captured`; a standing mirror sets
`foggedUntil = now + FOG_DURATION_MS`. `isFogged` is defined as
`mirrorVisual(...) !== 'clear'`, so sight and display cannot disagree.

**Orthogonal:** `cracked` is damage, not sight. It tints the glass, does not
change what the glass shows or what can see through it, and survives a fog
lifting. It is deliberately not part of this union.

---

## 3. DoorPhase — `src/game/passages.ts`

| From | Event | To |
|---|---|---|
| `closed` | `beginDoorSlide(d)` | `opening { t: 0 }` |
| `opening` | `stepDoor(d, dtS)` | `opening { t + dtS·1000/DOOR_SLIDE_MS }` |
| `opening` | `stepDoor` reaching `t >= 1` | `open { t: 1 }` |
| `open` | anything | `open` — terminal |
| non-`closed` | `beginDoorSlide` | unchanged (one push per door) |

**Owner note.** `main.ts` keeps two maps: `doorStates` (the machine — the only
truth for "still pushable") and `doorById` (mesh binding for the animation).
The `open` state outlives `GamePhase` resets: the house remembers its secrets.

---

## 4. Echo mode — `src/game/echo.ts`

A pure machine: `updateEcho` returns a new `EchoState` and never mutates.

| From | Condition | To |
|---|---|---|
| any | ≥2 fogged eyes within `CONFUSE_FOGGED_R` **and** 0 clear eyes within `CONFUSE_UNFOGGED_R` | `confused` — chase memory is kept; `target`/`field` caches are dropped; heading spins |
| `patrol` | a sense check succeeds | `chase` (memory `now + CHASE_MEMORY_MS`) |
| `chase` | `now >= loseMemoryAt` | `patrol` |

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

| From | Event | To |
|---|---|---|
| — | beacon captured | `pending` (`house.shards += SHARD_BEACON`) |
| `pending` | floor cleared | **banked** — `awardShards(meta, pending + clear bonus)`, then saved |
| `pending` | floor failed | **forfeited** — `resetFloor` re-inits `house`, pending returns to 0 |

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
  owns it — Q while Aaina is open (her toggle), E while the push hint shows
  (the door). The claim drops the key from the snapshot before
  `keysToMoveInput` sees it, so exactly that key's turn contribution
  disappears; mouse and every other key are untouched.

---

## 7. Input gate — `src/ui/faq.ts` + `src/game/viewMode.ts`

Two pauses, one gate. The FAQ overlay is two states derived from the element
(`open` when `root.hidden === false`), toggled by the HUD button, the `H` key,
the close button and a backdrop click. The tactical view (M3/T4) is a
`ViewMode` value (`focus` · `quad` · `overhead` · `tactical` — `src/game/viewMode.ts`),
entered with `T` from overhead and left with `Esc` (after one Esc-clears
waypoints press) or any `[V]` press.

Together they are the input gate's second half:
`simActive = active(phase) && faqHidden && !isTactical(view)` — and the same
three terms gate the verbs through `canAct` (frost, step-through, push). This
is the machine that used to be implicit and unread — the reason you could
walk the maze while reading the FAQ.

---

## Look-alikes — deliberately *not* machines

| Thing | Why not |
|---|---|
| **Breath** (0..1) | A clamped resource with a continuous rate. No discrete states; `updateBreath` is arithmetic. |
| **Anger** (0..100) | A resource with a threshold. `isCollapse(h)` is the event; there is no state to be in. |
| **Run timer** | Derived: `runElapsedMs(phase, now)`. Never stored. |
| **HUD hints** | Derived each frame by a precedence chain (step-through → push → sealed exit), not stored. |
| **Chhaya visibility** | Derived: visible iff a delayed path sample exists **and** the phase is active. She has no state of her own. |
| **Cracked glass** | Orthogonal damage flag on the runtime mirror; guarded once-per-mirror by `applyCrack`. |
| **Pointer lock** | Owned by the browser. We observe; we do not model. |
| **Meta save `v1`** | A versioning policy, not a machine: `loadMeta` validates `v === 1` and falls back to defaults; migrations arrive with the M4 save chain. |

---

## Adding a machine

1. Write the union with a `kind` tag; make illegal states unrepresentable.
2. Write pure transitions that return the input **by reference** when nothing
   changes — callers rely on identity to skip work.
3. Give it one owning module and no DOM/three.js imports.
4. Add the row to the table above and the section below it.
5. Unit-test every transition plus the no-op path.

## Verification

`npm run typecheck` clean · `npm run lint` clean · **169/169** unit ·
**11/11** Playwright (10 pre-existing, 1 new for the FAQ pause).

---

## Tunables

All timings and thresholds stay in `src/engine/constants.ts`:
`FAIL_FREEZE_MS`, `FOG_DURATION_MS`, `DOOR_SLIDE_MS`, `CHASE_MEMORY_MS`,
`SENSE_INTERVAL_MS`, `CHHAYA_DELAY_MS`, `CRACK_ANGER`, `ANGER_MAX`.
