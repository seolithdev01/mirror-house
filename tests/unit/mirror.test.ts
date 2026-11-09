// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { generateFloor, TIER_ONE } from '../../src/game/maze';
import { HeroMirror, mirrorSpots } from '../../src/game/mirror';

describe('mirrorSpots', () => {
  it('places exactly two mirrors (entrance + exit cells), deterministic, 0.12m off a wall, facing the cell center', () => {
    const floor = generateFloor({ ...TIER_ONE, seed: 'MIRROR' });
    const spots = mirrorSpots(floor);
    expect(spots).toHaveLength(2);
    for (const s of spots) {
      const { cx, cy } = floor.grid.cellCenter(
        s === spots[0] ? floor.entrance.x : floor.exit.x,
        s === spots[0] ? floor.entrance.y : floor.exit.y,
      );
      // wall-mounted: offset from cell center is CELL/2 - 0.12 along one axis, 0 on the other
      const dx = Math.abs(s.x - cx);
      const dz = Math.abs(s.z - cy);
      expect(Math.abs(dx - (4 / 2 - 0.12)) < 1e-6 || Math.abs(dz - (4 / 2 - 0.12)) < 1e-6).toBe(
        true,
      );
      // facing back into the cell: normal points from mirror toward cell center
      const nx = Math.sin(s.rotY),
        nz = Math.cos(s.rotY);
      expect(nx * (cx - s.x) + nz * (cy - s.z)).toBeGreaterThan(0.9);
    }
    expect(mirrorSpots(generateFloor({ ...TIER_ONE, seed: 'MIRROR' }))).toEqual(spots);
  });
});

describe('HeroMirror.dispose (M5/T5 — the M4-review leak)', () => {
  it('frees the RT, the RT material, the glass geometry, and the frame geometry+material', () => {
    const m = new HeroMirror({ x: 1, z: 1, rotY: 0 }, { size: 256, frame: true });
    // the instance-owned resources (rtMaterial and the frame's material are
    // the two this fix adds; rt/geometries were already freed and ride along)
    const rt = (m as unknown as { rt: THREE.WebGLRenderTarget }).rt;
    const rtMaterial = (m as unknown as { rtMaterial: THREE.MeshBasicMaterial }).rtMaterial;
    const frame = m.mesh.children[0] as THREE.Mesh;
    const spies = [
      vi.spyOn(rt, 'dispose'),
      vi.spyOn(rtMaterial, 'dispose'),
      vi.spyOn(m.mesh.geometry, 'dispose'),
      vi.spyOn(frame.geometry, 'dispose'),
      vi.spyOn(frame.material as THREE.Material, 'dispose'),
    ];
    m.dispose();
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1);
  });

  it('never disposes the shared fog/capture swap materials, even while fogged', () => {
    const m = new HeroMirror({ x: 0, z: 0, rotY: 0 });
    m.setFog('fogged'); // mesh.material now points at the SHARED fogged material
    const fogged = m.mesh.material as THREE.Material;
    const spy = vi.spyOn(fogged, 'dispose');
    m.dispose();
    expect(spy).not.toHaveBeenCalled();
  });
});
