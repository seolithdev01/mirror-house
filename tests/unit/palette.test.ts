// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  floorAccent,
  paletteForTier,
  TIER_ONE_PALETTE,
  TIER_TWO_PALETTE,
} from '../../src/game/palette';
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
    // tier-aware: the palette param must not dodge the browser guard
    expect(makeFloorTexture(TIER_TWO_PALETTE)).toBeNull();
    expect(makeWallTexture(TIER_TWO_PALETTE)).toBeNull();
  });

  // T2/T3 — the Hall of Ancestors palette: slot NAMES stay, values move to the
  // amber/brown/deep-teal art direction (spec §6.1 tier mood, plan Task 3).
  it('tier-two values are exact (Hall of Ancestors: amber/brown/deep-teal)', () => {
    expect(TIER_TWO_PALETTE).toEqual({
      void: 0x120d08,
      floorBase: 0x2a2018,
      floorLines: 0x3a2c1c,
      teal: 0xc98a3d, // the amber slot — the portraits' glass (PORTRAIT_GLASS)
      ivory: 0xe8dcc8,
      gold: 0xd9a441,
      rose: 0x2f6f6a, // the deep-teal slot
      wallTop: 0x8a7a5c,
      wallBottom: 0x4a3f2c,
      lantern: 0xffe0b0,
      entrance: 0xc98a3d,
      exit: 0x2f6f6a,
    });
  });

  it('paletteForTier picks the tier palette', () => {
    expect(paletteForTier(1)).toBe(TIER_ONE_PALETTE);
    expect(paletteForTier(2)).toBe(TIER_TWO_PALETTE);
  });

  it('floorAccent default is pinned tier-one (no-arg call sites unchanged)', () => {
    // explicit no-arg pin: the default parameter IS TIER_ONE_PALETTE
    expect(floorAccent(3, 3)).toBe(0xc2548a);
    expect(floorAccent(1, 1)).toBe(0x2a3560);
    expect(floorAccent(2, 1)).toBe(0x1d2440);
  });

  it('floorAccent with the tier-two palette: same pattern, ancestors colors', () => {
    // the rose-diamond slot becomes deep teal; gold lattice unchanged
    expect(floorAccent(3, 3, TIER_TWO_PALETTE)).toBe(0x2f6f6a);
    expect(floorAccent(9, 3, TIER_TWO_PALETTE)).toBe(0x2f6f6a);
    expect(floorAccent(6, 2, TIER_TWO_PALETTE)).toBe(0xd9a441);
    expect(floorAccent(2, 12, TIER_TWO_PALETTE)).toBe(0xd9a441);
    expect(floorAccent(0, 0, TIER_TWO_PALETTE)).toBe(0xd9a441);
    // the two-tone checker flips to the brown floor pair
    expect(floorAccent(1, 1, TIER_TWO_PALETTE)).toBe(0x3a2c1c);
    expect(floorAccent(2, 1, TIER_TWO_PALETTE)).toBe(0x2a2018);
  });
});
