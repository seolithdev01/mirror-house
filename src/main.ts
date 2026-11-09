// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import {
  ANGER_MAX,
  CHHAYA_DELAY_MS,
  CONTACT_RADIUS,
  DOOR_SLIDE_MS,
  EYE_HEIGHT,
  EXIT_LOCKED_EMISSIVE,
  FAIL_FREEZE_MS,
  FIXED_STEP,
  FOG_COST,
  SHARD_BEACON,
} from './engine/constants';
import { InputCollector, keysToMoveInput, mouseOnlyInput, type InputMode } from './engine/input';
import { Dir } from './engine/grid';
import { createAvatar, createChhaya, updateAvatar } from './game/avatar';
import { bracketSamples, recordPath, sampleDelayed, type PathSample } from './game/chhaya';
import { initEchoes, updateEcho } from './game/echo';
import { createEchoMesh, syncEchoMesh } from './game/echoView';
import { generateFloorObjects, mirrorSpotFor, type MirrorRef } from './game/floorObjects';
import { createFloorRun, isAtExit, runElapsedMs } from './game/floorRun';
import { buildFloorScene } from './game/floorScene';
import { applyFog, fogTarget, initMirrorRuntime, isFogged, updateBreath } from './game/frost';
import {
  applyCrack,
  beaconsCaptured,
  crackTarget,
  exitUnlocked,
  initHouseState,
  isCollapse,
  shardsForClear,
} from './game/houseState';
import { parseLook } from './game/look';
import { generateFloor, TIER_ONE } from './game/maze';
import { awardShards, dailySeed, loadMeta, recordRun, saveMeta, todayStamp } from './game/meta';
import {
  createMirrorMesh,
  createSilveredDoor,
  HeroMirror,
  mirrorSpots,
  type CrackVisual,
  type FogVisual,
  type MirrorFogState,
  type SilveredDoor,
} from './game/mirror';
import { tryPushDoor, tryTeleport } from './game/passages';
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
let run = createFloorRun(seed); // re-armed (fresh) by resetFloor after a fail
const exitCenter = floor.grid.cellCenter(floor.exit.x, floor.exit.y);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1026);
scene.fog = new THREE.Fog(0x0b1026, 2, 26);
const sceneBuilt = buildFloorScene(floor);
scene.add(sceneBuilt.group);
// Beacon gate: the stair door burns dim red until every beacon is frosted,
// then returns to its built gold. Tint the material the scene was built with.
const exitMarkerMat = sceneBuilt.exitMarker.material as THREE.MeshStandardMaterial;
const exitUnlockedTint = exitMarkerMat.emissive.getHex();
function setExitLocked(locked: boolean): void {
  const hex = locked ? EXIT_LOCKED_EMISSIVE : exitUnlockedTint;
  exitMarkerMat.emissive.setHex(hex);
  exitMarkerMat.color.setHex(hex);
}
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
      wallDir: spot.dir,
    });
}
const allMirrors = [...objs.mirrors, ...heroRefs];
let mirrorRuntime = initMirrorRuntime(allMirrors); // re-init by resetFloor after a fail

// Bind every mirror to a visual: HeroMirror when its spot matches by position
// proximity (same wall-mount convention; a floorObjects mirror can never sit
// closer than ~0.24m to a hero spot), else a cheap reflective-look mesh.
// T7 passages: the true pair gets its own 256px RT HeroMirrors with a gold
// frame, and each silvered mirror becomes a wall-sized slab door that slides.
const MIRROR_MATCH_EPS = 0.05;
interface MirrorBinding {
  bind: FogVisual & CrackVisual;
  hero: HeroMirror | null;
  state: MirrorFogState;
}
const trueMirrors: HeroMirror[] = []; // RT step-through pairs — updated like the heroes
const silveredDoors: Array<{ ref: MirrorRef; door: SilveredDoor }> = [];
const visuals: MirrorBinding[] = allMirrors.map((m) => {
  const hero = heroMirrors.find(
    (h) => Math.hypot(h.mesh.position.x - m.x, h.mesh.position.z - m.z) < MIRROR_MATCH_EPS,
  );
  if (hero) return { bind: hero, hero, state: 'clear' as const };
  if (m.kind === 'true') {
    const tm = new HeroMirror(m, { size: 256, frame: true });
    trueMirrors.push(tm);
    scene.add(tm.mesh);
    return { bind: tm, hero: tm, state: 'clear' as const };
  }
  if (m.kind === 'silvered' && m.wallDir !== null) {
    const door = createSilveredDoor(m, m.wallDir);
    silveredDoors.push({ ref: m, door });
    scene.add(door.group);
    return { bind: door.mirror, hero: null, state: 'clear' as const };
  }
  const { mesh, setFog, setCracked } = createMirrorMesh(m.kind);
  mesh.position.set(m.x, 1.35, m.z);
  mesh.rotation.y = m.rotY;
  scene.add(mesh);
  return { bind: { setFog, setCracked }, hero: null, state: 'clear' as const };
});

