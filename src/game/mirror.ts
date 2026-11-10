// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import {
  CELL_SIZE,
  CRACK_TINT,
  DOOR_SLIDE_M,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from '../engine/constants';
import { Dir, DIR_VECTOR } from '../engine/grid';
import type { Floor } from './maze';
import type { MirrorKind } from './floorObjects';
import type { MirrorVisual } from './frost';
import { AVATAR_LAYER } from './avatar';
import { canvasTexture, makePortraitCanvas, portraitSpec, PORTRAIT_GLASS } from './textures';

export interface MirrorSpot {
  x: number;
  z: number;
  rotY: number;
}

/** Fog visual state shared by RT hero mirrors and cheap mirror meshes (M2 frost).
 *  Aliased to frost's `MirrorVisual` rather than re-declared: the renderer and
 *  the sight logic must not be able to drift into disagreement. */
export type MirrorFogState = MirrorVisual;

/** Anything whose material can be swapped for the frost visual (hero or cheap). */
export interface FogVisual {
  setFog(state: MirrorFogState): void;
}

/** A mirror that can show the sprint-crack tint (T6 house anger). Reversible:
 *  a floor restart un-cracks every mirror, so the original tint is restored. */
export interface CrackVisual {
  setCracked(cracked: boolean): void;
}

// Shared swap targets — fogged glass goes matte (a perf win: fogging removes
// reflective work); a captured beacon additionally carries the teal emissive,
// pulse-free. Shared instances: never disposed per mirror. M6/T1 — venue
// floors recolor their beacon emissive with the pack's secondary accent, so
// the captured swap material is a per-accent cache (one live material per
// color, still never disposed per mirror).
const BEACON_TEAL = 0x2ec4b6;
const foggedMaterial = new THREE.MeshStandardMaterial({ color: 0x39415f, roughness: 1 });
const capturedMaterials = new Map<number, THREE.MeshStandardMaterial>();
function capturedMaterialFor(accent: number): THREE.MeshStandardMaterial {
  let m = capturedMaterials.get(accent);
  if (m === undefined) {
    m = new THREE.MeshStandardMaterial({
      color: 0x39415f,
      roughness: 1,
      emissive: accent,
      emissiveIntensity: 0.6,
    });
    capturedMaterials.set(accent, m);
  }
  return m;
}

/** Deterministic wall-mounted spots: first walled direction of the entrance and exit cells. */
export function mirrorSpots(floor: Floor): MirrorSpot[] {
  const spots: MirrorSpot[] = [];
  for (const cell of [floor.entrance, floor.exit]) {
    for (const d of [Dir.North, Dir.East, Dir.South, Dir.West] as const) {
      if (floor.grid.hasWall(cell.x, cell.y, d)) {
        const { cx, cy } = floor.grid.cellCenter(cell.x, cell.y);
        const v = DIR_VECTOR[d]!;
        spots.push({
          x: cx + v.dx * (CELL_SIZE / 2 - 0.12),
          z: cy + v.dy * (CELL_SIZE / 2 - 0.12),
          rotY: Math.atan2(-v.dx, -v.dy), // plane normal (+z rotated) faces back into the cell
        });
        break;
      }
    }
  }
  return spots;
}

/**
 * Cheap standing/beacon/true/silvered mirror: reflective-look material (no RT
 * pass). Beacons add the teal emissive so objectives read at a glance; a
 * venue floor (M6/T1) passes `beaconAccent` to recolor that emissive with the
 * pack's secondary. The caller positions/rotates `mesh` from the MirrorRef spot.
 */
export interface CheapMirror extends FogVisual, CrackVisual {
  readonly mesh: THREE.Mesh;
  /** M4/T2 floor teardown — per-instance resources only (shared swap
   *  materials stay alive for the next floor). */
  dispose(): void;
}

const MIRROR_BASE_COLOR = 0x8fb8c8;

