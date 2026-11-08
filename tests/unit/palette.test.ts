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
  it('floorAccent: gold grid lines on every 6th row/column, rose diamond at (3,3), else two-tone checker', () => {
    expect(floorAccent(3, 3)).toBe(TIER_ONE_PALETTE.rose);
    expect(floorAccent(9, 3)).toBe(TIER_ONE_PALETTE.rose);
    expect(floorAccent(6, 2)).toBe(TIER_ONE_PALETTE.gold);
    expect(floorAccent(2, 12)).toBe(TIER_ONE_PALETTE.gold);
    // the full 0-lattice is gold (column 0 and row 0 included) so tiles seam every 6 cells
    expect(floorAccent(0, 0)).toBe(TIER_ONE_PALETTE.gold);
    expect(floorAccent(1, 0)).toBe(TIER_ONE_PALETTE.gold); // row 0
    expect(floorAccent(1, 1)).toBe(TIER_ONE_PALETTE.floorLines);
  });
  it('textures degrade to null in node (browser guard)', () => {
    expect(makeFloorTexture()).toBeNull();
    expect(makeWallTexture()).toBeNull();
  });
});