// House state (M2/T6): anger from sprint-cracked mirrors, attempt count, and
// the shards pending this attempt (beacon captures bank here — awarded only
// at clear, forfeited on a fail).
let house = initHouseState();
let breath = 1;

// M2 echoes: hollow reflections hunting through the mirrors above. They see
// via allMirrors/mirrorRuntime, walk the flow field, and touch-fail the run.
// Layer-0 glass figures — visible to the player AND inside every mirror pass.
let echoes = initEchoes(objs.echoSpawns, floor.grid, objs.patrolAnchors, performance.now());
const echoMeshes = echoes.map(() => {
  const mesh = createEchoMesh();
  scene.add(mesh);
  return mesh;
});

// Fail + restart (M2/T6). Caught by an echo or Chhaya, or the house collapses
// at ANGER_MAX: the HUD announces it, input freezes FAIL_FREEZE_MS (the timer
// pins at the fail moment via run state), then the floor re-arms for the next
// attempt — mirrors unfrost/un-crack, echoes and Chhaya reset, pending beacon
// shards are forfeited, and the player returns to the spawn.
let floorFailed = false;
let freezeUntil: number | null = null;
let frozenElapsedMs = 0;

function failFloor(reason: string): void {
  if (floorFailed || run.clearedAt !== null) return;
  floorFailed = true;
  const now = performance.now();
  freezeUntil = now + FAIL_FREEZE_MS;
  frozenElapsedMs = runElapsedMs(run, now);
  hud.showFail(reason === 'collapse' ? 'The mirrors collapsed' : 'Caught by the glass');
}

function resetFloor(now: number): void {
  mirrorRuntime = initMirrorRuntime(allMirrors);
  for (const v of visuals) {
    v.state = 'clear';
    v.bind.setFog('clear');
    v.bind.setCracked(false);
  }
  echoes = initEchoes(objs.echoSpawns, floor.grid, objs.patrolAnchors, now);
  path = []; // Chhaya loses the trail; she hides on the next update
  chhaya.visible = false;
  house = { ...initHouseState(), attempts: house.attempts + 1 };
  breath = 1;
  run = createFloorRun(seed);
  player = spawnPlayer(floor);
  floorFailed = false;
  freezeUntil = null;
  hud.hideFail();
  hud.hideCleared(); // a cleared banner never outlives a reset (T6 review fix)
  setExitLocked(true);
  hud.setChips({
    beacons: beaconsCaptured(allMirrors, mirrorRuntime),
    shards: house.shards,
    timerMs: null,
  });
}

// M2 Chhaya: the six-second shadow. A pure replay of the player's recorded
// path — recordPath in the fixed step while the run is active, sampleDelayed
// to place her (heading from the bracketing samples' movement delta). Like
// the echoes she is layer-0 glass: visible to the player AND in every mirror.
let path: PathSample[] = [];
const chhaya = createChhaya();
chhaya.visible = false; // hidden until the first recorded sample expires (6s grace)
scene.add(chhaya);
let chhayaHeading = 0;

function updateChhaya(now: number): void {
  const at = sampleDelayed(path, now);
  if (at === null) {
    chhaya.visible = false;
    return;
  }
  chhaya.visible = true;
  const br = bracketSamples(path, now - CHHAYA_DELAY_MS);
  if (br !== null) {
    const dx = br.b.x - br.a.x;
    const dy = br.b.y - br.a.y;
    if (dx * dx + dy * dy > 1e-8) chhayaHeading = Math.atan2(dx, -dy); // heading 0 = −y
  }
  chhaya.position.set(at.x, 0, at.y);
  chhaya.rotation.y = -chhayaHeading; // same convention as the avatar
}

