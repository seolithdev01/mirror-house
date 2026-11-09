// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { EYE_HEIGHT, FIXED_STEP, FOG_COST, SHARD_BEACON } from './engine/constants';
import { InputCollector, keysToMoveInput, mouseOnlyInput, type InputMode } from './engine/input';
import { Dir } from './engine/grid';
import { createAvatar, updateAvatar } from './game/avatar';
import { generateFloorObjects, mirrorSpotFor, type MirrorRef } from './game/floorObjects';
import { createFloorRun, isAtExit, runElapsedMs } from './game/floorRun';
import { buildFloorScene } from './game/floorScene';
import { applyFog, fogTarget, initMirrorRuntime, isFogged, updateBreath } from './game/frost';
import { parseLook } from './game/look';
import { generateFloor, TIER_ONE } from './game/maze';
import { dailySeed, loadMeta, recordRun, saveMeta, todayStamp } from './game/meta';
import {
  createMirrorMesh,
  HeroMirror,
  mirrorSpots,
  type FogVisual,
  type MirrorFogState,
} from './game/mirror';
import { movePlayer, spawnPlayer, type PlayerState } from './game/player';
import { isValidSeed, normalizeSeed, randomSeed } from './game/seedCode';
import { buildFaqOverlay } from './ui/faq';
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

// M2 frost: deterministic floor objects + the 2 RT hero mirrors at the
// entrance/exit kept as standing mirrors. Their geometry comes from the pure
// `mirrorSpotFor` (identical to `mirrorSpots` — proven by T2's cross-check
// test), so binding a MirrorRef to its HeroMirror is a position match.
const objs = generateFloorObjects(floor);
const heroMirrors = mirrorSpots(floor).map((s) => new HeroMirror(s));
heroMirrors.forEach((m) => scene.add(m.mesh));
const heroRefs: MirrorRef[] = [];
for (const cell of [floor.entrance, floor.exit]) {
  const spot = mirrorSpotFor(floor.grid, cell.x, cell.y);
  if (spot)
    heroRefs.push({
      id: objs.mirrors.length + heroRefs.length,
      kind: 'standing',
      x: spot.x,
      z: spot.z,
      rotY: spot.rotY,
      cellX: cell.x,
      cellY: cell.y,
      pairId: null,
    });
}
const allMirrors = [...objs.mirrors, ...heroRefs];
const mirrorRuntime = initMirrorRuntime(allMirrors);

// Bind every mirror to a visual: HeroMirror when its spot matches by position
// proximity (same wall-mount convention; a floorObjects mirror can never sit
// closer than ~0.24m to a hero spot), else a cheap reflective-look mesh.
const MIRROR_MATCH_EPS = 0.05;
interface MirrorBinding {
  bind: FogVisual;
  hero: HeroMirror | null;
  state: MirrorFogState;
}
const visuals: MirrorBinding[] = allMirrors.map((m) => {
  const hero = heroMirrors.find(
    (h) => Math.hypot(h.mesh.position.x - m.x, h.mesh.position.z - m.z) < MIRROR_MATCH_EPS,
  );
  if (hero) return { bind: hero, hero, state: 'clear' as const };
  const { mesh, setFog } = createMirrorMesh(m.kind);
  mesh.position.set(m.x, 1.35, m.z);
  mesh.rotation.y = m.rotY;
  scene.add(mesh);
  return { bind: { setFog }, hero: null, state: 'clear' as const };
});

// Frost Lantern state (M2): breath meter + beacon capture. `pendingShards`
// awaits the T6 house state, which awards SHARD_BEACON per capture at clear.
let breath = 1;
const totalBeacons = allMirrors.filter((m) => m.kind === 'beacon').length;
let capturedBeacons = 0;
let pendingShards = 0;

function tryFrost(now: number): void {
  const target = fogTarget(allMirrors, player);
  if (!target || breath < FOG_COST) return;
  const rt = mirrorRuntime.find((r) => r.id === target.id);
  if (!rt) return;
  const wasCaptured = rt.captured;
  applyFog(mirrorRuntime, target.id, now);
  breath = updateBreath(breath, 0, true);
  if (!wasCaptured && rt.captured) {
    capturedBeacons++;
    pendingShards += SHARD_BEACON;
    hud.setChips({ beacons: { captured: capturedBeacons, total: totalBeacons }, shards: pendingShards });
  }
}

function syncFogVisuals(now: number): void {
  for (let i = 0; i < mirrorRuntime.length; i++) {
    const rt = mirrorRuntime[i]!;
    const v = visuals[i]!;
    const state: MirrorFogState = rt.captured ? 'captured' : isFogged(rt, now) ? 'fogged' : 'clear';
    if (state === v.state) continue;
    v.state = state;
    v.bind.setFog(state);
  }
}
const lantern = new THREE.PointLight(0xffd9a0, 22, 18, 1.8);
scene.add(lantern, new THREE.AmbientLight(0x3a3f55, 0.7));
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 60);

const input = new InputCollector();
input.attach(window);
let mode: InputMode = meta.mode;
const faq = buildFaqOverlay();
const hud = createHud({
  mode,
  onMode: (m) => {
    mode = m;
    hud.setMode(m);
    meta = { ...meta, mode: m };
    saveMeta(meta);
  },
  onFaq: () => faq.toggle(),
  onDaily: () => {
    const d = dailySeed(todayStamp());
    window.location.search = `?seed=${d}`;
  },
  onFrost: () => tryFrost(performance.now()),
});
hud.setChips({ beacons: { captured: capturedBeacons, total: totalBeacons }, shards: pendingShards });
canvas.addEventListener('click', () => {
  if (mode === 'hybrid') {
    const lock = canvas.requestPointerLock() as unknown as
      { catch?: (cb: () => void) => void } | undefined;
    lock?.catch?.(() => {});
  }
});
window.addEventListener('keydown', (e) => { if (e.code === 'KeyH' && !e.repeat) faq.toggle(); });
// Frost is a keydown press, not a held key (e.repeat guard) — same trigger as the HUD button.
window.addEventListener('keydown', (e) => { if (e.code === 'KeyF' && !e.repeat) tryFrost(performance.now()); });

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
    breath = updateBreath(breath, FIXED_STEP, false); // recharge per fixed step
    accumulator -= FIXED_STEP;
  }
  hud.setChips({
    timerMs: runElapsedMs(run, now),
    streak: meta.streak.count,
    bestMs: meta.best[seed] ?? null,
  });
  hud.setBreath(breath);
  syncFogVisuals(now);
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
  // mirrors update on alternate frames — perf budget (each costs one extra scene render);
  // fogged hero mirrors skip their RT pass entirely (matte material, no reflection)
  heroMirrors.forEach((m, i) => {
    const v = visuals.find((x) => x.hero === m);
    if (v?.state === 'clear' && frameIndex % 2 === i % 2) m.update(renderer, scene, camera);
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
    look: () => look.name,
    mode: () => mode,
    mirrors: heroMirrors.length,
    avatarPresent: true,
    streak: () => meta.streak.count,
    bestFor: (s: string) => meta.best[s] ?? null,
    breath: () => breath,
    beacons: () => ({ captured: capturedBeacons, total: totalBeacons }),
    fogTarget: () => fogTarget(allMirrors, player)?.id ?? null,
    mirrorRefs: () => allMirrors.map((m) => ({ ...m })),
    mirrorRuntime: () => mirrorRuntime.map((r) => ({ ...r })),
    canWalk: (x: number, y: number, d: number) => floor.grid.canWalk(x, y, d as Dir),
  };
}
