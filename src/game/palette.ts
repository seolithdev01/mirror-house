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

/** The Carnival of Faces (floors 31–40, T4): rose/magenta on night — the
 *  funhouse's candle-lit plum. The slot-name game reaches its punchline: the
 *  teal slot wears the carnival's magenta (the tier-one ROSE value), and the
 *  rose-diamond slot wears the candle flame — the lattice diamonds glow like
 *  fairground lights over a plum-dark floor. */
export const TIER_FOUR_PALETTE: TierPalette = {
  void: 0x140812,
  floorBase: 0x2e1a26,
  floorLines: 0x402233,
  teal: 0xc2548a, // magenta — the carnival glass' rose-magenta
  ivory: 0xf2e4ee,
  gold: 0xd9a441,
  rose: 0xffb347, // candle — the fairground lights (Aavart's flame glass)
  wallTop: 0x8a6a7a,
  wallBottom: 0x46303c,
  lantern: 0xffd4c0,
  entrance: 0xc2548a,
  exit: 0xffb347,
};

/** The Flood Halls (floors 41–50, T5): drowned indigo-green — Act II's
 *  flooded wing. Green-black void, moss over a sea-dark floor, sage walls
 *  under sea-green ivory light. The slot NAMES hold one last time: the teal
 *  slot is the water kin (the Gardens' exact water-teal — the same water the
 *  halls rise with), the rose-diamond slot wears the moss accent, so every
 *  palette-driven pattern re-dresses itself with zero structural change
 *  (the T2 precedent). */
export const TIER_FIVE_PALETTE: TierPalette = {
  void: 0x0a1414,
  floorBase: 0x16281e,
  floorLines: 0x1e3628,
  teal: 0x3fae9a, // water-teal — the flood's own glass
  ivory: 0xdce8dc,
  gold: 0xd9a441,
  rose: 0x5a8a6a, // moss
  wallTop: 0x6a8a7a,
  wallBottom: 0x2c3e34,
  lantern: 0xd8ffe8,
  entrance: 0x3fae9a,
  exit: 0x5a8a6a,
};

/** The Furnace Wings (floors 51–60, T6): ember/copper on charcoal — the
 *  forge's crucible light. Charred void and floor, ember flame in the glass
 *  slots, copper in the rose-diamond slot, forge-stone walls under lamplight
 *  the color of heated metal. The slot NAMES hold one last time: the teal
 *  slot wears the ember (the forge's flame — the same hue the T2 heat
 *  dressing already breathes into the haze), the rose-diamond slot wears
 *  copper, so every palette-driven pattern re-dresses itself with zero
 *  structural change (the T2 precedent). */
export const TIER_SIX_PALETTE: TierPalette = {
  void: 0x140a06,
  floorBase: 0x241610,
  floorLines: 0x322016,
  teal: 0xd9743a, // ember — the forge's flame glass
  ivory: 0xe8d8c8,
  gold: 0xd9a441,
  rose: 0xb87333, // copper
  wallTop: 0x7a5c4a,
  wallBottom: 0x3c2c1e,
  lantern: 0xffd0a0,
  entrance: 0xd9743a,
  exit: 0xb87333,
};

/** The Whisper Library (floors 61–70, T7): moonlit lavender-grey — the
 *  library by moonlight. Near-black void over a slate-blue floor, lavender
 *  glass in the teal slot, dusk in the rose-diamond slot, moon-white lantern
 *  light. The slot NAMES hold one last time: the teal slot wears the stacks'
 *  lavender, the rose-diamond slot wears the dusk accent, so every
 *  palette-driven pattern re-dresses itself with zero structural change
 *  (the T2 precedent). */
export const TIER_SEVEN_PALETTE: TierPalette = {
  void: 0x0a0a12,
  floorBase: 0x181824,
  floorLines: 0x242436,
  teal: 0x8a8ab8, // lavender — the moonlit stacks' glass
  ivory: 0xe4e4f0,
  gold: 0xd9a441,
  rose: 0x6a6a9a, // dusk — the lattice diamonds in library dusk
  wallTop: 0x5c5c78,
  wallBottom: 0x2e2e44,
  lantern: 0xe8e8ff,
  entrance: 0x8a8ab8,
  exit: 0xd9a441,
};

/** The Frozen Atrium (floors 71–80, T8): ice on deep void-blue — the atrium
 *  by frost-light. Near-black blue void over a sea-dark floor, ice-teal glass
 *  in the teal slot, frost-blue in the rose-diamond slot, pale ice lantern
 *  light. The slot NAMES hold one last time: the teal slot wears the atrium's
 *  frozen glass light, the rose-diamond slot wears the hoarfrost accent, so
 *  every palette-driven pattern re-dresses itself with zero structural
 *  change (the T2 precedent). */
