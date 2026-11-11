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
    new THREE.MeshStandardMaterial({
      color: look.glass,
      emissive: look.glass,
      emissiveIntensity: 1.4,
    }),
  );
  lanternBox.position.set(0.44, 0.82, -0.24);
  g.add(body, head, arm, lanternBox);
  g.traverse((o) => o.layers.set(AVATAR_LAYER));
  return g;
}

/** T5/T2 — the mirror-you decoy: the Surveyor's construction rebuilt EXACTLY
 *  (same geometry, same proportions, same coat/glass colors from the live
 *  look) on layer 0 — identical is the point: the copy stands in the world
 *  AND inside every mirror pass, like Chhaya and the Sentinels, so a player
 *  who meets one sees themself. A per-copy figure — dispose() frees the
 *  geometry and the two materials, which belong to the copy alone. */
export interface DecoyFigure {
  group: THREE.Group;
  dispose: () => void;
}

export function createDecoy(look: AvatarLook): DecoyFigure {
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
    new THREE.MeshStandardMaterial({
      color: look.glass,
      emissive: look.glass,
      emissiveIntensity: 1.4,
    }),
  );
  lanternBox.position.set(0.44, 0.82, -0.24);
  g.add(body, head, arm, lanternBox);
  g.traverse((o) => o.layers.set(0)); // a copy made flesh — never AVATAR_LAYER
  return {
    group: g,
    dispose: () => {
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      coat.dispose();
      skin.dispose();
      lanternBox.material.dispose();
    },
  };
}

/** Chhaya — the six-second shadow. The Surveyor's silhouette rebuilt in a
 *  near-black coat and dim rose lantern glass, on layer 0: she stands in the
 *  world AND inside every mirror pass (only the player's own avatar hides on
 *  AVATAR_LAYER). Same geometry construction as createAvatar; no look — she
 *  wears what she is. */
export function createChhaya(): THREE.Group {
  const g = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.8 });
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
    new THREE.MeshStandardMaterial({
      color: 0x8a3a5c,
      emissive: 0x8a3a5c,
      emissiveIntensity: 1.4,
    }),
  );
  lanternBox.position.set(0.44, 0.82, -0.24);
  g.add(body, head, arm, lanternBox);
  g.traverse((o) => o.layers.set(0)); // shadow made flesh — never AVATAR_LAYER
  return g;
}

/** Taal — the beat-walker (M4/T3). The Surveyor's silhouette rebuilt in an
 *  obsidian coat (0x1a1a22) with a gold lantern, on layer 0: he stands in
 *  the world AND inside every mirror pass, like Chhaya. setBeat(pulse)
 *  drives the lantern glass's emissive with the same beatPulse that paces
 *  his stride; under reduced-flash (M5/T1) main feeds it one constant from
 *  taal.ts's beatGlow — the beat lives in his stride, never in his light.
 *  A per-floor figure (floor 5 only) — dispose() frees the geometry and his
 *  three materials, which belong to him alone. */
export interface TaalFigure {
  group: THREE.Group;
  setBeat: (pulse: number) => void;
  dispose: () => void;
}

export function createTaal(): TaalFigure {
  const g = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8b28f, roughness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xd9a441,
    emissive: 0xd9a441,
    emissiveIntensity: 1.4, // resting glow — the frame loop's setBeat takes over
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.85, 4, 8), coat);
  body.position.y = 0.85;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skin);
  head.position.y = 1.58;
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.5, 2, 6), coat);
  arm.position.set(0.34, 1.05, -0.1);
  arm.rotation.z = -0.45;
  const lanternBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), glass);
  lanternBox.position.set(0.44, 0.82, -0.24);
  g.add(body, head, arm, lanternBox);
  g.traverse((o) => o.layers.set(0)); // the beat is diegetic — never AVATAR_LAYER
  return {
    group: g,
    setBeat: (pulse: number) => {
      // flare 2.2 on the accent, dim 0.3 on the rest — or the constant
      // beatGlow feeds when the player asked for reduced flashing (M5/T1)
      glass.emissiveIntensity = pulse;
    },
    dispose: () => {
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      coat.dispose();
      skin.dispose();
      glass.dispose();
    },
  };
}

/** Gher — the Encircler (T3/T2). The Surveyor's silhouette rebuilt in a moss
 *  coat (0x2f4a3a) with still-water glass (0x7fd4c4), on layer 0: he stands
 *  in the world AND inside every mirror pass, like Chhaya and Taal. No beat
 *  behavior — where Taal's lantern flares on the accent, Gher's glass holds
 *  one constant glow (the still-water look): his stride is a glide, and so
 *  is his light. A per-floor figure (every tier-3 floor) — dispose() frees
 *  the geometry and his three materials, which belong to him alone. */
export interface GherFigure {
  group: THREE.Group;
  dispose: () => void;
}

export function createGher(): GherFigure {
  const g = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: 0x2f4a3a, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8b28f, roughness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x7fd4c4,
    emissive: 0x7fd4c4,
    emissiveIntensity: 1.4, // the still-water glow — constant, no setBeat
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.85, 4, 8), coat);
  body.position.y = 0.85;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skin);
  head.position.y = 1.58;
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.5, 2, 6), coat);
  arm.position.set(0.34, 1.05, -0.1);
  arm.rotation.z = -0.45;
  const lanternBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), glass);
  lanternBox.position.set(0.44, 0.82, -0.24);
  g.add(body, head, arm, lanternBox);
  g.traverse((o) => o.layers.set(0)); // the seal is diegetic — never AVATAR_LAYER
  return {
    group: g,
    dispose: () => {
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      coat.dispose();
      skin.dispose();
      glass.dispose();
    },
  };
}

/** Aavart — the Ambusher (T4/T2). The Surveyor's silhouette rebuilt in a
 *  magenta coat (0x5c2a4a) with candle-flame glass (0xffb347), on layer 0:
 *  he stands in the world AND inside every mirror pass, like the other
 *  Sentinels. No beat behavior — where Taal's lantern flares on the accent,
 *  Aavart's candle-flame holds one constant glow: his stride is a glide (the
 *  fastest of the three), and so is his light. A per-floor figure (every
 *  tier-4 floor) — dispose() frees the geometry and his three materials,
 *  which belong to him alone. */
export interface AavartFigure {
  group: THREE.Group;
  dispose: () => void;
}

export function createAavart(): AavartFigure {
  const g = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: 0x5c2a4a, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8b28f, roughness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xffb347,
    emissive: 0xffb347,
    emissiveIntensity: 1.4, // the candle-flame glow — constant, no setBeat
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.85, 4, 8), coat);
  body.position.y = 0.85;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skin);
  head.position.y = 1.58;
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.5, 2, 6), coat);
  arm.position.set(0.34, 1.05, -0.1);
  arm.rotation.z = -0.45;
  const lanternBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), glass);
  lanternBox.position.set(0.44, 0.82, -0.24);
  g.add(body, head, arm, lanternBox);
  g.traverse((o) => o.layers.set(0)); // the ambush is diegetic — never AVATAR_LAYER
  return {
    group: g,
    dispose: () => {
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      coat.dispose();
      skin.dispose();
      glass.dispose();
    },
  };
}

export function updateAvatar(
  avatar: THREE.Group,
  x: number,
  y: number,
  heading: number,
  moving: boolean,
  t: number,
): void {
  avatar.position.set(x, moving ? Math.sin(t * 9) * 0.04 : 0, y);
  avatar.rotation.y = -heading;
}