export function createMirrorMesh(
  kind: MirrorKind,
  beaconAccent: number = BEACON_TEAL,
): CheapMirror {
  const base = new THREE.MeshStandardMaterial({
    color: MIRROR_BASE_COLOR,
    metalness: 0.9,
    roughness: 0.15,
    ...(kind === 'beacon' ? { emissive: beaconAccent, emissiveIntensity: 0.25 } : {}),
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.4), base);
  let state: MirrorFogState = 'clear';
  return {
    mesh,
    setFog(next: MirrorFogState): void {
      if (next === state) return;
      state = next;
      mesh.material =
        next === 'captured'
          ? capturedMaterialFor(beaconAccent)
          : next === 'fogged'
            ? foggedMaterial
            : base;
    },
    // Tint only the per-instance base material — the fogged/captured materials
    // are shared, and a crack outlives frost anyway (it shows once fog lifts).
    setCracked(cracked: boolean): void {
      base.color.setHex(cracked ? CRACK_TINT : MIRROR_BASE_COLOR);
    },
    // M4/T2 floor teardown: free the per-instance geometry and base material.
    // The shared fogged/captured materials are never touched (mesh.material may
    // point at them, but `base` is the only instance-owned one).
    dispose(): void {
      mesh.geometry.dispose();
      base.dispose();
    },
  };
}

/** M5/T4 — the no-RT hero: the standing hero spot rendered as a cheap
 *  reflective-look mirror (the low preset's path — heroRt false). Same
 *  placement convention as the HeroMirror constructor (y 1.35, the spot's
 *  rotation), the same fake material the floor's standing mirrors wear, and
 *  the full fog/crack interface via createMirrorMesh — so buildFloor binds
 *  it exactly like an RT hero. True mirrors NEVER take this path: their RT
 *  is gameplay-critical visibility (the step-through pair), so they keep
 *  their 256px render target on every preset. */
export function createHeroStandIn(spot: MirrorSpot): CheapMirror {
  const cm = createMirrorMesh('standing');
  cm.mesh.position.set(spot.x, 1.35, spot.z);
  cm.mesh.rotation.y = spot.rotY;
  return cm;
}

/** T2 — the ancestor portrait: the standing-mirror base (same 1.5×2.4 plane,
 *  same fake-reflective family, same fog/crack interface) wearing amber
 *  glass with a dim procedural silhouette baked per mirror id (portraitSpec
 *  → makePortraitCanvas; node/no-canvas falls back to plain amber glass).
 *  Fogged swaps to the shared matte exactly like standing glass — the
 *  ancestor vanishes when the pane does. */
export function createPortraitMirror(id: number): CheapMirror {
  const texture = canvasTexture(makePortraitCanvas(portraitSpec(id)), 1, 1);
  const base = new THREE.MeshStandardMaterial({
    ...(texture ? { map: texture, color: 0xffffff } : { color: PORTRAIT_GLASS }),
    metalness: 0.6,
    roughness: 0.25,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.4), base);
  let state: MirrorFogState = 'clear';
  return {
    mesh,
    setFog(next: MirrorFogState): void {
      if (next === state) return;
      state = next;
      // Portraits never capture (not beacons): any non-clear state is the
      // matte fogged swap.
      mesh.material = next === 'clear' ? base : foggedMaterial;
    },
    setCracked(cracked: boolean): void {
      base.color.setHex(cracked ? CRACK_TINT : texture ? 0xffffff : PORTRAIT_GLASS);
    },
    dispose(): void {
      mesh.geometry.dispose();
      base.dispose();
      texture?.dispose(); // per-instance silhouette — the shared matte survives
    },
  };
}

/** T4/T3 — the distorting mirror: the carnival glass. The standing-mirror
 *  base (same 1.5×2.4 plane family, same fog/crack interface) wearing the
 *  tier's rose tint and a STATIC vertex-wave bend — the plane's own vertices
 *  are displaced once at creation by a gentle sine along both axes, so the
 *  pane reads warped with zero per-frame animation (reduced-flash safe; the
 *  geometry never changes again). Fogged swaps to the shared matte exactly
 *  like standing glass — a fogged pane stops lying about where you stand. */
export const DISTORT_ROSE = 0xc2548a; // the Carnival's rose (palette.ts tier-4 teal→magenta accent)

