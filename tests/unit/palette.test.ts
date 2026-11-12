// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  floorAccent,
  paletteForTier,
  TIER_EIGHT_PALETTE,
  TIER_FIVE_PALETTE,
  TIER_FOUR_PALETTE,
  TIER_ONE_PALETTE,
  TIER_SEVEN_PALETTE,
  TIER_SIX_PALETTE,
  TIER_THREE_PALETTE,
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
    // T3/T4 — the Gardens dress tier 3 (night-blue stand-in retired)
    expect(paletteForTier(3)).toBe(TIER_THREE_PALETTE);
    // T4/T4 — the Carnival dresses tier 4 (the tier-one stand-in retired)
    expect(paletteForTier(4)).toBe(TIER_FOUR_PALETTE);
    // T5/T4 — the Flood Halls dress tier 5 (the Carnival stand-in retired)
    expect(paletteForTier(5)).toBe(TIER_FIVE_PALETTE);
    // T6/T4 — the Furnace Wings dress tier 6 (the Flood stand-in retired)
    expect(paletteForTier(6)).toBe(TIER_SIX_PALETTE);
    // T7/T3 — the Whisper Library dresses tier 7 (the Furnace stand-in retired)
    expect(paletteForTier(7)).toBe(TIER_SEVEN_PALETTE);
    // T8/T3 — the Frozen Atrium dresses tier 8 (the tier-one stand-in retired,
    // the same retire-the-stand-in pattern one tier down)
    expect(paletteForTier(8)).toBe(TIER_EIGHT_PALETTE);
  });

  // T3/T4 — the Reflecting Gardens palette (floors 21–30, spec §4.6 row 3):
  // moss-green floors, water-teal glass, ivory light. Same slot NAMES again —
  // the rose-diamond slot becomes the leaf accent, the teal slot the pools'
  // water-teal.
  it('tier-three values are exact (Reflecting Gardens: green/water-teal/ivory)', () => {
    expect(TIER_THREE_PALETTE).toEqual({
      void: 0x081410,
      floorBase: 0x1e3226,
      floorLines: 0x2a4432,
      teal: 0x3fae9a, // the water-teal slot — the pools' glass
      ivory: 0xeff2e4,
      gold: 0xc9b458,
      rose: 0x6fae6f, // the leaf slot
      wallTop: 0x7f937f,
      wallBottom: 0x3e4a3e,
      lantern: 0xfff2cf,
      entrance: 0x3fae9a,
      exit: 0x6fae6f,
    });
  });

  it('floorAccent with the tier-three palette: same pattern, gardens colors', () => {
    // the rose-diamond slot becomes the leaf accent; gold lattice follows suit
    expect(floorAccent(3, 3, TIER_THREE_PALETTE)).toBe(0x6fae6f);
    expect(floorAccent(9, 3, TIER_THREE_PALETTE)).toBe(0x6fae6f);
    expect(floorAccent(6, 2, TIER_THREE_PALETTE)).toBe(0xc9b458);
    expect(floorAccent(2, 12, TIER_THREE_PALETTE)).toBe(0xc9b458);
    expect(floorAccent(0, 0, TIER_THREE_PALETTE)).toBe(0xc9b458);
    // the two-tone checker flips to the moss-green floor pair
    expect(floorAccent(1, 1, TIER_THREE_PALETTE)).toBe(0x2a4432);
    expect(floorAccent(2, 1, TIER_THREE_PALETTE)).toBe(0x1e3226);
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

  // T4/T4 — the Carnival of Faces palette (floors 31–40, spec §4.6 row 4):
  // rose/magenta on night — the funhouse's candle-lit plum. The slot-name
  // game reaches its punchline: the teal slot wears the carnival's magenta
  // (the tier-one ROSE value, 0xc2548a) and the rose-diamond slot wears the
  // candle flame (0xffb347) — the lattice diamonds glow like fairground
  // lights over a plum-dark floor.
  it('tier-four values are exact (Carnival of Faces: magenta/candle/plum)', () => {
    expect(TIER_FOUR_PALETTE).toEqual({
      void: 0x140812,
      floorBase: 0x2e1a26,
      floorLines: 0x402233,
      teal: 0xc2548a, // the magenta slot — the carnival glass' rose-magenta
      ivory: 0xf2e4ee,
      gold: 0xd9a441,
      rose: 0xffb347, // the candle slot — the fairground lights
      wallTop: 0x8a6a7a,
      wallBottom: 0x46303c,
      lantern: 0xffd4c0,
      entrance: 0xc2548a,
      exit: 0xffb347,
    });
  });

  it('floorAccent with the tier-four palette: same pattern, carnival colors', () => {
    // the rose-diamond slot becomes the candle flame; the gold lattice holds
    expect(floorAccent(3, 3, TIER_FOUR_PALETTE)).toBe(0xffb347);
    expect(floorAccent(9, 3, TIER_FOUR_PALETTE)).toBe(0xffb347);
    expect(floorAccent(6, 2, TIER_FOUR_PALETTE)).toBe(0xd9a441);
    expect(floorAccent(2, 12, TIER_FOUR_PALETTE)).toBe(0xd9a441);
    expect(floorAccent(0, 0, TIER_FOUR_PALETTE)).toBe(0xd9a441);
    // the two-tone checker flips to the plum floor pair
    expect(floorAccent(1, 1, TIER_FOUR_PALETTE)).toBe(0x402233);
    expect(floorAccent(2, 1, TIER_FOUR_PALETTE)).toBe(0x2e1a26);
  });

  // T5/T4 — the Flood Halls palette (floors 41–50, spec §4.6 row 5): drowned
  // indigo-green — Act II's flooded wing. Green-black void, moss over a
  // sea-dark floor, sage walls under sea-green ivory light. The slot NAMES
  // hold one last time: the teal slot is the water kin (the Gardens' exact
  // water-teal — the same water the halls rise with), the rose-diamond slot
  // wears the moss accent.
  it('tier-five values are exact (Flood Halls: drowned indigo-green/water-teal/moss)', () => {
    expect(TIER_FIVE_PALETTE).toEqual({
      void: 0x0a1414,
      floorBase: 0x16281e,
      floorLines: 0x1e3628,
      teal: 0x3fae9a, // the water-teal slot — the flood's own glass
      ivory: 0xdce8dc,
      gold: 0xd9a441,
      rose: 0x5a8a6a, // the moss slot
      wallTop: 0x6a8a7a,
      wallBottom: 0x2c3e34,
      lantern: 0xd8ffe8,
      entrance: 0x3fae9a,
      exit: 0x5a8a6a,
    });
  });

  it('floorAccent with the tier-five palette: same pattern, flood colors', () => {
    // the rose-diamond slot becomes the moss accent; the gold lattice holds
    expect(floorAccent(3, 3, TIER_FIVE_PALETTE)).toBe(0x5a8a6a);
    expect(floorAccent(9, 3, TIER_FIVE_PALETTE)).toBe(0x5a8a6a);
    expect(floorAccent(6, 2, TIER_FIVE_PALETTE)).toBe(0xd9a441);
    expect(floorAccent(2, 12, TIER_FIVE_PALETTE)).toBe(0xd9a441);
    expect(floorAccent(0, 0, TIER_FIVE_PALETTE)).toBe(0xd9a441);
    // the two-tone checker flips to the drowned floor pair
    expect(floorAccent(1, 1, TIER_FIVE_PALETTE)).toBe(0x1e3628);
    expect(floorAccent(2, 1, TIER_FIVE_PALETTE)).toBe(0x16281e);
  });

  // T6/T4 — the Furnace Wings palette (floors 51–60, spec §4.6 row 6):
  // ember/copper on charcoal — the forge's crucible light. The slot NAMES
  // hold one last time: the teal slot wears the ember glass (the forge's
  // flame), the rose-diamond slot wears the copper accent, so every
  // palette-driven pattern re-dresses itself with zero structural change
  // (the T2 precedent).
  it('tier-six values are exact (Furnace Wings: ember/copper on charcoal)', () => {
    expect(TIER_SIX_PALETTE).toEqual({
      void: 0x140a06,
      floorBase: 0x241610,
      floorLines: 0x322016,
      teal: 0xd9743a, // the ember slot — the forge's flame glass
      ivory: 0xe8d8c8,
      gold: 0xd9a441,
      rose: 0xb87333, // the copper slot
      wallTop: 0x7a5c4a,
      wallBottom: 0x3c2c1e,
      lantern: 0xffd0a0,
      entrance: 0xd9743a,
      exit: 0xb87333,
    });
  });

  it('floorAccent with the tier-six palette: same pattern, furnace colors', () => {
    // the rose-diamond slot becomes the copper accent; the gold lattice holds
    expect(floorAccent(3, 3, TIER_SIX_PALETTE)).toBe(0xb87333);
    expect(floorAccent(9, 3, TIER_SIX_PALETTE)).toBe(0xb87333);
    expect(floorAccent(6, 2, TIER_SIX_PALETTE)).toBe(0xd9a441);
    expect(floorAccent(2, 12, TIER_SIX_PALETTE)).toBe(0xd9a441);
    expect(floorAccent(0, 0, TIER_SIX_PALETTE)).toBe(0xd9a441);
    // the two-tone checker flips to the charred floor pair
    expect(floorAccent(1, 1, TIER_SIX_PALETTE)).toBe(0x322016);
    expect(floorAccent(2, 1, TIER_SIX_PALETTE)).toBe(0x241610);
  });

  // T7/T3 — the Whisper Library palette (floors 61–70, spec §4.6 row 7):
  // moonlit lavender-grey — the library by moonlight. Near-black void over a
  // slate-blue floor, lavender glass in the teal slot, dusk in the rose-diamond
  // slot, moon-white lantern light. The slot NAMES hold one last time (the T2
  // precedent): every palette-driven pattern re-dresses itself with zero
  // structural change — and the Furnace stand-in retires with this commit.
  it('tier-seven values are exact (Whisper Library: moonlit lavender-grey)', () => {
    expect(TIER_SEVEN_PALETTE).toEqual({
      void: 0x0a0a12,
      floorBase: 0x181824,
      floorLines: 0x242436,
      teal: 0x8a8ab8, // the lavender slot — the moonlit stacks' glass
      ivory: 0xe4e4f0,
      gold: 0xd9a441,
      rose: 0x6a6a9a, // the dusk slot — the lattice diamonds in library dusk
      wallTop: 0x5c5c78,
      wallBottom: 0x2e2e44,
      lantern: 0xe8e8ff,
      entrance: 0x8a8ab8,
      exit: 0xd9a441,
    });
  });

  it('floorAccent with the tier-seven palette: same pattern, library colors', () => {
    // the rose-diamond slot becomes the dusk accent; the gold lattice holds
    expect(floorAccent(3, 3, TIER_SEVEN_PALETTE)).toBe(0x6a6a9a);
    expect(floorAccent(9, 3, TIER_SEVEN_PALETTE)).toBe(0x6a6a9a);
    expect(floorAccent(6, 2, TIER_SEVEN_PALETTE)).toBe(0xd9a441);
    expect(floorAccent(2, 12, TIER_SEVEN_PALETTE)).toBe(0xd9a441);
    expect(floorAccent(0, 0, TIER_SEVEN_PALETTE)).toBe(0xd9a441);
    // the two-tone checker flips to the slate-blue floor pair
    expect(floorAccent(1, 1, TIER_SEVEN_PALETTE)).toBe(0x242436);
    expect(floorAccent(2, 1, TIER_SEVEN_PALETTE)).toBe(0x181824);
  });

  // T8/T3 — the Frozen Atrium palette (floors 71–80, spec §4.6 row 8): ice
  // on deep void-blue — the atrium by frost-light. Near-black blue void over
  // a sea-dark floor, ice-teal glass in the teal slot, frost-blue in the
  // rose-diamond slot, pale ice lantern light. The slot NAMES hold one last
  // time (the T2 precedent): every palette-driven pattern re-dresses itself
  // with zero structural change — and the tier-one stand-in retires with
  // this commit.
  it('tier-eight values are exact (Frozen Atrium: ice on deep void-blue)', () => {
    expect(TIER_EIGHT_PALETTE).toEqual({
      void: 0x08101a,
      floorBase: 0x14243a,
      floorLines: 0x1e3450,
      teal: 0x9ad4e8, // the ice slot — the atrium's frozen glass light
      ivory: 0xeef4fa,
      gold: 0xd9a441,
      rose: 0x6a9ac2, // the frost-blue slot — the lattice diamonds in hoarfrost
      wallTop: 0x7c96ac,
      wallBottom: 0x31465c,
      lantern: 0xd8f0ff,
      entrance: 0x9ad4e8,
      exit: 0xd9a441,
    });
  });

  it('floorAccent with the tier-eight palette: same pattern, atrium colors', () => {
    // the rose-diamond slot becomes the frost-blue accent; the gold lattice holds
    expect(floorAccent(3, 3, TIER_EIGHT_PALETTE)).toBe(0x6a9ac2);
    expect(floorAccent(9, 3, TIER_EIGHT_PALETTE)).toBe(0x6a9ac2);
    expect(floorAccent(6, 2, TIER_EIGHT_PALETTE)).toBe(0xd9a441);
    expect(floorAccent(2, 12, TIER_EIGHT_PALETTE)).toBe(0xd9a441);
    expect(floorAccent(0, 0, TIER_EIGHT_PALETTE)).toBe(0xd9a441);
    // the two-tone checker flips to the sea-dark floor pair
    expect(floorAccent(1, 1, TIER_EIGHT_PALETTE)).toBe(0x1e3450);
    expect(floorAccent(2, 1, TIER_EIGHT_PALETTE)).toBe(0x14243a);
  });
});
