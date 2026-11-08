# M0–M1: Scaffold + Seeded Maze + FOCUS View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship M0 (repo scaffold, CI, Cloudflare Pages deploy) and M1 (deterministic seeded maze generation, Wolfenstein-style flat-grid movement with collision, first-person FOCUS view) — a walking simulator through infinite reproducible mirror-maze floors.

**Architecture:** Hand-rolled TypeScript + Vite + three.js (no game engine, no UI framework). Pure deterministic core (`src/engine`, `src/game`) with zero DOM dependencies, unit-tested in Node; a thin `src/main.ts` bootstrap owns the canvas, input events, fixed-timestep loop, and diagnostics overlay. Grid cells are 4 m; walls are bitflags on cells; world origin sits at the grid center (grid *y* maps to three.js *z*).

**Tech Stack:** TypeScript 5 (strict), Vite, three.js, Vitest, Playwright, ESLint (flat config, typescript-eslint), Prettier, GitHub Actions, Cloudflare Pages via `wrangler-action`.

**Spec:** `docs/superpowers/specs/2026-11-08-mirror-house-design.md` (§7 architecture, §13.2 M0–M1 acceptance).

## Global Constraints

- TypeScript `strict: true` plus `noUncheckedIndexedAccess`; ESLint `@typescript-eslint/no-explicit-any: error` — zero `any` in `src/` and `tests/`.
- Every source file's first line: `// SPDX-License-Identifier: Apache-2.0` (tests too).
- Wolfenstein constraints (spec §4.7): flat grid, uniform wall height, **no jumping, no vertical aim (yaw only)**, fast strafe-run.
- Exact constants (spec §7.4 budgets): `CELL_SIZE=4`, `WALL_THICKNESS=0.2`, `WALL_HEIGHT=3.2`, `EYE_HEIGHT=1.7`, `PLAYER_RADIUS=0.4`, `WALK_SPEED=3.5`, `SPRINT_SPEED=6`, `MAX_STEP_DT=1/30`, `FIXED_STEP=1/120`, `TURN_SENSITIVITY=0.003`.
- Determinism: same seed string ⇒ identical floor layout, entrance, exit (spec §7.3). No `Math.random` anywhere under `src/` — only `createRng` (test for `randomSeed()` may use Web Crypto).
- Seed codes restricted to `/^[A-Z2-9]{1,16}$/` (spec §10 input rule).
- Runtime loads **zero remote content**; CSP `default-src 'self'` (spec §10).
- Acceptance gates: lint + typecheck + unit tests + build green in CI; Playwright smoke passes; deploy to CF Pages on `main`; 60 fps mid desktop (diagnostics overlay).
- Commits: conventional, scoped to the task (`feat(m1): …`, `chore(m0): …`, `test(m1): …`).

**Coordinate conventions (all tasks):** heading `0` = North = −y (grid) = −z (three.js); positive heading turns clockwise (East at π/2). Grid → world: `cellCenter(x,y) = ((x−(w−1)/2)·4, (y−(h−1)/2·4)…)` i.e. origin at grid center. Camera mapping: `camera.rotation.y = −heading`. Grid `y` is three.js `z` everywhere in render code.

---

### Task 1: Project scaffold (M0)

**Files:**
- Create: `package.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `index.html`, `src/main.ts`, `tests/unit/sanity.test.ts`, `vitest.config.ts`, `.gitignore` (exists — verify covers `dist/`, `node_modules/`, `playwright-report/`, `test-results/`)

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `typecheck`, `test`, `test:watch`, `lint`, `format`, `e2e` used by every later task and by CI.

- [ ] **Step 1: Write package.json + configs + index.html**

`package.json`:

```json
{
  "name": "mirror-house",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src tests",
    "format": "prettier --write .",
    "e2e": "playwright test"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true
  },
  "include": ["src", "tests", "vitest.config.ts", "playwright.config.ts"]
}
```

`eslint.config.js`:

```js
// SPDX-License-Identifier: Apache-2.0
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'playwright-report', 'test-results'] },
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-explicit-any': 'error' } },
);
```

`.prettierrc`: `{ "singleQuote": true, "printWidth": 100 }`

`vitest.config.ts`:

```ts
// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
```

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mirror House</title>
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; background: #05060a; }
      #game { display: block; width: 100vw; height: 100vh; }
      #diagnostics {
        position: fixed; top: 8px; left: 8px; z-index: 10;
        font: 12px/1.5 ui-monospace, monospace; color: #9fb4c8;
        background: rgba(5, 6, 10, 0.7); padding: 6px 10px; border-radius: 6px;
        pointer-events: none; white-space: pre;
      }
    </style>
  </head>
  <body>
    <canvas id="game"></canvas>
    <div id="diagnostics"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts` (placeholder — replaced in Task 10):

```ts
// SPDX-License-Identifier: Apache-2.0
const canvas = document.querySelector<HTMLCanvasElement>('#game');
const diagnostics = document.querySelector<HTMLElement>('#diagnostics');
if (canvas && diagnostics) diagnostics.textContent = 'Mirror House — scaffold OK';
```

- [ ] **Step 2: Install dependencies**

```bash
npm i three
npm i -D typescript vite vitest @playwright/test eslint typescript-eslint prettier @types/three
```

