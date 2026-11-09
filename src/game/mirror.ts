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
import { AVATAR_LAYER } from './avatar';

export interface MirrorSpot { x: number; z: number; rotY: number }

/** Fog visual state shared by RT hero mirrors and cheap mirror meshes (M2 frost). */
export type MirrorFogState = 'clear' | 'fogged' | 'captured';

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
// pulse-free. Shared instances: never disposed per mirror.
const foggedMaterial = new THREE.MeshStandardMaterial({ color: 0x39415f, roughness: 1 });
const capturedMaterial = new THREE.MeshStandardMaterial({
  color: 0x39415f,
  roughness: 1,
  emissive: 0x2ec4b6,
  emissiveIntensity: 0.6,
});

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
 * pass). Beacons add the teal emissive so objectives read at a glance. The
 * caller positions/rotates `mesh` from the MirrorRef spot.
 */
export interface CheapMirror extends FogVisual, CrackVisual {
  readonly mesh: THREE.Mesh;
}

const MIRROR_BASE_COLOR = 0x8fb8c8;

export function createMirrorMesh(kind: MirrorKind): CheapMirror {
  const base = new THREE.MeshStandardMaterial({
    color: MIRROR_BASE_COLOR,
    metalness: 0.9,
    roughness: 0.15,
    ...(kind === 'beacon' ? { emissive: 0x2ec4b6, emissiveIntensity: 0.25 } : {}),
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.4), base);
  let state: MirrorFogState = 'clear';
  return {
    mesh,
    setFog(next: MirrorFogState): void {
      if (next === state) return;
      state = next;
      mesh.material = next === 'captured' ? capturedMaterial : next === 'fogged' ? foggedMaterial : base;
    },
    // Tint only the per-instance base material — the fogged/captured materials
    // are shared, and a crack outlives frost anyway (it shows once fog lifts).
    setCracked(cracked: boolean): void {
      base.color.setHex(cracked ? CRACK_TINT : MIRROR_BASE_COLOR);
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

  update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, mainCam: THREE.PerspectiveCamera): void {
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
    this.rt.dispose();
    this.mesh.geometry.dispose();
    for (const child of this.mesh.children) (child as THREE.Mesh).geometry.dispose(); // the true-mirror gold frame
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
  };
}
