// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { EYE_HEIGHT, FIXED_STEP } from './engine/constants';
import { InputCollector, keysToMoveInput, mouseOnlyInput, type InputMode } from './engine/input';
import { createAvatar, updateAvatar } from './game/avatar';
import { createFloorRun, isAtExit, runElapsedMs } from './game/floorRun';
import { buildFloorScene } from './game/floorScene';
import { parseLook } from './game/look';
import { generateFloor, TIER_ONE } from './game/maze';
import { dailySeed, loadMeta, recordRun, saveMeta, todayStamp } from './game/meta';
import { HeroMirror, mirrorSpots } from './game/mirror';
import { movePlayer, spawnPlayer, type PlayerState } from './game/player';
import { isValidSeed, normalizeSeed, randomSeed } from './game/seedCode';
import { createHud } from './ui/hud';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const diagnostics = document.querySelector<HTMLElement>('#diagnostics')!;

const urlSeed = normalizeSeed(new URLSearchParams(window.location.search).get('seed') ?? '');
const seed = isValidSeed(urlSeed) ? urlSeed : randomSeed();
const floor = generateFloor({ ...TIER_ONE, seed });
let player: PlayerState = spawnPlayer(floor);
let meta = loadMeta();
const run = createFloorRun(seed);
const exitCenter = floor.grid.cellCenter(floor.exit.x, floor.exit.y);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1026);
scene.fog = new THREE.Fog(0x0b1026, 2, 26);
scene.add(buildFloorScene(floor).group);
const look = parseLook(new URLSearchParams(window.location.search).get('look'));
const avatar = createAvatar(look);
scene.add(avatar);
const mirrors = mirrorSpots(floor).map((s) => new HeroMirror(s));
mirrors.forEach((m) => scene.add(m.mesh));
const lantern = new THREE.PointLight(0xffd9a0, 22, 18, 1.8);
scene.add(lantern, new THREE.AmbientLight(0x3a3f55, 0.7));
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 60);

const input = new InputCollector();
input.attach(window);
let mode: InputMode = meta.mode;
const hud = createHud({
  mode,
  onMode: (m) => {
    mode = m;
    hud.setMode(m);
    meta = { ...meta, mode: m };
    saveMeta(meta);
  },
  onFaq: () => {},
  onDaily: () => {
    const d = dailySeed(todayStamp());
    window.location.search = `?seed=${d}`;
  },
});
canvas.addEventListener('click', () => {
  if (mode === 'hybrid') {
    const lock = canvas.requestPointerLock() as unknown as
      { catch?: (cb: () => void) => void } | undefined;
    lock?.catch?.(() => {});
  }
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
let frameIndex = 0;

function frame(now: number): void {
  const elapsed = Math.min(now - last, 250) / 1000;
  last = now;
  accumulator += elapsed;
  while (accumulator >= FIXED_STEP) {
    const inputFrame =
      mode === 'mouse'
        ? mouseOnlyInput(input.mouseState())
        : keysToMoveInput(input.snapshotAndReset(), mode);
    player = movePlayer(player, inputFrame, floor.grid, FIXED_STEP);
    const inputActive =
      inputFrame.forward !== 0 || inputFrame.strafe !== 0 || inputFrame.turn !== 0;
    if (run.startedAt === null && inputActive) run.startedAt = now;
    updateAvatar(avatar, player.x, player.y, player.heading, inputActive, now / 1000);
    accumulator -= FIXED_STEP;
  }
  hud.setChips({
    timerMs: runElapsedMs(run, now),
    streak: meta.streak.count,
    bestMs: meta.best[seed] ?? null,
  });
  if (
    run.clearedAt === null &&
    run.startedAt !== null &&
    isAtExit(player.x, player.y, exitCenter.cx, exitCenter.cy)
  ) {
    run.clearedAt = now;
    const ms = runElapsedMs(run, now);
    const wasBest = meta.best[seed];
    meta = recordRun(meta, seed, ms, todayStamp());
    saveMeta(meta);
    hud.showCleared(ms, meta.best[seed] ?? null, wasBest === undefined || ms < wasBest);
  }
  camera.position.set(player.x, EYE_HEIGHT, player.y);
  camera.rotation.y = -player.heading;
  lantern.position.set(player.x, EYE_HEIGHT, player.y);
  // mirrors update on alternate frames — perf budget (each costs one extra scene render)
  mirrors.forEach((m, i) => {
    if (frameIndex % 2 === i % 2) m.update(renderer, scene, camera);
  });
  frameIndex++;
  renderer.render(scene, camera);

  frames++;
  if (now - fpsClock >= 250) {
    fps = Math.round((frames * 1000) / (now - fpsClock));
    frames = 0;
    fpsClock = now;
    diagnostics.textContent =
      `seed ${seed}  fps ${fps}\n` +
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
    mirrors: mirrors.length,
  };
}
