// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { generateFloor, TIER_ONE } from '../../src/game/maze';
import { buildFloorScene } from '../../src/game/floorScene';

describe('buildFloorScene', () => {
  it('instances one mesh per unique wall segment plus floor, ceiling, markers', () => {
    const floor = generateFloor({ ...TIER_ONE, seed: 'SCENE' });
    const { group, wallInstanceCount } = buildFloorScene(floor);
    expect(wallInstanceCount).toBe(floor.grid.wallSegments().length);
    // floor plane + ceiling plane + 2 instanced meshes + entrance + exit markers
    expect(group.children.length).toBe(6);
  });
});
