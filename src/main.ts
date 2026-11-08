// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { EYE_HEIGHT, FIXED_STEP } from './engine/constants';
import { InputCollector, keysToMoveInput } from './engine/input';
import { createAvatar, updateAvatar } from './game/avatar';
import { buildFloorScene } from './game/floorScene';
import { parseLook } from './game/look';
import { generateFloor, TIER_ONE } from './game/maze';
import { movePlayer, spawnPlayer, type PlayerState } from './game/player';
import { isValidSeed, normalizeSeed, randomSeed } from './game/seedCode';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const diagnostics = document.querySelector<HTMLElement>('#diagnostics')!;

const urlSeed = normalizeSeed(new URLSearchParams(window.location.search).get('seed') ?? '');
const seed = isValidSeed(urlSeed) ? urlSeed : randomSeed();
const floor = generateFloor({ ...TIER_ONE, seed });
let player: PlayerState = spawnPlayer(floor);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1026);
scene.fog = new THREE.Fog(0x0b1026, 2, 26);
scene.add(buildFloorScene(floor).group);
const look = parseLook(new URLSearchParams(window.location.search).get('look'));
const avatar = createAvatar(look);
scene.add(avatar);
const lantern = new THREE.PointLight(0xffd9a0, 22, 18, 1.8);
scene.add(lantern, new THREE.AmbientLight(0x3a3f55, 0.7));
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 60);

const input = new InputCollector();
input.attach(window);
canvas.addEventListener('click', () => {
  const lock = canvas.requestPointerLock() as unknown as { catch?: (cb: () => void) => void };
  lock?.catch?.(() => {});
});

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let accumulator = 0;
let last = performance.now();
let frames = 0;
let fpsClock = last;
let fps = 0;

function frame(now: number): void {
  const elapsed = Math.min(now - last, 250) / 1000;
  last = now;
  accumulator += elapsed;
  while (accumulator >= FIXED_STEP) {
    const inputFrame = keysToMoveInput(input.snapshotAndReset());
    player = movePlayer(player, inputFrame, floor.grid, FIXED_STEP);
    const inputActive = inputFrame.forward !== 0 || inputFrame.strafe !== 0 || inputFrame.turn !== 0;
    updateAvatar(avatar, player.x, player.y, player.heading, inputActive, now / 1000);
    accumulator -= FIXED_STEP;
  }
  camera.position.set(player.x, EYE_HEIGHT, player.y);
  camera.rotation.y = -player.heading;
  lantern.position.set(player.x, EYE_HEIGHT, player.y);
  renderer.render(scene, camera);

  frames++;
  if (now - fpsClock >= 250) {
    fps = Math.round((frames * 1000) / (now - fpsClock));
    frames = 0;
    fpsClock = now;
    diagnostics.textContent = `seed ${seed}  fps ${fps}\n` +
      `pos ${player.x.toFixed(1)}, ${player.y.toFixed(1)}  heading ${player.heading.toFixed(2)}`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__MIRROR_HOUSE_DEBUG__ = {
    getPlayer: () => ({ ...player }),
    seed,
    look: look.name,
  };
}
