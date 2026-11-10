// SPDX-License-Identifier: Apache-2.0
//
// The OVERHEAD / TACTICAL map (M3/T4) — a 2D canvas drawn over the paused 3D
// stage. Browser-only: `createOverhead` touches the canvas API, so it is never
// imported by the node unit suite; the one pure piece, `pingOpacity`, is the
// exported decay curve the pings fade along.
//
// Fog of war: a cell is visible iff the player has occupied it (`visited`,
// keyed y * grid.width + x — the same indexing FloorGrid uses internally).
// Unvisited cells sit near-black; visited cells get a floor tint and their
// wall edges drawn. Waypoint editing lives in main.ts (clicks are tactical-only).
import { CELL_SIZE, EXIT_LOCKED_EMISSIVE, PING_TTL_MS } from '../engine/constants';
import type { CellIndex, FloorGrid } from '../engine/grid';

export interface OverheadDrawInput {
  grid: FloorGrid;
  /** Visited cell indices: y * grid.width + x. */
  visited: ReadonlySet<number>;
  player: { x: number; y: number; heading: number };
  mirrors: Array<{ x: number; z: number; kind: string; captured: boolean }>;
  exit: { cx: number; cy: number; unlocked: boolean };
  entrance: { cx: number; cy: number };
  pings: Array<{ x: number; y: number; at: number }>;
  chhaya: { x: number; y: number } | null;
  waypoints: ReadonlyArray<{ x: number; y: number }>;
  /** T3 — the standing pools: teal dots, dim while their ripple blinds them. */
  water: ReadonlyArray<{ x: number; y: number; dim: boolean }>;
  now: number;
}

/** Linear ping decay: 1 at birth, 0 at the TTL, null (dropped) after it.
 *  A clock-skewed future ping clamps to full opacity rather than exceeding 1. */
export function pingOpacity(at: number, now: number): number | null {
  const age = now - at;
  if (age >= PING_TTL_MS) return null; // dropped after the TTL
  return Math.min(1, Math.max(0, 1 - age / PING_TTL_MS));
}

// Palette — same family as game/palette.ts (walls are the brief's exact hex).
const COLOR = {
  fog: '#05060a', // near-black — the unexplored house
  floor: '#0e1630', // visited cells get the faintest floor tint
  wall: '#2a3560',
  player: '#d9a441', // gold — the lantern-bearer
  beacon: '#2ec4b6', // teal
  entranceDim: 'rgba(46, 196, 182, 0.45)', // dim teal
  exitGold: '#d9a441',
  exitLocked: `#${EXIT_LOCKED_EMISSIVE.toString(16).padStart(6, '0')}`, // dim red
  chhaya: '#c8ccd8', // the six-second shadow — pale hollow ring
  ping: '#e05252', // fading red
  waypoint: '#f2e9d8', // ivory dots
  water: '#3fae9a', // T3 — the standing pools (water-teal; the tier-3 accent)
  distort: '#c2548a', // T4 — the carnival glass (the tier-4 rose)
} as const;

const MARGIN_PX = 28; // breathing room around the fitted grid

interface Layout {
  ox: number; // canvas-space origin of cell (0,0)
  oy: number;
  cell: number; // px per maze cell
}

/** Fit the grid into the canvas (CSS px), centered, with a fixed margin. */
function layoutFor(grid: FloorGrid, w: number, h: number): Layout {
  const cell = Math.max(
    4,
    Math.min((w - 2 * MARGIN_PX) / grid.width, (h - 2 * MARGIN_PX) / grid.height),
  );
  return {
    ox: (w - cell * grid.width) / 2,
    oy: (h - cell * grid.height) / 2,
    cell,
  };
}

/** World meters → canvas px along one axis (x east, y south — map is y-down). */
function toCanvas(v: number, halfCells: number, origin: number, cell: number): number {
  return origin + (v / CELL_SIZE + halfCells) * cell;
}

