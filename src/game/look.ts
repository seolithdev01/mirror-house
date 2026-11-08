// SPDX-License-Identifier: Apache-2.0
export interface AvatarLook { coat: number; glass: number }
export interface ResolvedLook extends AvatarLook { name: string }

export const COATS: Record<string, number> = {
  indigo: 0x2b3a67, teal: 0x1f7a70, rose: 0x8a3a5c, ivory: 0xcfc4ae,
};
export const GLASSES: Record<string, number> = {
  gold: 0xffc46b, teal: 0x7de8dc, white: 0xf5f2e8,
};
export const DEFAULT_LOOK_NAME = 'indigo-gold';

export function parseLook(raw: string | null): ResolvedLook {
  let coatName = 'indigo';
  let glassName = 'gold';
  if (raw) {
    const parts = raw.toLowerCase().split(/[.\-]/);
    const maybeCoat = parts[0];
    const maybeGlass = parts[1];
    if (maybeCoat && maybeCoat in COATS) coatName = maybeCoat;
    if (maybeGlass && maybeGlass in GLASSES) glassName = maybeGlass;
  }
  return {
    coat: COATS[coatName] ?? 0x2b3a67,
    glass: GLASSES[glassName] ?? 0xffc46b,
    name: `${coatName}-${glassName}`,
  };
}
