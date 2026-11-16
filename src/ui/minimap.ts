// SPDX-License-Identifier: Apache-2.0
//
// The PAC-MINIMAP (T11/T1) — a compact always-on guidance pane: the FULL maze
// layout as a Pac-Man-style guide. Browser-only: `createMinimap` touches the
// canvas API, so it is never imported by the node unit suite; the one pure
// piece, `fitScale`, is the exported fit the pane's legibility rides on.
//
// Fog of war is DELIBERATELY absent here — reveal-all is the point. The
// minimap is the Pac-Man guide (walls, beacons, exit, you, and what hunts
// you, at a glance), while the OVERHEAD tactical map (ui/overhead.ts) keeps
// its fog: that one is the earned-knowledge view, this one is the map on the
// arcade cabinet's bezel. All walls draw every frame-batch from the grid's
// unique wall segments; beacons, exit, Sentinels, decoys, pools and the
// Glazier draw from the same runtime objects the overhead view is fed.
import { CELL_SIZE, MINIMAP_PADDING_PX, MINIMAP_SIZE_PX } from '../engine/constants';
import type { FloorGrid } from '../engine/grid';

export interface MinimapDrawInput {
  grid: FloorGrid;
  player: { x: number; y: number; heading: number };
  mirrors: Array<{ x: number; z: number; kind: string; captured: boolean }>;
  exit: { cx: number; cy: number; unlocked: boolean };
  entrance: { cx: number; cy: number };
  /** The Sentinels walking THIS floor — only the present ones draw (the
   *  rotation decides who that is; main passes null when a warden rests). */
  taal: { x: number; y: number } | null;
  gher: { x: number; y: number } | null;
  aavart: { x: number; y: number } | null;
  /** The six-second shadow — only while her delayed sample exists. */
  chhaya: { x: number; y: number } | null;
  /** The live (unshattered) mirror-you copies: hollow gold dots. */
  decoys: ReadonlyArray<{ x: number; y: number }>;
  /** The standing pools: teal squares (the tier-3 accent; empty elsewhere). */
  water: ReadonlyArray<{ x: number; y: number }>;
  /** The Glazier — floor 100 only (the Ground is his). */
  glazier: { x: number; y: number } | null;
}

// Palette — the overhead map's family (walls take the brief's exact steel).
const COLOR = {
  plate: '#10131f', // the pane's inner dark — the bezel behind the maze
  wall: '#3a4a66', // steel ink — the full maze layout
  player: '#d9a441', // gold — the lantern-bearer (you)
  beacon: '#2ec4b6', // teal — an unfrosted beacon
  beaconCaptured: 'rgba(148, 158, 176, 0.45)', // dim grey — a captured beacon
  exitGold: '#d9a441', // the stair door, unlocked
  exitLocked: 'rgba(217, 164, 65, 0.35)', // dim while the beacons hold it shut
  entrance: 'rgba(46, 196, 182, 0.45)', // dim teal — where you woke
  taal: '#e05252', // rose — the beat-walker
  gher: '#4a90d9', // blue — the Encircler
  aavart: '#c2549b', // magenta — the Ambusher
  chhaya: '#9b8ae0', // violet — the six-second shadow
  decoy: '#d9a441', // the copies: the player's own gold, drawn hollow
  water: '#3fae9a', // the standing pools (water-teal, the tier-3 accent)
  glazier: '#eef3f8', // the master: one white dot on the Ground
} as const;

/** Fit the maze (world meters → pane px) inside the pane with the 6px
 *  padding honored on both axes: the tighter axis wins, and a pane smaller
 *  than the padding ring clamps to a 1px drawing area (never negative/NaN).
 *  Pure — the node suite pins it. */
export function fitScale(
  wPx: number,
  hPx: number,
  grid: { width: number; height: number },
): number {
  const availW = Math.max(1, wPx - 2 * MINIMAP_PADDING_PX);
  const availH = Math.max(1, hPx - 2 * MINIMAP_PADDING_PX);
  const w = Math.max(1, grid.width);
  const h = Math.max(1, grid.height);
  return Math.min(availW / (w * CELL_SIZE), availH / (h * CELL_SIZE));
}

interface Layout {
  ox: number; // pane-space origin of cell (0,0)
  oy: number;
  cell: number; // px per maze cell
}

/** Center the fitted grid in the pane (fitScale owns the scale; this owns the
 *  leftover space — half to each side, the padding already spent). */
function layoutFor(grid: FloorGrid, w: number, h: number): Layout {
  const cell = fitScale(w, h, grid) * CELL_SIZE;
  return {
    ox: (w - cell * grid.width) / 2,
    oy: (h - cell * grid.height) / 2,
    cell,
  };
}

/** World meters → pane px along one axis (x east, y south — y-down canvas). */
function toCanvas(v: number, halfCells: number, origin: number, cell: number): number {
  return origin + (v / CELL_SIZE + halfCells) * cell;
}

