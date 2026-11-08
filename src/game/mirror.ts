// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { CELL_SIZE } from '../engine/constants';
import { Dir, DIR_VECTOR } from '../engine/grid';
import type { Floor } from './maze';
import { AVATAR_LAYER } from './avatar';

export interface MirrorSpot { x: number; z: number; rotY: number }

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

export class HeroMirror {
  readonly mesh: THREE.Mesh;
  private readonly rt: THREE.WebGLRenderTarget;
  private readonly cam = new THREE.PerspectiveCamera();
  private readonly plane: THREE.Plane;
  private readonly target = new THREE.Vector3();

  constructor(spot: MirrorSpot, tint = 0xcfe8ea) {
    this.rt = new THREE.WebGLRenderTarget(512, 512);
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 2.4),
      new THREE.MeshBasicMaterial({ map: this.rt.texture, color: tint }),
    );
    this.mesh.position.set(spot.x, 1.35, spot.z);
    this.mesh.rotation.y = spot.rotY;
    const normal = new THREE.Vector3(Math.sin(spot.rotY), 0, Math.cos(spot.rotY));
    this.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, this.mesh.position);
    this.cam.layers.enable(AVATAR_LAYER); // the avatar is visible ONLY here and in other mirror passes
  }

  update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, mainCam: THREE.PerspectiveCamera): void {
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
  }
}