export function createOverhead(canvas: HTMLCanvasElement): {
  draw(input: OverheadDrawInput): void;
  clear(): void;
  /** The maze cell a mouse event landed on, or null when outside the grid.
   *  Uses the same fit as draw(), so a click lands where the dot was painted. */
  cellAtEvent(e: MouseEvent, grid: FloorGrid): CellIndex | null;
} {
  const ctx = canvas.getContext('2d')!;

  function cssSize(): { w: number; h: number } {
    // Full-viewport per CSS; the backing store is sized to match (x dpr) so
    // the map stays crisp on hi-dpi screens. Lazy — resized on every draw.
    const rect = canvas.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  function draw(input: OverheadDrawInput): void {
    const { w, h } = cssSize();
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.max(1, Math.round(w * dpr));
    const bh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { grid, visited, player } = input;
    const L = layoutFor(grid, w, h);
    const px = (wx: number) => toCanvas(wx, grid.width / 2, L.ox, L.cell);
    const py = (wy: number) => toCanvas(wy, grid.height / 2, L.oy, L.cell);

    // The void behind the house — unvisited cells stay this near-black.
    ctx.fillStyle = COLOR.fog;
    ctx.fillRect(0, 0, w, h);

    // Visited floor: the explored part of the maze gets a faint tint.
    ctx.fillStyle = COLOR.floor;
    for (let y = 0; y < grid.height; y++)
      for (let x = 0; x < grid.width; x++)
        if (visited.has(y * grid.width + x))
          ctx.fillRect(L.ox + x * L.cell, L.oy + y * L.cell, L.cell, L.cell);

    // Walls on visited cells only — the fog keeps the unexplored edges secret.
    ctx.strokeStyle = COLOR.wall;
    ctx.lineWidth = Math.max(1.5, L.cell * 0.08);
    ctx.lineCap = 'square';
    ctx.beginPath();
    for (let y = 0; y < grid.height; y++)
      for (let x = 0; x < grid.width; x++) {
        if (!visited.has(y * grid.width + x)) continue;
        const x0 = L.ox + x * L.cell;
        const y0 = L.oy + y * L.cell;
        const x1 = x0 + L.cell;
        const y1 = y0 + L.cell;
        if (grid.hasWall(x, y, 0)) {
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y0);
        } // N
        if (grid.hasWall(x, y, 1)) {
          ctx.moveTo(x1, y0);
          ctx.lineTo(x1, y1);
        } // E
        if (grid.hasWall(x, y, 2)) {
          ctx.moveTo(x0, y1);
          ctx.lineTo(x1, y1);
        } // S
        if (grid.hasWall(x, y, 3)) {
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0, y1);
        } // W
      }
    ctx.stroke();

    // Entrance — a dim teal diamond where you woke.
    const ex = px(input.entrance.cx);
    const ey = py(input.entrance.cy);
    const er = L.cell * 0.22;
    ctx.fillStyle = COLOR.entranceDim;
    ctx.beginPath();
    ctx.moveTo(ex, ey - er);
    ctx.lineTo(ex + er, ey);
    ctx.lineTo(ex, ey + er);
    ctx.lineTo(ex - er, ey);
    ctx.closePath();
    ctx.fill();

    // Exit — a gold ring once the beacons are frosted, dim red while sealed.
    ctx.strokeStyle = input.exit.unlocked ? COLOR.exitGold : COLOR.exitLocked;
    ctx.lineWidth = Math.max(2, L.cell * 0.1);
    ctx.beginPath();
    ctx.arc(px(input.exit.cx), py(input.exit.cy), L.cell * 0.32, 0, Math.PI * 2);
    ctx.stroke();

    // T3 — the standing pools: small teal dots, dimming while their ripple
    // blinds the eye (the water stills again when the TTL lapses).
    for (const p of input.water) {
      ctx.globalAlpha = p.dim ? 0.35 : 1;
      ctx.fillStyle = COLOR.water;
      ctx.beginPath();
      ctx.arc(px(p.x), py(p.y), L.cell * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Beacons — teal, filled once captured, hollow until then.
    for (const m of input.mirrors) {
      if (m.kind !== 'beacon') continue;
      const bx = px(m.x);
      const by = py(m.z);
      ctx.beginPath();
      ctx.arc(bx, by, L.cell * 0.2, 0, Math.PI * 2);
      if (m.captured) {
        ctx.fillStyle = COLOR.beacon;
        ctx.fill();
      } else {
        ctx.strokeStyle = COLOR.beacon;
        ctx.lineWidth = Math.max(1.5, L.cell * 0.07);
        ctx.stroke();
      }
    }

    // T4 — the distorting mirrors: a wavy rose squiggle, the carnival glass
    // that bends everything it shows (one period of a sine across the cell).
    for (const m of input.mirrors) {
      if (m.kind !== 'distort') continue;
      const bx = px(m.x);
      const by = py(m.z);
      const w = L.cell * 0.5;
      ctx.strokeStyle = COLOR.distort;
      ctx.lineWidth = Math.max(1.5, L.cell * 0.07);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const x = bx - w / 2 + t * w;
        const y = by + Math.sin(t * Math.PI * 2) * L.cell * 0.12;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Chhaya — a pale hollow ring; the shadow's last known standing.
    if (input.chhaya !== null) {
      ctx.strokeStyle = COLOR.chhaya;
      ctx.lineWidth = Math.max(1.5, L.cell * 0.07);
      ctx.beginPath();
      ctx.arc(px(input.chhaya.x), py(input.chhaya.y), L.cell * 0.18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Pings — red dots fading over PING_TTL_MS (pingOpacity drops expired ones).
    for (const p of input.pings) {
      const op = pingOpacity(p.at, input.now);
      if (op === null) continue;
      ctx.globalAlpha = op;
      ctx.fillStyle = COLOR.ping;
      ctx.beginPath();
      ctx.arc(px(p.x), py(p.y), L.cell * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Waypoints — small ivory dots (placed by tactical clicks in main.ts).
    ctx.fillStyle = COLOR.waypoint;
    for (const wp of input.waypoints) {
      ctx.beginPath();
      ctx.arc(px(wp.x), py(wp.y), L.cell * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    // The player — a gold arrow rotated by heading (heading 0 = north = up).
    const hx = px(player.x);
    const hy = py(player.y);
    const r = L.cell * 0.38;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(player.heading); // y-down canvas: positive heading turns east/right
    ctx.fillStyle = COLOR.player;
    ctx.beginPath();
    ctx.moveTo(0, -r); // tip — north at heading 0
    ctx.lineTo(r * 0.62, r * 0.55);
    ctx.lineTo(0, r * 0.26);
    ctx.lineTo(-r * 0.62, r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function clear(): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function cellAtEvent(e: MouseEvent, grid: FloorGrid): CellIndex | null {
    const { w, h } = cssSize();
    const L = layoutFor(grid, w, h);
    const rect = canvas.getBoundingClientRect();
    const gx = Math.floor((e.clientX - rect.left - L.ox) / L.cell);
    const gy = Math.floor((e.clientY - rect.top - L.oy) / L.cell);
    return grid.inBounds(gx, gy) ? { x: gx, y: gy } : null;
  }

  return { draw, clear, cellAtEvent };
}
