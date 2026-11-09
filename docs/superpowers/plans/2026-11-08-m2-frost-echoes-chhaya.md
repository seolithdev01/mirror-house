# M2: Frost Lantern, Echoes, Chhaya, House Anger, Passages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the walking sim into the game loop: fog mirrors with the Frost Lantern to blind mirror-sensing Echoes, capture beacon mirrors to unlock the exit, dodge Chhaya (your own 6-second-old path made hostile), manage House Anger (sprint into glass and it cracks; 100 = collapse), and use True Mirror pairs + silvered push-doors — winnable and losable floors.

**Architecture:** Additive modules over the M1+step003 core. All AI/gameplay is pure state-in/state-out functions (node-testable): `floorObjects` (deterministic object placement), `frost` (fog/breath), `los` + `flowField` (engine-level sensing/pathfinding), `echo` + `chhaya` (enemy state machines; Chhaya is a pure function of the player's path history), `houseState` (anger/fail/gate/shards), `passages` (teleports/push-doors with legality checks). `main.ts` orchestrates; new views (`echoView`, `chhaya` in `avatar.ts`) render on layer 0 (visible to player AND mirrors). Standing/hero/beacon mirrors: RT reflection only for the 2 hero spots + true pairs; others use a cheap reflective-look material; fog swaps to matte.

**Tech Stack:** unchanged.

**Spec:** `docs/superpowers/specs/2026-11-08-mirror-house-design.md` §4.2–4.4, §13.2 (M2). Backlog items folded in: FloorGrid segment cache (T1), positionIsLegal before teleports (T7), e2e console-error + scripted-state coverage (T8).

## Global Constraints

- TS `strict` + `noUncheckedIndexedAccess`; zero `any`; SPDX first line; no `Math.random` under src/ (all gameplay randomness via `createRng` on derived seeds); no remote loads; no telemetry; localStorage only persistence; conventional commits `feat(m2)/test(m2)/docs(m2)/chore(m2)`.
- M1+step003 contracts frozen: all existing exports, the debug hook's existing fields, and the 6 e2e tests (extended, never renamed/weakened).
- Constants are gameplay-tunable and fixed here: `FOG_DURATION_MS=25000`, `FOG_COST=0.34`, `BREATH_RECHARGE_PER_S=0.25`, `FOG_RANGE=5`, `FROST_CONE_COS=Math.cos(Math.PI/3)`, `ECHO_SPEED=2.2`, `CONTACT_RADIUS=0.7`, `SENSE_RANGE=13`, `SENSE_INTERVAL_MS=250`, `CHASE_MEMORY_MS=2000`, `CONFUSE_FOGGED_R=6`, `CONFUSE_UNFOGGED_R=8`, `CHHAYA_DELAY_MS=6000`, `CRACK_ANGER=15`, `ANGER_MAX=100`, `CRACK_RANGE=1.0`, `PASSAGE_RANGE=1.4`, `SHARD_BEACON=5`, `SHARD_STUCK=10`, `SHARD_PERFECT=25`.
- Fail states auto-restart the SAME seed after 1.2s; attempts counted in-memory; best/streak/shards persist in meta (`shards?: number` additive on v1).
- Every task: TDD for pure logic; render/wiring verified via e2e hook extensions (T8); gates `npm run lint && npm run typecheck && npm test && npm run build` (+ `npm run e2e` where the task touches main.ts behavior).

---

### Task 1: FloorGrid segment cache (perf backlog)

**Files:**
- Modify: `src/engine/grid.ts`, `tests/unit/grid.test.ts` (extend)

**Interfaces:**
- Consumes/Produces: `wallSegments()` / `wallSegmentsNearCells()` signatures unchanged — pure perf change.

- [ ] **Step 1: Failing test** (append to `tests/unit/grid.test.ts`)

```ts
it('wallSegments is cached and invalidated by wall changes', () => {
  const g = new FloorGrid(9, 9);
  const a = g.wallSegments();
  const b = g.wallSegments();
  expect(b).toBe(a); // same reference — cached
  g.setOpen(4, 4, Dir.North);
  const c = g.wallSegments();
  expect(c).not.toBe(a);
  expect(c.length).toBe(a.length - 1);
});
```

- [ ] **Step 2: RED** — `npm test -- grid` (toBe fails: new array each call).

- [ ] **Step 3: Implement** — in `FloorGrid`: add `private segCache: WallSegment[] | null = null;`; `wallSegments()` returns `this.segCache ??= buildSegments()` (extract the existing body to a private `buildSegments()`); in `setWallBit`, after any mutation: `this.segCache = null;`.

- [ ] **Step 4: GREEN + gates.**
- [ ] **Step 5: Commit** — `perf(m2): cache wall segments, invalidate on mutation`

---

### Task 2: Floor objects — deterministic placement

**Files:**
- Create: `src/game/floorObjects.ts`
- Test: `tests/unit/floorobjects.test.ts`

**Interfaces:**
- Consumes: `Floor`, `FloorGrid`, `bfsDistances`, `createRng`, `Dir`, `DIR_VECTOR`, `CELL_SIZE`.
- Produces (used by T3–T8):

```ts
export type MirrorKind = 'standing' | 'beacon' | 'true' | 'silvered';
export interface MirrorRef { id: number; kind: MirrorKind; x: number; z: number; rotY: number; cellX: number; cellY: number; pairId: number | null }
export interface FloorObjects { mirrors: MirrorRef[]; echoSpawns: Array<{ x: number; y: number }>; patrolAnchors: Array<{ x: number; y: number }> }
export interface M2Params { standing: number; beacons: number; echoes: number; anchors: number }
export const M2_PARAMS: M2Params; // 6, 3, 4, 6
export function generateFloorObjects(floor: Floor, params?: M2Params): FloorObjects;
```

Placement rules (deterministic from `createRng(floor.seed + ':objects')`):
1. Candidate cells with ≥1 wall, excluding entrance/exit cells. `mirrorSpotFor(cell)` helper: first walled dir → position/rotY exactly like `mirrorSpots` in mirror.ts (offset `CELL_SIZE/2 − 0.12`, facing into the cell).
2. **Beacons (3):** from candidates sorted by descending `bfsDistances` (far half), greedy-pick cells ≥ 4 cells apart (Chebyshev), then take first `beacons`.
3. **True pair (2):** among remaining candidates, pick the pair maximizing Manhattan cell distance (O(n²) fine at ≤100 cells); ids i and i+1 pair with each other (`pairId`).
4. **Silvered (1):** first candidate whose chosen wall edge, if opened, connects two cells BOTH reachable from entrance (check with `bfsDistances` on a copy… simpler: verify both neighbor cells currently reachable — since maze is fully connected, any interior edge qualifies; pick a candidate whose walled dir leads to an in-bounds neighbor).
5. **Standing (6):** remaining candidates, rng-shuffled, first `standing`, none sharing a cell with any placed mirror.
6. **Echo spawns (4):** rng-pick cells with bfs distance ≥ 6 from entrance, not entrance/exit cells.
7. **Patrol anchors (6):** rng-pick reachable cells (any).

All positions in meters (cell centers / mirror offsets) except spawns/anchors = cell centers.

- [ ] **Step 1: Failing tests** (`tests/unit/floorobjects.test.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { generateFloor, TIER_ONE } from '../../src/game/maze';
import { generateFloorObjects, M2_PARAMS } from '../../src/game/floorObjects';

const floor = generateFloor({ ...TIER_ONE, seed: 'OBJECTS' });

describe('generateFloorObjects', () => {
  it('is deterministic and matches params', () => {
    const a = generateFloorObjects(floor);
    const b = generateFloorObjects(floor);
    expect(a).toEqual(b);
    expect(a.mirrors.filter((m) => m.kind === 'standing')).toHaveLength(M2_PARAMS.standing);
    expect(a.mirrors.filter((m) => m.kind === 'beacon')).toHaveLength(M2_PARAMS.beacons);
    expect(a.mirrors.filter((m) => m.kind === 'true')).toHaveLength(2);
    expect(a.mirrors.filter((m) => m.kind === 'silvered')).toHaveLength(1);
    expect(a.echoSpawns).toHaveLength(M2_PARAMS.echoes);
    expect(a.patrolAnchors).toHaveLength(M2_PARAMS.anchors);
  });
  it('no two mirrors share a cell; true mirrors pair with each other', () => {
    const o = generateFloorObjects(floor);
    const cells = o.mirrors.map((m) => `${m.cellX},${m.cellY}`);
    expect(new Set(cells).size).toBe(cells.length);
    const trues = o.mirrors.filter((m) => m.kind === 'true');
    expect(trues[0]!.pairId).toBe(trues[1]!.id);
    expect(trues[1]!.pairId).toBe(trues[0]!.id);
    expect(o.mirrors.filter((m) => m.kind !== 'true').every((m) => m.pairId === null)).toBe(true);
  });
  it('beacons are far from the entrance and mutually spread', () => {
    const { bfsDistances } = await import('../../src/game/maze');
    const dist = bfsDistances(floor.grid, floor.entrance);
    const o = generateFloorObjects(floor);
    for (const m of o.mirrors.filter((m) => m.kind === 'beacon')) {
      expect(dist[m.cellY * floor.grid.width + m.cellX]!).toBeGreaterThan(floor.grid.width / 2);
    }
  });
});
```

(Note: `await import` inside the test — use a top-level `import { bfsDistances }` instead when writing the file.)

- [ ] **Step 2: RED.**
- [ ] **Step 3: Implement** per placement rules; export a `mirrorSpotFor(grid, x, y): { x: number; z: number; rotY: number; dir: Dir } | null` internal helper (exported for reuse by tests/T7).
- [ ] **Step 4: GREEN + gates.**
- [ ] **Step 5: Commit** — `feat(m2): deterministic floor objects — mirrors, beacons, spawns, anchors`

---

### Task 3: Frost Lantern — fog, breath, capture

**Files:**
- Create: `src/game/frost.ts`
- Modify: `src/game/mirror.ts` (fog/capture material states on HeroMirror), `src/main.ts` (F key + HUD button wiring, breath update, fog visual), `src/ui/hud.ts` (breath bar + frost button + beacons/shards chips), `index.html` (CSS), `src/engine/constants.ts` (frost constants)
- Test: `tests/unit/frost.test.ts`

**Interfaces:**
- Consumes: `MirrorRef` (T2), `PlayerState`.
- Produces:

```ts
export interface MirrorRuntime { id: number; foggedUntil: number | null; captured: boolean; cracked: boolean }
export function initMirrorRuntime(mirrors: MirrorRef[]): MirrorRuntime[];
export function fogTarget(mirrors: MirrorRef[], player: PlayerState): MirrorRef | null; // standing|beacon, ≤FOG_RANGE, within 60° cone of heading, nearest
export function applyFog(rt: MirrorRuntime[], id: number, now: number): void; // beacon→captured permanent; standing→foggedUntil=now+FOG_DURATION_MS
export function isFogged(m: MirrorRuntime, now: number): boolean; // captured counts as fogged
export function updateBreath(breath: number, dtS: number, spent: boolean): number; // clamp 0..1
```

main.ts wiring: runtime array from T2 mirrors; `F` keydown + HUD button → if `breath >= FOG_COST` and `fogTarget` → `applyFog`, `breath -= FOG_COST`, if beacon → captured++, HUD beacons update + SHARD_BEACON shards pending (awarded at clear by T6 — store `pendingShards` counter in house state, T6). Hero standing mirrors at entrance/exit: fog visual = `mesh.material` swap to `MeshStandardMaterial({ color: 0x39415f, roughness: 1 })` while fogged (restore RT material after). Non-RT standing/beacon mirrors: `createMirrorMesh(kind)` — reflective-look `MeshStandardMaterial({ color: 0x8fb8c8, metalness: 0.9, roughness: 0.15 })`, beacon adds emissive teal; fog swaps to the matte material, capture adds emissive 0x2ec4b6 pulse-free. Beacon fog is permanent (no restore).

- [ ] **Step 1: Failing tests** (`tests/unit/frost.test.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { applyFog, fogTarget, initMirrorRuntime, isFogged, updateBreath, FOG_COST } from '../../src/game/frost';
import type { MirrorRef } from '../../src/game/floorObjects';

const m = (id: number, kind: MirrorRef['kind'], x: number, z: number, rotY = 0): MirrorRef =>
  ({ id, kind, x, z, rotY, cellX: 0, cellY: 0, pairId: null });

describe('frost', () => {
  it('fogTarget: nearest standing/beacon within range and cone; ignores true/silvered', () => {
    const player = { x: 0, y: 0, heading: 0 }; // facing north (-y)
    const mirrors = [m(1, 'standing', 0, -3), m(2, 'beacon', 0, -4.5), m(3, 'true', 0, -1), m(4, 'silvered', 0, -1.5)];
    expect(fogTarget(mirrors, player)?.id).toBe(1);
  });
  it('fogTarget: outside cone or range → null', () => {
    const player = { x: 0, y: 0, heading: 0 };
    expect(fogTarget([m(1, 'standing', 3, -3)], player)).toBeNull(); // ~45° off-cone
    expect(fogTarget([m(1, 'standing', 0, -5.5)], player)).toBeNull(); // beyond 5m
  });
  it('applyFog: standing times out, beacon is captured forever', () => {
    const rt = initMirrorRuntime([m(1, 'standing', 0, 0), m(2, 'beacon', 0, 0)]);
    applyFog(rt, 1, 1000);
    expect(isFogged(rt[0]!, 2000)).toBe(true);
    expect(isFogged(rt[0]!, 26001)).toBe(false);
    applyFog(rt, 2, 1000);
    expect(isFogged(rt[1]!, 999_999)).toBe(true);
    expect(rt[1]!.captured).toBe(true);
  });
  it('breath spends and recharges with clamp', () => {
    expect(updateBreath(1, 0, true)).toBeCloseTo(1 - FOG_COST);
    expect(updateBreath(0, 4, false)).toBeCloseTo(1);
    expect(updateBreath(0.99, 4, false)).toBe(1);
  });
});
```

- [ ] **Step 2: RED.**
- [ ] **Step 3: Implement** `frost.ts` + constants + HUD/CSS/main wiring (frost button id `mh-frost`, breath bar `mh-breath`/`mh-breath-fill`).
- [ ] **Step 4: GREEN + gates + e2e (existing 6 still pass).**
- [ ] **Step 5: Commit** — `feat(m2): frost lantern — fog, breath, beacon capture`

---

### Task 4: LOS, flow fields, Echoes

**Files:**
- Create: `src/engine/los.ts`, `src/engine/flowField.ts`, `src/game/echo.ts`, `src/game/echoView.ts`
- Modify: `src/main.ts` (spawn echoes, update loop, contact fail)
- Test: `tests/unit/los.test.ts`, `tests/unit/flowfield.test.ts`, `tests/unit/echo.test.ts`

**Interfaces:**
- Produces:

```ts
// los.ts
export function losClear(grid: FloorGrid, x0: number, y0: number, x1: number, y1: number): boolean;
// flowField.ts
export function buildFlowField(grid: FloorGrid, targets: CellIndex[]): Int32Array; // multi-source BFS dist, -1 unreachable
export function flowStep(field: Int32Array, grid: FloorGrid, x: number, y: number): CellIndex | null; // strictly-closer neighbor
// echo.ts
export interface EchoState { id: number; x: number; y: number; heading: number; mode: 'patrol' | 'chase' | 'confused'; anchorIdx: number; target: CellIndex | null; field: Int32Array | null; lastSensedCell: CellIndex | null; loseMemoryAt: number | null; nextSenseAt: number; stuckAwarded: boolean }
export function initEchoes(spawns: Array<{ x: number; y: number }>, grid: FloorGrid, anchors: Array<{ x: number; y: number }>, now: number): EchoState[];
export function sensesPlayer(echo: EchoState, player: PlayerState, mirrors: MirrorRef[], rt: MirrorRuntime[], grid: FloorGrid, now: number): boolean; // ∃ unfogged standing|beacon|true mirror within SENSE_RANGE of BOTH, LOS from both to mirror center
export function updateEcho(echo: EchoState, player: PlayerState, mirrors: MirrorRef[], rt: MirrorRuntime[], grid: FloorGrid, anchors: Array<{ x: number; y: number }>, now: number, dtS: number): EchoState;
// echoView.ts
export function createEchoMesh(): THREE.Group; // layer 0, translucent glass figure ~1.6m
export function syncEchoMesh(mesh: THREE.Group, e: EchoState): void;
```

`updateEcho` state machine (pure — returns new state, no mutation):
- Confused override: ≥2 fogged mirrors within CONFUSE_FOGGED_R of echo AND 0 unfogged within CONFUSE_UNFOGGED_R → `mode='confused'`, target/field=null, heading += 2·dtS.
- Sense check every SENSE_INTERVAL_MS (per echo, `nextSenseAt`): if sensesPlayer → `lastSensedCell = player cell`, `loseMemoryAt = now + CHASE_MEMORY_MS`.
- Mode select: confused-cond → confused; `now < loseMemoryAt` → chase; else patrol.
- Targeting: patrol → anchors[anchorIdx]; on arrival (≤0.15m to anchor center) `anchorIdx = (anchorIdx+1) % anchors.length`. chase → lastSensedCell. confused → null.
- Pathing: if target null → stand. If field null or target changed → `field = buildFlowField(grid, [target])`. `next = flowStep(field, grid, cellAt(x,y))`; if null (at target cell) move straight toward target world pos; else toward `cellCenter(next)`. Move ECHO_SPEED·dtS; heading = `Math.atan2(vx, -vy)`.

main.ts: echo meshes synced per frame; contact `hypot < CONTACT_RADIUS` → fail ('caught'). Echos render on layer 0 (visible in mirrors too).

- [ ] **Step 1: Failing tests** — los (same-cell true; through-wall false; open corridor true; corner diagonal), flowField (distances from target; flowStep descends; unreachable −1), echo (init counts; sensesPlayer true via shared visible mirror, false when fogged, false when no mirror; patrol→chase on sense at interval; chase→patrol after CHASE_MEMORY_MS without sense; confused condition with 2 fogged near + 0 unfogged; movement advances toward next flow cell).

```ts
// tests/unit/echo.test.ts (core shape)
it('senses through a shared visible mirror; fogging blinds it', () => {
  const grid = new FloorGrid(5, 5);
  grid.setOpen(2, 2, Dir.East); grid.setOpen(2, 3, Dir.West); // open corridor cells 2,2–3,2? — build a simple open row instead:
  // (in the real file: open a full row via setOpen for each pair, then:)
  const mirrors = [{ id: 1, kind: 'standing', x: 0, z: -2, rotY: 0, cellX: 2, cellY: 2, pairId: null }];
  const rt = initMirrorRuntime(mirrors);
  const echo = { ...baseEcho, x: -1.5, y: -2 };
  const player = { x: 1.5, y: -2, heading: 0 };
  expect(sensesPlayer(echo, player, mirrors, rt, grid, 1000)).toBe(true);
  applyFog(rt, 1, 1000);
  expect(sensesPlayer(echo, player, mirrors, rt, 2000)).toBe(false);
});
```

(Write the full test file with a helper that opens an entire row of a 5×5 grid so positions are mirror-visible; keep positions within SENSE_RANGE=13 so a 5×5 (20m) grid row works.)

- [ ] **Step 2: RED.** **Step 3: Implement** los/flowField/echo/echoView + main wiring (spawn on floor objects, update in fixed-step loop, contact → fail handled by T6's `failFloor` — until T6, log-only placeholder `onFail('caught')` no-op).
- [ ] **Step 4: GREEN + gates + e2e (6/6).**
- [ ] **Step 5: Commit** — `feat(m2): echoes — mirror-sight sensing, flow-field pursuit, confusion`

---

### Task 5: Chhaya — the six-second shadow

**Files:**
- Create: `src/game/chhaya.ts`
- Modify: `src/game/avatar.ts` (add `createChhaya(): THREE.Group` — same silhouette, coat 0x14141c, glass 0x8a3a5c, layer 0), `src/main.ts` (record path in fixed-step, position Chhaya, contact fail)
- Test: `tests/unit/chhaya.test.ts`

**Interfaces:**
- Produces:

```ts
export interface PathSample { x: number; y: number; t: number }
export function recordPath(samples: PathSample[], x: number, y: number, t: number): PathSample[]; // append; trim head while samples[1].t <= t - 20_000; max 1200 samples
export function sampleDelayed(samples: PathSample[], now: number, delayMs = 6000): { x: number; y: number } | null; // null before first sample ≥ now-delay; else linear interpolation between bracketing samples
```

main.ts: record only while the floor run is active (started, not cleared/failed); Chhaya mesh follows `sampleDelayed`; heading from movement delta; contact → fail ('caught'). Chhaya hidden until first sample expires (6s of grace at floor start).

- [ ] **Step 1: Failing tests** — record trims and caps; sampleDelayed null-before, exact-at-sample, interpolated-mid, follows-after.
- [ ] **Step 2: RED.** **Step 3: Implement.** **Step 4: GREEN + gates + e2e.**
- [ ] **Step 5: Commit** — `feat(m2): chhaya — six-second shadow on the player's path`

---

### Task 6: House state — anger, fail/restart, beacon gate, shards

**Files:**
- Create: `src/game/houseState.ts`
- Modify: `src/main.ts` (crack detection, fail/clear flows, HUD bars/chips, restart), `src/ui/hud.ts` (anger bar, beacons/shards/attempts chips, fail overlay, hint line), `index.html` (CSS), `src/game/meta.ts` (award shards helper)
- Test: `tests/unit/housestate.test.ts`

**Interfaces:**
- Produces:

```ts
export interface HouseState { anger: number; attempts: number; shards: number; crackedAny: boolean }
export function initHouseState(): HouseState;
export function applyCrack(h: HouseState, rt: MirrorRuntime[], id: number): HouseState; // anger += CRACK_ANGER (cracked flag set, once per mirror); returns new state
export function isCollapse(h: HouseState): boolean; // anger >= ANGER_MAX
export function crackTarget(mirrors: MirrorRef[], rt: MirrorRuntime[], player: PlayerState, sprinting: boolean): MirrorRef | null; // standing|beacon within CRACK_RANGE in cone, only while sprinting, not already cracked
export function beaconsCaptured(mirrors: MirrorRef[], rt: MirrorRuntime[]): { captured: number; total: number };
export function exitUnlocked(mirrors: MirrorRef[], rt: MirrorRuntime[]): boolean; // all beacons captured
export function shardsForClear(h: HouseState, stuckEnemies: number): number; // SHARD_PERFECT if !crackedAny, + SHARD_STUCK * stuckEnemies
// meta.ts addition:
export function awardShards(m: MetaSave, gained: number): MetaSave; // shards = (m.shards ?? 0) + gained
```

main.ts flows:
- **Crack:** each frame when sprint input && moving — `crackTarget` → applyCrack → HUD anger bar + crack tint on that mirror (material color darken 0x4a4038); anger ≥ 100 → collapse fail.
- **Fail (`failFloor(reason)`):** HUD fail overlay (`Caught by the glass` / `The mirrors collapsed`), freeze player input 1.2s, then `resetFloor()`: re-init mirror runtime, echoes, chhaya path, house state (attempts+1, shards keep only awarded-at-clear — pending beacon shards reset), timer re-armed.
- **Clear:** existing exit check now requires `exitUnlocked`; on clear award `SHARD_BEACON * capturedThisRun (already counted in pendingShards) + shardsForClear(...)` → `awardShards(meta, total)` + saveMeta; exit marker dims red while locked (emissive 0x5c2a2a) / gold when unlocked.
- HUD: `mh-anger`/`mh-anger-fill` bar, `mh-beacons` chip `🪞 c/t`, `mh-shards` chip `◆ n`, `showFail(reason)`, `hint(text|null)` (`mh-hint` line for passage prompts).

- [ ] **Step 1: Failing tests** — applyCrack accumulation + once-per-mirror; isCollapse at 100 (7 cracks); beaconsCaptured/exitUnlocked; shardsForClear (perfect/stuck bonus combos); awardShards additive from undefined.
- [ ] **Step 2: RED.** **Step 3: Implement** + wiring. **Step 4: GREEN + gates + e2e (6/6).**
- [ ] **Step 5: Commit** — `feat(m2): house anger, fail/restart, beacon-gated exit, shards`

---

### Task 7: Passages — True Mirror pairs + silvered doors

**Files:**
- Create: `src/game/passages.ts`
- Modify: `src/main.ts` (Space/E keys, prompts, visuals), `src/game/mirror.ts` (true-mirror RT renderer at 256px reused; silvered door mesh + open animation)
- Test: `tests/unit/passages.test.ts`

**Interfaces:**
- Produces:

```ts
export function positionIsLegal(grid: FloorGrid, x: number, y: number): boolean; // ≥ PLAYER_RADIUS + 0.05 clearance from every wall plane in the 3x3 neighborhood
export function tryTeleport(mirrors: MirrorRef[], player: PlayerState): { x: number; y: number; heading: number; usedId: number } | null; // true mirror within PASSAGE_RANGE → paired mirror position, heading = pair rotY + π (facing out), only if positionIsLegal at destination
export function tryPushDoor(mirrors: MirrorRef[], player: PlayerState): MirrorRef | null; // silvered within PASSAGE_RANGE and in cone
```

main.ts: `Space` near true mirror → teleport (also snap chhaya? NO — Chhaya follows the recorded path through the door naturally; that's the fun) + hint text `Space — step through` when in range; `E` near silvered door → `grid.setOpen` on the door's wall edge (cell + facing dir derived from rotY: the walled dir it was placed against — recompute from `mirrorSpotFor` or store `wallDir` in MirrorRef — ADD `wallDir: Dir | null` to MirrorRef in T2 for silvered/standing), animate door sliding 1.2m along the wall over 0.4s, +0 shards (secret found flag → include in perfect bonus? keep simple: no shard), hint `E — push`.

- [ ] **Step 1: Failing tests** — positionIsLegal (cell center true; 0.3m from a wall plane false); tryTeleport (in-range true mirror → pair position + reversed heading; out of range null; illegal destination null — construct by hand with a grid + custom mirrors); tryPushDoor (range + kind gating).
- [ ] **Step 2: RED.** **Step 3: Implement** (extend `MirrorRef` with `wallDir: Dir | null` — update T2 module + its tests accordingly, defaulting standing/silvered to their wall dir, others null). **Step 4: GREEN + gates + e2e.**
- [ ] **Step 5: Commit** — `feat(m2): true mirror step-through, silvered push-doors, teleport legality`

---

### Task 8: E2E — winnable & losable, scripted

**Files:**
- Modify: `src/main.ts` (hook extensions), `tests/e2e/smoke.spec.ts`

**Hook additions (dev-only, exact names):**

```ts
mirrors(): { total: number; fogged: number; captured: number };
beaconsLeft(): number;
anger(): number;
shards(): number;
attempts(): number;
enemyCount(): number;
enemyPos(i: number): { x: number; y: number } | null;
chhayaPos(): { x: number; y: number } | null;
mirrorAt(kind: string): { x: number; z: number; id: number } | null;
warp(x: number, y: number, heading?: number): void;
addAnger(n: number): void;
```

**New e2e tests (bring suite to 10):**
1. `m2: frost captures a beacon and unlocks gating` — warp near `mirrorAt('beacon')`, setHeading to face it (compute from warp position: place player 2.5m south facing north), press F → `mirrors().captured` increments, `beaconsLeft()` decrements; after all three (repeat), exit unlocked (assert via `beaconsLeft() === 0`).
2. `m2: caught by an echo restarts the floor` — warp onto `enemyPos(0)` → wait 1.5s → `attempts() === 1` and player is back at spawn (compare `getPlayer()` to initial spawn).
3. `m2: house collapse at 100 anger` — `addAnger(100)` → fail overlay → attempts increments.
4. `m2: full win flow records shards and best` — capture all beacons (warp+F ×3), warp to exit marker (expose via `mirrorAt('exit')`? exit is a marker not mirror — expose `exitPos()` in hook too), wait → cleared overlay visible, `shards() >= 15` (3×SHARD_BEACON), `bestFor(seed)` not null.
Also: add a console-error collector to every test (new and existing): `const errors: string[] = []; page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); }); ... expect(errors).toEqual([]);` — plus keep the existing pageerror listener pattern.

- [ ] **Step 1: Extend hook.** **Step 2: Write tests.** **Step 3: `npm run e2e` → 10/10 (fix only genuine regressions; report flakiness honestly).** **Step 4: Gates.** **Step 5: Commit** — `test(m2): e2e — frost/capture, caught, collapse, full win`

---

### Task 9: Close-out — README, FAQ, CI hardening, acceptance

**Files:**
- Modify: `README.md`, `src/ui/faq.ts` (4 new Q/As: fogging & Echo sight; House Anger; beacons & the exit; Chhaya), `.github/workflows/ci.yml` (permissions + concurrency), `public/_headers` (immutable assets)

- [ ] **Step 1: CI hardening** — ci.yml: top-level `permissions: { contents: read }`; `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }`. `_headers` append: `/assets/*` with `Cache-Control: public, max-age=31536000, immutable`.
- [ ] **Step 2: FAQ** — add 4 entries (after 'What hunts me'): fogging mechanics, anger/collapse, beacon gating, Chhaya delay — copy consistent with §4.
- [ ] **Step 3: README** — How to play M2: fog (F), beacons, anger, Chhaya, passages (Space/E), fail/restart, shards.
- [ ] **Step 4: Local acceptance checklist** — gates + 10/10 e2e; manual notes for feel (echo speed, fog duration); bundle < 3 MB gz.
- [ ] **Step 5: Commit** — `docs(m2): how to play, FAQ entries, CI hardening`

## Plan Self-Review (authoring time)

- **Coverage vs M2 acceptance:** frost ✓ (T3), mirrors-as-gameplay ✓ (T2/T3/T7), Echoes ✓ (T4), Chhaya ✓ (T5), traps/confusion ✓ (T4 confused mode), winnable+losable ✓ (T6 + T8 e2e proves both), backlog: segment cache ✓ (T1), teleport legality ✓ (T7), e2e hardening ✓ (T8), CI hardening ✓ (T9). Audio/Aaina/views = M3, correctly out of scope.
- **Placeholders:** none; T4's echo test excerpt includes an explicit instruction to build the open-row helper in the real file — full assertions specified.
- **Type consistency:** `MirrorRef` gains `wallDir` in T7 — flagged as a T2-module update inside T7 (breaking change handled there, tests updated in the same task); `MirrorRuntime` defined in T3, consumed by T4/T6/T7; hook names in T8 match main.ts wiring.
- **M1/step003 freeze:** existing e2e untouched (T8 only adds + a console listener); `keysToMoveInput` etc. untouched; HUD additions are new ids only.
