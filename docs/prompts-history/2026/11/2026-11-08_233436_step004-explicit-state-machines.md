# step004 — Explicit state machines: find, decide, wire

- **Captured:** 2026-11-08 23:34:36
- **Step:** #step004
- **Project:** `mirror-house`

## Request (verbatim)

> Find all of the implicit state machines in my app. Make the best decision that will elevate all three: the user experience (UX), developer experience (DX), and agent experience (AX) always, without breaking anything.

## What was found

An inventory of eight stateful systems, seven of them implicit or undocumented:

| #   | Machine              | Where it lived before                                                                                      |
| --- | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Run phase            | Already extracted to `GamePhase` (commit `acc82bb`), verified here                                         |
| 2   | Mirror sight/display | Re-derived inline in `main.ts#syncFogVisuals` from `captured` / `foggedUntil`                              |
| 3   | Door lifecycle       | A `Set` of opened ids **plus** an array of animation start times — two truths that could disagree          |
| 4   | Echo mode            | A pure machine in `echo.ts`, but undocumented sub-state (field cache, chase memory, `stuckAwarded` latch)  |
| 5   | Pending shards       | A number in `HouseState` with bank/forfeit rules spread across `main.ts` and `meta.ts`                     |
| 6   | Input mode           | Enum + pointer-lock side effect + persisted meta                                                           |
| 7   | FAQ overlay          | A DOM `hidden` flag that **nothing read** — the cause of walking while reading                             |
| —   | Look-alikes          | Breath, anger, timer, hints, Chhaya visibility, cracked glass, pointer lock — documented as _not_ machines |

## What was decided

The repository already carried a plan (`docs/superpowers/plans/2026-11-08-refactor-explicit-state-machines.md`) with Task 1 committed. Rather than invent a competing architecture, the plan's shape was adopted and one part of it was **improved**:

- The plan kept `openedDoorIds` alongside a new `DoorAnim` — still two sources of truth. Replaced with a single `Map<id, DoorAnim>`; `doorById` only binds meshes. `doorsOpened()` now derives from the machine, keeping the debug-hook contract.

Two deviations, both recorded:

- The plan's e2e name was `sm: movement suppressed while FAQ open…`; the shipped test is `sm: movement is paused behind the FAQ and resumes on close` and asserts both directions.
- Verbs (frost / step-through / push) are gated on the same pause as movement, so pressing F while reading the FAQ cannot frost glass behind the overlay.

## What broke on the way

The first wiring inverted the overlay test: `!faq.root.hidden` is false when the overlay is _closed_ (`hidden === true` means not shown). Five existing e2e tests caught it immediately — no unit test could have, because the bug was in the frame gate. Fixed to `faq.root.hidden === true`; 11/11 after.

## Verification (actually run)

- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm test` — **130/130** (125 before; +5 machine tests)
- `npm run e2e` — **11/11** (10 pre-existing unchanged, 1 new)
- `npm run build` — succeeds; the 575 kB chunk warning is pre-existing (three.js)

`npx prettier --check` still flags `tests/e2e/smoke.spec.ts` and `src/game/mirror.ts` — verified pre-existing by running it against the `HEAD:` versions. Prettier's unrelated reformat was reverted to keep the diff reviewable.

## Files

- `src/game/frost.ts` — `MirrorVisual` + `mirrorVisual()`; `isFogged` becomes `!== 'clear'`
- `src/game/mirror.ts` — `MirrorFogState` aliased to `MirrorVisual`
- `src/game/passages.ts` — `DoorPhase` / `DoorAnim` / `createDoor` / `beginDoorSlide` / `stepDoor`
- `src/main.ts` — pause gate, single door truth, Chhaya visibility, visual derivation
- `tests/unit/frost.test.ts`, `tests/unit/passages.test.ts` — +5 tests
- `tests/e2e/smoke.spec.ts` — +1 pause test
- `docs/STATE_MACHINES.md` — the map (policy, inventory, per-machine transitions, look-alikes)
- `docs/superpowers/specs/2026-11-08-mirror-house-design.md` — §7.1 policy line
- `README.md` — one-line pointer
