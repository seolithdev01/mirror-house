// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import type { AvatarLook } from './look';

export const AVATAR_LAYER = 1;

/** Low-poly Surveyor. Model faces -z at rotation.y = 0 (same convention as the camera at heading 0). */
export function createAvatar(look: AvatarLook): THREE.Group {
  const g = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: look.coat, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8b28f, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.85, 4, 8), coat);
  body.position.y = 0.85;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skin);
  head.position.y = 1.58;
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.5, 2, 6), coat);
  arm.position.set(0.34, 1.05, -0.1);
  arm.rotation.z = -0.45;
  const lanternBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.2, 0.14),
    new THREE.MeshStandardMaterial({ color: look.glass, emissive: look.glass, emissiveIntensity: 1.4 }),
  );
  lanternBox.position.set(0.44, 0.82, -0.24);
  g.add(body, head, arm, lanternBox);
  g.traverse((o) => o.layers.set(AVATAR_LAYER));
  return g;
}

export function updateAvatar(avatar: THREE.Group, x: number, y: number, heading: number, moving: boolean, t: number): void {
  avatar.position.set(x, moving ? Math.sin(t * 9) * 0.04 : 0, y);
  avatar.rotation.y = -heading;
}
