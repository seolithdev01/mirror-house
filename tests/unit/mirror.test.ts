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
