// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { generateFloor, TIER_ONE } from '../../src/game/maze';
import {
  createDistortMirror,
  createMirrorMesh,
  createPortraitMirror,
  FROST_GLASS_COLOR,
  HeroMirror,
  mirrorSpots,
} from '../../src/game/mirror';

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

// T2 — the ancestor portrait: a cheap mirror in the standing-mirror family
// (same plane, same fog/crack interface) wearing the amber glass and the
// per-id silhouette. In node the canvas factories return null, so the
// map-less path (plain amber glass) is the one this suite pins.
describe('createPortraitMirror (T2)', () => {
  it('builds node-safe: amber-tinted glass, standing-mirror plane, deterministic per id', () => {
    const p = createPortraitMirror(4);
    const q = createPortraitMirror(4);
    expect(p.mesh).toBeInstanceOf(THREE.Mesh);
    expect(p.mesh.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    const a = p.mesh.material as THREE.MeshStandardMaterial;
    const b = q.mesh.material as THREE.MeshStandardMaterial;
    // in node there is no map — the amber glass tint stands in for the canvas
    expect(a.map).toBeNull();
    expect(a.color.getHex()).toBe(0xc98a3d);
    expect(b.color.getHex()).toBe(0xc98a3d);
  });

  it('fog swaps the glass matte (shared material) and back; crack tints and restores', () => {
    const p = createPortraitMirror(0);
    const base = p.mesh.material;
    p.setFog('fogged');
    expect(p.mesh.material).not.toBe(base); // the shared matte swap
    expect((p.mesh.material as THREE.MeshStandardMaterial).map).toBeNull(); // matte: no map
    p.setFog('clear');
    expect(p.mesh.material).toBe(base);
    p.setCracked(true);
    expect((p.mesh.material as THREE.MeshStandardMaterial).color.getHex()).not.toBe(0xc98a3d);
    p.setCracked(false);
    expect((p.mesh.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0xc98a3d);
  });

  it('dispose frees the instance-owned geometry and material; shared matte survives', () => {
    const p = createPortraitMirror(2);
    const base = p.mesh.material as THREE.MeshStandardMaterial;
    p.setFog('fogged'); // mesh.material now points at the SHARED matte
    const matte = p.mesh.material as THREE.Material;
    const matteSpy = vi.spyOn(matte, 'dispose');
    const geoSpy = vi.spyOn(p.mesh.geometry, 'dispose');
    const matSpy = vi.spyOn(base, 'dispose');
    p.dispose();
    expect(geoSpy).toHaveBeenCalledTimes(1);
    expect(matSpy).toHaveBeenCalledTimes(1);
    expect(matteSpy).not.toHaveBeenCalled();
  });
});

// T8 — the frozen pane: the Atrium's spawn state renders frost-white (an
// opaque pane material — eye-blind like the fogged matte, but its OWN shared
// material: ice is white, fog is dark). Every glass family takes the swap:
// cheap standing/beacon, portrait, distort, and the RT heroes (whose update
// skips the reflection pass while frozen, exactly like fogged).
describe('frozen render — the frost-white pane (T8)', () => {
  it('createMirrorMesh swaps to a shared frost material on frozen, base on clear', () => {
    const m = createMirrorMesh('standing');
    const base = m.mesh.material;
    m.setFog('fogged');
    const matte = m.mesh.material;
    m.setFog('frozen');
    const frost = m.mesh.material;
    expect(frost).not.toBe(base);
    expect(frost).not.toBe(matte); // ice is not fog — its own material
    expect((frost as THREE.MeshStandardMaterial).color.getHex()).toBe(FROST_GLASS_COLOR);
    m.setFog('clear');
    expect(m.mesh.material).toBe(base);
  });

  it('the portrait and the carnival glass freeze onto the same frost material', () => {
    const p = createPortraitMirror(0);
    const base = p.mesh.material;
    p.setFog('frozen');
    expect(p.mesh.material).not.toBe(base);
    expect((p.mesh.material as THREE.MeshStandardMaterial).color.getHex()).toBe(FROST_GLASS_COLOR);
    p.setFog('clear');
    expect(p.mesh.material).toBe(base);
    const d = createDistortMirror();
    const dBase = d.mesh.material;
    d.setFog('frozen');
    expect(d.mesh.material).not.toBe(dBase);
    expect((d.mesh.material as THREE.MeshStandardMaterial).color.getHex()).toBe(FROST_GLASS_COLOR);
  });

  it('HeroMirror freezes onto the frost material and skips the RT pass while frozen', () => {
    const m = new HeroMirror({ x: 0, z: 0, rotY: 0 });
    const rtMaterial = (m as unknown as { rtMaterial: THREE.Material }).rtMaterial;
    m.setFog('frozen');
    expect(m.mesh.material).not.toBe(rtMaterial);
    expect((m.mesh.material as THREE.MeshStandardMaterial).color.getHex()).toBe(FROST_GLASS_COLOR);
    expect((m as unknown as { fogged: boolean }).fogged).toBe(true); // the update() early-out
    m.setFog('clear');
    expect(m.mesh.material).toBe(rtMaterial);
    expect((m as unknown as { fogged: boolean }).fogged).toBe(false);
  });

  it('the shared frost material is never disposed with the mirror', () => {
    const m = createMirrorMesh('standing');
    m.setFog('frozen');
    const frost = m.mesh.material as THREE.Material;
    const spy = vi.spyOn(frost, 'dispose');
    m.dispose();
    expect(spy).not.toHaveBeenCalled();
  });
});