export const TIER_EIGHT_PALETTE: TierPalette = {
  void: 0x08101a,
  floorBase: 0x14243a,
  floorLines: 0x1e3450,
  teal: 0x9ad4e8, // ice — the atrium's frozen glass light
  ivory: 0xeef4fa,
  gold: 0xd9a441,
  rose: 0x6a9ac2, // frost-blue — the lattice diamonds in hoarfrost
  wallTop: 0x7c96ac,
  wallBottom: 0x31465c,
  lantern: 0xd8f0ff,
  entrance: 0x9ad4e8,
  exit: 0xd9a441,
};

/** The Warden's Warrens (floors 81–90, T9): iron on near-void — the apex by
 *  furnace-dawn. Near-black iron void over a gunmetal floor, warden-steel
 *  glass in the teal slot, iron-red in the rose-diamond slot, pale
 *  iron-white lantern light. The slot NAMES hold one last time: the teal slot
 *  wears the warren's watch-steel, the rose-diamond slot wears the iron-red
 *  accent, so every palette-driven pattern re-dresses itself with zero
 *  structural change (the T2 precedent) — and the LAST tier-one stand-in
 *  retires with this commit. */
export const TIER_NINE_PALETTE: TierPalette = {
  void: 0x0a0c0e,
  floorBase: 0x1a1e22,
  floorLines: 0x262c30,
  teal: 0x5a9a9a, // warden-steel — the warren's watch-steel glass
  ivory: 0xd8dde0,
  gold: 0xd9a441,
  rose: 0x9a4a4a, // iron-red — the lattice diamonds in iron-red
  wallTop: 0x565e66,
  wallBottom: 0x2a3036,
  lantern: 0xe8f0f0,
  entrance: 0x5a9a9a,
  exit: 0xd9a441,
};

/** The palette a floor dresses in, by tier (campaign.tierOf picks the side).
 *  T3/T4: tier 3 wears the Gardens palette — the tier-one stand-in is
 *  retired. T4/T4: tier 4 wears the Carnival palette — the documented
 *  tier-one stand-in (T4/T1's fallthrough) is retired by this commit.
 *  T5/T4: tier 5 wears the Flood Halls' drowned indigo-green — the
 *  documented Carnival stand-in (T5/T1's fallthrough) is retired here,
 *  the same retire-the-stand-in pattern one tier down.
 *  T6/T4: tier 6 wears the Furnace Wings' ember/copper-on-charcoal — the
 *  documented Flood stand-in (T6/T1's fallthrough) is retired here, the
 *  same retire-the-stand-in pattern one tier down.
 *  T7/T3: tier 7 wears the Whisper Library's moonlit lavender-grey — the
 *  documented Furnace stand-in (T7/T1's fallthrough) is retired here, the
 *  same retire-the-stand-in pattern one tier down.
 *  T8/T3: tier 8 wears the Frozen Atrium's ice-on-void-blue — the documented
 *  tier-one stand-in (T8/T1's fallthrough) is retired here, the same
 *  retire-the-stand-in pattern one tier down.
 *  T9/T3: tier 9 wears the Warden's Warrens' iron-on-near-void — the tier-one
 *  stand-in (T9/T1's fallthrough) retires there. T10/T1: tier 10 REOPENS the
 *  stand-in — the Foundations and the Ground keep the tier-one dressing until
 *  T3 delivers the stone palette, the same retire-the-stand-in pattern one
 *  last tier down. */
export function paletteForTier(tier: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10): TierPalette {
  if (tier === 2) return TIER_TWO_PALETTE;
  if (tier === 3) return TIER_THREE_PALETTE;
  if (tier === 4) return TIER_FOUR_PALETTE;
  if (tier === 5) return TIER_FIVE_PALETTE;
  if (tier === 6) return TIER_SIX_PALETTE;
  if (tier === 7) return TIER_SEVEN_PALETTE; // T7/T3 — the stand-in retires
  if (tier === 8) return TIER_EIGHT_PALETTE; // T8/T3 — the stand-in retires
  if (tier === 9) return TIER_NINE_PALETTE; // T9/T3 — the stand-in retires
  // T10/T1 — the Foundations and the Ground keep the tier-one stand-in (the
  // documented fallthrough, the same pattern every tier wore once); T3
  // delivers the stone palette and retires it one last time.
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