export function createDistortMirror(): CheapMirror {
  const geo = new THREE.PlaneGeometry(1.5, 2.4, 6, 10);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // the bend: a gentle wave along the pane's height, skewed by its width —
    // the funhouse ripple, frozen into the geometry
    pos.setZ(i, Math.sin(y * 2.2 + x * 0.9) * 0.07);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals(); // the warped plane shades like warped glass
  const base = new THREE.MeshStandardMaterial({
    color: DISTORT_ROSE,
    metalness: 0.7,
    roughness: 0.3,
  });
  const mesh = new THREE.Mesh(geo, base);
  let state: MirrorFogState = 'clear';
  return {
    mesh,
    setFog(next: MirrorFogState): void {
      if (next === state) return;
      state = next;
      // Distort mirrors never capture (not beacons): any non-clear state is
      // the matte fogged swap.
      mesh.material = next === 'clear' ? base : foggedMaterial;
    },
    setCracked(cracked: boolean): void {
      base.color.setHex(cracked ? CRACK_TINT : DISTORT_ROSE);
    },
    dispose(): void {
      geo.dispose();
      base.dispose();
    },
  };
}

/** Options for the RT mirror classes of visuals: heroes render at 512, the
 *  true-mirror step-through pairs (T7) reuse the class at 256 with a gold
 *  frame so the passage reads at a glance. */
export interface HeroMirrorOptions {
  /** RT texture resolution per side (default 512 — the entrance/exit heroes). */
  size?: number;
  /** Thin gold box behind the glass — the true-mirror passage marker. */
  frame?: boolean;
  /** RT material tint (default 0xcfe8ea). */
  tint?: number;
}

export class HeroMirror implements FogVisual, CrackVisual {
  readonly mesh: THREE.Mesh;
  private readonly rt: THREE.WebGLRenderTarget;
  private readonly rtMaterial: THREE.MeshBasicMaterial;
  private readonly cam = new THREE.PerspectiveCamera();
  private readonly plane: THREE.Plane;
  private readonly target = new THREE.Vector3();
  private readonly baseTint: number;
  private fogged = false;

  constructor(spot: MirrorSpot, opts: HeroMirrorOptions = {}) {
    const { size = 512, frame = false, tint = 0xcfe8ea } = opts;
    this.rt = new THREE.WebGLRenderTarget(size, size);
    this.rtMaterial = new THREE.MeshBasicMaterial({ map: this.rt.texture, color: tint });
    this.baseTint = tint;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.4), this.rtMaterial);
    this.mesh.position.set(spot.x, 1.35, spot.z);
    this.mesh.rotation.y = spot.rotY;
    if (frame) {
      const framing = new THREE.Mesh(
        new THREE.BoxGeometry(1.66, 2.56, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.8, roughness: 0.35 }),
      );
      framing.position.z = -0.04; // just behind the glass (local +z is the facing normal)
      this.mesh.add(framing);
    }
    const normal = new THREE.Vector3(Math.sin(spot.rotY), 0, Math.cos(spot.rotY));
    this.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, this.mesh.position);
    this.cam.layers.enable(AVATAR_LAYER); // the avatar is visible ONLY here and in other mirror passes
  }

  /** Swap to the matte fog material while fogged; restore the RT material after. */
  setFog(state: MirrorFogState): void {
    this.fogged = state !== 'clear';
    this.mesh.material = this.fogged ? foggedMaterial : this.rtMaterial;
  }

  /** Tint the RT material — the reflection itself goes dark, cracks included. */
  setCracked(cracked: boolean): void {
    this.rtMaterial.color.setHex(cracked ? CRACK_TINT : this.baseTint);
  }

  update(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    mainCam: THREE.PerspectiveCamera,
  ): void {
    if (this.fogged) return; // matte glass shows no reflection — skip the RT pass entirely
    const pos = new THREE.Vector3();
    mainCam.getWorldPosition(pos);
    const d = this.plane.distanceToPoint(pos);
    mainCam.getWorldDirection(this.target).add(pos); // a point ahead of the camera
    const td = this.plane.distanceToPoint(this.target);

    this.cam.position.copy(pos).addScaledVector(this.plane.normal, -2 * d); // mirrored eye
    const mirroredTarget = this.target.clone().addScaledVector(this.plane.normal, -2 * td);
    this.cam.up.set(0, 1, 0); // wall normals are horizontal, so up is unchanged
    this.cam.lookAt(mirroredTarget);
    this.cam.projectionMatrix.copy(mainCam.projectionMatrix);

    const prevClipping = renderer.clippingPlanes;
    const wasVisible = this.mesh.visible;
    this.mesh.visible = false; // no feedback loop
    renderer.clippingPlanes = [this.plane]; // render only the room side; if the RT comes out empty, plane.negate() is the fix
    renderer.setRenderTarget(this.rt);
    renderer.render(scene, this.cam);
    renderer.setRenderTarget(null);
    renderer.clippingPlanes = prevClipping;
    this.mesh.visible = wasVisible;
  }

  dispose(): void {
    // M5/T5 — the M4-review leak closed: the per-instance RT MATERIAL and the
    // true-mirror frame's material are freed with their geometries. The
    // shared fogged/captured swap materials are never touched (setFog may have
    // parked mesh.material on one of them; they outlive this mirror).
    this.rt.dispose();
    this.rtMaterial.dispose();
    this.mesh.geometry.dispose();
    for (const child of this.mesh.children) {
      const frame = child as THREE.Mesh;
      frame.geometry.dispose();
      (frame.material as THREE.Material).dispose(); // the true-mirror gold frame
    }
  }
}

