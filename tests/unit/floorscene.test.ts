// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { generateFloor, TIER_ONE } from '../../src/game/maze';
import { buildFloorScene } from '../../src/game/floorScene';
import { TIER_ONE_PALETTE, TIER_TWO_PALETTE } from '../../src/game/palette';

describe('buildFloorScene', () => {
  it('instances one mesh per unique wall segment plus floor, ceiling, markers', () => {
    const floor = generateFloor({ ...TIER_ONE, seed: 'SCENE' });
    const { group, wallInstanceCount } = buildFloorScene(floor);
    expect(wallInstanceCount).toBe(floor.grid.wallSegments().length);
    // floor plane + ceiling plane + 2 instanced meshes + entrance + exit markers
    expect(group.children.length).toBe(6);
  });

  // T2/T3 — tier-aware palette flow. Node has no canvas, so the materials fall
  // back to their palette colors — exactly the seam that proves which palette
  // the scene dressed in (the browser path bakes the same palette into the
  // texture atlas via makeFloorTexture/makeWallTexture).
  it('dresses tier-one colors by default (node fallback pins tier-1 unchanged)', () => {
    const floor = generateFloor({ ...TIER_ONE, seed: 'T1DRESS' });
    const { group, exitMarker } = buildFloorScene(floor);
    const mat = (m: unknown) => (m as { material: { color: { getHex(): number } } }).material.color.getHex();
    expect(mat(group.children[0])).toBe(TIER_ONE_PALETTE.floorBase); // 0x1d2440
    expect(mat(group.children[1])).toBe(TIER_ONE_PALETTE.void); // ceiling
    expect(mat(exitMarker)).toBe(TIER_ONE_PALETTE.exit); // 0xd9a441
  });

  it('dresses the tier-two palette when handed one (Hall of Ancestors)', () => {
    const floor = generateFloor({ ...TIER_ONE, seed: 'T2DRESS' });
    const { group, exitMarker } = buildFloorScene(floor, TIER_TWO_PALETTE);
    const mat = (m: unknown) => (m as { material: { color: { getHex(): number } } }).material.color.getHex();
    expect(mat(group.children[0])).toBe(0x2a2018); // amber hall floorBase
    expect(mat(group.children[1])).toBe(0x120d08); // brown-black void ceiling
    expect(mat(exitMarker)).toBe(0x2f6f6a); // deep-teal exit marker
  });
});