- [ ] **Step 3: Write the sanity test** (`tests/unit/sanity.test.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';

describe('scaffold', () => {
  it('runs TypeScript tests in node', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Verify all gates**

Run: `npm run typecheck && npm run lint && npm test && npm run build`
Expected: all exit 0; `dist/` created with `index.html`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(m0): vite+ts scaffold, eslint/prettier, vitest sanity"
```

---

### Task 2: CI + Cloudflare Pages deploy (M0)

**Files:**
- Create: `.github/workflows/ci.yml`, `public/_headers`, `public/404.html`

**Interfaces:**
- Consumes: npm scripts from Task 1.
- Produces: CI green badge requirement; production deploys of `dist/` on push to `main`; preview deploys per PR via CI artifact (wrangler previews) or `vite preview` — CI check is the gate.

**One-time user prerequisite (do before Step 1, needs the human):**
1. `npx wrangler login`
2. `npx wrangler pages project create mirror-house --production-branch main`
3. Cloudflare dashboard → My Profile → API Tokens → *Create Token* → template **Cloudflare Pages — Edit**.
4. Add GitHub repo secrets: `CF_API_TOKEN` (the token) and `CLOUDFLARE_ACCOUNT_ID` (shown on any domain overview page, right sidebar).

- [ ] **Step 1: Write `public/_headers`**

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()
```

- [ ] **Step 2: Write `public/404.html`**

```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Mirror House — lost in the glass</title>
<style>body{background:#05060a;color:#9fb4c8;font:16px/1.6 system-ui;display:grid;place-items:center;height:100vh;margin:0}</style>
</head><body><p>This corridor does not exist. <a style="color:#c8d8e8" href="/">Back to the entrance</a></p></body></html>
```

- [ ] **Step 3: Write `.github/workflows/ci.yml`**

```yaml
name: ci
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist }

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e

  deploy:
    needs: [check, e2e]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci && npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=mirror-house
```

- [ ] **Step 4: Verify locally + push**

Run: `npm run build && npx wrangler pages deploy dist --project-name mirror-house` (manual smoke; CI does this automatically once pushed).
Expected: a `mirror-house.pages.dev` URL serving the scaffold page with the CSP header (`curl -sI <url> | grep -i content-security`).

```bash
git add -A && git commit -m "chore(m0): CI (lint/type/test/build/e2e) + CF Pages deploy + CSP headers"
git push -u origin main   # after creating the empty GitHub repo and adding `origin`
```

- [ ] **Step 5: Confirm M0 acceptance**

GitHub Actions all green on `main`; production URL loads; PR opened from a branch gets a check run. M0 done.

---

### Task 3: Deterministic RNG (`src/engine/rng.ts`)

**Files:**
- Create: `src/engine/rng.ts`
- Test: `tests/unit/rng.test.ts`

**Interfaces:**
- Produces (used by Tasks 5, 6):

```ts
export interface Rng {
  next(): number;                        // uniform [0,1)
  int(maxExclusive: number): number;     // uniform integer 0..maxExclusive-1
  chance(p: number): boolean;            // true with probability p
  pick<T>(items: readonly T[]): T;       // uniform choice
  shuffle<T>(items: readonly T[]): T[];  // new array, deterministic permutation
}
export function createRng(seed: string): Rng;
```

- [ ] **Step 1: Write failing tests** (`tests/unit/rng.test.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/engine/rng';

describe('createRng', () => {
  it('same seed produces identical sequences', () => {
    const a = createRng('SHEESH');
    const b = createRng('SHEESH');
    const seqA = Array.from({ length: 16 }, () => a.next());
    const seqB = Array.from({ length: 16 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds diverge', () => {
    expect(createRng('AAA').next()).not.toBe(createRng('BBB').next());
  });

  it('next() stays in [0,1)', () => {
    const rng = createRng('X');
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() stays in range', () => {
    const rng = createRng('X');
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(15);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(15);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('shuffle() is a deterministic permutation', () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = createRng('S').shuffle(src);
    const b = createRng('S').shuffle(src);
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // input untouched
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`Cannot find module '../../src/engine/rng'`)

Run: `npm test -- rng`

- [ ] **Step 3: Implement** (`src/engine/rng.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0

export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

/** String-hash PRNG seeder (public-domain reference implementation). */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** Small fast PRNG (public-domain reference implementation). */
export function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): Rng {
  const seedFn = xmur3(seed);
  const next = mulberry32(seedFn());
  return {
    next,
    int: (maxExclusive) => Math.floor(next() * maxExclusive),
    chance: (p) => next() < p,
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('pick() on empty array');
      return items[Math.floor(next() * items.length)] as T;
    },
    shuffle: <T>(items: readonly T[]): T[] => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = out[i] as T;
        out[i] = out[j] as T;
        out[j] = tmp;
      }
      return out;
    },
  };
}
```

Note: object-literal methods with explicit generics satisfy the `Rng` interface — do not add a separate `Rng` implementation class.

- [ ] **Step 4: Run — expect PASS**

Run: `npm test -- rng`

- [ ] **Step 5: Commit**

```bash
git add src/engine/rng.ts tests/unit/rng.test.ts
git commit -m "feat(m1): deterministic rng (xmur3+mulberry32)"
```

---

### Task 4: Grid model (`src/engine/grid.ts`)

**Files:**
- Create: `src/engine/constants.ts`, `src/engine/grid.ts`
- Test: `tests/unit/grid.test.ts`

**Interfaces:**
- Produces (used by Tasks 5–10):

```ts
export const enum Dir { North = 0, East = 1, South = 2, West = 3 }
export interface CellIndex { x: number; y: number }
export interface WallSegment { x1: number; y1: number; x2: number; y2: number } // meters, axis-aligned
export class FloorGrid {
  constructor(width: number, height: number);       // all walls present
  readonly width: number; readonly height: number;
  inBounds(x: number, y: number): boolean;
  hasWall(x: number, y: number, dir: Dir): boolean;
  setOpen(x: number, y: number, dir: Dir): void;    // removes wall on both sides
  neighborIndex(x: number, y: number, dir: Dir): CellIndex | null;
  canWalk(x: number, y: number, dir: Dir): boolean; // neighbor exists && no wall
  deadEndCount(): number;                            // cells with 3 walls
  cellCenter(x: number, y: number): { cx: number; cy: number }; // world meters, origin at grid center
  cellAt(px: number, py: number): CellIndex;         // world meters -> cell
  wallSegments(): WallSegment[];                     // unique edges, exact spans
  wallSegmentsNearCells(gx: number, gy: number): WallSegment[]; // 3x3 neighborhood
}
```

- [ ] **Step 1: Write failing tests** (`tests/unit/grid.test.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { Dir, FloorGrid } from '../../src/engine/grid';

describe('FloorGrid', () => {
  it('starts fully walled', () => {
    const g = new FloorGrid(15, 15);
    expect(g.hasWall(7, 7, Dir.North)).toBe(true);
    expect(g.hasWall(0, 0, Dir.West)).toBe(true);
  });

  it('setOpen removes the wall from both sides', () => {
    const g = new FloorGrid(15, 15);
    g.setOpen(2, 2, Dir.North);
    expect(g.hasWall(2, 2, Dir.North)).toBe(false);
    expect(g.hasWall(2, 1, Dir.South)).toBe(false);
    expect(g.hasWall(2, 2, Dir.East)).toBe(true);
  });

  it('neighborIndex returns null out of bounds', () => {
    const g = new FloorGrid(5, 5);
    expect(g.neighborIndex(0, 0, Dir.West)).toBeNull();
    expect(g.neighborIndex(0, 0, Dir.South)).toEqual({ x: 0, y: 1 });
  });

  it('canWalk requires neighbor and no wall', () => {
    const g = new FloorGrid(5, 5);
    expect(g.canWalk(0, 0, Dir.North)).toBe(false); // out of bounds
    expect(g.canWalk(2, 2, Dir.East)).toBe(false);  // wall
    g.setOpen(2, 2, Dir.East);
    expect(g.canWalk(2, 2, Dir.East)).toBe(true);
  });

  it('15x15 all-walls has 480 unique segments; opening one shared wall removes one', () => {
    const g = new FloorGrid(15, 15);
    expect(g.wallSegments()).toHaveLength(480); // 15*16 horizontal + 16*15 vertical
    g.setOpen(2, 2, Dir.North);
    expect(g.wallSegments()).toHaveLength(479);
  });

  it('cellCenter puts origin at grid center; cellAt inverts it', () => {
    const g = new FloorGrid(5, 5);
    const { cx, cy } = g.cellCenter(2, 2);
    expect(cx).toBeCloseTo(0);
    expect(cy).toBeCloseTo(0);
    expect(g.cellCenter(0, 0).cx).toBeCloseTo(-8);
    expect(g.cellAt(-8, 0)).toEqual({ x: 0, y: 2 });
  });

  it('deadEndCount counts cells with exactly one open direction', () => {
    const g = new FloorGrid(3, 3);
    g.setOpen(1, 1, Dir.North);
    // (1,1) has 1 open (north); (1,0) has 1 open (south — shared wall) — both dead ends
    expect(g.deadEndCount()).toBe(2);
    g.setOpen(1, 1, Dir.South);
    // (1,1) now has 2 open (not a dead end); (1,0) and (1,2) each still have 1
    expect(g.deadEndCount()).toBe(2);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`Cannot find module '../../src/engine/grid'`)

Run: `npm test -- grid`

- [ ] **Step 3: Implement**

`src/engine/constants.ts`:

```ts
// SPDX-License-Identifier: Apache-2.0
export const CELL_SIZE = 4; // meters
export const WALL_THICKNESS = 0.2; // meters
export const WALL_HEIGHT = 3.2; // meters — uniform, Wolfenstein constraint
export const EYE_HEIGHT = 1.7; // meters
export const PLAYER_RADIUS = 0.4; // meters
export const WALK_SPEED = 3.5; // m/s
export const SPRINT_SPEED = 6; // m/s
export const MAX_STEP_DT = 1 / 30; // seconds — clamps tunneling
export const TURN_SENSITIVITY = 0.003; // radians per mouse pixel
export const FIXED_STEP = 1 / 120; // seconds
```

`src/engine/grid.ts`:

```ts
// SPDX-License-Identifier: Apache-2.0
import { CELL_SIZE } from './constants';

export const enum Dir { North = 0, East = 1, South = 2, West = 3 }
export const WALL_BIT: readonly number[] = [1, 2, 4, 8]; // bit per Dir
export const OPPOSITE: readonly Dir[] = [Dir.South, Dir.West, Dir.North, Dir.East];
export const DIR_VECTOR: readonly { dx: number; dy: number }[] = [
  { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
];

export interface CellIndex { x: number; y: number }
export interface WallSegment { x1: number; y1: number; x2: number; y2: number }

export class FloorGrid {
  readonly width: number;
  readonly height: number;
  private readonly walls: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.walls = new Uint8Array(width * height).fill(0b1111);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  private idx(x: number, y: number): number { return y * this.width + x; }

  hasWall(x: number, y: number, dir: Dir): boolean {
    return (this.walls[this.idx(x, y)]! & WALL_BIT[dir]!) !== 0;
  }

  private setWallBit(x: number, y: number, dir: Dir, present: boolean): void {
    const i = this.idx(x, y);
    const bit = WALL_BIT[dir]!;
    this.walls[i] = present ? this.walls[i]! | bit : this.walls[i]! & ~bit;
  }

  setOpen(x: number, y: number, dir: Dir): void {
    const n = this.neighborIndex(x, y, dir);
    if (!n) throw new Error(`no neighbor ${x},${y} dir ${dir}`);
    this.setWallBit(x, y, dir, false);
    this.setWallBit(n.x, n.y, OPPOSITE[dir]!, false);
  }

  neighborIndex(x: number, y: number, dir: Dir): CellIndex | null {
    const v = DIR_VECTOR[dir]!;
    const nx = x + v.dx, ny = y + v.dy;
    return this.inBounds(nx, ny) ? { x: nx, y: ny } : null;
  }

  canWalk(x: number, y: number, dir: Dir): boolean {
    const n = this.neighborIndex(x, y, dir);
    return n !== null && !this.hasWall(x, y, dir);
  }

  deadEndCount(): number {
    let count = 0;
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        let open = 0;
        for (const d of [Dir.North, Dir.East, Dir.South, Dir.West])
          if (!this.hasWall(x, y, d)) open++;
        if (open === 1) count++;
      }
    return count;
  }

  cellCenter(x: number, y: number): { cx: number; cy: number } {
    return {
      cx: (x - (this.width - 1) / 2) * CELL_SIZE,
      cy: (y - (this.height - 1) / 2) * CELL_SIZE,
    };
  }

  cellAt(px: number, py: number): CellIndex {
    const x = Math.min(this.width - 1, Math.max(0, Math.floor(px / CELL_SIZE + this.width / 2)));
    const y = Math.min(this.height - 1, Math.max(0, Math.floor(py / CELL_SIZE + this.height / 2)));
    return { x, y };
  }

  /** Unique wall edges: N and W per cell, plus E on last column and S on last row. */
  wallSegments(): WallSegment[] {
    const segs: WallSegment[] = [];
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        const { cx, cy } = this.cellCenter(x, y);
        const left = cx - CELL_SIZE / 2, right = cx + CELL_SIZE / 2;
        const top = cy - CELL_SIZE / 2, bottom = cy + CELL_SIZE / 2;
        if (this.hasWall(x, y, Dir.North)) segs.push({ x1: left, y1: top, x2: right, y2: top });
        if (this.hasWall(x, y, Dir.West)) segs.push({ x1: left, y1: top, x2: left, y2: bottom });
        if (x === this.width - 1 && this.hasWall(x, y, Dir.East))
          segs.push({ x1: right, y1: top, x2: right, y2: bottom });
        if (y === this.height - 1 && this.hasWall(x, y, Dir.South))
          segs.push({ x1: left, y1: bottom, x2: right, y2: bottom });
      }
    return segs;
  }

  wallSegmentsNearCells(gx: number, gy: number): WallSegment[] {
    const all = this.wallSegments();
    return all.filter((s) => {
      const midX = (s.x1 + s.x2) / 2, midY = (s.y1 + s.y2) / 2;
      const c = this.cellAt(midX, midY);
      return Math.abs(c.x - gx) <= 1 && Math.abs(c.y - gy) <= 1;
    });
  }
}
```

- [ ] **Step 4: Run — expect PASS** (`npm test -- grid`)

- [ ] **Step 5: Commit**

```bash
git add src/engine/constants.ts src/engine/grid.ts tests/unit/grid.test.ts
git commit -m "feat(m1): floor grid model, wall bitmasks, world-space segments"
```

---

### Task 5: Seeded maze generation (`src/game/maze.ts`)

**Files:**
- Create: `src/game/maze.ts`
- Test: `tests/unit/maze.test.ts`

**Interfaces:**
- Consumes: `createRng` (Task 3), `FloorGrid`/`Dir` (Task 4).
- Produces (used by Tasks 7, 9, 10):

```ts
export interface FloorParams {
  seed: string; width: number; height: number;
  braid: number;   // 0..1 chance to open each dead end
  rooms: number; roomMin: number; roomMax: number; // cells; rooms carved open
}
export interface Floor { seed: string; grid: FloorGrid; entrance: CellIndex; exit: CellIndex }
export const TIER_ONE: FloorParams; // seed filled per-run; 15x15, braid .15, rooms 3, 2..4
export function generateFloor(params: FloorParams): Floor;
export function bfsDistances(grid: FloorGrid, start: CellIndex): Int32Array; // -1 unreachable
```

- [ ] **Step 1: Write failing tests** (`tests/unit/maze.test.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { bfsDistances, generateFloor, TIER_ONE, type FloorParams } from '../../src/game/maze';

const params = (seed: string, over: Partial<FloorParams> = {}): FloorParams => ({
  ...TIER_ONE, seed, ...over,
});

describe('generateFloor', () => {
  it('is deterministic for a seed', () => {
    const a = generateFloor(params('AAAA'));
    const b = generateFloor(params('AAAA'));
    expect(a.entrance).toEqual(b.entrance);
    expect(a.exit).toEqual(b.exit);
    expect(a.grid.wallSegments()).toEqual(b.grid.wallSegments());
  });

  it('produces different layouts for different seeds', () => {
    const a = generateFloor(params('AAAA'));
    const b = generateFloor(params('BBBB'));
    expect(a.grid.wallSegments()).not.toEqual(b.grid.wallSegments());
  });

  it('every cell is reachable from the entrance', () => {
    const f = generateFloor(params('CCCC'));
    const dist = bfsDistances(f.grid, f.entrance);
    expect(Array.from(dist).every((d) => d >= 0)).toBe(true);
  });

  it('exit is the farthest cell from the entrance', () => {
    const f = generateFloor(params('CCCC'));
    const dist = bfsDistances(f.grid, f.entrance);
    const max = Math.max(...Array.from(dist));
    const i = f.exit.y * f.grid.width + f.exit.x;
    expect(dist[i]).toBe(max);
  });

  it('braiding strictly reduces dead ends (same seed)', () => {
    const tight = generateFloor(params('DDDD', { braid: 0 }));
    const loose = generateFloor(params('DDDD', { braid: 0.5 }));
    expect(loose.grid.deadEndCount()).toBeLessThan(tight.grid.deadEndCount());
  });

  it('respects dimensions', () => {
    const f = generateFloor(params('EEEE', { width: 9, height: 7 }));
    expect(f.grid.width).toBe(9);
    expect(f.grid.height).toBe(7);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- maze`)

- [ ] **Step 3: Implement** (`src/game/maze.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { createRng, type Rng } from '../engine/rng';
import { Dir, FloorGrid, DIR_VECTOR, type CellIndex } from '../engine/grid';

export interface FloorParams {
  seed: string;
  width: number;
  height: number;
  braid: number;
  rooms: number;
  roomMin: number;
  roomMax: number;
}

export interface Floor {
  seed: string;
  grid: FloorGrid;
  entrance: CellIndex;
  exit: CellIndex;
}

export const TIER_ONE: FloorParams = {
  seed: '',
  width: 15,
  height: 15,
  braid: 0.15,
  rooms: 3,
  roomMin: 2,
  roomMax: 4,
};

export function bfsDistances(grid: FloorGrid, start: CellIndex): Int32Array {
  const dist = new Int32Array(grid.width * grid.height).fill(-1);
  dist[start.y * grid.width + start.x] = 0;
  const queue: number[] = [start.y * grid.width + start.x];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const cx = cur % grid.width;
    const cy = Math.floor(cur / grid.width);
    for (const d of [Dir.North, Dir.East, Dir.South, Dir.West]) {
      if (!grid.canWalk(cx, cy, d)) continue;
      const v = DIR_VECTOR[d]!;
      const n = (cy + v.dy) * grid.width + (cx + v.dx);
      if (dist[n] === -1) {
        dist[n] = dist[cur]! + 1;
        queue.push(n);
      }
    }
  }
  return dist;
}

function carveBacktracker(grid: FloorGrid, start: CellIndex, rng: Rng): void {
  const visited = new Uint8Array(grid.width * grid.height);
  visited[start.y * grid.width + start.x] = 1;
  const stack: CellIndex[] = [start];
  while (stack.length > 0) {
    const cur = stack[stack.length - 1]!;
    const closed: Dir[] = [];
    for (const d of [Dir.North, Dir.East, Dir.South, Dir.West]) {
      const n = grid.neighborIndex(cur.x, cur.y, d);
      if (n && visited[n.y * grid.width + n.x] === 0) closed.push(d);
    }
    if (closed.length === 0) {
      stack.pop();
      continue;
    }
    const dir = rng.pick(closed);
    grid.setOpen(cur.x, cur.y, dir);
    const next = grid.neighborIndex(cur.x, cur.y, dir)!;
    visited[next.y * grid.width + next.x] = 1;
    stack.push(next);
  }
}

function braidDeadEnds(grid: FloorGrid, braid: number, rng: Rng): void {
  if (braid <= 0) return;
  for (let y = 0; y < grid.height; y++)
    for (let x = 0; x < grid.width; x++) {
      let open = 0;
      for (const d of [Dir.North, Dir.East, Dir.South, Dir.West])
        if (!grid.hasWall(x, y, d)) open++;
      if (open !== 1 || !rng.chance(braid)) continue;
      const candidates = ([Dir.North, Dir.East, Dir.South, Dir.West] as Dir[]).filter(
        (d) => grid.hasWall(x, y, d) && grid.neighborIndex(x, y, d) !== null,
      );
      if (candidates.length > 0) grid.setOpen(x, y, rng.pick(candidates));
    }
}

function carveRooms(grid: FloorGrid, rooms: number, min: number, max: number, rng: Rng): void {
  for (let r = 0; r < rooms; r++) {
    const w = min + rng.int(max - min + 1);
    const h = min + rng.int(max - min + 1);
    const x0 = rng.int(grid.width - w + 1);
    const y0 = rng.int(grid.height - h + 1);
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        if (x + 1 < x0 + w) grid.setOpen(x, y, Dir.East);
        if (y + 1 < y0 + h) grid.setOpen(x, y, Dir.South);
      }
  }
}

export function generateFloor(params: FloorParams): Floor {
  const rng = createRng(params.seed);
  const grid = new FloorGrid(params.width, params.height);
  const entrance: CellIndex = { x: rng.int(params.width), y: rng.int(params.height) };
  carveBacktracker(grid, entrance, rng);
  braidDeadEnds(grid, params.braid, rng);
  carveRooms(grid, params.rooms, params.roomMin, params.roomMax, rng);
  const dist = bfsDistances(grid, entrance);
  let bestIdx = 0;
  for (let i = 1; i < dist.length; i++) if (dist[i]! > dist[bestIdx]!) bestIdx = i;
  const exit: CellIndex = { x: bestIdx % grid.width, y: Math.floor(bestIdx / grid.width) };
  return { seed: params.seed, grid, entrance, exit };
}
```

- [ ] **Step 4: Run — expect PASS** (`npm test -- maze`)

- [ ] **Step 5: Commit**

```bash
git add src/game/maze.ts tests/unit/maze.test.ts
git commit -m "feat(m1): seeded maze gen — backtracker, braiding, rooms, farthest exit"
```

---

### Task 6: Seed codes (`src/game/seedCode.ts`)

**Files:**
- Create: `src/game/seedCode.ts`
- Test: `tests/unit/seedcode.test.ts`

**Interfaces:**
- Produces (used by Task 10): `isValidSeed(raw): boolean`, `normalizeSeed(raw): string`, `randomSeed(): string` (8 chars, Web Crypto).

- [ ] **Step 1: Write failing tests** (`tests/unit/seedcode.test.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { isValidSeed, normalizeSeed, randomSeed, SEED_ALPHABET } from '../../src/game/seedCode';

describe('seedCode', () => {
  it('accepts uppercase alphanumeric codes up to 16 chars', () => {
    expect(isValidSeed('A')).toBe(true);
    expect(isValidSeed('PLAYTEST7')).toBe(true);
    expect(isValidSeed('')).toBe(false);
    expect(isValidSeed('has space')).toBe(false);
    expect(isValidSeed('ABCDEFGHIJKLMNOPQRS')).toBe(false); // 17 chars
    expect(isValidSeed('play')).toBe(false); // lowercase
  });

  it('normalizeSeed uppercases, strips foreign chars, caps at 16', () => {
    expect(normalizeSeed(' play-2 ')).toBe('PLAY2');
    expect(normalizeSeed('a'.repeat(30))).toBe('A'.repeat(16));
  });

  it('randomSeed returns 8 chars from the alphabet', () => {
    for (let i = 0; i < 20; i++) {
      const s = randomSeed();
      expect(s).toHaveLength(8);
      for (const ch of s) expect(SEED_ALPHABET.includes(ch)).toBe(true);
    }
  });

  it('two random seeds differ (probabilistic but 8 chars base31)', () => {
    const set = new Set(Array.from({ length: 50 }, () => randomSeed()));
    expect(set.size).toBe(50);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- seedcode`)

- [ ] **Step 3: Implement** (`src/game/seedCode.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
/** Share-code alphabet: uppercase + digits ≥2, minus easily-confused I/L/O/0/1. */
export const SEED_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SEED_MAX = 16;

export function isValidSeed(raw: string): boolean {
  return /^[A-Z2-9]{1,16}$/.test(raw);
}

export function normalizeSeed(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, SEED_MAX);
}

export function randomSeed(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += SEED_ALPHABET[b % SEED_ALPHABET.length];
  return out;
}
```

- [ ] **Step 4: Run — expect PASS** (`npm test -- seedcode`)

- [ ] **Step 5: Commit**

```bash
git add src/game/seedCode.ts tests/unit/seedcode.test.ts
git commit -m "feat(m1): seed share codes, normalize + crypto random"
```

---

### Task 7: Player movement + collision (`src/game/player.ts`)

**Files:**
- Create: `src/game/player.ts`
- Test: `tests/unit/player.test.ts`

**Interfaces:**
- Consumes: `FloorGrid`, `WallSegment` (Task 4), speed/radius/dt constants (Task 4), `Floor` (Task 5).
- Produces (used by Tasks 8, 10):

```ts
export interface PlayerState { x: number; y: number; heading: number } // meters, radians
export interface MoveInput { forward: number; strafe: number; sprint: boolean; turn: number }
export function spawnPlayer(floor: Floor): PlayerState; // entrance center, faces first open dir
export function movePlayer(p: PlayerState, input: MoveInput, grid: FloorGrid, dtRaw: number): PlayerState;
```

- [ ] **Step 1: Write failing tests** (`tests/unit/player.test.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { FloorGrid, Dir } from '../../src/engine/grid';
import { PLAYER_RADIUS, SPRINT_SPEED, MAX_STEP_DT, WALK_SPEED } from '../../src/engine/constants';
import { movePlayer, spawnPlayer, type PlayerState } from '../../src/game/player';
import { generateFloor, TIER_ONE } from '../../src/game/maze';

const grid = new FloorGrid(15, 15);
const atCenter = (): PlayerState => ({ x: 0, y: 0, heading: 0 }); // center of cell (7,7) in a 15x15 grid

describe('movePlayer', () => {
  it('walks north at WALK_SPEED for the clamped dt', () => {
    const p = movePlayer(atCenter(), { forward: 1, strafe: 0, sprint: false, turn: 0 }, grid, 0.5);
    expect(p.y).toBeCloseTo(-WALK_SPEED * MAX_STEP_DT); // dt clamped to 1/30
    expect(p.x).toBeCloseTo(0);
  });

  it('sprints east with strafe input', () => {
    const p = movePlayer(atCenter(), { forward: 0, strafe: 1, sprint: true, turn: 0 }, grid, 1 / 120);
    expect(p.x).toBeCloseTo(SPRINT_SPEED / 120);
  });

  it('is blocked by a wall and stops at PLAYER_RADIUS from it', () => {
    // all-walls grid: north wall of cell (7,7) sits at y = -2; start 0.5m away heading north.
    // dt clamps to 1/30, so the 0.2m sprint step crosses the stop plane at -2 + PLAYER_RADIUS.
    const start: PlayerState = { x: 0, y: -1.5, heading: 0 };
    const p = movePlayer(start, { forward: 1, strafe: 0, sprint: true, turn: 0 }, grid, 1);
    expect(p.y).toBeCloseTo(-2 + PLAYER_RADIUS); // clamped against the wall
  });

  it('slides along a wall on the perpendicular axis', () => {
    const start: PlayerState = { x: 0, y: -2 + PLAYER_RADIUS, heading: 0 }; // hugging north wall
    const p = movePlayer(start, { forward: 1, strafe: 1, sprint: true, turn: 0 }, grid, 1 / 120);
    expect(p.x).toBeCloseTo(SPRINT_SPEED / 120); // east slide happened
    expect(p.y).toBeCloseTo(-2 + PLAYER_RADIUS); // no north penetration
  });

  it('never tunnels: giant dt still clamps to a legal position', () => {
    const start: PlayerState = { x: 0, y: -1.5, heading: 0 };
    const p = movePlayer(start, { forward: 1, strafe: 0, sprint: true, turn: 0 }, grid, 1000);
    expect(p.y).toBeCloseTo(-2 + PLAYER_RADIUS);
  });

  it('applies turn to heading', () => {
    const p = movePlayer(atCenter(), { forward: 0, strafe: 0, sprint: false, turn: 0.5 }, grid, 1 / 120);
    expect(p.heading).toBeCloseTo(0.5);
  });
});

describe('spawnPlayer', () => {
  it('spawns at entrance center facing an open direction', () => {
    const floor = generateFloor({ ...TIER_ONE, seed: 'SPAWN' });
    const p = spawnPlayer(floor);
    const { cx, cy } = floor.grid.cellCenter(floor.entrance.x, floor.entrance.y);
    expect(p.x).toBeCloseTo(cx);
    expect(p.y).toBeCloseTo(cy);
    const dirs = [Dir.North, Dir.East, Dir.South, Dir.West] as const;
    const cardinals = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]; // index = Dir value
    const openHeadings = cardinals.filter((_c, d) =>
      floor.grid.canWalk(floor.entrance.x, floor.entrance.y, dirs[d]!),
    );
    expect(openHeadings.some((c) => Math.abs(p.heading - c) < 1e-9)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- player`)

- [ ] **Step 3: Implement** (`src/game/player.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { Dir, FloorGrid, type WallSegment } from '../engine/grid';
import {
  MAX_STEP_DT, PLAYER_RADIUS, SPRINT_SPEED, WALK_SPEED,
} from '../engine/constants';
import type { Floor } from './maze';

export interface PlayerState { x: number; y: number; heading: number }
export interface MoveInput { forward: number; strafe: number; sprint: boolean; turn: number }

export function spawnPlayer(floor: Floor): PlayerState {
  const { cx, cy } = floor.grid.cellCenter(floor.entrance.x, floor.entrance.y);
  const openOrder: Array<[Dir, number]> = [
    [Dir.North, 0], [Dir.East, Math.PI / 2], [Dir.South, Math.PI], [Dir.West, (3 * Math.PI) / 2],
  ];
  let heading = 0;
  for (const [dir, h] of openOrder)
    if (floor.grid.canWalk(floor.entrance.x, floor.entrance.y, dir)) { heading = h; break; }
  return { x: cx, y: cy, heading };
}

/** Clamp movement along one axis against blocking wall planes. */
function clampAxis(
  value: number, delta: number, other: number, segs: readonly WallSegment[], axisIsX: boolean,
): number {
  let best = value + delta;
  if (delta === 0) return value;
  const r = PLAYER_RADIUS;
  for (const s of segs) {
    const isVertical = s.x1 === s.x2; // vertical walls block X, horizontal block Y
    if (axisIsX !== isVertical) continue;
    const wallPos = axisIsX ? s.x1 : s.y1;
    const lo = axisIsX ? Math.min(s.y1, s.y2) : Math.min(s.x1, s.x2);
    const hi = axisIsX ? Math.max(s.y1, s.y2) : Math.max(s.x1, s.x2);
    if (other + r <= lo || other - r >= hi) continue; // runs parallel, no overlap
    if (delta > 0 && value + r <= wallPos && best + r > wallPos) best = wallPos - r;
    if (delta < 0 && value - r >= wallPos && best - r < wallPos) best = wallPos + r;
  }
  return best;
}

export function movePlayer(
  p: PlayerState, input: MoveInput, grid: FloorGrid, dtRaw: number,
): PlayerState {
  const dt = Math.min(dtRaw, MAX_STEP_DT);
  const heading = p.heading + input.turn;
  const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
  const fx = Math.sin(heading), fy = -Math.cos(heading); // heading 0 = north (-y)
  const rx = Math.cos(heading), ry = Math.sin(heading);  // right vector
  const dx = (fx * input.forward + rx * input.strafe) * speed * dt;
  const dy = (fy * input.forward + ry * input.strafe) * speed * dt;
  const cell = grid.cellAt(p.x, p.y);
  const segs = grid.wallSegmentsNearCells(cell.x, cell.y);
  return {
    heading,
    x: clampAxis(p.x, dx, p.y, segs, true),
    y: clampAxis(p.y, dy, p.x, segs, false),
  };
}
```

- [ ] **Step 4: Run — expect PASS** (`npm test -- player`)

- [ ] **Step 5: Commit**

```bash
git add src/game/player.ts tests/unit/player.test.ts
git commit -m "feat(m1): wolf3d movement — strafe-run, wall clamp+slide, tunnel-proof dt"
```

---

### Task 8: Keyboard + mouse input (`src/engine/input.ts`)

**Files:**
- Create: `src/engine/input.ts`
- Test: `tests/unit/input.test.ts`

**Interfaces:**
- Consumes: `MoveInput` (Task 7), `TURN_SENSITIVITY` (Task 4).
- Produces (used by Task 10):

```ts
export interface KeyboardSnapshot { keys: ReadonlySet<string>; mouseDx: number }
export function keysToMoveInput(snap: KeyboardSnapshot): MoveInput;
export class InputCollector {
  attach(win: Window): () => void;   // installs listeners; returns detach
  snapshotAndReset(): KeyboardSnapshot; // keys now + mouse dx since last call
}
```

- [ ] **Step 1: Write failing tests** (`tests/unit/input.test.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { keysToMoveInput } from '../../src/engine/input';
import { TURN_SENSITIVITY } from '../../src/engine/constants';

const snap = (keys: string[], mouseDx = 0) => ({ keys: new Set(keys), mouseDx });

describe('keysToMoveInput', () => {
  it('WASD maps to forward/strafe', () => {
    expect(keysToMoveInput(snap(['KeyW'])).forward).toBe(1);
    expect(keysToMoveInput(snap(['KeyS'])).forward).toBe(-1);
    expect(keysToMoveInput(snap(['KeyD'])).strafe).toBe(1);
    expect(keysToMoveInput(snap(['KeyA'])).strafe).toBe(-1);
    expect(keysToMoveInput(snap([])).forward).toBe(0);
  });

  it('arrows work too and combine with shift sprint', () => {
    const i = keysToMoveInput(snap(['ArrowUp', 'ShiftLeft'], 10));
    expect(i.forward).toBe(1);
    expect(i.sprint).toBe(true);
    expect(i.turn).toBeCloseTo(10 * TURN_SENSITIVITY);
  });

  it('opposites cancel; no keys = idle', () => {
    expect(keysToMoveInput(snap(['KeyW', 'KeyS'])).forward).toBe(0);
    const idle = keysToMoveInput(snap([]));
    expect(idle).toEqual({ forward: 0, strafe: 0, sprint: false, turn: 0 });
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- input`)

- [ ] **Step 3: Implement** (`src/engine/input.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { TURN_SENSITIVITY } from './constants';
import type { MoveInput } from '../game/player';

export interface KeyboardSnapshot { keys: ReadonlySet<string>; mouseDx: number }

export function keysToMoveInput(snap: KeyboardSnapshot): MoveInput {
  const has = (...codes: string[]) => codes.some((c) => snap.keys.has(c));
  return {
    forward: (has('KeyW', 'ArrowUp') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0),
    strafe: (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft') ? 1 : 0),
    sprint: has('ShiftLeft', 'ShiftRight'),
    turn: snap.mouseDx * TURN_SENSITIVITY,
  };
}

export class InputCollector {
  private keys = new Set<string>();
  private mouseDx = 0;

  attach(win: Window): () => void {
    const down = (e: KeyboardEvent) => this.keys.add(e.code);
    const up = (e: KeyboardEvent) => this.keys.delete(e.code);
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement) this.mouseDx += e.movementX;
    };
    win.addEventListener('keydown', down);
    win.addEventListener('keyup', up);
    win.addEventListener('mousemove', move);
    return () => {
      win.removeEventListener('keydown', down);
      win.removeEventListener('keyup', up);
      win.removeEventListener('mousemove', move);
    };
  }

  snapshotAndReset(): KeyboardSnapshot {
    const snap: KeyboardSnapshot = { keys: new Set(this.keys), mouseDx: this.mouseDx };
    this.mouseDx = 0;
    return snap;
  }
}
```

- [ ] **Step 4: Run — expect PASS** (`npm test -- input`)

- [ ] **Step 5: Commit**

```bash
git add src/engine/input.ts tests/unit/input.test.ts
git commit -m "feat(m1): keyboard/mouse input mapping with pointer-lock yaw"
```

---

### Task 9: three.js floor scene (`src/game/floorScene.ts`)

**Files:**
- Create: `src/game/floorScene.ts`
- Test: `tests/unit/floorscene.test.ts`

**Interfaces:**
- Consumes: `Floor` (Task 5), wall constants (Task 4).
- Produces (used by Task 10):

```ts
export interface FloorSceneResult { group: THREE.Group; wallInstanceCount: number }
export function buildFloorScene(floor: Floor): FloorSceneResult;
```

- [ ] **Step 1: Write failing test** (`tests/unit/floorscene.test.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { generateFloor, TIER_ONE } from '../../src/game/maze';
import { buildFloorScene } from '../../src/game/floorScene';

describe('buildFloorScene', () => {
  it('instances one mesh per unique wall segment plus floor, ceiling, markers', () => {
    const floor = generateFloor({ ...TIER_ONE, seed: 'SCENE' });
    const { group, wallInstanceCount } = buildFloorScene(floor);
    expect(wallInstanceCount).toBe(floor.grid.wallSegments().length);
    // floor plane + ceiling plane + 2 instanced meshes + entrance + exit markers
    expect(group.children.length).toBe(6);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- floorscene`)

- [ ] **Step 3: Implement** (`src/game/floorScene.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS } from '../engine/constants';
import type { WallSegment } from '../engine/grid';
import type { Floor } from './maze';

export interface FloorSceneResult { group: THREE.Group; wallInstanceCount: number }

function instancedWalls(segs: WallSegment[], horizontal: boolean): THREE.InstancedMesh {
  const geo = horizontal
    ? new THREE.BoxGeometry(CELL_SIZE + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS)
    : new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE + WALL_THICKNESS);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.9, metalness: 0.1 });
  const mesh = new THREE.InstancedMesh(geo, mat, segs.length);
  const m = new THREE.Matrix4();
  segs.forEach((s, i) => {
    m.makeTranslation((s.x1 + s.x2) / 2, WALL_HEIGHT / 2, (s.y1 + s.y2) / 2); // grid y -> world z
    mesh.setMatrixAt(i, m);
  });
  return mesh;
}

function marker(x: number, y: number, color: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.1, 0.6),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8 }),
  );
  mesh.position.set(x, 0.06, y);
  return mesh;
}

export function buildFloorScene(floor: Floor): FloorSceneResult {
  const segs = floor.grid.wallSegments();
  const horizontal = segs.filter((s) => s.y1 === s.y2);
  const vertical = segs.filter((s) => s.x1 === s.x2);
  const group = new THREE.Group();

  const planeW = floor.grid.width * CELL_SIZE;
  const planeH = floor.grid.height * CELL_SIZE;
  const floorPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(planeW, planeH),
    new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 1 }),
  );
  floorPlane.rotation.x = -Math.PI / 2;
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(planeW, planeH),
    new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 1 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;

  const en = floor.grid.cellCenter(floor.entrance.x, floor.entrance.y);
  const ex = floor.grid.cellCenter(floor.exit.x, floor.exit.y);

  group.add(floorPlane, ceiling);
  group.add(instancedWalls(horizontal, true), instancedWalls(vertical, false));
  group.add(marker(en.cx, en.cy, 0x4dc9b0), marker(ex.cx, ex.cy, 0xd9a441));

  return { group, wallInstanceCount: segs.length };
}
```

- [ ] **Step 4: Run — expect PASS** (`npm test -- floorscene`)

- [ ] **Step 5: Commit**

```bash
git add src/game/floorScene.ts tests/unit/floorscene.test.ts
git commit -m "feat(m1): grid->three scene, instanced walls, entrance/exit markers"
```

---

### Task 10: FOCUS view bootstrap (`src/main.ts`)

**Files:**
- Modify: `src/main.ts` (replace placeholder entirely)

**Interfaces:**
- Consumes: everything from Tasks 5–9.
- Produces: running game; dev hook `window.__MIRROR_HOUSE_DEBUG__ = { getPlayer(): PlayerState; seed: string }` (dev builds only); URL `?seed=CODE` selects the floor.

- [ ] **Step 1: Write the bootstrap**

```ts
// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { EYE_HEIGHT, FIXED_STEP } from './engine/constants';
import { InputCollector, keysToMoveInput } from './engine/input';
import { buildFloorScene } from './game/floorScene';
import { generateFloor, TIER_ONE } from './game/maze';
import { movePlayer, spawnPlayer, type PlayerState } from './game/player';
import { isValidSeed, normalizeSeed, randomSeed } from './game/seedCode';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const diagnostics = document.querySelector<HTMLElement>('#diagnostics')!;

const urlSeed = normalizeSeed(new URLSearchParams(window.location.search).get('seed') ?? '');
const seed = isValidSeed(urlSeed) ? urlSeed : randomSeed();
const floor = generateFloor({ ...TIER_ONE, seed });
let player: PlayerState = spawnPlayer(floor);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 2, 26);
scene.add(buildFloorScene(floor).group);
const lantern = new THREE.PointLight(0xffe6c0, 18, 18, 1.8);
scene.add(lantern, new THREE.AmbientLight(0x30343d, 0.7));
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 60);

const input = new InputCollector();
input.attach(window);
canvas.addEventListener('click', () => canvas.requestPointerLock());

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let accumulator = 0;
let last = performance.now();
let frames = 0;
let fpsClock = last;
let fps = 0;

function frame(now: number): void {
  const elapsed = Math.min(now - last, 250) / 1000;
  last = now;
  accumulator += elapsed;
  while (accumulator >= FIXED_STEP) {
    player = movePlayer(player, keysToMoveInput(input.snapshotAndReset()), floor.grid, FIXED_STEP);
    accumulator -= FIXED_STEP;
  }
  camera.position.set(player.x, EYE_HEIGHT, player.y);
  camera.rotation.y = -player.heading;
  lantern.position.set(player.x, EYE_HEIGHT, player.y);
  renderer.render(scene, camera);

  frames++;
  if (now - fpsClock >= 250) {
    fps = Math.round((frames * 1000) / (now - fpsClock));
    frames = 0;
    fpsClock = now;
    diagnostics.textContent = `seed ${seed}  fps ${fps}\n` +
      `pos ${player.x.toFixed(1)}, ${player.y.toFixed(1)}  heading ${player.heading.toFixed(2)}`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__MIRROR_HOUSE_DEBUG__ = {
    getPlayer: () => ({ ...player }),
    seed,
  };
}
```

- [ ] **Step 2: Manual verify**

Run: `npm run dev`, open the URL with and without `?seed=PLAYTEST`.
Expected: dark corridor maze, click locks pointer, WASD + mouse moves/turns, Shift sprints, fps in overlay ≥ 60 on a mid desktop, same `?seed` always yields the same maze (compare pos of entrance marker).

- [ ] **Step 3: Gates**

Run: `npm run lint && npm run typecheck && npm test && npm run build` — all green.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat(m1): FOCUS view — fixed-step loop, lantern light, diagnostics, url seed"
```

---

### Task 11: Playwright smoke test (M1 gate)

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: dev server + `__MIRROR_HOUSE_DEBUG__` hook (Task 10).

- [ ] **Step 1: Write config** (`playwright.config.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: 1,
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 2: Write the smoke test** (`tests/e2e/smoke.spec.ts`)

```ts
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';

interface DebugHook {
  getPlayer(): { x: number; y: number; heading: number };
  seed: string;
}

test('loads a seeded floor, moves with W, no page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?seed=PLAYTEST');

  await expect(page.locator('#game')).toBeVisible();
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>).__MIRROR_HOUSE_DEBUG__ !== undefined,
  );
  const before = await page.evaluate(
    () => (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.getPlayer(),
  );
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  const after = await page.evaluate(
    () => (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.getPlayer(),
  );

  // spawn faces an open direction, so 0.6 s of walking must cover ground
  const moved = Math.hypot(after.x - before.x, after.y - before.y);
  expect(moved).toBeGreaterThan(0.5);
  expect(errors).toEqual([]);
});

test('same seed renders the same spawn', async ({ page }) => {
  await page.goto('/?seed=SAMESAME');
  const p = await page.evaluate(
    () => (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.getPlayer(),
  );
  await page.reload();
  const q = await page.evaluate(
    () => (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.getPlayer(),
  );
  expect(q).toEqual(p);
});
```

- [ ] **Step 3: Run locally**

Run: `npx playwright install chromium && npm run e2e`
Expected: 2 passed. (Dev hook only exists in dev — the webServer runs `npm run dev`, so this holds.)

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts tests/e2e/smoke.spec.ts
git commit -m "test(m1): playwright smoke — load, walk, determinism, no errors"
```

---

### Task 12: M0–M1 acceptance close-out

**Files:**
- Modify: `README.md` (quickstart), this plan (tick boxes)

- [x] **Step 1: README quickstart section** — add under "How this repo works":

```markdown
## Run it

```bash
npm install
npm run dev          # http://localhost:5173 — add ?seed=YOURCODE for a specific floor
npm test             # unit tests (deterministic maze/rng/movement)
npm run e2e          # playwright smoke (first run: npx playwright install chromium)
```
```

- [x] **Step 2: Acceptance checklist (verify + fix before tagging)**

- [ ] CI green on `main` (check + e2e + deploy jobs) *(deferred: no remote/credentials yet — verify after merge, before tagging)*
- [ ] `https://mirror-house.pages.dev` (or project URL) serves latest with CSP header *(deferred: no deployment yet — verify after first CF Pages deploy)*
- [x] `npm test` — 30+ unit tests green *(34/34, 2026-11-08)*
- [x] Determinism proven twice: two runs of `?seed=PLAYTEST` show identical spawn pos and maze *(e2e test 2: `?seed=SAMESAME` load + reload → identical spawn; maze determinism per seed covered by maze/rng unit tests)*
- [ ] Diagnostics overlay ≥ 60 fps while sprinting on a mid desktop (spec §7.4 budget) *(deferred: needs manual playtest on real GPU — overlay in `src/main.ts` displays fps; headless e2e fps is not representative)*
- [x] `dist/` bundle under 3 MB gzipped (`npm run build && du -sh dist` as a rough check) *(raw 543 KB, gzipped ≈ 132 KB — `find dist -type f | xargs gzip -c | wc -c` → 134,995 bytes)*

- [x] **Step 3: Tag + commit** *(commit done; `git tag m1` + push deferred to post-merge per controller decision)*

```bash
git add README.md && git commit -m "docs(m1): quickstart + acceptance verified"
git tag m1
git push --tags origin main
```

---

## Plan Self-Review (done at authoring time)

- **Spec coverage vs M0–M1:** scaffold ✓ (T1), CI ✓ (T2), CF Pages deploy ✓ (T2), CSP ✓ (T2 `_headers`), grid ✓ (T4), movement+collision ✓ (T7–8), seeded maze ✓ (T3, T5), determinism tests ✓ (T3, T5, T11), FOCUS view ✓ (T9–10), fps budget check ✓ (T12). Mirrors/enemies/saves/views are M2+ — intentionally out of scope (spec §13.2).
- **Placeholders:** none — every code block is final implementation code.
- **Type consistency:** `PlayerState`/`MoveInput` identical in T7/T8/T10/T11; `Floor`/`FloorParams` identical in T5/T7/T9/T10; `WallSegment` from T4 reused in T7/T9; constants names match T4 ↔ all consumers.
