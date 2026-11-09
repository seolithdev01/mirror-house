# step003: Color, Avatar + Self-Reflection, Input Modes, FAQ, Meta-lite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the gray walking skeleton into Mirror House: tier-1 art direction, a configurable Surveyor avatar the player sees in real reflective mirrors, three input modes (keyboard-only / mouse-only / hybrid) with on-screen buttons, an FAQ screen, and device-local best times + daily streak + daily-challenge seed.

**Architecture:** Additive modules over the M1 core (`src/engine` pure, `src/game` logic/scene, `src/main.ts` orchestrator): `palette.ts`/`textures.ts` (procedural canvas art, browser-guarded), `look.ts`+`avatar.ts` (avatar on render layer 1 — invisible to the main camera, visible to mirror cameras), `mirror.ts` (planar render-to-texture hero mirrors with a global clip plane), `hud.ts` (DOM buttons/chips/overlays, no innerHTML), `floorRun.ts`+`meta.ts` (localStorage v1: best/streak/look/mode), `faq.ts`. Coordinate conventions unchanged: heading 0 = north = −y = −z; camera/avatar yaw = −heading; grid y → three z.

**Tech Stack:** unchanged (TS strict + Vite + three.js + Vitest + Playwright).

**Spec:** `docs/superpowers/specs/2026-11-08-mirror-house-design.md` §5.5–5.7 (step003 additions), §7.4.

## Global Constraints

- TypeScript `strict` + `noUncheckedIndexedAccess`; zero `any`; first line of every source file `// SPDX-License-Identifier: Apache-2.0`; no `Math.random` under `src/` (Web Crypto/date-derived randomness only); no remote loads; conventional commits.
- M1 interfaces are frozen contracts: `generateFloor/Floor/TIER_ONE`, `FloorGrid`, `movePlayer/PlayerState/MoveInput`, `keysToMoveInput/KeyboardSnapshot/InputCollector`, `buildFloorScene`, seed-code fns, `__MIRROR_HOUSE_DEBUG__` (extend, never rename).
- Node-run unit tests must not touch `document`/`window`: browser-only code paths are guarded (`typeof document === 'undefined'` → fallback) or live in `main.ts`/`hud.ts` which have no unit tests (e2e covers them).
- Palette values are fixed art direction (§5.6): void `0x0b1026`, floorBase `0x1d2440`, floorLines `0x2a3560`, teal `0x2ec4b6`, ivory `0xf2e9d8`, gold `0xd9a441`, rose `0xc2548a`, wallTop `0x9c8f7a`, wallBottom `0x5c5346`, lantern `0xffd9a0`.
- No telemetry anywhere; localStorage is the only persistence; `try/catch` all storage access (private-mode safe).
- Each task: TDD where the logic is pure (mappers, streak, meta, look, palette pattern, mirror-spot placement); render code is e2e-verified via the debug hook.

---

### Task 1: Palette + procedural textures + scene recolor

**Files:**

- Create: `src/game/palette.ts`, `src/game/textures.ts`
- Modify: `src/game/floorScene.ts` (accept palette + textures), `src/main.ts` (fog/lantern/marker colors), `tests/unit/floorscene.test.ts` (unchanged assertions must still pass)
- Test: `tests/unit/palette.test.ts`

**Interfaces:**

- Consumes: `FloorGrid`, `buildFloorScene(floor)` (M1).
- Produces:

```ts
export interface TierPalette {
  void: number;
  floorBase: number;
  floorLines: number;
  teal: number;
  ivory: number;
  gold: number;
  rose: number;
  wallTop: number;
  wallBottom: number;
  lantern: number;
  entrance: number;
  exit: number;
}
export const TIER_ONE_PALETTE: TierPalette;
export function floorAccent(gx: number, gy: number): number; // pure per-cell accent
// textures.ts — browser-only, node returns null
export function makeFloorTexture(): HTMLCanvasElement | null; // 6x6-cell atlas, 64px cells
export function makeWallTexture(): HTMLCanvasElement | null; // vertical gradient + band
export function buildFloorScene(floor: Floor, palette?: TierPalette): FloorSceneResult; // palette defaults to TIER_ONE_PALETTE
```

