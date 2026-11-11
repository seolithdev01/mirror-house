// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { generateFloor, TIER_ONE } from '../../src/game/maze';
import { buildFloorScene } from '../../src/game/floorScene';
import { TIER_ONE_PALETTE, TIER_TWO_PALETTE } from '../../src/game/palette';

describe('buildFloorScene', () => {
  it('instances one mesh per unique wall segment plus floor, ceiling, markers, water', () => {
    const floor = generateFloor({ ...TIER_ONE, seed: 'SCENE' });
    const { group, wallInstanceCount } = buildFloorScene(floor);
    expect(wallInstanceCount).toBe(floor.grid.wallSegments().length);
    // floor plane + ceiling plane + 2 instanced meshes + entrance + exit markers + T5 water plane
    expect(group.children.length).toBe(7);
  });

  // T5/T3 — the flood: one translucent teal-green plane across the whole
  // floor, hidden while the water is at 0 (dry stage, tiers 1–4 unchanged);
  // main.ts raises it to the live level per frame and disposes it with the
  // stage group.
  it('builds the flood plane: hidden at level 0, translucent teal-green, lying flat', () => {
    const floor = generateFloor({ ...TIER_ONE, seed: 'FLOOD' });
    const { waterPlane } = buildFloorScene(floor);
    expect(waterPlane.visible).toBe(false); // dry until the clock says otherwise
    const mat = waterPlane.material as unknown as {
      color: { getHex(): number };
      opacity: number;
      transparent: boolean;
      depthWrite: boolean;
    };
    expect(mat.color.getHex()).toBe(0x2c4a44);
    expect(mat.opacity).toBeCloseTo(0.45, 5);
    expect(mat.transparent).toBe(true);
    expect(mat.depthWrite).toBe(false); // translucent water never occludes
    expect(waterPlane.rotation.x).toBeCloseTo(-Math.PI / 2, 10); // lying flat, facing up
    expect(waterPlane.position.y).toBe(0);
  });

  // T2/T3 — tier-aware palette flow. Node has no canvas, so the materials fall
  // back to their palette colors — exactly the seam that proves which palette
  // the scene dressed in (the browser path bakes the same palette into the
  // texture atlas via makeFloorTexture/makeWallTexture).
  it('dresses tier-one colors by default (node fallback pins tier-1 unchanged)', () => {
    const floor = generateFloor({ ...TIER_ONE, seed: 'T1DRESS' });
    const { group, exitMarker } = buildFloorScene(floor);
    const mat = (m: unknown) =>
      (m as { material: { color: { getHex(): number } } }).material.color.getHex();
    expect(mat(group.children[0])).toBe(TIER_ONE_PALETTE.floorBase); // 0x1d2440
    expect(mat(group.children[1])).toBe(TIER_ONE_PALETTE.void); // ceiling
    expect(mat(exitMarker)).toBe(TIER_ONE_PALETTE.exit); // 0xd9a441
  });

  it('dresses the tier-two palette when handed one (Hall of Ancestors)', () => {
    const floor = generateFloor({ ...TIER_ONE, seed: 'T2DRESS' });
    const { group, exitMarker } = buildFloorScene(floor, TIER_TWO_PALETTE);
    const mat = (m: unknown) =>
      (m as { material: { color: { getHex(): number } } }).material.color.getHex();
    expect(mat(group.children[0])).toBe(0x2a2018); // amber hall floorBase
    expect(mat(group.children[1])).toBe(0x120d08); // brown-black void ceiling
    expect(mat(exitMarker)).toBe(0x2f6f6a); // deep-teal exit marker
  });
});