function tryFrost(now: number): void {
  if (floorFailed || run.clearedAt !== null) return; // no frost while frozen or done
  const target = fogTarget(allMirrors, player);
  if (!target || breath < FOG_COST) return;
  const rt = mirrorRuntime.find((r) => r.id === target.id);
  if (!rt) return;
  const wasCaptured = rt.captured;
  applyFog(mirrorRuntime, target.id, now);
  breath = updateBreath(breath, 0, true);
  if (!wasCaptured && rt.captured) {
    // Beacon shards bank as pending in the house state — awarded at clear.
    house = { ...house, shards: house.shards + SHARD_BEACON };
    hud.setChips({ beacons: beaconsCaptured(allMirrors, mirrorRuntime), shards: house.shards });
    setExitLocked(!exitUnlocked(allMirrors, mirrorRuntime));
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
hud.setChips({ beacons: beaconsCaptured(allMirrors, mirrorRuntime), shards: house.shards });
setExitLocked(true); // the stair door starts sealed behind its beacons
canvas.addEventListener('click', () => {
  if (mode === 'hybrid') {
    const lock = canvas.requestPointerLock() as unknown as
      { catch?: (cb: () => void) => void } | undefined;
    lock?.catch?.(() => {});
  }
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyH' && !e.repeat) faq.toggle();
});
// Frost is a keydown press, not a held key (e.repeat guard) — same trigger as the HUD button.
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF' && !e.repeat) tryFrost(performance.now());
});

// T7 passages — step-through (Space) and push-doors (E), both keydown presses
// like frost. A pushed door is one-time: its id banks here so it never hints
// or pushes again. The opened wall edge stays open for the rest of the floor
// (fail/restart included — the house remembers its own secrets).
const openedDoorIds = new Set<number>();
const doorAnims: Array<{ door: SilveredDoor; startedAt: number }> = [];

function activeDoorMirrors(): MirrorRef[] {
  return allMirrors.filter((m) => m.kind !== 'silvered' || !openedDoorIds.has(m.id));
}

function stepThrough(): void {
  if (floorFailed || run.clearedAt !== null) return;
  const tp = tryTeleport(allMirrors, player, floor.grid);
  if (!tp) return;
  // Snap position + facing-out heading; the avatar follows immediately so the
  // jump reads clean. Chhaya needs no special handling — she replays the
  // recorded path, so she walks your exact route and blinks across the same
  // glass, 6s behind you.
  player = { x: tp.x, y: tp.y, heading: tp.heading };
  updateAvatar(avatar, player.x, player.y, player.heading, false, performance.now() / 1000);
}