export function createMinimap(canvas: HTMLCanvasElement): {
  draw(input: MinimapDrawInput): void;
  setVisible(visible: boolean): void;
} {
  const ctx = canvas.getContext('2d')!;
  const size = MINIMAP_SIZE_PX; // fixed square — the pane never resizes

  function draw(input: MinimapDrawInput): void {
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.max(1, Math.round(size * dpr));
    if (canvas.width !== bw || canvas.height !== bw) {
      canvas.width = bw;
      canvas.height = bw;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { grid, player } = input;
    const L = layoutFor(grid, size, size);
    const px = (wx: number) => toCanvas(wx, grid.width / 2, L.ox, L.cell);
    const py = (wy: number) => toCanvas(wy, grid.height / 2, L.oy, L.cell);
    const dotR = Math.max(1.6, L.cell * 0.16); // the live-dot radius (scales with the fit)

    // The bezel behind the maze.
    ctx.fillStyle = COLOR.plate;
    ctx.fillRect(0, 0, size, size);

    // The FULL maze layout — every wall segment, fog-free (the guide's point).
    ctx.strokeStyle = COLOR.wall;
    ctx.lineWidth = Math.max(1.5, L.cell * 0.1);
    ctx.lineCap = 'square';
    ctx.beginPath();
    for (const s of grid.wallSegments()) {
      ctx.moveTo(px(s.x1), py(s.y1));
      ctx.lineTo(px(s.x2), py(s.y2));
    }
    ctx.stroke();

    // The entrance — a dim teal diamond where you woke.
    const ex = px(input.entrance.cx);
    const ey = py(input.entrance.cy);
    const er = Math.max(2, L.cell * 0.22);
    ctx.fillStyle = COLOR.entrance;
    ctx.beginPath();
    ctx.moveTo(ex, ey - er);
    ctx.lineTo(ex + er, ey);
    ctx.lineTo(ex, ey + er);
    ctx.lineTo(ex - er, ey);
    ctx.closePath();
    ctx.fill();

    // The stair door — a gold dot while it opens, dim while sealed.
    ctx.fillStyle = input.exit.unlocked ? COLOR.exitGold : COLOR.exitLocked;
    ctx.beginPath();
    ctx.arc(px(input.exit.cx), py(input.exit.cy), Math.max(2.2, L.cell * 0.26), 0, Math.PI * 2);
    ctx.fill();

    // The standing pools — teal squares (the tier-3 accent; empty elsewhere).
    ctx.fillStyle = COLOR.water;
    for (const p of input.water) {
      const r = Math.max(2, L.cell * 0.2);
      ctx.fillRect(px(p.x) - r / 2, py(p.y) - r / 2, r, r);
    }

    // The beacons — solid teal dots; a captured one dims to grey.
    for (const m of input.mirrors) {
      if (m.kind !== 'beacon') continue;
      ctx.fillStyle = m.captured ? COLOR.beaconCaptured : COLOR.beacon;
      ctx.beginPath();
      ctx.arc(px(m.x), py(m.z), Math.max(1.8, L.cell * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }

    // The copies — hollow gold dots (the solid arrow is the real you; the
    // outline-vs-fill tell is the overhead map's convention carried over).
    ctx.strokeStyle = COLOR.decoy;
    ctx.lineWidth = Math.max(1.2, L.cell * 0.07);
    for (const d of input.decoys) {
      ctx.beginPath();
      ctx.arc(px(d.x), py(d.y), Math.max(2.4, L.cell * 0.24), 0, Math.PI * 2);
      ctx.stroke();
    }

    // The Sentinels who walk THIS floor — small live dots, one hue each
    // (the rotation decides who is present; a resting warden never draws).
    const sentinels: Array<{ at: { x: number; y: number }; color: string }> = [];
    if (input.taal !== null) sentinels.push({ at: input.taal, color: COLOR.taal });
    if (input.gher !== null) sentinels.push({ at: input.gher, color: COLOR.gher });
    if (input.aavart !== null) sentinels.push({ at: input.aavart, color: COLOR.aavart });
    if (input.chhaya !== null) sentinels.push({ at: input.chhaya, color: COLOR.chhaya });
    for (const s of sentinels) {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(px(s.at.x), py(s.at.y), dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    // The Glazier — one white dot on the Ground (floor 100 only).
    if (input.glazier !== null) {
      ctx.fillStyle = COLOR.glazier;
      ctx.beginPath();
      ctx.arc(px(input.glazier.x), py(input.glazier.y), dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    // YOU — the gold arrow, rotated by heading (heading 0 = north = up).
    const hx = px(player.x);
    const hy = py(player.y);
    const r = Math.max(4, L.cell * 0.38);
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

  function setVisible(visible: boolean): void {
    canvas.style.display = visible ? 'block' : 'none';
  }

  return { draw, setVisible };
}
