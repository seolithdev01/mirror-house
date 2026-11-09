// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS } from '../engine/constants';
import type { WallSegment } from '../engine/grid';
import type { Floor } from './maze';
import { TIER_ONE_PALETTE, type TierPalette } from './palette';
import { canvasTexture, makeFloorTexture, makeWallTexture } from './textures';

export interface FloorSceneResult {
  group: THREE.Group;
  wallInstanceCount: number;
  /** The exit marker mesh, exposed so main.ts can re-tint it for the beacon gate. */
  exitMarker: THREE.Mesh;
}

function instancedWalls(segs: WallSegment[], horizontal: boolean, mat: THREE.MeshStandardMaterial): THREE.InstancedMesh {
  const geo = horizontal
    ? new THREE.BoxGeometry(CELL_SIZE + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS)
    : new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE + WALL_THICKNESS);
  const mesh = new THREE.InstancedMesh(geo, mat, segs.length);
  const m = new THREE.Matrix4();
  segs.forEach((s, i) => {
    m.makeTranslation((s.x1 + s.x2) / 2, WALL_HEIGHT / 2, (s.y1 + s.y2) / 2); // grid y -> world z
    mesh.setMatrixAt(i, m);
  });
  return mesh;
}

function marker(x: number, y: number, color: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.1, 0.6),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.0 }),
  );
  mesh.position.set(x, 0.06, y);
  return mesh;
}

export function buildFloorScene(floor: Floor, palette: TierPalette = TIER_ONE_PALETTE): FloorSceneResult {
  const segs = floor.grid.wallSegments();
  const horizontal = segs.filter((s) => s.y1 === s.y2);
  const vertical = segs.filter((s) => s.x1 === s.x2);
  const group = new THREE.Group();

  const planeW = floor.grid.width * CELL_SIZE;
  const planeH = floor.grid.height * CELL_SIZE;
  const floorMap = canvasTexture(makeFloorTexture(), floor.grid.width / 6, floor.grid.height / 6);
  const floorPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(planeW, planeH),
    floorMap
      ? new THREE.MeshStandardMaterial({ color: 0xffffff, map: floorMap, roughness: 1 })
      : new THREE.MeshStandardMaterial({ color: palette.floorBase, roughness: 1 }),
  );
  floorPlane.rotation.x = -Math.PI / 2;
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(planeW, planeH),
    new THREE.MeshStandardMaterial({ color: palette.void, roughness: 1 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;

  const wallCanvas = makeWallTexture();
  const wallMat = wallCanvas
    ? new THREE.MeshStandardMaterial({ map: canvasTexture(wallCanvas, 1, 1), roughness: 0.95 })
    : new THREE.MeshStandardMaterial({ color: palette.wallBottom, roughness: 0.9, metalness: 0.1 });

  const en = floor.grid.cellCenter(floor.entrance.x, floor.entrance.y);
  const ex = floor.grid.cellCenter(floor.exit.x, floor.exit.y);

  group.add(floorPlane, ceiling);
  group.add(instancedWalls(horizontal, true, wallMat), instancedWalls(vertical, false, wallMat));
  const exitMarker = marker(ex.cx, ex.cy, palette.exit);
  group.add(marker(en.cx, en.cy, palette.entrance), exitMarker);

  return { group, wallInstanceCount: segs.length, exitMarker };
}
