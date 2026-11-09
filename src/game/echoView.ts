// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import type { EchoState } from './echo';

// Shared translucent glass material — never disposed per echo (same pattern
// as mirror.ts's fogged/captured materials).
const glass = new THREE.MeshStandardMaterial({
  color: 0x9fc4d4,
  transparent: true,
  opacity: 0.42,
  roughness: 0.15,
  metalness: 0.55,
});

/** A peeled reflection: translucent glass figure ~1.6 m tall on layer 0 —
 *  visible to the player AND inside every mirror pass (the hero-mirror RT
 *  cameras render layer 0; only the player's own avatar hides on
 *  AVATAR_LAYER). Model faces −z at rotation 0, like the avatar. */
export function createEchoMesh(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.85, 4, 8), glass);
  body.position.y = 0.85;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), glass);
  head.position.y = 1.58;
  g.add(body, head);
  g.traverse((o) => o.layers.set(0));
  return g;
}

export function syncEchoMesh(mesh: THREE.Group, e: EchoState): void {
  mesh.position.set(e.x, 0, e.y);
  mesh.rotation.y = -e.heading; // same heading convention as the avatar
}

/** M4/T2 floor teardown: free the per-figure geometries. The glass material is
 *  shared across every echo (and every floor) — never disposed here. */
export function disposeEchoMesh(mesh: THREE.Group): void {
  mesh.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
  });
}
