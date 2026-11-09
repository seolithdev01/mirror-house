# Refactor: Explicit State Machines — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every state machine explicit — discriminated unions + pure transitions + single owner — eliminating the implicit lifecycle logic smeared across main.ts, fixing three known UX warts (movement while FAQ open, Chhaya lingering after clear, fail-freeze mouse spin class), and leaving all 116 unit + 10 e2e green plus one new e2e.

**Architecture:** `floorRun.ts` evolves into the master `GamePhase` machine (absorbing `floorFailed`/`freezeUntil`/timer lifecycle; input acceptance and Chhaya visibility derive from it). `frost.ts` gains `mirrorVisual()` as the single source of mirror sight+display state. `passages.ts` gains a typed door phase. A new `docs/STATE_MACHINES.md` maps every machine; the spec gains the "explicit machines" policy. No behavior changes except the three named wart fixes.

**Tech Stack:** unchanged.

## Global Constraints

- **Nothing breaks:** all existing unit tests keep passing (adapted only where the plan says), all 10 e2e keep passing UNCHANGED except where the plan explicitly extends one, the debug hook keeps every existing field name and semantics (`getPlayer/seed/look()/mode()/mirrors()/beaconsLeft()/anger()/shards()/attempts()/enemyCount()/enemyPos()/chhayaPos()/mirrorAt()/exitPos()/warp()/addAnger()/fail()/streak()/bestFor()/avatarPresent`), and shipped gameplay feel is untouched.
- Behavior changes allowed, exactly three: (1) simulation input suppressed while the FAQ overlay is open; (2) Chhaya hidden when phase is `cleared` or `failing`; (3) timer display during the fail-freeze reads the frozen value via `failedAt` (same displayed number as today's hack, cleaner source).
- Machine pattern (the new policy, applied here): each machine = one discriminated union (`kind` tag) + pure transition functions returning new states + one owning module; invalid states unrepresentable; registered in `docs/STATE_MACHINES.md`.
- TS strict + noUncheckedIndexedAccess; zero `any`; SPDX first lines; no Math.random; conventional commits `refactor(sm):` / `test(sm):` / `docs(sm):`.
- Constants: reuse `FAIL_FREEZE_MS` (constants.ts); add `DOOR_SLIDE_MS = 400`.

---

### Task 1: `GamePhase` — the master machine

**Files:**
- Modify: `src/game/floorRun.ts` (evolve into the phase machine; keep `isAtExit`/`EXIT_RADIUS`), `src/main.ts` (adopt it), `tests/unit/floorrun.test.ts` (rewrite for the machine)

**Interfaces — final shape (Consumes: `FAIL_FREEZE_MS`; Produces for everything else):**

```ts
export type FailReason = 'caught' | 'collapse';
export type GamePhase =
  | { kind: 'ready' }
  | { kind: 'running'; startedAt: number }
  | { kind: 'failing'; reason: FailReason; startedAt: number; failedAt: number; resetAt: number }
  | { kind: 'cleared'; startedAt: number; clearedAt: number };

export function createFloorRun(): GamePhase;                       // { kind: 'ready' }
export function active(p: GamePhase): boolean;                     // ready || running — simulation & input live
export function startRun(p: GamePhase, now: number): GamePhase;    // ready→running; idempotent otherwise
export function failRun(p: GamePhase, reason: FailReason, now: number, freezeMs?: number): GamePhase;
// running→failing (failedAt=now, resetAt=now+freezeMs); ready→failing (startedAt=now);
// failing→failing keeps ORIGINAL resetAt (re-fail during freeze is a no-op); cleared→no-op (race unrepresentable)
export function clearRun(p: GamePhase, now: number): GamePhase;    // running→cleared; else no-op
export function tickFail(p: GamePhase, now: number): { phase: GamePhase; shouldReset: boolean }; // failing & now≥resetAt → { ready, true }
export function runElapsedMs(p: GamePhase, now: number): number;   // ready 0; running now−startedAt; failing failedAt−startedAt; cleared clearedAt−startedAt
export function isAtExit(px: number, py: number, exitCx: number, exitCy: number): boolean; // unchanged
export const EXIT_RADIUS = 1.6; // unchanged
```

- [ ] **Step 1: Rewrite tests** (`tests/unit/floorrun.test.ts`) — transitions, idempotence, THE race (`failRun` after `clearRun` is a no-op), re-fail-during-freeze keeps original `resetAt`, `tickFail` boundary (now = resetAt−1 vs resetAt), elapsed in all four phases, `isAtExit` cases (keep existing).
- [ ] **Step 2: RED → implement → GREEN.**
- [ ] **Step 3: Rewire `src/main.ts`:** delete `floorFailed` and `freezeUntil`; `let phase = createFloorRun()`; timer start on first active input (`phase = startRun(phase, now)`); simulation gate (`active(phase) && !faqOpen` — FAQ gate lands in T3, wire the `active` half now); clear condition becomes `phase.kind === 'running' && exitUnlocked(...) && isAtExit(...)` → `phase = clearRun(phase, now)`; contact/collapse fails become `phase = failRun(phase, 'caught'|'collapse', now)` (dev `fail()` and `addAnger` routes too); each frame `tickFail(phase, now)` → on `shouldReset` run the existing `resetFloor()` body (attempts++, re-inits, HUD) with `phase = createFloorRun()`; delete the old `run.startedAt = now − frozenElapsedMs` timer-pin hack (use `runElapsedMs(phase, now)`); Chhaya recording gate `phase.kind === 'running'`; HUD timer chip from `runElapsedMs`.
- [ ] **Step 4: Gates + `npm run e2e` — 10/10.**
- [ ] **Step 5: Commit** — `refactor(sm): GamePhase master machine replaces floorFailed/freezeUntil/run lifecycle`

---

### Task 2: Mirror visual state + door phase

**Files:**
- Modify: `src/game/frost.ts`, `src/game/passages.ts`, `src/main.ts`, `src/engine/constants.ts` (`DOOR_SLIDE_MS=400`), tests

**Interfaces:**

```ts
// frost.ts — single source of mirror sight AND display state
export type MirrorVisual = 'clear' | 'fogged' | 'captured';
export function mirrorVisual(m: MirrorRuntime, now: number): MirrorVisual; // captured → fogged-until → clear
// isFogged(m, now) becomes `mirrorVisual(m, now) !== 'clear'` (export kept — echoes/passages consume it)
// NOTE (document in code): `cracked` is orthogonal DAMAGE state, not sight state — crack tint layers over any visual.

// passages.ts — typed door lifecycle
export type DoorPhase = 'closed' | 'opening' | 'open';
export interface DoorAnim { id: number; phase: DoorPhase; t: number }
export function stepDoor(d: DoorAnim, dtS: number): DoorAnim; // opening: t += dtS*1000/DOOR_SLIDE_MS, → 'open' at t≥1; others unchanged
```

- [ ] **Step 1: Tests** — `mirrorVisual` precedence (captured beats unexpired fog; expired fog → clear); `isFogged` equivalence; `stepDoor` progression/boundary/idempotence on 'open'.
- [ ] **Step 2: RED → implement → GREEN.**
- [ ] **Step 3: Rewire main.ts** — `syncFogVisuals` consumes `mirrorVisual` (delete its private re-derivation); door animation entries become `DoorAnim` records stepped via `stepDoor` (replace the inline 0.4s math; filter out `'open'` entries same as today's splice).
- [ ] **Step 4: Gates + e2e 10/10.**
- [ ] **Step 5: Commit** — `refactor(sm): mirrorVisual single source + typed door phase`

---

### Task 3: Unified input gate + Chhaya phase + e2e

**Files:**
- Modify: `src/main.ts`, `tests/e2e/smoke.spec.ts` (add 1 test → 11 total)

**Behavior (the three sanctioned changes):**
1. `const simActive = active(phase) && faqHidden;` — when `!simActive`, still call `input.snapshotAndReset()` every frame (drain-and-discard; kills the mouseDx build-up class everywhere, making the T8 reset-drain redundant — remove it); skip player/enemy/Chhaya/contact/door-step simulation... doors may keep animating (cosmetic, matches today's freeze behavior). Verbs (F/Space/E/H) still handled when `phase.kind !== 'failing'`.
2. `faqOpen` tracked from the overlay's `hidden` property each frame (no new state — derived).
3. Chhaya mesh visible iff `sampleDelayed(...) !== null && active(phase)` (hides on cleared/failing; hook `chhayaPos()` unchanged — it reports the sample regardless).

- [ ] **Step 1: New e2e** — `sm: movement suppressed while FAQ open, resumes after close`: goto fixed seed, record `getPlayer()`, open FAQ via `#mh-faq`, hold W 600ms, assert position unchanged; press H to close, hold W 600ms, assert moved > 0.5m. Add console-error collector as usual.
- [ ] **Step 2: Implement the gate; run `npm run e2e` → 11/11.**
- [ ] **Step 3: Full gates.**
- [ ] **Step 4: Commit** — `refactor(sm): unified input gate (FAQ pause), Chhaya phase visibility, e2e`

---

### Task 4: STATE_MACHINES.md + spec policy + close-out

**Files:**
- Create: `docs/STATE_MACHINES.md`
- Modify: `docs/superpowers/specs/2026-11-08-mirror-house-design.md` (§7.1 policy line), `README.md` (one line under How this repo works)

**STATE_MACHINES.md contents (the AX map):**
- The policy: "Every stateful system is an explicit machine: one discriminated union (`kind`), pure transition functions, one owning module, registered here. Resources (breath/anger/shards) and derived values (timer, hints) are NOT machines — say which you're adding."
- Per machine (GamePhase, MirrorVisual + cracked-orthogonal, Echo mode + sub-states (target/field cache, stuckAwarded latch), Chhaya (derived visibility rule), DoorPhase, InputMode (side-effects list), pending-shards (banked/forfeited rule)): states, transitions, owner module, invariants, what's derived vs stored.
- Non-machines section: resources, derived displays, browser-owned pointer lock, meta v1 versioning policy.
- Tunables cross-reference (constants.ts).

**Spec §7.1 addition (verbatim):** `State-machine policy: all lifecycle behavior is modeled as explicit discriminated-union state machines with pure transition functions, one owning module each, documented in docs/STATE_MACHINES.md. New features add machines, not scattered flags.`

- [ ] **Step 1: Write the doc from the shipped code (verify each transition against source — no aspirational rows).**
- [ ] **Step 2: Spec + README lines; full gates + 11/11 e2e; bundle check.**
- [ ] **Step 3: Commit** — `docs(sm): STATE_MACHINES.md map + spec policy`

## Plan Self-Review

- Coverage: all 9 machines from the inventory are either refactored (1,2,3,5,6,7,8 via GamePhase/mirrorVisual/DoorPhase) or documented-in-place (4 echo sub-states, 9 input mode) ✓. Look-alikes documented as non-machines ✓. The three sanctioned behavior changes map 1:1 to known warts ✓.
- Placeholders: none. Type consistency: `GamePhase` fields (`startedAt/failedAt/resetAt/clearedAt`) consistent across T1/T3; hook untouched ✓. e2e: 10 existing unchanged + 1 new ✓.