- [x] **Step 1: Failing tests** (`tests/unit/palette.test.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { floorAccent, TIER_ONE_PALETTE } from '../../src/game/palette';
import { makeFloorTexture, makeWallTexture } from '../../src/game/textures';

describe('palette', () => {
  it('art-direction values are exact (spec 5.6)', () => {
    expect(TIER_ONE_PALETTE.void).toBe(0x0b1026);
    expect(TIER_ONE_PALETTE.teal).toBe(0x2ec4b6);
    expect(TIER_ONE_PALETTE.gold).toBe(0xd9a441);
    expect(TIER_ONE_PALETTE.rose).toBe(0xc2548a);
    expect(TIER_ONE_PALETTE.lantern).toBe(0xffd9a0);
  });
  it('floorAccent: rose diamond on the 6-lattice, gold lines on 6-multiples, else two-tone checker', () => {
    expect(floorAccent(3, 3)).toBe(TIER_ONE_PALETTE.rose);
    expect(floorAccent(9, 3)).toBe(TIER_ONE_PALETTE.rose);
    expect(floorAccent(6, 2)).toBe(TIER_ONE_PALETTE.gold);
    expect(floorAccent(2, 12)).toBe(TIER_ONE_PALETTE.gold);
    expect(floorAccent(0, 0)).toBe(TIER_ONE_PALETTE.floorLines);
    expect(floorAccent(1, 0)).toBe(TIER_ONE_PALETTE.floorBase);
  });
  it('textures degrade to null in node (browser guard)', () => {
    expect(makeFloorTexture()).toBeNull();
    expect(makeWallTexture()).toBeNull();
  });
});
```

- [x] **Step 2: RED** — `npm test -- palette` fails (module missing).

- [x] **Step 3: Implement**

`src/game/palette.ts`:

```ts
// SPDX-License-Identifier: Apache-2.0
export interface TierPalette {
  void: number;
  floorBase: number;
  floorLines: number;
  teal: number;
  ivory: number;
  gold: number;
  rose: number;
  wallTop: number;
  wallBottom: number;
  lantern: number;
  entrance: number;
  exit: number;
}

export const TIER_ONE_PALETTE: TierPalette = {
  void: 0x0b1026,
  floorBase: 0x1d2440,
  floorLines: 0x2a3560,
  teal: 0x2ec4b6,
  ivory: 0xf2e9d8,
  gold: 0xd9a441,
  rose: 0xc2548a,
  wallTop: 0x9c8f7a,
  wallBottom: 0x5c5346,
  lantern: 0xffd9a0,
  entrance: 0x2ec4b6,
  exit: 0xd9a441,
};

/** Deterministic per-cell floor accent on a 6x6 lattice: gold grid lines on every 6th
 *  row/column, a rose diamond at (3,3), two-tone checker elsewhere. Pure twin of the atlas. */
export function floorAccent(gx: number, gy: number): number {
  const m6 = ((gx % 6) + 6) % 6;
  const n6 = ((gy % 6) + 6) % 6;
  if (m6 === 3 && n6 === 3) return TIER_ONE_PALETTE.rose;
  if (m6 === 0 || n6 === 0) return TIER_ONE_PALETTE.gold;
  return m6 % 2 === n6 % 2 ? TIER_ONE_PALETTE.floorLines : TIER_ONE_PALETTE.floorBase;
}
```

`src/game/textures.ts`:

```ts
// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { floorAccent, TIER_ONE_PALETTE } from './palette';

const CELL_PX = 64;
const LATTICE = 6;

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

export function makeFloorTexture(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = CELL_PX * LATTICE;
  canvas.height = CELL_PX * LATTICE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  for (let gy = 0; gy < LATTICE; gy++)
    for (let gx = 0; gx < LATTICE; gx++) {
      ctx.fillStyle = hex(floorAccent(gx, gy));
      ctx.fillRect(gx * CELL_PX, gy * CELL_PX, CELL_PX, CELL_PX);
      ctx.strokeStyle = hex(TIER_ONE_PALETTE.void);
      ctx.lineWidth = 2;
      ctx.strokeRect(gx * CELL_PX + 1, gy * CELL_PX + 1, CELL_PX - 2, CELL_PX - 2);
    }
  return canvas;
}

export function makeWallTexture(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, hex(TIER_ONE_PALETTE.wallTop));
  grad.addColorStop(1, hex(TIER_ONE_PALETTE.wallBottom));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = hex(TIER_ONE_PALETTE.gold); // wainscot band
  ctx.fillRect(0, 208, 128, 6);
  ctx.fillStyle = 'rgba(11,16,38,0.25)';
  for (let x = 16; x < 128; x += 32) ctx.fillRect(x, 0, 3, 256); // faint panel joints
  return canvas;
}

export function canvasTexture(
  canvas: HTMLCanvasElement | null,
  repeatX: number,
  repeatY: number,
): THREE.CanvasTexture | null {
  if (!canvas) return null;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
```

Modify `src/game/floorScene.ts`:

- signature: `export function buildFloorScene(floor: Floor, palette: TierPalette = TIER_ONE_PALETTE): FloorSceneResult`
- wall material: if `makeWallTexture()` non-null → `new THREE.MeshStandardMaterial({ map: canvasTexture(makeWallTexture(), 1, 1), roughness: 0.95 })` shared by both instanced meshes; else keep `color: palette.wallBottom`
- floor: `map: canvasTexture(makeFloorTexture(), floor.grid.width / 6, floor.grid.height / 6)` with `color: 0xffffff` when textured, else `color: palette.floorBase`
- ceiling color `palette.void`; marker colors `palette.entrance`/`palette.exit`; emissiveIntensity 1.0
- add `import { TIER_ONE_PALETTE, type TierPalette } from './palette';` and `import { canvasTexture, makeFloorTexture, makeWallTexture } from './textures';`

Modify `src/main.ts` (three lines): `scene.background`/`scene.fog` color → `0x0b1026`; `PointLight` color `0xffd9a0`, intensity `22`; ambient `0x3a3f55`.

- [x] **Step 4: GREEN + gates** — `npm run lint && npm run typecheck && npm test` (M1 floorscene tests still pass — group child count is unchanged: textures swap materials in place).

- [x] **Step 5: Commit** — `feat(step003): tier-one art direction — palette, procedural floor/wall textures`

---

### Task 2: Avatar + configurable look

**Files:**

- Create: `src/game/look.ts`, `src/game/avatar.ts`
- Modify: `src/main.ts` (create avatar, update per frame, expose look in debug hook)
- Test: `tests/unit/look.test.ts`

**Interfaces:**

- Produces:

```ts
// look.ts
export interface AvatarLook {
  coat: number;
  glass: number;
}
export const COATS: Record<string, number>; // indigo 0x2b3a67, teal 0x1f7a70, rose 0x8a3a5c, ivory 0xcfc4ae
export const GLASSES: Record<string, number>; // gold 0xffc46b, teal 0x7de8dc, white 0xf5f2e8
export const DEFAULT_LOOK_NAME = 'indigo-gold';
export function parseLook(raw: string | null): { coat: number; glass: number; name: string }; // "teal-white" | "teal.white"
// avatar.ts
export const AVATAR_LAYER = 1;
export function createAvatar(look: AvatarLook): THREE.Group; // model faces -z at rotation 0 (matches camera at heading 0)
export function updateAvatar(
  avatar: THREE.Group,
  x: number,
  y: number,
  heading: number,
  moving: boolean,
  t: number,
): void;
```

- [x] **Step 1: Failing tests** (`tests/unit/look.test.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { COATS, GLASSES, parseLook } from '../../src/game/look';

describe('parseLook', () => {
  it('parses known names with - or . separators', () => {
    expect(parseLook('teal-white')).toEqual({
      coat: COATS['teal'],
      glass: GLASSES['white'],
      name: 'teal-white',
    });
    expect(parseLook('rose.gold')).toEqual({
      coat: COATS['rose'],
      glass: GLASSES['gold'],
      name: 'rose-gold',
    });
  });
  it('defaults unknown parts and null input', () => {
    expect(parseLook(null).name).toBe('indigo-gold');
    expect(parseLook('banana-gold').name).toBe('indigo-gold');
    expect(parseLook('teal-banana')).toEqual({
      coat: COATS['teal'],
      glass: GLASSES['gold'],
      name: 'teal-gold',
    });
  });
});
```

- [x] **Step 2: RED** — `npm test -- look`.

- [x] **Step 3: Implement**

`src/game/look.ts`:

```ts
// SPDX-License-Identifier: Apache-2.0
export interface AvatarLook {
  coat: number;
  glass: number;
}
export interface ResolvedLook extends AvatarLook {
  name: string;
}

export const COATS: Record<string, number> = {
  indigo: 0x2b3a67,
  teal: 0x1f7a70,
  rose: 0x8a3a5c,
  ivory: 0xcfc4ae,
};
export const GLASSES: Record<string, number> = {
  gold: 0xffc46b,
  teal: 0x7de8dc,
  white: 0xf5f2e8,
};
export const DEFAULT_LOOK_NAME = 'indigo-gold';

export function parseLook(raw: string | null): ResolvedLook {
  const coatNames = Object.keys(COATS);
  const glassNames = Object.keys(GLASSES);
  let coatName = 'indigo';
  let glassName = 'gold';
  if (raw) {
    const parts = raw.toLowerCase().split(/[.\-]/);
    const maybeCoat = parts[0];
    const maybeGlass = parts[1];
    if (maybeCoat && maybeCoat in COATS) coatName = maybeCoat;
    if (maybeGlass && maybeGlass in GLASSES) glassName = maybeGlass;
  }
  return {
    coat: COATS[coatName] ?? 0x2b3a67,
    glass: GLASSES[glassName] ?? 0xffc46b,
    name: `${coatName}-${glassName}`,
  };
}
```

`src/game/avatar.ts`:

```ts
// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import type { AvatarLook } from './look';

export const AVATAR_LAYER = 1;

/** Low-poly Surveyor. Model faces -z at rotation.y = 0 (same convention as the camera at heading 0). */
export function createAvatar(look: AvatarLook): THREE.Group {
  const g = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: look.coat, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8b28f, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.85, 4, 8), coat);
  body.position.y = 0.85;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skin);
  head.position.y = 1.58;
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.5, 2, 6), coat);
  arm.position.set(0.34, 1.05, -0.1);
  arm.rotation.z = -0.45;
  const lanternBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.2, 0.14),
    new THREE.MeshStandardMaterial({
      color: look.glass,
      emissive: look.glass,
      emissiveIntensity: 1.4,
    }),
  );
  lanternBox.position.set(0.44, 0.82, -0.24);
  g.add(body, head, arm, lanternBox);
  g.traverse((o) => o.layers.set(AVATAR_LAYER));
  return g;
}

export function updateAvatar(
  avatar: THREE.Group,
  x: number,
  y: number,
  heading: number,
  moving: boolean,
  t: number,
): void {
  avatar.position.set(x, moving ? Math.sin(t * 9) * 0.04 : 0, y);
  avatar.rotation.y = -heading;
}
```

Modify `src/main.ts`:

- `import { parseLook } from './game/look';` + `import { createAvatar, updateAvatar } from './game/avatar';`
- after `scene.add(buildFloorScene(floor).group);`:

```ts
const look = parseLook(new URLSearchParams(window.location.search).get('look'));
const avatar = createAvatar(look);
scene.add(avatar);
```

- in the fixed-step block, after `player = movePlayer(...)`: `updateAvatar(avatar, player.x, player.y, player.heading, inputActive, now / 1000);` where `inputActive` is the input's forward/strafe/turn non-zero (capture from the MoveInput you just built — restructure: `const inputFrame = keysToMoveInput(...); player = movePlayer(player, inputFrame, floor.grid, FIXED_STEP); const inputActive = inputFrame.forward !== 0 || inputFrame.strafe !== 0 || inputFrame.turn !== 0; updateAvatar(avatar, player.x, player.y, player.heading, inputActive, now / 1000);`
- debug hook: add `look: look.name`.

- [x] **Step 4: GREEN + gates.**

- [x] **Step 5: Commit** — `feat(step003): configurable surveyor avatar on mirror-only render layer`

---

### Task 3: Hero mirrors — planar RT reflection (see yourself)

**Files:**

- Create: `src/game/mirror.ts`
- Modify: `src/main.ts` (instantiate mirrors, update every other frame, expose `mirrors` count in debug hook)
- Test: `tests/unit/mirror.test.ts`

**Interfaces:**

- Consumes: `Floor`/`FloorGrid` (M1), `AVATAR_LAYER` (Task 2).
- Produces:

```ts
export interface MirrorSpot {
  x: number;
  z: number;
  rotY: number;
}
export function mirrorSpots(floor: Floor): MirrorSpot[]; // entrance + exit cell, wall-mounted, facing into the cell
export class HeroMirror {
  constructor(spot: MirrorSpot, tint?: number);
  readonly mesh: THREE.Mesh;
  update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, mainCam: THREE.PerspectiveCamera): void;
  dispose(): void;
}
```

- [x] **Step 1: Failing tests** (`tests/unit/mirror.test.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { generateFloor, TIER_ONE } from '../../src/game/maze';
import { mirrorSpots } from '../../src/game/mirror';

describe('mirrorSpots', () => {
  it('places exactly two mirrors (entrance + exit cells), deterministic, 0.12m off a wall, facing the cell center', () => {
    const floor = generateFloor({ ...TIER_ONE, seed: 'MIRROR' });
    const spots = mirrorSpots(floor);
    expect(spots).toHaveLength(2);
    for (const s of spots) {
      const { cx, cy } = floor.grid.cellCenter(
        s === spots[0] ? floor.entrance.x : floor.exit.x,
        s === spots[0] ? floor.entrance.y : floor.exit.y,
      );
      // wall-mounted: offset from cell center is CELL/2 - 0.12 along one axis, 0 on the other
      const dx = Math.abs(s.x - cx);
      const dz = Math.abs(s.z - cy);
      expect(Math.abs(dx - (4 / 2 - 0.12)) < 1e-6 || Math.abs(dz - (4 / 2 - 0.12)) < 1e-6).toBe(
        true,
      );
      // facing back into the cell: normal points from mirror toward cell center
      const nx = Math.sin(s.rotY),
        nz = Math.cos(s.rotY);
      expect(nx * (cx - s.x) + nz * (cy - s.z)).toBeGreaterThan(0.9);
    }
    expect(mirrorSpots(generateFloor({ ...TIER_ONE, seed: 'MIRROR' }))).toEqual(spots);
  });
});
```

- [x] **Step 2: RED** — `npm test -- mirror`.

- [x] **Step 3: Implement** (`src/game/mirror.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { CELL_SIZE } from '../engine/constants';
import { Dir, DIR_VECTOR } from '../engine/grid';
import type { Floor } from './maze';
import { AVATAR_LAYER } from './avatar';

export interface MirrorSpot {
  x: number;
  z: number;
  rotY: number;
}

/** Deterministic wall-mounted spots: first walled direction of the entrance and exit cells. */
export function mirrorSpots(floor: Floor): MirrorSpot[] {
  const spots: MirrorSpot[] = [];
  for (const cell of [floor.entrance, floor.exit]) {
    for (const d of [Dir.North, Dir.East, Dir.South, Dir.West] as const) {
      if (floor.grid.hasWall(cell.x, cell.y, d)) {
        const { cx, cy } = floor.grid.cellCenter(cell.x, cell.y);
        const v = DIR_VECTOR[d]!;
        spots.push({
          x: cx + v.dx * (CELL_SIZE / 2 - 0.12),
          z: cy + v.dy * (CELL_SIZE / 2 - 0.12),
          rotY: Math.atan2(-v.dx, -v.dy), // plane normal (+z rotated) faces back into the cell
        });
        break;
      }
    }
  }
  return spots;
}

export class HeroMirror {
  readonly mesh: THREE.Mesh;
  private readonly rt: THREE.WebGLRenderTarget;
  private readonly cam = new THREE.PerspectiveCamera();
  private readonly plane: THREE.Plane;
  private readonly target = new THREE.Vector3();

  constructor(spot: MirrorSpot, tint = 0xcfe8ea) {
    this.rt = new THREE.WebGLRenderTarget(512, 512);
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 2.4),
      new THREE.MeshBasicMaterial({ map: this.rt.texture, color: tint }),
    );
    this.mesh.position.set(spot.x, 1.35, spot.z);
    this.mesh.rotation.y = spot.rotY;
    const normal = new THREE.Vector3(Math.sin(spot.rotY), 0, Math.cos(spot.rotY));
    this.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, this.mesh.position);
    this.cam.layers.enable(AVATAR_LAYER); // the avatar is visible ONLY here and in other mirror passes
  }

  update(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    mainCam: THREE.PerspectiveCamera,
  ): void {
    const pos = new THREE.Vector3();
    mainCam.getWorldPosition(pos);
    const d = this.plane.distanceToPoint(pos);
    mainCam.getWorldDirection(this.target).add(pos); // a point ahead of the camera
    const td = this.plane.distanceToPoint(this.target);

    this.cam.position.copy(pos).addScaledVector(this.plane.normal, -2 * d); // mirrored eye
    const mirroredTarget = this.target.clone().addScaledVector(this.plane.normal, -2 * td);
    this.cam.up.set(0, 1, 0); // wall normals are horizontal, so up is unchanged
    this.cam.lookAt(mirroredTarget);
    this.cam.projectionMatrix.copy(mainCam.projectionMatrix);

    const prevClipping = renderer.clippingPlanes;
    const wasVisible = this.mesh.visible;
    this.mesh.visible = false; // no feedback loop
    renderer.clippingPlanes = [this.plane]; // render only the room side; if the RT comes out empty, plane.negate() is the fix
    renderer.setRenderTarget(this.rt);
    renderer.render(scene, this.cam);
    renderer.setRenderTarget(null);
    renderer.clippingPlanes = prevClipping;
    this.mesh.visible = wasVisible;
  }

  dispose(): void {
    this.rt.dispose();
    this.mesh.geometry.dispose();
  }
}
```

Modify `src/main.ts`:

- `import { HeroMirror, mirrorSpots } from './game/mirror';`
- after avatar creation: `const mirrors = mirrorSpots(floor).map((s) => new HeroMirror(s)); mirrors.forEach((m) => scene.add(m.mesh));`
- in `frame()`, before `renderer.render(...)`: `mirrors.forEach((m, i) => { if (frameIndex % 2 === i % 2) m.update(renderer, scene, camera); });` with a `frameIndex++` counter (mirrors update on alternate frames — perf budget).
- debug hook: add `mirrors: mirrors.length`.
- **Important:** the avatar's `PointLight` (the lantern in `main.ts`) stays on layer 0 — lights must affect both cameras. Only meshes were moved to layer 1 in Task 2.

- [x] **Step 4: GREEN + gates + quick visual sanity** — `npm run dev`, load `/?seed=MIRROR&look=teal-white`, walk forward/turn: your reflection must appear in the wall mirror at spawn (coat teal, lantern white). You cannot verify visually headlessly — instead add nothing to unit tests; Task 7's e2e asserts `mirrors >= 2` via the hook, and you record "visual check: deferred to user/e2e" in the report.

- [x] **Step 5: Commit** — `feat(step003): hero mirrors — planar RT reflections, self-reflection at spawn`

---

### Task 4: Input modes (keyboard-only / mouse-only / hybrid) + HUD buttons

**Files:**

- Create: `src/ui/hud.ts`
- Modify: `src/engine/input.ts`, `src/main.ts`, `index.html` (hud CSS)
- Test: `tests/unit/input.test.ts` (extend), `tests/unit/hudmode.test.ts` (pure part only if any — else none)

**Interfaces:**

- Consumes: `keysToMoveInput` (M1), constants.
- Produces:

```ts
// input.ts additions
export type InputMode = 'keyboard' | 'mouse' | 'hybrid';
export const KEY_TURN_PER_STEP = 0.045;
export const MOUSE_TURN_PER_STEP = 0.06;
export function keysToMoveInput(snap: KeyboardSnapshot, mode?: InputMode): MoveInput; // mode-aware
export interface MouseState {
  leftDown: boolean;
  rightDown: boolean;
  cursorNorm: number;
} // cursorNorm -1..1 viewport
export function mouseOnlyInput(m: MouseState): MoveInput;
// InputCollector gains: mouseState(): MouseState
// hud.ts
export type HudInit = {
  mode: InputMode;
  onMode(m: InputMode): void;
  onFaq(): void;
  onDaily(): void;
};
export interface Hud {
  setMode(mode: InputMode): void;
  setChips(chips: { streak?: number; bestMs?: number | null; timerMs?: number | null }): void;
  showCleared(ms: number, bestMs: number | null, isBest: boolean): void;
  hideCleared(): void;
  root: HTMLElement;
}
export function createHud(init: HudInit): Hud;
```

- [x] **Step 1: Extend failing tests** (`tests/unit/input.test.ts` — add)

```ts
import { keysToMoveInput as map, mouseOnlyInput } from '../../src/engine/input';
import { KEY_TURN_PER_STEP, MOUSE_TURN_PER_STEP } from '../../src/engine/constants';

describe('input modes', () => {
  it('keyboard mode: arrows turn, no strafe, Q/E turn', () => {
    const right = map({ keys: new Set(['ArrowRight']), mouseDx: 0 }, 'keyboard');
    expect(right.turn).toBeCloseTo(KEY_TURN_PER_STEP);
    expect(right.strafe).toBe(0);
    expect(map({ keys: new Set(['KeyQ']), mouseDx: 0 }, 'keyboard').turn).toBeCloseTo(
      -KEY_TURN_PER_STEP,
    );
    const both = map({ keys: new Set(['ArrowRight', 'KeyD']), mouseDx: 0 }, 'keyboard');
    expect(both.strafe).toBe(0);
  });
  it('hybrid mode: arrows strafe, mouse turns, Q/E turns too', () => {
    const h = map({ keys: new Set(['ArrowRight', 'KeyE']), mouseDx: 10 });
    expect(h.strafe).toBe(1);
    expect(h.turn).toBeCloseTo(10 * 0.003 + KEY_TURN_PER_STEP);
  });
  it('mouse-only: hold left = walk steering toward cursor; right = sprint; center deadzone', () => {
    expect(mouseOnlyInput({ leftDown: true, rightDown: false, cursorNorm: 0 })).toEqual({
      forward: 1,
      strafe: 0,
      sprint: false,
      turn: 0,
    });
    expect(mouseOnlyInput({ leftDown: true, rightDown: true, cursorNorm: 0.65 }).turn).toBeCloseTo(
      MOUSE_TURN_PER_STEP,
    );
    expect(mouseOnlyInput({ leftDown: false, rightDown: false, cursorNorm: 1 }).forward).toBe(0);
    expect(mouseOnlyInput({ leftDown: true, rightDown: false, cursorNorm: -0.9 }).turn).toBeCloseTo(
      -MOUSE_TURN_PER_STEP,
    );
    expect(mouseOnlyInput({ leftDown: true, rightDown: false, cursorNorm: 0.1 }).turn).toBe(0); // deadzone
  });
});
```

Add both constants to `src/engine/constants.ts` (`KEY_TURN_PER_STEP = 0.045`, `MOUSE_TURN_PER_STEP = 0.06`) — update the import line above accordingly (`TURN_SENSITIVITY` already imported).

- [x] **Step 2: RED** — `npm test -- input`.

- [x] **Step 3: Implement**

`src/engine/input.ts` — replace `keysToMoveInput` body and extend `InputCollector`:

```ts
export type InputMode = 'keyboard' | 'mouse' | 'hybrid';

export function keysToMoveInput(snap: KeyboardSnapshot, mode: InputMode = 'hybrid'): MoveInput {
  const has = (...codes: string[]) => codes.some((c) => snap.keys.has(c));
  const forward = (has('KeyW', 'ArrowUp') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0);
  const keyTurn = (has('KeyE') ? 1 : 0) - (has('KeyQ') ? 1 : 0);
  const sprint = has('ShiftLeft', 'ShiftRight');
  const mouseTurn = snap.mouseDx * TURN_SENSITIVITY;
  if (mode === 'keyboard') {
    const arrowTurn = (has('ArrowRight') ? 1 : 0) - (has('ArrowLeft') ? 1 : 0);
    return {
      forward,
      strafe: 0,
      sprint,
      turn: mouseTurn + (keyTurn + arrowTurn) * KEY_TURN_PER_STEP,
    };
  }
  const strafe = (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft') ? 1 : 0);
  return { forward, strafe, sprint, turn: mouseTurn + keyTurn * KEY_TURN_PER_STEP };
}

export interface MouseState {
  leftDown: boolean;
  rightDown: boolean;
  cursorNorm: number;
}

export function mouseOnlyInput(m: MouseState): MoveInput {
  const mag = Math.abs(m.cursorNorm);
  const steer = mag < 0.15 ? 0 : Math.sign(m.cursorNorm) * Math.min(1, (mag - 0.15) / 0.5);
  return {
    forward: m.leftDown ? 1 : 0,
    strafe: 0,
    sprint: m.rightDown,
    turn: steer * MOUSE_TURN_PER_STEP,
  };
}
```

`InputCollector`: track `leftDown/rightDown/cursorX`; `mousedown` (button 0/2), `mouseup`, `contextmenu` preventDefault, `mousemove` updates `cursorX` always (no pointer-lock gate for this field); add `mouseState(): MouseState` returning `{ leftDown, rightDown, cursorNorm: this.cursorNorm() }` with `cursorNorm() = (this.cursorX / win.innerWidth) * 2 - 1` (store width at attach; `Window` passed in). Keep all M1 exports/behavior identical.

`src/ui/hud.ts`:

```ts
// SPDX-License-Identifier: Apache-2.0
import type { InputMode } from '../engine/input';

export type HudInit = {
  mode: InputMode;
  onMode(m: InputMode): void;
  onFaq(): void;
  onDaily(): void;
};
export interface Hud {
  setMode(mode: InputMode): void;
  setChips(chips: { streak?: number; bestMs?: number | null; timerMs?: number | null }): void;
  showCleared(ms: number, bestMs: number | null, isBest: boolean): void;
  hideCleared(): void;
  root: HTMLElement;
}

function chip(label: string, id: string): HTMLElement {
  const el = document.createElement('span');
  el.className = 'mh-chip';
  el.id = `mh-${id}`;
  el.textContent = label;
  return el;
}

export function createHud(init: HudInit): Hud {
  const root = document.createElement('div');
  root.id = 'hud';
  const modes = document.createElement('div');
  modes.id = 'mh-modes';
  const buttons: Record<string, HTMLButtonElement> = {};
  for (const m of ['keyboard', 'mouse', 'hybrid'] as const) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.mode = m;
    b.textContent = m === 'keyboard' ? '⌨ Keys' : m === 'mouse' ? '🖱 Mouse' : '⌨+🖱 Both';
    b.addEventListener('click', () => init.onMode(m));
    buttons[m] = b;
    modes.appendChild(b);
  }
  const faq = document.createElement('button');
  faq.type = 'button';
  faq.id = 'mh-faq';
  faq.textContent = '? FAQ';
  faq.addEventListener('click', () => init.onFaq());
  const daily = document.createElement('button');
  daily.type = 'button';
  daily.id = 'mh-daily';
  daily.textContent = '★ Daily';
  daily.addEventListener('click', () => init.onDaily());
  const chips = document.createElement('div');
  chips.id = 'mh-chips';
  chips.append(chip('🔥 0', 'streak'), chip('⏱ —', 'best'), chip('⏳ 0.0s', 'timer'));
  const cleared = document.createElement('div');
  cleared.id = 'mh-cleared';
  cleared.hidden = true;
  root.append(modes, faq, daily, chips, cleared);
  document.body.appendChild(root);

  const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  const setMode = (mode: InputMode) => {
    for (const m of Object.keys(buttons)) buttons[m]!.classList.toggle('active', m === mode);
  };
  setMode(init.mode);
  return {
    setMode,
    setChips: (c) => {
      if (c.streak !== undefined)
        (document.getElementById('mh-streak') as HTMLElement).textContent = `🔥 ${c.streak}`;
      if (c.bestMs !== undefined)
        (document.getElementById('mh-best') as HTMLElement).textContent =
          `⏱ ${c.bestMs == null ? '—' : fmt(c.bestMs)}`;
      if (c.timerMs !== undefined)
        (document.getElementById('mh-timer') as HTMLElement).textContent = `⏳ ${fmt(c.timerMs)}`;
    },
    showCleared: (ms, bestMs, isBest) => {
      cleared.hidden = false;
      cleared.textContent = isBest
        ? `✨ Floor cleared in ${fmt(ms)} — new best!`
        : `Floor cleared in ${fmt(ms)} (best ${bestMs == null ? '—' : fmt(bestMs)})`;
    },
    hideCleared: () => {
      cleared.hidden = true;
    },
    root,
  };
}
```

`index.html` `<style>` — append:

```css
#hud {
  position: fixed;
  top: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  font: 13px/1.4 system-ui;
  color: #f2e9d8;
  pointer-events: none;
}
#hud button {
  pointer-events: auto;
  cursor: pointer;
  background: rgba(11, 16, 38, 0.8);
  color: #f2e9d8;
  border: 1px solid #2a3560;
  border-radius: 6px;
  padding: 4px 10px;
  margin-left: 4px;
}
#hud button.active {
  border-color: #2ec4b6;
  color: #2ec4b6;
}
#mh-chips {
  display: flex;
  gap: 8px;
  background: rgba(11, 16, 38, 0.7);
  border-radius: 6px;
  padding: 4px 10px;
}
#mh-cleared {
  background: rgba(11, 16, 38, 0.92);
  border: 1px solid #d9a441;
  color: #f2e9d8;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 15px;
  pointer-events: none;
}
```

`src/main.ts`:

- `import { createHud } from './ui/hud';` + InputMode/mouseOnlyInput imports
- `let mode: InputMode = 'hybrid';` and `const hud = createHud({ mode, onMode: (m) => { mode = m; hud.setMode(m); }, onFaq: () => {}, onDaily: () => {} });` (FAQ/daily wired in Tasks 5–6 — empty callbacks now, exact names reserved)
- pointer lock only in hybrid: wrap the existing click listener → `canvas.addEventListener('click', () => { if (mode === 'hybrid') { const lock = canvas.requestPointerLock() as unknown as { catch?: (cb: () => void) => void } | undefined; lock?.catch?.(() => {}); } });` (move the guard from Task M1's fix into the mode check)
- in the fixed-step block: `const inputFrame = mode === 'mouse' ? mouseOnlyInput(input.mouseState()) : keysToMoveInput(input.snapshotAndReset(), mode);` — careful: in mouse mode don't drain mouseDx (unused); call `input.snapshotAndReset()` only for keyboard/hybrid exactly as before.

- [x] **Step 4: GREEN + gates + `npm run e2e`** (M1 smoke must still pass — hybrid default unchanged).

- [x] **Step 5: Commit** — `feat(step003): three input modes with on-screen HUD switcher`

---

### Task 5: Floor run, meta save, timer, streak, daily seed

**Files:**

- Create: `src/game/floorRun.ts`, `src/game/meta.ts`
- Modify: `src/main.ts` (timer/exit/overlay/daily/streak wiring), `src/ui/hud.ts` (no change expected)
- Test: `tests/unit/meta.test.ts`, `tests/unit/floorrun.test.ts`

**Interfaces:**

- Consumes: `SEED_ALPHABET`, `xmur3` (M1), `InputMode` (Task 4), hud.
- Produces:

```ts
// floorRun.ts
export const EXIT_RADIUS = 1.6;
export interface FloorRun {
  seed: string;
  startedAt: number | null;
  clearedAt: number | null;
}
export function createFloorRun(seed: string): FloorRun;
export function isAtExit(px: number, py: number, exitCx: number, exitCy: number): boolean;
export function runElapsedMs(run: FloorRun, now: number): number; // 0 before start
// meta.ts
export interface MetaSave {
  v: 1;
  lookName: string;
  mode: InputMode;
  best: Record<string, number>;
  streak: { count: number; lastDay: string };
}
export const META_KEY = 'mirrorhouse.meta.v1';
export function defaultMeta(mode?: InputMode): MetaSave;
export function loadMeta(): MetaSave; // try/catch, validates v===1, else defaultMeta()
export function saveMeta(m: MetaSave): void; // try/catch silent
export function todayStamp(d?: Date): string; // 'YYYY-MM-DD' local
export function nextStreak(count: number, lastDay: string, today: string): number;
export function dailySeed(stamp: string): string; // 6 chars from SEED_ALPHABET
export function recordRun(m: MetaSave, seed: string, ms: number, today: string): MetaSave; // min best + streak tick
```

- [x] **Step 1: Failing tests**

`tests/unit/floorrun.test.ts`:

```ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { createFloorRun, isAtExit, runElapsedMs, EXIT_RADIUS } from '../../src/game/floorRun';

describe('floorRun', () => {
  it('timer starts at 0, runs after start, freezes after clear', () => {
    const r = createFloorRun('AAAA');
    expect(runElapsedMs(r, 5000)).toBe(0);
    const started = { ...r, startedAt: 4000 as number | null };
    expect(runElapsedMs(started, 9000)).toBe(5000);
    expect(runElapsedMs({ ...started, clearedAt: 6000 }, 9000)).toBe(2000);
  });
  it('exit radius check', () => {
    expect(isAtExit(0, 0, 1, 0)).toBe(true);
    expect(isAtExit(0, 0, EXIT_RADIUS + 0.1, 0)).toBe(false);
  });
});
```

`tests/unit/meta.test.ts`:

```ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  dailySeed,
  defaultMeta,
  nextStreak,
  recordRun,
  todayStamp,
  SEED_ALPHABET,
} from '../../src/game/meta';

describe('meta', () => {
  it('nextStreak: same day keeps, yesterday increments, gap resets to 1', () => {
    expect(nextStreak(3, '2026-11-08', '2026-11-08')).toBe(3);
    expect(nextStreak(3, '2026-11-07', '2026-11-08')).toBe(4);
    expect(nextStreak(3, '2026-11-01', '2026-11-08')).toBe(1);
    expect(nextStreak(0, '', '2026-11-08')).toBe(1);
  });
  it('dailySeed is deterministic, 6 chars of the alphabet, differs across days', () => {
    const a = dailySeed('2026-11-08');
    expect(a).toHaveLength(6);
    for (const ch of a) expect(SEED_ALPHABET.includes(ch)).toBe(true);
    expect(dailySeed('2026-11-08')).toBe(a);
    expect(dailySeed('2026-11-09')).not.toBe(a);
  });
  it('recordRun keeps min best and ticks streak', () => {
    const m0 = defaultMeta();
    const m1 = recordRun(m0, 'AAAA', 9000, '2026-11-08');
    expect(m1.best['AAAA']).toBe(9000);
    expect(m1.streak).toEqual({ count: 1, lastDay: '2026-11-08' });
    const m2 = recordRun(m1, 'AAAA', 7000, '2026-11-09');
    expect(m2.best['AAAA']).toBe(7000);
    expect(m2.streak.count).toBe(2);
    const m3 = recordRun(m2, 'AAAA', 8000, '2026-11-09');
    expect(m3.best['AAAA']).toBe(7000); // slower run does not overwrite best
  });
  it('todayStamp formats local YYYY-MM-DD', () => {
    expect(todayStamp(new Date(2026, 10, 8, 23, 59))).toBe('2026-11-08');
  });
});
```

- [x] **Step 2: RED** — both files.

- [x] **Step 3: Implement**

`src/game/floorRun.ts`:

```ts
// SPDX-License-Identifier: Apache-2.0
export const EXIT_RADIUS = 1.6;

export interface FloorRun {
  seed: string;
  startedAt: number | null;
  clearedAt: number | null;
}

export function createFloorRun(seed: string): FloorRun {
  return { seed, startedAt: null, clearedAt: null };
}

export function isAtExit(px: number, py: number, exitCx: number, exitCy: number): boolean {
  return Math.hypot(px - exitCx, py - exitCy) <= EXIT_RADIUS;
}

export function runElapsedMs(run: FloorRun, now: number): number {
  if (run.startedAt === null) return 0;
  return (run.clearedAt ?? now) - run.startedAt;
}
```

`src/game/meta.ts`:

```ts
// SPDX-License-Identifier: Apache-2.0
import type { InputMode } from '../engine/input';
import { xmur3 } from '../engine/rng';
import { SEED_ALPHABET } from './seedCode';

export interface MetaSave {
  v: 1;
  lookName: string;
  mode: InputMode;
  best: Record<string, number>;
  streak: { count: number; lastDay: string };
}

export const META_KEY = 'mirrorhouse.meta.v1';
export { SEED_ALPHABET };

export function defaultMeta(mode: InputMode = 'hybrid'): MetaSave {
  return { v: 1, lookName: 'indigo-gold', mode, best: {}, streak: { count: 0, lastDay: '' } };
}

export function loadMeta(): MetaSave {
  try {
    const raw = globalThis.localStorage?.getItem(META_KEY);
    if (!raw) return defaultMeta();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && (parsed as { v?: number }).v === 1) {
      return parsed as MetaSave;
    }
  } catch {
    /* corrupted or unavailable storage — fall back to defaults */
  }
  return defaultMeta();
}

export function saveMeta(m: MetaSave): void {
  try {
    globalThis.localStorage?.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* storage unavailable (private mode) — play without persistence */
  }
}

export function todayStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function nextStreak(count: number, lastDay: string, today: string): number {
  if (lastDay === today) return count;
  const dayMs = 86400000;
  const gap = new Date(today).getTime() - new Date(lastDay).getTime();
  return gap === dayMs ? count + 1 : 1;
}

export function dailySeed(stamp: string): string {
  const h = xmur3(`mirrorhouse-daily:${stamp}`);
  let n = h() >>> 0;
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += SEED_ALPHABET[n % SEED_ALPHABET.length];
    n = Math.floor(n / SEED_ALPHABET.length) + h();
  }
  return out;
}

export function recordRun(m: MetaSave, seed: string, ms: number, today: string): MetaSave {
  const prev = m.best[seed];
  return {
    ...m,
    best: prev === undefined || ms < prev ? { ...m.best, [seed]: ms } : m.best,
    streak: { count: nextStreak(m.streak.count, m.streak.lastDay, today), lastDay: today },
  };
}
```

`src/main.ts` wiring:

- imports; `let meta = loadMeta(); let run = createFloorRun(seed); const exitCenter = floor.grid.cellCenter(floor.exit.x, floor.exit.y);`
- hud init: `mode` starts as `meta.mode`; `onMode` also does `meta = { ...meta, mode: m }; saveMeta(meta);`
- daily: `onDaily: () => { const d = dailySeed(todayStamp()); window.location.search = \`?seed=${d}\`; }`(and append`&look=${...}`? No — keep look in URL only if user set it; acceptable to drop).
- in the fixed-step block after movement: if `run.startedAt === null && inputActive` → `run.startedAt = now;`
- after the step loop each frame: `hud.setChips({ timerMs: runElapsedMs(run, now), streak: meta.streak.count, bestMs: meta.best[seed] ?? null });`
- exit check (once per frame, when `run.clearedAt === null && run.startedAt !== null`): `if (isAtExit(player.x, player.y, exitCenter.cx, exitCenter.cy)) { run.clearedAt = now; const ms = runElapsedMs(run, now); const wasBest = meta.best[seed]; meta = recordRun(meta, seed, ms, todayStamp()); saveMeta(meta); hud.showCleared(ms, meta.best[seed] ?? null, wasBest === undefined || ms < wasBest); }`
- `?seed=` daily flows through the normal seed path (6-char code is valid).

- [x] **Step 4: GREEN + gates + e2e still 2/2.**

- [x] **Step 5: Commit** — `feat(step003): floor timer, local best times, daily streak, daily seed`

---

### Task 6: FAQ screen

**Files:**

- Create: `src/ui/faq.ts`
- Modify: `src/main.ts` (wire `onFaq` + [H] key toggle), `index.html` (faq CSS)

**Interfaces:**

- Produces: `export function buildFaqOverlay(): { root: HTMLElement; toggle(): void; }` — `<details>` list, built with `document.createElement` (no innerHTML).

- [x] **Step 1: Implement** (`src/ui/faq.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
export interface FaqEntry {
  q: string;
  a: string;
}

export const FAQ: readonly FaqEntry[] = [
  {
    q: 'What is Mirror House?',
    a: 'A 100-floor escape through a century-old palace of mirrors. Floors are 2–5 minute tactical puzzles: fog the glass, outthink what hunts you, reach the stair door. You start at the top — level 1 — and descend.',
  },
  {
    q: 'How do I move?',
    a: 'Three modes, all fully playable alone — switch with the buttons at top right. Keys: WASD + mouse look (hybrid). Keys only: arrows or Q/E turn. Mouse only: hold left button to walk toward the cursor, hold right to sprint.',
  },
  {
    q: 'Why do I see myself in the mirrors?',
    a: 'Because it is the point. Your reflection is you — coat and lantern are yours to configure (try ?look=teal-white in the URL). In later floors, the house will try to fake it.',
  },
  {
    q: 'What is a seed?',
    a: 'Every floor layout is generated deterministically from its seed code — the same seed always builds the same maze. Share a code and a friend walks your exact floor.',
  },
  {
    q: 'What is the Daily?',
    a: "A seed derived from today's date — everyone on Earth gets the same floor each day. One a day keeps the streak alive.",
  },
  {
    q: 'What are the streak and best time?',
    a: 'Streak counts consecutive days you cleared a floor. Best time is your fastest clear of the current seed. Both live only on your device.',
  },
  {
    q: 'Where is my data stored?',
    a: "On your device, in your browser's local storage. No accounts, no servers, no telemetry — nothing leaves your machine. Ever.",
  },
  {
    q: 'Who is the lantern voice?',
    a: "Aaina — a shard of the palace's first true mirror. She guides, hints, and occasionally judges. She arrives with the next milestone.",
  },
  {
    q: 'What hunts me in later floors?',
    a: 'Echoes — hollow reflections of past guests — and four Sentinels: Chhaya who walks your past, Taal who moves on the beat, Gher who seals exits, Aavart who predicts. Not yet. They come with the mirrors.',
  },
  {
    q: 'Is it free? Is it open source?',
    a: 'Yes and yes: MIT-style freedom under Apache-2.0 for code, CC-BY 4.0 for art and words. The repo is public on GitHub.',
  },
  {
    q: 'Who made the music?',
    a: 'Nobody yet — it arrives soon, generated live in your browser: Indian classical-fusion, fully original, no samples.',
  },
  {
    q: 'I found a bug.',
    a: 'Thank you — please file it at github.com/seolithdev01/mirror-house/issues with your seed code; the layout reproduces itself.',
  },
];

export function buildFaqOverlay(): { root: HTMLElement; toggle(): void } {
  const root = document.createElement('div');
  root.id = 'mh-faq-overlay';
  root.hidden = true;
  const box = document.createElement('div');
  box.id = 'mh-faq-box';
  const h = document.createElement('h2');
  h.textContent = 'Mirror House — FAQ';
  box.appendChild(h);
  for (const { q, a } of FAQ) {
    const d = document.createElement('details');
    const s = document.createElement('summary');
    s.textContent = q;
    const p = document.createElement('p');
    p.textContent = a;
    d.append(s, p);
    box.appendChild(d);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '✕ Close (H)';
  close.addEventListener('click', () => {
    root.hidden = true;
  });
  box.appendChild(close);
  root.appendChild(box);
  root.addEventListener('click', (e) => {
    if (e.target === root) root.hidden = true;
  });
  document.body.appendChild(root);
  return {
    root,
    toggle: () => {
      root.hidden = !root.hidden;
    },
  };
}
```

`index.html` style append:

```css
#mh-faq-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(5, 8, 20, 0.82);
  display: grid;
  place-items: center;
}
#mh-faq-overlay[hidden] {
  display: none;
}
#mh-faq-box {
  max-width: 640px;
  max-height: 82vh;
  overflow: auto;
  background: #0b1026;
  border: 1px solid #2a3560;
  border-radius: 10px;
  padding: 20px 26px;
  color: #f2e9d8;
  font: 14px/1.6 system-ui;
}
#mh-faq-box h2 {
  margin: 0 0 12px;
  color: #d9a441;
  font-size: 18px;
}
#mh-faq-box details {
  border-bottom: 1px solid #1d2440;
  padding: 8px 0;
}
#mh-faq-box summary {
  cursor: pointer;
  color: #2ec4b6;
}
#mh-faq-box button {
  margin-top: 14px;
  background: #1d2440;
  color: #f2e9d8;
  border: 1px solid #2a3560;
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
}
```

`src/main.ts`: `const faq = buildFaqOverlay();` → hud init `onFaq: () => faq.toggle()`; keydown listener: `window.addEventListener('keydown', (e) => { if (e.code === 'KeyH' && !e.repeat) faq.toggle(); });`

- [x] **Step 2: Gates + e2e** (`npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`).

- [x] **Step 3: Commit** — `feat(step003): in-game FAQ screen (12 Q/A, doubles as future Aaina knowledge base)`

---

### Task 7: E2E coverage for step003 + debug-hook extension

**Files:**

- Modify: `src/main.ts` (extend hook: `look`, `mode`, `mirrors`, `avatarPresent`, `streak`, `bestFor(seed)`), `tests/e2e/smoke.spec.ts` (add tests)

**Interfaces — final debug hook shape (all tasks depend on exact names):**

```ts
window.__MIRROR_HOUSE_DEBUG__ = {
  getPlayer: () => ({ x, y, heading }),
  seed: string,
  look: string, // e.g. 'teal-white'
  mode: InputMode, // current input mode
  setModeRef: () => mode, // not needed — mode already exposed via closure re-read
  mirrors: number,
  avatarPresent: boolean, // scene contains the avatar group
  streak: () => number,
  bestFor: (seed: string) => number | null,
};
```

- [x] **Step 1: Extend `src/main.ts` hook** (inside the existing `if (import.meta.env.DEV)` block; `mode` and `meta` are `let` bindings so closures read current values):

```ts
(window as unknown as Record<string, unknown>).__MIRROR_HOUSE_DEBUG__ = {
  getPlayer: () => ({ ...player }),
  seed,
  look: () => look.name,
  mode: () => mode,
  mirrors,
  avatarPresent: true,
  streak: () => meta.streak.count,
  bestFor: (s: string) => meta.best[s] ?? null,
};
```

- [x] **Step 2: Add e2e tests** (`tests/e2e/smoke.spec.ts`)

```ts
interface DebugHook {
  getPlayer(): { x: number; y: number; heading: number };
  seed: string;
  look(): string;
  mode(): string;
  mirrors: number;
  avatarPresent: boolean;
  streak(): number;
  bestFor(seed: string): number | null;
}
const hook = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () => (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__,
  );

test('step003: look param, mirrors at spawn, avatar present', async ({ page }) => {
  await page.goto('/?seed=MIRROR&look=teal-white');
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>).__MIRROR_HOUSE_DEBUG__,
  );
  const h = await hook(page);
  expect(h.look()).toBe('teal-white');
  expect(h.mirrors).toBeGreaterThanOrEqual(2);
  expect(h.avatarPresent).toBe(true);
});

test('step003: mode buttons switch input mode', async ({ page }) => {
  await page.goto('/?seed=MODES');
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>).__MIRROR_HOUSE_DEBUG__,
  );
  await page.locator('#hud button[data-mode="keyboard"]').click();
  expect((await hook(page)).mode()).toBe('keyboard');
  await page.locator('#hud button[data-mode="mouse"]').click();
  expect((await hook(page)).mode()).toBe('mouse');
});

test('step003: FAQ opens with 12 entries and H toggles', async ({ page }) => {
  await page.goto('/?seed=FAQ');
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>).__MIRROR_HOUSE_DEBUG__,
  );
  await page.locator('#mh-faq').click();
  await expect(page.locator('#mh-faq-box details')).toHaveCount(12);
  await page.keyboard.press('KeyH'); // closes
  await expect(page.locator('#mh-faq-overlay')).toBeHidden();
  await page.keyboard.press('KeyH'); // reopens
  await expect(page.locator('#mh-faq-overlay')).toBeVisible();
});
```

Note: the M1 hook exposed `seed` as a plain field and `getPlayer` — keep those exact; the new `look`/`mode` are **functions** (closures over `let`), asserted with calls in tests.

- [x] **Step 3: Run** — `npm run e2e` → 5/5 (2 old + 3 new). Fix only genuine regressions; report anything suspicious.

- [x] **Step 4: Commit** — `test(step003): e2e — look/mirrors/avatar, mode buttons, FAQ`

---

### Task 8: Close-out — README, plan ticks, merge prep

**Files:**

- Modify: `README.md`, this plan (tick boxes), `docs/prompts-history/` (controller does the archive)

- [x] **Step 1: README updates** — controls section (three modes), `?look=coat-glass` table (4 coats × 3 glasses), Daily/streak/best explanation, FAQ button mention, art-direction screenshot placeholder note. Status line: "step003 — playable mirror-maze walker with self-reflection."
- [x] **Step 2: Local acceptance checklist**
  - [ ] `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e` all green
  - [ ] `?look=` all 12 valid combos parse (spot-check 3 in dev)
  - [ ] Streak increments only on cleared floor; best keeps min (unit-tested)
  - [ ] localStorage cleared → game still boots (defaultMeta path)
  - [ ] Bundle still < 3 MB gz
- [x] **Step 3: Commit** — `docs(step003): controls, looks, daily/streak, README`

## Plan Self-Review (authoring time)

- **Coverage:** colors→T1, avatar+config+reflection→T2/T3, input modes+buttons→T4, FAQ→T6, high score/streak/retention→T5(+T7 hooks), user acceptance→T8. ✓
- **Placeholders:** none — all code complete; the two intentional "wire later" hud callbacks (onFaq/onDaily empty in T4) are filled in T5/T6 with exact code. ✓
- **Type consistency:** `InputMode` defined once (input.ts) and imported by hud/meta/main; `AvatarLook`/`ResolvedLook` consistent T2; debug hook final shape defined in T7 and matched by T4/T5 wiring (look/mode as functions). ✓
- **M1 contract freeze:** `keysToMoveInput(snap)` default mode = 'hybrid' preserves M1 call semantics; M1 tests untouched and still passing in T4 Step 4. ✓