/** A silvered push-door (T7): a wall-sized slab (the same box geometry the
 *  instanced walls use, in mirror-look material) carrying the glass plane on
 *  its cell-facing side. `setSlide(0..1)` slides the whole slab DOOR_SLIDE_M
 *  along its wall — main.ts drives the lerp from the frame loop and hides the
 *  wall instance underneath (floorScene's hideWallEdge) as the door opens. */
export interface SilveredDoor {
  readonly group: THREE.Group;
  /** The glass plane — binds into the shared fog/crack visual array. */
  readonly mirror: CheapMirror;
  setSlide(t: number): void; // 0 closed, 1 fully slid; positions are precomputed
  /** M4/T2 floor teardown — slab + glass, skipping the shared materials. */
  dispose(): void;
}

export function createSilveredDoor(spot: MirrorSpot, wallDir: Dir): SilveredDoor {
  const v = DIR_VECTOR[wallDir]!;
  const alongX = v.dy !== 0; // N/S walls run along X; E/W walls along Z
  const slab = new THREE.Mesh(
    alongX
      ? new THREE.BoxGeometry(CELL_SIZE + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS)
      : new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE + WALL_THICKNESS),
    new THREE.MeshStandardMaterial({ color: MIRROR_BASE_COLOR, metalness: 0.9, roughness: 0.15 }),
  );
  slab.position.y = WALL_HEIGHT / 2;
  const mirror = createMirrorMesh('silvered');
  mirror.mesh.position.set(-v.dx * 0.12, 1.35, -v.dy * 0.12); // glass faces into the cell
  mirror.mesh.rotation.y = spot.rotY;
  const group = new THREE.Group();
  group.add(slab, mirror.mesh);
  const wallX = spot.x + v.dx * 0.12; // the mirror sits 0.12 off the wall plane
  const wallZ = spot.z + v.dy * 0.12;
  group.position.set(wallX, 0, wallZ);
  const axisX = alongX ? 1 : 0;
  const axisZ = alongX ? 0 : 1;
  return {
    group,
    mirror,
    setSlide(t: number): void {
      const k = Math.min(1, Math.max(0, t));
      group.position.set(wallX + axisX * DOOR_SLIDE_M * k, 0, wallZ + axisZ * DOOR_SLIDE_M * k);
    },
    dispose(): void {
      mirror.dispose();
      slab.geometry.dispose();
      (slab.material as THREE.MeshStandardMaterial).dispose();
    },
  };
}
