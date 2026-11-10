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

/** The Hall of Ancestors (floors 11–20, T2/T3): amber glass, brown stone,
 *  deep-teal markers. The slot NAMES stay (teal/rose) so every palette-driven
 *  pattern — floorAccent's rose-diamond/gold-lattice atlas above all —
 *  re-dresses itself in the tier-2 colors with zero structural change. */
export const TIER_TWO_PALETTE: TierPalette = {
  void: 0x120d08,
  floorBase: 0x2a2018,
  floorLines: 0x3a2c1c,
  teal: 0xc98a3d, // amber — the ancestors' portrait glass
  ivory: 0xe8dcc8,
  gold: 0xd9a441,
  rose: 0x2f6f6a, // deep teal
  wallTop: 0x8a7a5c,
  wallBottom: 0x4a3f2c,
  lantern: 0xffe0b0,
  entrance: 0xc98a3d,
  exit: 0x2f6f6a,
};

/** The Reflecting Gardens (floors 21–30, T3/T4): moss-green floors, sage
 *  walls, water-teal glass and ivory light — the pastoral third act. Same
 *  slot NAMES again: the teal slot becomes the pools' water-teal, the rose
 *  diamond a leaf accent, so every palette-driven pattern re-dresses itself
 *  with zero structural change (the T2 precedent). */
export const TIER_THREE_PALETTE: TierPalette = {
  void: 0x081410,
  floorBase: 0x1e3226,
  floorLines: 0x2a4432,
  teal: 0x3fae9a, // water-teal — the standing pools' glass
  ivory: 0xeff2e4,
  gold: 0xc9b458,
  rose: 0x6fae6f, // leaf
  wallTop: 0x7f937f,
  wallBottom: 0x3e4a3e,
  lantern: 0xfff2cf,
  entrance: 0x3fae9a,
  exit: 0x6fae6f,
};

/** The palette a floor dresses in, by tier (campaign.tierOf picks the side).
 *  T3/T4: tier 3 wears the Gardens palette — the tier-one stand-in is
 *  retired. T4/T1: tier 4 (the Carnival of Faces) keeps the tier-one night
 *  palette FOR NOW — the carnival's rose/magenta set arrives with T4/T4's
 *  palette task, whose commit replaces this fallthrough. */
export function paletteForTier(tier: 1 | 2 | 3 | 4): TierPalette {
  if (tier === 2) return TIER_TWO_PALETTE;
  if (tier === 3) return TIER_THREE_PALETTE;
  return TIER_ONE_PALETTE;
}

/** Deterministic per-cell floor accent on a 6x6 lattice: gold grid lines on every 6th row/column,
 *  a rose diamond at (3,3), two-tone checker elsewhere. Pure twin of the canvas atlas.
 *  Tier-aware: the palette defaults to tier-one (call sites that pass nothing
 *  are pinned tier-1); tier-2 reuses the same slots in its own colors. */
export function floorAccent(
  gx: number,
  gy: number,
  palette: TierPalette = TIER_ONE_PALETTE,
): number {
  const m6 = ((gx % 6) + 6) % 6;
  const n6 = ((gy % 6) + 6) % 6;
  if (m6 === 3 && n6 === 3) return palette.rose;
  if (m6 === 0 || n6 === 0) return palette.gold;
  return m6 % 2 === n6 % 2 ? palette.floorLines : palette.floorBase;
}