function pushDoor(): void {
  if (floorFailed || run.clearedAt !== null) return;
  const target = tryPushDoor(activeDoorMirrors(), player);
  if (!target || target.wallDir === null) return;
  openedDoorIds.add(target.id); // one push per door — it goes inert from here
  const neighbor = floor.grid.neighborIndex(target.cellX, target.cellY, target.wallDir);
  if (neighbor) {
    floor.grid.setOpen(target.cellX, target.cellY, target.wallDir);
    sceneBuilt.hideWallEdge(target.cellX, target.cellY, target.wallDir);
  } // no neighbor (degenerate boundary mount): the edge cannot open — the door still slides, and goes inert
  const bound = silveredDoors.find((d) => d.ref.id === target.id);
  if (bound) doorAnims.push({ door: bound.door, startedAt: performance.now() });
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault(); // nothing else in the UI owns Space
    stepThrough();
  } else if (e.code === 'KeyE' && !e.repeat) {
    pushDoor();
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
  if (freezeUntil !== null) {
    // Fail freeze: no simulation, inputs ignored, timer pinned at the fail
    // moment via run state — restarting re-arms it fresh.
    accumulator = 0;
    if (run.startedAt !== null) run.startedAt = now - frozenElapsedMs;
    if (now >= freezeUntil) resetFloor(now);
  } else {
    accumulator += elapsed;
    while (accumulator >= FIXED_STEP && freezeUntil === null) {
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
      echoes = echoes.map((e) => {
        const next = updateEcho(
          e,
          player,
          allMirrors,
          mirrorRuntime,
          floor.grid,
          objs.patrolAnchors,
          now,
          FIXED_STEP,
        );
        // Stuck bounty: first confusion banks the award flag for this run.
        return next.mode === 'confused' && !next.stuckAwarded
          ? { ...next, stuckAwarded: true }
          : next;
      });
      // Sprint into a mirror and it cracks: the house angers, the glass tints.
      const sprintMoving =
        inputFrame.sprint && (inputFrame.forward !== 0 || inputFrame.strafe !== 0);
      if (sprintMoving && !floorFailed && run.clearedAt === null) {
        const target = crackTarget(allMirrors, mirrorRuntime, player, true);
        if (target) {
          house = applyCrack(house, mirrorRuntime, target.id);
          visuals.find((_, i) => allMirrors[i]!.id === target.id)?.bind.setCracked(true);
          if (isCollapse(house)) failFloor('collapse');
        }
      }
      // Chhaya walks the player's path, 6s late — record only while the run is
      // active; after clear/fail she stands wherever the path ended.
      if (run.startedAt !== null && run.clearedAt === null && !floorFailed)
        path = recordPath(path, player.x, player.y, now);
      if (!floorFailed) {
        for (const e of echoes)
          if (Math.hypot(e.x - player.x, e.y - player.y) < CONTACT_RADIUS) failFloor('caught');
        const at = sampleDelayed(path, now);
        if (at !== null && Math.hypot(at.x - player.x, at.y - player.y) < CONTACT_RADIUS)
          failFloor('caught');
      }
      accumulator -= FIXED_STEP;
    }
  }
  echoes.forEach((e, i) => syncEchoMesh(echoMeshes[i]!, e));
  updateChhaya(now);
  hud.setChips({
    timerMs: runElapsedMs(run, now),
    streak: meta.streak.count,
    bestMs: meta.best[seed] ?? null,
  });
  hud.setBreath(breath);
  hud.setAnger(house.anger / ANGER_MAX);
  syncFogVisuals(now);
  // Silvered push-doors slide 1.2m along their wall over 0.4s (simple linear
  // lerp); once spent the door rests open and inert — no further hints.
  for (let i = doorAnims.length - 1; i >= 0; i--) {
    const a = doorAnims[i]!;
    const t = Math.min(1, (now - a.startedAt) / DOOR_SLIDE_MS);
    a.door.setSlide(t);
    if (t >= 1) doorAnims.splice(i, 1);
  }
  const unlocked = exitUnlocked(allMirrors, mirrorRuntime);
  if (
    run.clearedAt === null &&
    !floorFailed && // a same-frame fail+clear must not award a clear (T6 review fix)
    run.startedAt !== null &&
    unlocked &&
    isAtExit(player.x, player.y, exitCenter.cx, exitCenter.cy)
  ) {
    run.clearedAt = now;
    const ms = runElapsedMs(run, now);
    const wasBest = meta.best[seed];
    meta = recordRun(meta, seed, ms, todayStamp());
    meta = awardShards(
      meta,
      house.shards + shardsForClear(house, echoes.filter((e) => e.stuckAwarded).length),
    );
    saveMeta(meta);
    hud.showCleared(ms, meta.best[seed] ?? null, wasBest === undefined || ms < wasBest);
    hud.setChips({ shards: meta.shards ?? 0 }); // chip flips from pending to banked
  }
  // Passage hints (T7), in precedence order: step-through, push-door, then
  // the sealed-exit explanation — the prompt always names the key that works.
  if (!floorFailed && run.clearedAt === null) {
    if (tryTeleport(allMirrors, player, floor.grid) !== null) {
      hud.hint('Space — step through');
    } else if (tryPushDoor(activeDoorMirrors(), player) !== null) {
      hud.hint('E — push');
    } else if (!unlocked && Math.hypot(player.x - exitCenter.cx, player.y - exitCenter.cy) < 3) {
      const bc = beaconsCaptured(allMirrors, mirrorRuntime);
      hud.hint(`The stair door is sealed — frost the beacons (${bc.captured}/${bc.total})`);
    } else {
      hud.hint(null);
    }
  } else {
    hud.hint(null);
  }
  camera.position.set(player.x, EYE_HEIGHT, player.y);
  camera.rotation.y = -player.heading;
  lantern.position.set(player.x, EYE_HEIGHT, player.y);
  // mirrors update on alternate frames — perf budget (each costs one extra scene render);
  // fogged hero mirrors skip their RT pass entirely (matte material, no
  // reflection). True-mirror pairs share the same budget at 256px (they are
  // never fogged, so their RT always runs when their turn comes).
  [...heroMirrors, ...trueMirrors].forEach((m, i) => {
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
    avatarPresent: true,
    streak: () => meta.streak.count,
    bestFor: (s: string) => meta.best[s] ?? null,
    breath: () => breath,
    echoes: () => echoes.map((e) => ({ id: e.id, x: e.x, y: e.y, mode: e.mode })),
    chhaya: () => sampleDelayed(path, performance.now()),
    // T8 e2e hooks — scripted win/lose. `mirrors()` replaces the old hero
    // count (the step003 suite reads .total now). mirrorAt(kind) prefers the
    // first mirror of that kind not captured yet, so a capture loop walks the
    // beacons in whatever order the floor laid them — no id assumptions.
    mirrors: () => {
      const now = performance.now();
      return {
        total: allMirrors.length,
        fogged: mirrorRuntime.filter((r) => isFogged(r, now)).length,
        captured: mirrorRuntime.filter((r) => r.captured).length,
      };
    },
    beaconsLeft: () => {
      const bc = beaconsCaptured(allMirrors, mirrorRuntime);
      return bc.total - bc.captured;
    },
    anger: () => house.anger,
    shards: () => meta.shards ?? 0,
    attempts: () => house.attempts,
    enemyCount: () => echoes.length,
    enemyPos: (i: number) => {
      const e = echoes[i];
      return e ? { x: e.x, y: e.y } : null;
    },
    chhayaPos: () => sampleDelayed(path, performance.now()),
    mirrorAt: (kind: string) => {
      const m =
        allMirrors.find(
          (x) => x.kind === kind && !mirrorRuntime.find((r) => r.id === x.id)?.captured,
        ) ?? allMirrors.find((x) => x.kind === kind);
      if (!m) return null;
      const c = floor.grid.cellCenter(m.cellX, m.cellY);
      return {
        x: m.x,
        z: m.z,
        id: m.id,
        kind: m.kind,
        cellX: m.cellX,
        cellY: m.cellY,
        cx: c.cx,
        cy: c.cy,
      };
    },
    exitPos: () => ({ x: exitCenter.cx, z: exitCenter.cy }),
    warp: (x: number, y: number, heading?: number) => {
      player = { x, y, heading: heading ?? player.heading };
      input.snapshotAndReset(); // drop any pending mouseDx so the jump does not jitter
      updateAvatar(avatar, player.x, player.y, player.heading, false, performance.now() / 1000);
      camera.position.set(player.x, EYE_HEIGHT, player.y);
      camera.rotation.y = -player.heading;
    },
    addAnger: (n: number) => {
      house = { ...house, anger: house.anger + n };
      if (isCollapse(house)) failFloor('collapse');
    },
    house: () => ({
      anger: house.anger,
      attempts: house.attempts,
      pendingShards: house.shards,
      crackedAny: house.crackedAny,
      beacons: beaconsCaptured(allMirrors, mirrorRuntime),
      exitUnlocked: exitUnlocked(allMirrors, mirrorRuntime),
      failed: floorFailed,
    }),
    metaShards: () => meta.shards ?? 0,
    fail: (reason: string) => failFloor(reason),
    fogTarget: () => fogTarget(allMirrors, player)?.id ?? null,
    canStepThrough: () => tryTeleport(allMirrors, player, floor.grid) !== null,
    stepThrough,
    doorTarget: () => tryPushDoor(activeDoorMirrors(), player)?.id ?? null,
    pushDoor,
    doorsOpened: () => [...openedDoorIds],
    mirrorRefs: () => allMirrors.map((m) => ({ ...m })),
    mirrorRuntime: () => mirrorRuntime.map((r) => ({ ...r })),
    canWalk: (x: number, y: number, d: number) => floor.grid.canWalk(x, y, d as Dir),
  };
}
