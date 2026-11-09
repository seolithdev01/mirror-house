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

/** Deterministic per-cell floor accent on a 6x6 lattice: gold grid lines on every 6th row/column,
 *  a rose diamond at (3,3), two-tone checker elsewhere. Pure twin of the canvas atlas. */
export function floorAccent(gx: number, gy: number): number {
  const m6 = ((gx % 6) + 6) % 6;
  const n6 = ((gy % 6) + 6) % 6;
  if (m6 === 3 && n6 === 3) return TIER_ONE_PALETTE.rose;
  if (m6 === 0 || n6 === 0) return TIER_ONE_PALETTE.gold;
  return m6 % 2 === n6 % 2 ? TIER_ONE_PALETTE.floorLines : TIER_ONE_PALETTE.floorBase;
}
