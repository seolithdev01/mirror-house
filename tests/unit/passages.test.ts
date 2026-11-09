// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { Dir, FloorGrid } from '../../src/engine/grid';
import { CELL_SIZE } from '../../src/engine/constants';
import {
  PASSAGE_CLEARANCE,
  PASSAGE_RANGE,
  positionIsLegal,
  tryPushDoor,
  tryTeleport,
} from '../../src/game/passages';
import type { MirrorRef } from '../../src/game/floorObjects';

// Fully walled 3x3 grid (the constructor fills 0b1111): every cell edge is a
// wall plane, so clearance math is exact and local to the middle cell (0,0).
const grid = new FloorGrid(3, 3);

const mirror = (
  over: Partial<MirrorRef> & Pick<MirrorRef, 'id' | 'kind' | 'x' | 'z' | 'rotY'>,
): MirrorRef => ({ cellX: 1, cellY: 1, pairId: null, wallDir: null, ...over });

describe('positionIsLegal', () => {
  it('cell center is legal', () => {
    expect(positionIsLegal(grid, 0, 0)).toBe(true);
  });

  it('0.3m from a wall plane is illegal (clearance is PLAYER_RADIUS + 0.05)', () => {
    expect(positionIsLegal(grid, 0, -CELL_SIZE / 2 + 0.3)).toBe(false);
    expect(positionIsLegal(grid, 0, CELL_SIZE / 2 - 0.3)).toBe(false);
    expect(positionIsLegal(grid, -CELL_SIZE / 2 + 0.3, 0)).toBe(false);
  });

  it('0.5m from a wall plane clears the margin', () => {
    expect(positionIsLegal(grid, 0, -CELL_SIZE / 2 + 0.5)).toBe(true);
  });
});

describe('tryTeleport', () => {
  // A: true mirror on the north wall of the middle cell (rotY 0 → normal +z).
  // B: its pair on the west wall (rotY π/2 → normal +x, back into the cell).
  const A: MirrorRef = mirror({ id: 0, kind: 'true', x: 0, z: -1.88, rotY: 0, pairId: 1 });
  const B: MirrorRef = mirror({
    id: 1,
    kind: 'true',
    x: -1.88,
    z: 0,
    rotY: Math.PI / 2,
    pairId: 0,
  });

  it('in range: emerges from the pair along its normal, heading facing out', () => {
    const player = { x: 0, y: -0.88, heading: 0 }; // 1.0m from A — within PASSAGE_RANGE
    const tp = tryTeleport([A, B], player, grid);
    expect(tp).not.toBeNull();
    expect(tp!.x).toBeCloseTo(B.x + PASSAGE_CLEARANCE, 9); // normal (sin π/2, cos π/2) = +x
    expect(tp!.y).toBeCloseTo(B.z, 9);
    expect(tp!.heading).toBeCloseTo(Math.PI / 2, 9); // atan2(sin rotY, −cos rotY)
    expect(tp!.usedId).toBe(A.id);
  });

  it('out of range: null', () => {
    expect(tryTeleport([A, B], { x: 0, y: 0.5, heading: 0 }, grid)).toBeNull();
  });

  it('non-true mirrors are never teleport targets', () => {
    const silvered = mirror({
      id: 2,
      kind: 'silvered',
      x: 0,
      z: -1.88,
      rotY: 0,
      wallDir: Dir.North,
    });
    expect(tryTeleport([silvered, B], { x: 0, y: -0.88, heading: 0 }, grid)).toBeNull();
  });

  it('illegal destination (pair normal points into its own wall): null', () => {
    const bad: MirrorRef = mirror({
      id: 1,
      kind: 'true',
      x: -1.88,
      z: 0,
      rotY: -Math.PI / 2,
      pairId: 0,
    });
    expect(tryTeleport([A, bad], { x: 0, y: -0.88, heading: 0 }, grid)).toBeNull();
  });
});

describe('tryPushDoor', () => {
  const silvered: MirrorRef = mirror({
    id: 3,
    kind: 'silvered',
    x: 0,
    z: -1.88,
    rotY: 0,
    wallDir: Dir.North,
  });
  const near = { x: 0, y: -0.88, heading: 0 }; // 1.0m away, dead ahead

  it('silvered within PASSAGE_RANGE and in the heading cone: returned', () => {
    expect(PASSAGE_RANGE).toBe(1.4);
    expect(tryPushDoor([silvered], near)).toBe(silvered);
  });

  it('out of range: null', () => {
    expect(tryPushDoor([silvered], { x: 0, y: 0.6, heading: 0 })).toBeNull();
  });

  it('behind the player (outside the cone): null', () => {
    expect(tryPushDoor([silvered], { x: 0, y: -0.88, heading: Math.PI })).toBeNull();
  });

  it('in range and ahead but sideways past the cone: null', () => {
    // mirror bears ~48° off heading: dot > 0 yet lateral sin > cos(60°)
    expect(tryPushDoor([silvered], { x: 0.9, y: -0.88, heading: 0 })).toBeNull();
  });

  it('non-silvered kinds are never door targets', () => {
    const standing = mirror({
      id: 4,
      kind: 'standing',
      x: 0,
      z: -1.88,
      rotY: 0,
      wallDir: Dir.North,
    });
    expect(tryPushDoor([standing], near)).toBeNull();
  });
});
