// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { APP_VERSION } from './appVersion';
import { createAudioEngine } from './audio/engine';
import {
  intensityFrom,
  TIER_FOUR_SCALE,
  TIER_ONE_SCALE,
  TIER_THREE_SCALE,
  TIER_TWO_SCALE,
} from './audio/theory';
import {
  ANGER_MAX,
  CELL_SIZE,
  CHHAYA_PING_MS,
  CONTACT_RADIUS,
  DESCEND_MS,
  DECOY_SHARD,
  DECOY_SPAWN_EVERY_MS,
  DWAAR_FLOOR,
  EYE_HEIGHT,
  EXIT_LOCKED_EMISSIVE,
  FIXED_STEP,
  FOG_COST,
  SHARD_BEACON,
  SPRINT_SPEED,
  TAAL_FLOOR,
  TIER_FIVE_FLOORS,
  TIER_FOUR_FLOORS,
  TIER_THREE_FLOORS,
  TIER_TWO_FLOORS,
  WALK_SPEED,
} from './engine/constants';
import { createRng, type Rng } from './engine/rng';
import {
  actionFor,
  InputCollector,
  keysToMoveInput,
  mouseOnlyInput,
  rebind,
  withoutKey,
  type InputMode,
} from './engine/input';
import { Dir, type CellIndex } from './engine/grid';
import {
  createAavart,
  createAvatar,
  createChhaya,
  createDecoy,
  createGher,
  createTaal,
  updateAvatar,
  type AavartFigure,
  type DecoyFigure,
  type GherFigure,
  type TaalFigure,
} from './game/avatar';
import {
  aavartPresent,
  completeTier,
  descend,
  dwaarGrid,
  floorParams,
  floorSeed,
  gherPresent,
  isDwaar,
  newCampaign,
  taalPresent,
  tierOf,
  type Campaign,
} from './game/campaign';
import {
  hintCost,
  loreUnlockedCount,
  nextHint,
  type HintContext,
  type HintKind,
} from './game/aaina';
import { bracketSamples, recordPath, sampleDelayed, type PathSample } from './game/chhaya';
import {
  shatterDecoys,
  spawnDecoy,
  updateDecoys,
  type DecoyState,
} from './game/decoy';
import { initEchoes, updateEcho } from './game/echo';
import { createEchoMesh, disposeEchoMesh, syncEchoMesh } from './game/echoView';
import {
  generateFloorObjects,
  M2_PARAMS,
  mirrorSpotFor,
  type MirrorRef,
} from './game/floorObjects';
import {
  active,
  clearRun,
  createFloorRun,
  failRun,
  isAtExit,
  runElapsedMs,
  startRun,
  tickFail,
  type FailReason,
} from './game/floorRun';
import { buildFloorScene, type FloorSceneResult } from './game/floorScene';
import {
  applyFog,
  fogTarget,
  initMirrorRuntime,
  isFogged,
  mirrorVisual,
  updateBreath,
  type MirrorRuntime,
} from './game/frost';
import {
  applyCrack,
  bankOnClear,
  beaconsCaptured,
  crackTarget,
  exitUnlocked,
  initHouseState,
  isCollapse,
} from './game/houseState';
import { parseLook } from './game/look';
import { apparentPlayer as computeApparent } from './game/distort';
import { diagnosticsSnapshot, keymapDiffCount, recordError, type RingError } from './game/feedback';
import {
  DEMO_VENUE_ID,
  validateVenuePack,
  venueFloorParams,
  venueSeed,
  venueString,
  VENUE_CHHAYA_DELAY_MS,
  type VenuePack,
} from './game/venue';
import {
  beatGlow,
  initTaal,
  taalOutcome,
  taalTouch,
  TAAL_TOUCH_ANGER,
  TAAL_TOUCH_COOLDOWN_MS,
  updateTaal,
  type TaalState,
} from './game/taal';
import { initGher, interceptCell, updateGher, type GherState } from './game/gher';
import { ambushCell, initAavart, updateAavart, type AvartState } from './game/avart';
import { floorFromGrid, generateFloor, TIER_ONE, type Floor } from './game/maze';
import { paletteForTier, TIER_ONE_PALETTE } from './game/palette';
import { awardShards, dailySeed, META_KEY, recordRun, spendShards, todayStamp } from './game/meta';
import {
  DEFAULT_A11Y,
  DEFAULT_KEYMAP,
  defaultSave,
  idbGet,
  idbPut,
  mergeCampaign,
  migrateMeta,
  normalizeSave,
  serializeSave,
  validateSave,
  type A11ySettings,
  type SaveData,
} from './game/save';
import {
  createDistortMirror,
  createHeroStandIn,
  createMirrorMesh,
  createPortraitMirror,
  createSilveredDoor,
  HeroMirror,
  mirrorSpots,
  type CheapMirror,
  type CrackVisual,
  type FogVisual,
  type MirrorFogState,
  type SilveredDoor,
} from './game/mirror';
import {
  beginDoorSlide,
  createDoor,
  stepDoor,
  tryPushDoor,
  tryTeleport,
  type DoorAnim,
} from './game/passages';
import { movePlayer, spawnPlayer, type MoveInput, type PlayerState } from './game/player';
import { autoPreset, PROFILES, type PerfChoice, type PerfPreset } from './game/quality';
import { isValidSeed, normalizeSeed, randomSeed } from './game/seedCode';
import { parseTestMode } from './game/testMode';
import { canvasTexture, makeWaterCanvas } from './game/textures';
import { initWaterRuntime, rippleState, rippleTrigger, type WaterRuntime } from './game/water';
import {
  cycleView,
  exitTactical,
  isTactical,
  QUAD_PIXEL_RATIO,
  showsOverhead,
  type ViewMode,
} from './game/viewMode';
import { buildAainaOverlay } from './ui/aaina';
import { buildAboutOverlay } from './ui/about';
import { CAPTION_TTL_MS, captionFeed, renderCaptions, type CaptionEvent } from './ui/captions';
import { buildFeedbackOverlay } from './ui/feedback';
import { buildFaqOverlay } from './ui/faq';
import { createHud } from './ui/hud';
import { fill, resolveLang, t, type Lang } from './ui/i18n';
import { createOverhead, pingOpacity } from './ui/overhead';
import { buildSettingsOverlay, keyLabel, type TextScale } from './ui/settings';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const overheadCanvas = document.querySelector<HTMLCanvasElement>('#overhead')!;
const diagnostics = document.querySelector<HTMLElement>('#diagnostics')!;

// step007/T2 — the error ring: the last 10 runtime errors (window `error` +
// `unhandledrejection`), capped and ~200 chars each inside recordError. It
// feeds the 📮 composer's diagnostics block — nothing is sent anywhere; the
// ring lives in memory for this tab only and dies with it. Attached before
// the async boot below, so a boot-time failure is caught too.
let errorRing: RingError[] = [];
window.addEventListener('error', (e) => {
  errorRing = recordError(errorRing, performance.now(), e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  errorRing = recordError(errorRing, performance.now(), `Unhandled rejection: ${String(e.reason)}`);
});

// M4/T2 campaign boot. The URL names the campaign's BASE seed — `?seed=PLAY`
// starts floor 1 of that base; DEV builds may also jump with `&floor=N`.
// M4/T4 makes boot save-driven and async: IDB save v2 first, then a one-time
// migration of the localStorage meta v1 (the copy stays untouched — belt and
// braces), then a fresh default. The URL still overrides the campaign. The
// top-level await below pauses module evaluation — the debug hook at the
// bottom therefore registers only after the save has landed, and e2e's
// waitForFunction tolerates that whenever it lands.
const urlParams = new URLSearchParams(window.location.search);
const urlSeed = normalizeSeed(urlParams.get('seed') ?? '');
// step007/T3 — tester mode: `?test=1` (never `0`, nothing else) unlocks the
// diagnostics hook + the TESTER chip for THIS session in ANY build — PROD
// included, because invited testers play the deployed game. Session-only by
// nature: the flag lives in the URL and nothing persists it.
const testMode = parseTestMode(window.location.search);
function bootFloorFromUrl(): number {
  if (!import.meta.env.DEV) return 1; // the floor jump is a dev-only affordance
  const n = Number.parseInt(urlParams.get('floor') ?? '', 10);
  // T3/T1 — widened with the campaign: floors 21–30 jump too (the e2e legs).
  // T4/T1 — and 31–40: the carnival legs jump the same way. T5/T1 — and
  // 41–50: the Flood Halls (Act II's banner + Dwaar V's duel are jumpable).
  return Number.isInteger(n) && n >= 1 && n <= TIER_FIVE_FLOORS ? n : 1;
}
/** Migration reads the legacy localStorage meta v1 ONCE; unreadable → null
 *  (a fresh default, never a dead boot). The localStorage copy is left in
 *  place deliberately — removal is a later, deliberate housekeeping step. */
function migrateFromMetaV1(): SaveData | null {
  try {
    const raw = globalThis.localStorage?.getItem(META_KEY);
    if (!raw) return null;
    return migrateMeta(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}
// M5/T1 — normalizeSave fills the additive a11y defaults post-load: every
// pre-M5 save (stored, exported, migrated) arrives without the block and
// leaves this line carrying the full default one.
let save: SaveData = normalizeSave((await idbGet()) ?? migrateFromMetaV1() ?? defaultSave());
/** The save's a11y block, defaulted — never undefined past boot. */
function a11y(): A11ySettings {
  return save.a11y ?? DEFAULT_A11Y;
}
/** M5/T2 — the live code for an action: the save's keymap with the default
 *  as the floor. Post-normalize the map always binds all 15 actions, so the
 *  fallbacks are belt-and-braces for hand-built saves, same stance as T1's
 *  aainaKey() (which this generalizes and replaces). */
function keyOf(action: string): string {
  return a11y().keyMap[action] ?? DEFAULT_KEYMAP[action] ?? '';
}
// M5/T1 — a11y application. Text scale is one CSS var every HUD/overlay font
// multiplies in (index.html defaults it to 1); reduced-flash flips a body
// class the overlay-fade CSS keys on AND steadies the pulsing lights (the
// Taal lantern reads it per frame via beatGlow).
function applyTextScale(scale: TextScale): void {
  document.body.style.setProperty('--mh-text-scale', String(scale));
}
function applyReducedFlash(on: boolean): void {
  document.body.classList.toggle('mh-reduced-flash', on);
}
applyTextScale(a11y().textScale);
applyReducedFlash(a11y().reducedFlash);
let campaign: Campaign = isValidSeed(urlSeed)
  ? { seedBase: urlSeed, floor: bootFloorFromUrl(), tierComplete: false } // URL wins over the save
  : {
      // resume as saved — tierComplete gates lore/aggregation, not the boot
      seedBase: save.progress.seedBase,
      floor: save.progress.floor,
      tierComplete: save.progress.tierComplete,
    };
// M6/T1 — the venue SIDE-FLOOR. `venue` names the pack whose floor is live
// (null = the campaign floor). The isolation invariant: entering, playing,
// clearing, failing, or leaving a venue floor never mutates `campaign`, the
// save's bests/streak/shards, or the phase-of-campaign state — the venue
// floor reuses the same floor machines (buildFloor/resetFloor/GamePhase) with
// the pack's parameters and its own daily seed, and every campaign hook in
// the frame loop (descend, clear-banking, the tier screen) is gated off it.
// Returning REBUILDS the campaign floor fresh at the same floor number —
// mid-floor progress is lost, disclosed in the banner's note.
let venue: VenuePack | null = null;
let player: PlayerState; // armed by buildFloor — the spawn belongs to the floor

// M4/T4 — the single write-through. Mutate the in-memory save, then persist():
// the debounced arm (250ms) coalesces bursts (mode flips, hint buys), while
// flush=true cancels the timer and writes NOW — a cleared floor, a descend,
// the tier screen, and an import must never ride a debounce window that a
// closed tab could eat.
let persistTimer: number | null = null;
function persist(flush = false): void {
  if (persistTimer !== null) window.clearTimeout(persistTimer);
  persistTimer = null;
  if (flush) void idbPut(save);
  else
    persistTimer = window.setTimeout(() => {
      persistTimer = null;
      void idbPut(save);
    }, 250);
}

// M3/T6 procedural audio: the engine exists from boot but only speaks after
// the first user gesture (listener below) — an AudioContext must start
// user-initiated. The saved mute preference applies before that start, so a
// muted boot never makes a sound. One voice per house: the campaign base
// carries it across every floor.
const audio = createAudioEngine(campaign.seedBase);
audio.setMuted(save.muted);
let audioIntensity = 0.2; // last intensity fed to the engine (audioState reports it)
let phase = createFloorRun(); // the GamePhase master machine — re-armed (ready) on reset

// preserveDrawingBuffer: QUAD's side panes render on alternate frames and must
// keep their last frame on screen in between — the browser clears an
// unpreserved drawing buffer after every composite, which blanks skipped
// panes. Keeping the buffer makes the stale-side-pane budget actually visible.
//
// M5/T4 — quality presets. The CHOICE ('auto' or a pinned rung) resolves at
// boot: the DEV ?perf= override wins (testing), else the saved choice
// (normalizeSave healed 'auto' pre-T4 saves). Auto starts from a 60fps prior
// until the rolling FPS window fills (below), then follows autoPreset. The
// PRESET is the effective rung every knob reads: pixel ratio applies live
// (the cap below), Chhaya's bob reads the profile per frame, and the mirror
// knobs (hero RT on/off + RT size) are read at the next floor build — the
// settings note says so.
const PERF_URL_CHOICES: readonly PerfChoice[] = ['auto', 'low', 'mid', 'high'];
const perfOverride: PerfChoice | null = import.meta.env.DEV
  ? (PERF_URL_CHOICES.find((c) => c === urlParams.get('perf')) ?? null)
  : null;
let perfChoice: PerfChoice = perfOverride ?? save.perf ?? 'auto';
let preset: PerfPreset =
  perfChoice === 'auto' ? autoPreset(60, window.devicePixelRatio) : perfChoice;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
// boot is focus mode: the live devicePixelRatio capped by the preset's rung.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, PROFILES[preset].pixelRatioCap));
const scene = new THREE.Scene();
const VOID_COLOR = 0x0b1026; // the night the house floats in — background, fog, map-mode clear
// T2/T4 (carried one-liners) — the void and the fog re-dress with the stage
// palette at every buildFloor; boot pins the tier-one pair, so floors 1–10
// render exactly as they did before the tier existed.
const voidColor = new THREE.Color(VOID_COLOR);
const voidFog = new THREE.Fog(VOID_COLOR, 2, 26);
scene.background = voidColor;
scene.fog = voidFog;
// M4/T6 — the UI language resolves once at boot: `?lang=` (the demo path)
// beats the saved choice beats a hi-* browser, else English. The resolved
// value becomes the saved one (the look pattern below), so `?lang=hi` sticks.
let lang: Lang = resolveLang(save.lang, urlParams.get('lang'), navigator.language);
if (save.lang !== lang) {
  save = { ...save, lang };
  persist();
}
// M4/T4 — the URL `?look=` still wins for this visit; otherwise the saved
// look returns. The resolved name becomes the saved one (parseLook heals a
// junk name to indigo-gold), so a URL choice or self-heal persists.
const look = parseLook(urlParams.get('look') ?? save.lookName);
if (save.lookName !== look.name) {
  save = { ...save, lookName: look.name };
  persist();
}
const avatar = createAvatar(look);
scene.add(avatar);

// ---- Floor runtime (M4/T2) -------------------------------------------------
// Everything the CURRENT floor owns lives in these lets; buildFloor() tears
// the old floor down and constructs the next one (campaign descend, tier
// Play again). The one-time rig — renderer, scene, avatar, lantern, cameras,
// HUD, overlays — stays put; only the house itself changes under your feet.
let floor: Floor; // the active floor (procedural or Dwaar grid)
let seed = ''; // floorSeed(campaign) — the per-floor best-time bucket + rng stem
let exitCenter: { cx: number; cy: number } = { cx: 0, cy: 0 };
let sceneBuilt: FloorSceneResult;
let exitMarkerMat: THREE.MeshStandardMaterial;
let exitUnlockedTint = 0;
let objs: ReturnType<typeof generateFloorObjects>;
let heroMirrors: HeroMirror[] = []; // RT heroes at the entrance/exit
let allMirrors: MirrorRef[] = [];
let mirrorRuntime: MirrorRuntime[] = []; // re-init by resetFloor / buildFloor
let visuals: MirrorBinding[] = []; // 1:1 with allMirrors — binds each to its visual
let trueMirrors: HeroMirror[] = []; // RT step-through pairs — updated like the heroes
let silveredDoors: Array<{ ref: MirrorRef; door: SilveredDoor }> = [];
let doorStates = new Map<number, DoorAnim>();
let doorById = new Map<number, SilveredDoor>();
let echoes: ReturnType<typeof initEchoes> = [];
let echoMeshes: THREE.Group[] = [];
// M4/T3 — Taal's cameo (floor 5); T2 — the Sentinel from floor 11 up (the
// ladder accumulates: he keeps the beat through the Gardens beside Gher).
// State is null everywhere else; the figure
// exists exactly while that floor is built (buildFloor owns both, the
// teardown rides floorDisposers with the rest of the stage).
let taal: TaalState | null = null;
let taalFigure: TaalFigure | null = null;
// T3/T2 — Gher the Encircler: every tier-3 floor (21–30), and nowhere else.
// Same per-floor ownership as Taal — buildFloor owns state + figure, the
// teardown rides floorDisposers with the rest of the stage, resetFloor
// re-seeds him at the far anchor.
let gher: GherState | null = null;
let gherFigure: GherFigure | null = null;
// T4/T2 — Aavart the Ambusher: every tier-4 floor (31–40), and nowhere else.
// The ladder accumulates — by the Carnival all three Sentinels walk (spec
// §4.4: tier 4 ADDS Aavart beside Taal and Gher). Same per-floor ownership
// as the other two; resetFloor re-seeds him at the far anchor.
let aavart: AvartState | null = null;
let aavartFigure: AavartFigure | null = null;
// T5/T2 — the mirror-you decoys (Act II's first form): the house sends glass
// copies of the Surveyor ahead on the Flood Halls. State + per-copy figures
// are 1:1 by spawn order; buildFloor owns both (the teardown rides
// floorDisposers with the rest of the stage), resetFloor kills every copy
// with the attempt, and the spawn clock arms only on campaign floors 41–50.
// The rng is re-seeded per floor build (`{seed}:decoys`) — deterministic,
// no Math.random anywhere in the house.
let decoys: DecoyState[] = [];
let decoyFigures: DecoyFigure[] = [];
let decoyRng: Rng = createRng('decoys');
let nextDecoySpawnAt = Infinity; // armed by buildFloor/resetFloor on 41–50 only
let decoyIdNext = 0;
/** The jittered spawn cadence: DECOY_SPAWN_EVERY_MS scaled 0.8–1.2× by the
 *  floor rng — the house keeps no metronome. */
function decoySpawnInterval(): number {
  return DECOY_SPAWN_EVERY_MS * (0.8 + 0.4 * decoyRng.next());
}
/** The copies walk the campaign's Flood Halls only — a venue floor is the
 *  sponsor's stage, and the house's deceptions stay home (M6 isolation). */
function decoysActiveFloor(): boolean {
  return venue === null && tierOf(campaign.floor) === 5;
}
// T3/T3 — the water-mirrors: runtime pools (rippledAt mutated in place, the
// MirrorRuntime precedent) + their visual patches. Empty arrays on every
// tier-1/2/venue floor; buildFloor owns both, the teardown rides
// floorDisposers, resetFloor clears the ripples (pools persist with the floor).
let waterRt: WaterRuntime[] = [];
let waterPatches: THREE.Mesh[] = []; // 1:1 with waterRt — the material IS the ripple read-out
let floorDisposers: Array<() => void> = []; // one floor's teardown, in order
// Beacon gate: the stair door burns dim red until every beacon is frosted,
// then returns to its built gold. Tint the material of the CURRENT floor's
// stage (buildFloor refreshes both bindings).
function setExitLocked(locked: boolean): void {
  const hex = locked ? EXIT_LOCKED_EMISSIVE : exitUnlockedTint;
  exitMarkerMat.emissive.setHex(hex);
  exitMarkerMat.color.setHex(hex);
}

// Mirror→visual binding convention (M2 frost / T7 passages), applied per
// floor by buildFloor: HeroMirror when its spot matches by position proximity
// (same wall-mount convention; a floorObjects mirror can never sit closer
// than ~0.24m to a hero spot), else a cheap reflective-look mesh. The true
// pair gets its own 256px RT HeroMirrors with a gold frame, and each silvered
// mirror becomes a wall-sized slab door that slides.
const MIRROR_MATCH_EPS = 0.05;
interface MirrorBinding {
  bind: FogVisual & CrackVisual;
  hero: HeroMirror | null;
  state: MirrorFogState;
}

// House state (M2/T6): anger from sprint-cracked mirrors, attempt count, and
// the shards pending this attempt (beacon captures bank here — awarded only
// at clear, forfeited on a fail).
let house = initHouseState();
let breath = 1;

// M3/T4 map state. `visited` is the fog-of-war set — cells the player has
// occupied, keyed `y * grid.width + x` (the grid's own indexing), written in
// the fixed step and reset in resetFloor. Pings are map radar: one at an
// echo's position whenever its sense check succeeds (a success is the only
// writer of `loseMemoryAt`, so a changed value IS this tick's check), one at
// Chhaya's position every CHHAYA_PING_MS while her sample exists. Waypoints
// are the player's tactical marks (max WAYPOINT_MAX, click-toggle, Esc-clear).
const visited = new Set<number>();
let pings: Array<{ x: number; y: number; at: number }> = [];
let lastChhayaPingAt = 0;
const waypoints: Array<{ x: number; y: number }> = [];
const WAYPOINT_MAX = 8;
const overhead = createOverhead(overheadCanvas);

// M5/T3 — captions: the sound-cue feed behind the bottom bar. pushCaption is
// the ONE door (gated on a11y.captions); the feed dedupes by id within its
// ttl, so a repeatedly-firing cue (the echo sense check runs every 250 ms
// per echo) speaks once per window. The frame loop renders the latest two
// lines and clears the feed the moment the toggle goes off.
let captions: CaptionEvent[] = [];
function pushCaption(id: string, text: string): void {
  if (!a11y().captions) return;
  const now = performance.now();
  captions = captionFeed(captions, { id, text, at: now, ttlMs: CAPTION_TTL_MS }, now);
}
/** The anger thresholds already spoke this attempt (reset with the house).
 *  Per-frame check — anger rises in the fixed step (cracks, Taal's touch)
 *  and via the dev faucet; one reader catches every writer. */
let anger60Spoken = false;
let anger90Spoken = false;
function captionAnger(): void {
  if (!anger60Spoken && house.anger >= 60) {
    anger60Spoken = true;
    pushCaption('anger-60', t(lang, 'caption.anger60'));
  }
  if (!anger90Spoken && house.anger >= 90) {
    anger90Spoken = true;
    pushCaption('anger-90', t(lang, 'caption.anger90'));
  }
}

/** Mark the player's current cell explored (fog of war). */
function markVisited(): void {
  const c = floor.grid.cellAt(player.x, player.y);
  visited.add(c.y * floor.grid.width + c.x);
}

// Aaina's hint economy (M3/T2). hintsUsed is a per-floor counter — it resets
// with the floor, so a new attempt prices hints from ◆ 5 again. purchasedHint
// is the line she last sold this floor; it clears when the situation changes
// (nextHint's kind moves on) — derived data, not a machine.
let hintsUsed = 0;
let purchasedHint: { kind: HintKind; text: string } | null = null;

// M2 echoes: hollow reflections hunting through the mirrors above. They see
// via allMirrors/mirrorRuntime, walk the flow field, and touch-fail the run.
// Layer-0 glass figures — visible to the player AND inside every mirror pass.
// Spawned per floor by buildFloor; re-armed per attempt by resetFloor.

// Fail + restart (M2/T6). Caught by an echo or Chhaya, or the house collapses
// at ANGER_MAX: the HUD announces it, input freezes FAIL_FREEZE_MS (the timer
// pins at the fail moment — runElapsedMs of a failing phase), then the floor
// re-arms for the next attempt — mirrors unfrost/un-crack, echoes and Chhaya
// reset, pending beacon shards are forfeited, and the player returns to the
// spawn. All of that lifecycle lives in the GamePhase machine.
function failFloor(reason: FailReason): void {
  const next = failRun(phase, reason, performance.now());
  if (next === phase) return; // re-fail during the freeze, or the fail-after-clear race
  phase = next;
  hud.showFail(t(lang, reason === 'collapse' ? 'overlay.failCollapse' : 'overlay.failCaught'));
  // M5/T3 — the fail caption reuses the overlay's own line: one announcement.
  pushCaption(
    reason === 'collapse' ? 'fail-collapse' : 'fail-caught',
    t(lang, reason === 'collapse' ? 'overlay.failCollapse' : 'overlay.failCaught'),
  );
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
  chhayaAnnounced = false; // the new attempt's first sighting speaks again
  distortAnnounced = false; // the new attempt's first displacement speaks again
  house = { ...initHouseState(), attempts: house.attempts + 1 };
  anger60Spoken = anger90Spoken = false; // the calmed house has nothing said
  breath = 1;
  hintsUsed = 0; // a fresh attempt prices Aaina's hints from the base again
  purchasedHint = null;
  player = spawnPlayer(floor);
  // Taal re-seeds at the far anchor — the beat never missed a step, only the
  // attempt did (and the far-anchor rule means the reset can never land him
  // on the returned player). Cooldown clears; the figure is the floor's.
  taal = taalFigure === null ? null : initTaal(objs.patrolAnchors, player);
  if (taalFigure !== null) taalFigure.group.visible = taal !== null;
  // Gher re-seeds at the far anchor — the Gardens' roads reset with the
  // attempt, and the first commit is again the player's to make.
  gher = gherFigure === null ? null : initGher(objs.patrolAnchors, player);
  if (gherFigure !== null) gherFigure.group.visible = gher !== null;
  // Aavart re-seeds at the far anchor too — the Carnival resets with the
  // attempt, and the first pace is again the player's to set.
  aavart = aavartFigure === null ? null : initAavart(objs.patrolAnchors, player);
  if (aavartFigure !== null) aavartFigure.group.visible = aavart !== null;
  // T5/T2 — the copies die with the attempt: the stage forgets every copy,
  // the spawn clock re-arms on the Flood Halls (re-seeded per attempt — the
  // reset can never replay the same spawn cell twice in a row).
  for (const fig of decoyFigures) {
    scene.remove(fig.group);
    fig.dispose();
  }
  decoys = [];
  decoyFigures = [];
  decoyIdNext = 0;
  decoyRng = createRng(`${seed}:decoys:${house.attempts}`);
  nextDecoySpawnAt = decoysActiveFloor() ? now + decoySpawnInterval() : Infinity;
  // T3/T3 — the pools persist with the floor; only their ripples reset (all
  // still water again — the patches re-brighten on the next frame's sync).
  for (const w of waterRt) w.rippledAt = null;
  visited.clear(); // the fog closes in — the new attempt starts unexplored
  pings = []; // the old attempt's radar is spent
  markVisited();
  input.snapshotAndReset(); // drain mouseDx banked during the freeze — no giant first turn
  hud.hideFail();
  hud.hideCleared(); // a cleared banner never outlives a reset (T6 review fix)
  hud.hideDescend(); // nor does a descend banner (it cannot pend across a fail — belt and braces)
  setExitLocked(true);
  hud.setChips({
    beacons: beaconsCaptured(allMirrors, mirrorRuntime),
    timerMs: null,
  });
  updateShardsChip(); // the forfeited pending leaves the chip — the purse stays
}

// M2 Chhaya: the six-second shadow. A pure replay of the player's recorded
// path — recordPath in the fixed step while the run is active, sampleDelayed
// to place her (heading from the bracketing samples' movement delta). Like
// the echoes she is layer-0 glass: visible to the player AND in every mirror.
let path: PathSample[] = [];
const chhaya = createChhaya();
chhaya.visible = false; // hidden until the first recorded sample expires (the floor's grace)
scene.add(chhaya);
let chhayaHeading = 0;
// M5/T3 — her caption speaks once per attempt: the first frame her delayed
// sample exists (reset with the trail in resetFloor/buildFloor).
let chhayaAnnounced = false;
// T4/T3 — the carnival glass's caption speaks once per attempt: the first
// fixed step ANY unfogged distort mirror displaces the player's apparent
// position (reset in resetFloor/buildFloor — a new attempt re-learns the lie).
let distortAnnounced = false;

/** Chhaya walks closer as the campaign descends (M4/T2): her delay comes from
 *  the floor ramp — 7s on floor 1 down to 4.6s, 4s in the Dwaar. On a venue
 *  floor (M6/T1) she runs at the fixed side-floor delay — never the campaign
 *  depth underneath (isolation runs both ways). */
function chhayaDelayMs(): number {
  return venue === null ? floorParams(campaign.floor).chhayaDelayMs : VENUE_CHHAYA_DELAY_MS;
}

function updateChhaya(now: number): void {
  const delay = chhayaDelayMs();
  const at = sampleDelayed(path, now, delay);
  // She belongs to a live floor: on clear or fail she leaves the stage rather
  // than lingering beside a run that is over.
  const visible = at !== null && active(phase);
  chhaya.visible = visible;
  if (visible && !chhayaAnnounced) {
    // M5/T3 — first sighting this attempt: the line names the live delay
    // (7 s on floor 1 … 4 s in the Dwaar), so the caption stays true as the
    // campaign tightens it.
    chhayaAnnounced = true;
    pushCaption('chhaya', fill(t(lang, 'caption.chhaya'), { s: delay / 1000 }));
  }
  if (!visible || at === null) return;
  const br = bracketSamples(path, now - delay);
  if (br !== null) {
    const dx = br.b.x - br.a.x;
    const dy = br.b.y - br.a.y;
    if (dx * dx + dy * dy > 1e-8) chhayaHeading = Math.atan2(dx, -dy); // heading 0 = −y
  }
  // M5/T4 — the bob is the profile's (a pure visual, off on low): her walk
  // breathes at the avatar's cadence (t·9, ±0.04m — updateAvatar's rhythm).
  chhaya.position.set(
    at.x,
    PROFILES[preset].chhayaBob ? Math.sin((now / 1000) * 9) * 0.04 : 0,
    at.y,
  );
  chhaya.rotation.y = -chhayaHeading; // same convention as the avatar
}

/**
 * Aaina's live view of the floor (M3/T2). chhayaNear = her delayed sample
 * exists on an active floor within 6 m of the player; chasing = echoes that
 * currently hunt. The panel is diegetic — the feed runs while you walk.
 */
function aainaContext(): HintContext {
  const bc = beaconsCaptured(allMirrors, mirrorRuntime);
  const at = sampleDelayed(path, performance.now(), chhayaDelayMs());
  return {
    beaconsLeft: bc.total - bc.captured,
    anger: house.anger,
    chhayaNear: at !== null && active(phase) && Math.hypot(at.x - player.x, at.y - player.y) < 6,
    // M4/T3 — his cameo floor, him on it: Aaina names the beat before she
    // names your shadow (chasing-adjacent in her chain of concerns).
    taalPresent: campaign.floor === TAAL_FLOOR && taal !== null,
    // T2 — the Sentinel version: a tier-2 floor and him within 8 m. Different
    // advice than the cameo — this touch catches, so the crossing rule only
    // now earns its urgency. T5/T1 — reads taalPresent() (he never rests).
    taalSentinelNear:
      taalPresent(campaign.floor) &&
      taal !== null &&
      Math.hypot(taal.x - player.x, taal.y - player.y) < 8,
    // T3 — the Encircler: a tier-3 floor and him within 8 m. Slotted beside
    // the taalSentinel rule — the third Sentinel's counter is the feint.
    // T5/T1 — reads the rotation: he rests on 41–49, walks the V duel.
    gherNear:
      gherPresent(campaign.floor) &&
      gher !== null &&
      Math.hypot(gher.x - player.x, gher.y - player.y) < 8,
    // T4 — the Ambusher: a tier-4 floor and him within 8 m. Slotted beside
    // the other Sentinel rules — the fourth keeper's counter is your pace.
    // T5/T1 — reads the rotation: he rests on 41–49, walks the V duel.
    avartNear:
      aavartPresent(campaign.floor) &&
      aavart !== null &&
      Math.hypot(aavart.x - player.x, aavart.y - player.y) < 8,
    chasing: echoes.filter((e) => e.mode === 'chase').length,
    exitUnlocked: exitUnlocked(allMirrors, mirrorRuntime),
    hintsUsed,
  };
}

/** The roads the predicting Sentinels may play (T3/T2, widened T4/T2): every
 *  UNCAPTURED beacon's cell plus the stair door — the player's plausible
 *  destinations, nothing else. Gher seals them; Aavart ambushes them. As
 *  beacons fall the predictions tighten toward the exit: both seal exits. */
function sentinelObjectives(): CellIndex[] {
  const cells: CellIndex[] = allMirrors
    .filter(
      (m) => m.kind === 'beacon' && !(mirrorRuntime.find((r) => r.id === m.id)?.captured ?? false),
    )
    .map((m) => ({ x: m.cellX, y: m.cellY }));
  cells.push({ x: floor.exit.x, y: floor.exit.y });
  return cells;
}

/** The player's current stride (T4/T2): the one thing Aavart reads that the
 *  other Sentinels do not. Sprint, walk, or a standstill — turning on the
 *  spot or holding still projects no lead at all, which is the whole
 *  counter-play: change your pace. */
function playerSpeed(input: MoveInput): number {
  if (input.forward === 0 && input.strafe === 0) return 0;
  return input.sprint ? SPRINT_SPEED : WALK_SPEED;
}

/** Per-frame panel refresh while she is open: preview kind, price, purse, lore. */
function refreshAaina(): void {
  const hint = nextHint(aainaContext());
  if (purchasedHint !== null && purchasedHint.kind !== hint.kind) purchasedHint = null;
  aaina.updateHint({
    kind: hint.kind,
    cost: hintCost(hintsUsed),
    shards: save.shards,
    revealedText: purchasedHint === null ? null : purchasedHint.text,
  });
  aaina.updateLore(loreUnlockedCount(Object.keys(save.best).length));
}

/** Buy the offered hint: banked shards only (pending floor shards cannot pay),
 *  saved at once, hintsUsed up — the next hint this floor costs more.
 *  M6/T4 (T1 adjudication) — Aaina stays in the campaign: on a venue floor
 *  the sale is refused outright (nothing on a sponsored floor is hers to
 *  sell, and the campaign situation her hints speak to isn't the one under
 *  the player's feet) — the toast says how to get her back. */
function buyHint(): void {
  if (venue !== null) {
    hud.toast(t(lang, 'toast.hintVenue'));
    return; // no spend, no hintsUsed, no purchased line — the refusal is total
  }
  const hint = nextHint(aainaContext());
  const spent = spendShards(save, hintCost(hintsUsed));
  if (spent === null) return; // unaffordable — the Buy button is disabled; this is the guard
  save = spent;
  persist();
  hintsUsed += 1;
  purchasedHint = { kind: hint.kind, text: hint.text };
  updateShardsChip(); // the purse shrank; the pending stake is untouched
  pushCaption('hint', t(lang, 'caption.hint')); // M5/T3 — the buy has a sound cue
}

/**
 * Verbs (frost, step-through, push) need a live floor AND no overlay in front
 * of it: the FAQ, the 📮 composer and the tactical view are pauses, and a key
 * pressed while reading/writing/pausing must not act. Aaina is deliberately
 * absent here — she is diegetic, so verbs stay live while she talks.
 */
function canAct(): boolean {
  return (
    active(phase) &&
    faq.root.hidden === true &&
    feedback.root.hidden === true && // step007/T2 — the composer is a pause
    !isTactical(view)
  );
}

function tryFrost(now: number): void {
  if (!canAct()) return; // no frost while frozen, done, or reading the FAQ
  const target = fogTarget(allMirrors, player, floor.grid);
  if (!target || breath < FOG_COST) return;
  const rt = mirrorRuntime.find((r) => r.id === target.id);
  if (!rt) return;
  if (rt.captured) return; // re-frosting a captured beacon buys nothing — keep the breath
  const wasCaptured = rt.captured;
  applyFog(mirrorRuntime, target.id, now);
  breath = updateBreath(breath, 0, true);
  if (!wasCaptured && rt.captured) {
    // Beacon shards bank as pending in the house state — awarded at clear.
    house = { ...house, shards: house.shards + SHARD_BEACON };
    hud.setChips({ beacons: beaconsCaptured(allMirrors, mirrorRuntime) });
    updateShardsChip(); // the new stake joins the display: `banked (+pending)`
    setExitLocked(!exitUnlocked(allMirrors, mirrorRuntime));
  }
}

// T3/T3 — the water visuals. One plane geometry + one static sheen texture
// for every pool on every floor: created lazily ONCE and never disposed, so
// the geometry/texture counts stay flat across floor rebuilds (the soak
// census's witness). The ripple read-out is the per-pool material's OPACITY
// — the only thing that ever changes on a pool (reduced-flash: no shimmer,
// one dim on ripple, one brighten when the water stills).
const WATER_STILL_OPACITY = 0.35;
const WATER_RIPPLED_OPACITY = 0.15;
const WATER_PLANE_M = CELL_SIZE - 0.6; // the patch sits clear of the cell walls
let waterGeo: THREE.PlaneGeometry | null = null;
let waterTex: THREE.CanvasTexture | null = null;
function waterGeometry(): THREE.PlaneGeometry {
  waterGeo ??= new THREE.PlaneGeometry(WATER_PLANE_M, WATER_PLANE_M);
  return waterGeo;
}
function waterSheen(): THREE.CanvasTexture | null {
  waterTex ??= canvasTexture(makeWaterCanvas(), 1, 1);
  return waterTex;
}
/** Still pools hold the still opacity; rippled pools sit dim until their TTL
 *  lapses — then the water stills again on its own (and re-ripples the very
 *  next step if the player still stands in it). */
function syncWaterVisuals(now: number): void {
  for (let i = 0; i < waterPatches.length; i++) {
    const mat = waterPatches[i]!.material as THREE.MeshBasicMaterial;
    mat.opacity = rippleState(waterRt[i]!.rippledAt, now)
      ? WATER_RIPPLED_OPACITY
      : WATER_STILL_OPACITY;
  }
}

function syncFogVisuals(now: number): void {
  for (let i = 0; i < mirrorRuntime.length; i++) {
    const rt = mirrorRuntime[i]!;
    const v = visuals[i]!;
    const state: MirrorFogState = mirrorVisual(rt, now);
    if (state === v.state) continue;
    v.state = state;
    v.bind.setFog(state);
  }
}
// The walking lantern rides the player (position set per frame below); its
// flame re-dresses with the stage palette at buildFloor (T2/T4) — the
// tier-one cream here is the boot default.
const lantern = new THREE.PointLight(0xffd9a0, 22, 18, 1.8);
scene.add(lantern, new THREE.AmbientLight(0x3a3f55, 0.7));
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 60);

// M3/T3 view modes. `view` is the one ViewMode value; [V] walks cycleView
// (focus → quad → overhead → focus). tactical is T4's Esc pause — unreachable
// by [V], but its predicates gate the loop already (isTactical pauses sim).
let view: ViewMode = 'focus';
/** The view chip's label — M4/T6: one source in the string table per mode. */
function viewLabel(v: ViewMode): string {
  return t(lang, `view.${v}`);
}

// QUAD side rig: three cameras at the player's eye, yawed by a fixed offset
// from the heading (left = −π/2, right = +π/2, back = π). Each pane is w/2 ×
// h/2 — halving both dimensions keeps the window's aspect, so the side cams
// share it and resize() keeps them in step with the main camera (T3 review
// fix: aspect 1 stretched the side panes ~2× on wide windows). They stay on
// layer 0 — the avatar (layer 1) remains visible only inside mirrors, by
// design. The front pane IS the main camera.
const QUAD_SIDE_YAW: readonly { cam: THREE.PerspectiveCamera; yaw: number }[] = [
  { cam: new THREE.PerspectiveCamera(75, 1, 0.1, 60), yaw: -Math.PI / 2 }, // left
  { cam: new THREE.PerspectiveCamera(75, 1, 0.1, 60), yaw: Math.PI / 2 }, // right
  { cam: new THREE.PerspectiveCamera(75, 1, 0.1, 60), yaw: Math.PI }, // back
];

const input = new InputCollector();
input.attach(window);
let mode: InputMode = save.mode;
const faq = buildFaqOverlay();
// step007/T1 — the About panel: version, pitch, beta, credits, links, tagline.
// Two doors: the ⓘ beside 🌐 (hud.ts) and the entry inside ⚙ (settings.ts);
// both land on this one overlay.
const about = buildAboutOverlay();
// step007/T2 — the 📮 feedback composer. On every open the textarea is
// pre-filled with the prompt + a FRESH diagnosticsSnapshot (below) — the
// player reads, edits or trims the whole thing before any button opens
// GitHub or a mail client. Nothing else reads this state; nothing sends it.
const feedback = buildFeedbackOverlay({ diagnostics: diagnosticsText });
/** The composer's diagnostics: READ-ONLY truth from live state, composed at
 *  open time — version, language, quality preset, the floor's seed + the
 *  campaign base, the phase, the venue pack (if any), the a11y flags, the
 *  remapped-key COUNT (never the bindings), the user agent, and the error
 *  ring. Function declaration on purpose: every let it reads is live at the
 *  moment the overlay opens, long after boot initialized them. */
function diagnosticsText(): string {
  const a = a11y();
  return diagnosticsSnapshot({
    appVersion: APP_VERSION,
    userAgent: navigator.userAgent,
    lang,
    preset,
    seed,
    floor: campaign.floor,
    campaignBase: campaign.seedBase,
    phaseKind: phase.kind,
    venueId: venue === null ? null : venue.id,
    reducedFlash: a.reducedFlash,
    captions: a.captions,
    textScale: a.textScale,
    remappedKeys: keymapDiffCount(a.keyMap, DEFAULT_KEYMAP),
    errors: errorRing,
  });
}
const aaina = buildAainaOverlay({ onBuyHint: buyHint });
// M5/T1 — the ⚙ settings overlay: every control applies at once (text scale
// re-sets the CSS var, reduced-flash flips the body class + the beat glow
// flag); persistence rides the usual debounce, flushed when it closes.
// M5/T2 — Controls goes live: rebinds run through the conflict guard and the
// new map lands in save.a11y.keyMap (validated on load by the strict gate);
// every successful write pushes the values back so the rows re-render.
function pushA11yValues(): void {
  settings.setValues({
    textScale: a11y().textScale,
    reducedFlash: a11y().reducedFlash,
    captions: a11y().captions,
    keyMap: a11y().keyMap,
    perf: perfChoice, // M5/T4 — the full SettingsValues shape (unchanged by rebinds)
  });
}
/** M5/T5 — the overlays' close hints follow the live map: FAQ's and Aaina's
 *  close labels name whatever key answers today (keyLabel(keyOf(...))), not
 *  the static default H/I — a remap never leaves a close hint naming a dead
 *  key. Called at boot and after every keymap write (rebind, reset). */
function pushCloseKeys(): void {
  faq.setCloseKey(keyLabel(keyOf('faq')));
  aaina.setCloseKey(keyLabel(keyOf('aaina')));
}
const settings = buildSettingsOverlay({
  onTextScale: (scale) => {
    save = { ...save, a11y: { ...a11y(), textScale: scale } };
    applyTextScale(scale);
    persist();
  },
  onReducedFlash: (on) => {
    save = { ...save, a11y: { ...a11y(), reducedFlash: on } };
    applyReducedFlash(on);
    persist();
  },
  onCaptions: (on) => {
    save = { ...save, a11y: { ...a11y(), captions: on } };
    persist(); // M5/T3 — the bar is live: pushCaption gates on this flag, and
    // the frame loop empties the feed the moment the toggle goes off
  },
  onPerf: (choice) => {
    // M5/T4 — manual override: the radio pins the rung (or returns to auto);
    // the choice persists, the preset lands at once (ratio) / next floor.
    save = { ...save, perf: choice };
    persist();
    setPerfChoice(choice);
  },
  onRebind: (action, code) => {
    const { map, conflict } = rebind(a11y().keyMap, action, code);
    if (conflict !== null) return conflict; // refused — the overlay names the owner inline
    save = { ...save, a11y: { ...a11y(), keyMap: map } };
    persist();
    pushA11yValues();
    pushCloseKeys();
    return null;
  },
  onResetKeys: () => {
    save = { ...save, a11y: { ...a11y(), keyMap: { ...DEFAULT_KEYMAP } } };
    persist();
    pushA11yValues();
    pushCloseKeys();
  },
  // M6/T1 — the Floors section: play the DEMO venue side-floor / return.
  onVenueFloor: () => void toggleDemoVenue(),
  // step007/T1 — the ⚙ About entry stacks the panel on top of ⚙.
  onAbout: () => about.toggle(),
  // step007/T2 — the ⚙ Feedback entry stacks the composer the same way.
  onFeedback: () => feedback.toggle(),
  onClosed: () => persist(true), // a closed overlay must not ride a debounce window
});
settings.setValues({
  textScale: a11y().textScale,
  reducedFlash: a11y().reducedFlash,
  captions: a11y().captions,
  keyMap: a11y().keyMap,
  perf: perfChoice, // M5/T4 — the radio reflects the live choice (DEV ?perf= included)
});
pushCloseKeys(); // M5/T5 — the close hints start on the saved bindings
const hud = createHud({
  mode,
  onMode: (m) => {
    mode = m;
    hud.setMode(m);
    save = { ...save, mode: m };
    persist();
  },
  onFaq: () => faq.toggle(),
  onAaina: () => aaina.toggle(),
  onDaily: () => {
    // T4 review fix: the navigation reloads the page — flush any pending
    // debounced write NOW or the reload eats it.
    persist(true);
    const d = dailySeed(todayStamp());
    // keep the UI language across the jump (M4/T6) — the URL param is the
    // highest-priority resolver, so an unnamed lang would fall to the save's
    const params = `?seed=${d}${lang === 'hi' ? '&lang=hi' : ''}`;
    window.location.search = params;
  },
  onFrost: () => tryFrost(performance.now()),
  onMute: () => toggleMute(),
  onPlayAgain: () => playAgain(),
  onStay: () => stayInDwaar(),
  // M4/T4 — the save chain's front door: 💾 export / 📂 import.
  onExport: () => void exportSave(),
  onImport: () => void importSave(),
  // M4/T6 — the 🌐 button: en ↔ hi, saved at once, chrome re-rendered now.
  onLang: () => cycleLang(),
  // M5/T1 — the ⚙ button.
  onSettings: () => settings.toggle(),
  // step007/T1 — the ⓘ beside 🌐.
  onAbout: () => about.toggle(),
  // step007/T2 — the 📮 beside ⓘ.
  onFeedback: () => feedback.toggle(),
});

/** M4/T6 — one fn that re-feeds every localized surface the HUD/overlays own.
 *  The HUD's own setLang relabels its buttons/chips from cached values; the
 *  setters below re-send the strings main composes (view chip, floor chip,
 *  mute label). The per-frame hint line re-localizes on its next frame.
 *  M5/T6 — the document's own lang attribute rides along, so assistive tech
 *  switches pronunciation with the 🌐 button (and boots right from ?lang=). */
function refreshChrome(): void {
  document.documentElement.lang = lang;
  hud.setLang(lang);
  aaina.setLang(lang);
  faq.setLang(lang);
  about.setLang(lang); // step007/T1 — the About panel is bilingual chrome
  feedback.setLang(lang); // step007/T2 — the composer's chrome flips too
  settings.setLang(lang);
  hud.setMode(mode);
  hud.setView(viewLabel(view));
  hud.setFloor(venue === null ? floorChipLabel(campaign) : `☕ ${venue.name}`);
  hud.setMuted(audio.muted);
  if (venue !== null) showVenueBanner(venue); // M6/T1 — the banner re-localizes
}

function cycleLang(): void {
  lang = lang === 'en' ? 'hi' : 'en';
  save = { ...save, lang };
  persist();
  refreshChrome();
}
refreshChrome(); // the boot paint: labels, chips and the 🔊 state in `lang`

/** M4/T7 — the ONE writer of the shards chip. Before this, six call sites
 *  each fed setChips a `shards:` number — sometimes the banked purse
 *  (save.shards, the IDB truth), sometimes the floor's pending captures
 *  (house.shards, banked only at clear, forfeited on a fail), so the chip
 *  silently flipped between two meanings mid-run. Now the display is always
 *  `banked (+pending)` — the purse plus what this attempt has staked — and
 *  `(+0)` hides: nothing at stake reads as just the purse. Every shards
 *  mutation (beacon capture, hint buy, clear banking, fail forfeit, floor
 *  rebuild, dev grant) funnels through here; nothing else may write it. */
function updateShardsChip(): void {
  // M6/T1 — a venue floor's pending captures never bank, so they never show
  // as a stake either (the banner's note is the promise; this is the ledger).
  const pending = venue === null ? house.shards : 0;
  hud.setChips({ shards: pending > 0 ? `${save.shards} (+${pending})` : save.shards });
}

// ---- Campaign floor lifecycle (M4/T2) --------------------------------------
// The Stair Door flow: clearing floors 1–9 holds 0.8s behind a `descending…`
// overlay, then the campaign descends and the next floor arms (timer starts on
// its first input). Clearing the Dwaar claims the Truth-Shard — the tier
// screen offers Play again (fresh random base) or Stay (a sanctioned free
// walk: sim live, echoes respawned for sport, but no objectives and no second
// banking — the clear check is off while dwaarFreeWalk).
let descendAt: number | null = null; // when the held clear turns into a descend
let dwaarFreeWalk = false; // Stay: the cleared Dwaar is a sandbox
// M5/T5 — the re-clear banking gate's eye: was the tier ALREADY complete when
// this floor was entered? Captured once per buildFloor, never read live, so a
// floor-10 resume of a finished tier banks its re-frosted beacons but never a
// second perfect/stuck bonus (see bankOnClear).
let tierCompleteAtEntry = false;
// T5/T1 — the Act II banner's once-per-session eye: flipped on the first
// floor-41 build. Session-scoped on purpose (a refresh of 41 raises it
// again — it is an act-opening flourish, not a save fact).
let actBannerShown = false;

/** Free one floor's stage resources: buildFloorScene owns all of its
 *  materials/textures (they are created per floor), so a tree walk is safe.
 *  Mirror/echo visuals never pass through here — their modules' dispose
 *  methods skip the shared fog/crack/glass materials by construction. */
function disposeTree(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) {
      (m as THREE.MeshStandardMaterial).map?.dispose();
      m.dispose();
    }
  });
}

function teardownFloor(): void {
  for (const dispose of floorDisposers) dispose();
  floorDisposers = [];
}

/** The floor chip: `L02` on the tier-one ramp; tier two floors carry the
 *  `· T2` suffix (`L14 · T2`), tier three the `· T3` suffix (`L24 · T3`),
 *  tier four the `· T4` suffix (`L34 · T4`), tier five the `· T5` suffix
 *  (`L44 · T5`); the threshold floors name their Dwaar (`L10 · DWAAR I ✦`,
 *  `L20 · DWAAR II ✦`, `L30 · DWAAR III ✦`, `L40 · DWAAR IV ✦`,
 *  `L50 · DWAAR V ✦`).
 *  M4/T6: the `L`/`स्तर` prefix, the `DWAAR`/`द्वार` name and the tier
 *  suffix localize. */
function floorChipLabel(c: Campaign): string {
  const tag = `${t(lang, 'chip.floor')}${String(c.floor).padStart(2, '0')}`;
  if (isDwaar(c.floor)) {
    const numeral =
      c.floor === DWAAR_FLOOR
        ? 'I'
        : c.floor === TIER_TWO_FLOORS
          ? 'II'
          : c.floor === TIER_FOUR_FLOORS
            ? 'IV'
            : c.floor === TIER_FIVE_FLOORS
              ? 'V'
              : 'III';
    return `${tag} · ${t(lang, 'chip.dwaar')} ${numeral} ✦`;
  }
  const tier = tierOf(c.floor);
  return tier === 5
    ? `${tag} · ${t(lang, 'chip.tier5')}`
    : tier === 4
      ? `${tag} · ${t(lang, 'chip.tier4')}`
      : tier === 3
        ? `${tag} · ${t(lang, 'chip.tier3')}`
        : tier === 2
          ? `${tag} · ${t(lang, 'chip.tier')}`
          : tag;
}

/** Build the campaign's current floor. Floors 1–9 come from the procedural
 *  generator seeded by floorSeed(campaign) with the ramp's braid and object
 *  counts (M2_PARAMS base, echoes/beacons overridden); floor 10 is the
 *  hand-authored Dwaar hall — its grid from DWAAR_LAYOUT via floorFromGrid,
 *  same object placer with the Dwaar counts (4 beacons, 4 echoes). The build
 *  also performs the full per-floor reset — fresh mirror runtime, echoes,
 *  Chhaya trail, house (the attempt tally rides along), fog, radar, hints,
 *  breath — and re-arms the phase machine, so the timer starts on this
 *  floor's first input.
 *
 *  M6/T1 — `pack` builds a venue SIDE-FLOOR instead: the same machines with
 *  the pack's maze/object parameters, its accent colors on the exit marker
 *  (primary) and beacon emissive (secondary), and its own daily seed. The
 *  campaign object `c` is still passed (its floor number rebuilds on return)
 *  but nothing campaign-shaped is read for the venue floor's difficulty. */
function buildFloor(c: Campaign, pack: VenuePack | null = null): void {
  teardownFloor();
  venue = pack; // the side-floor flag every campaign hook below reads
  tierCompleteAtEntry = c.tierComplete; // the re-clear gate reads entry state, never live state
  const fp = floorParams(c.floor);
  const vp = pack === null ? null : venueFloorParams(pack);
  seed = pack === null ? floorSeed(c) : venueSeed(pack, todayStamp());
  floor =
    pack !== null
      ? generateFloor({ ...TIER_ONE, seed, ...vp!.mazeOverrides }) // always procedural, pack-shaped
      : isDwaar(c.floor)
        ? floorFromGrid(dwaarGrid(c.floor), seed) // Dwaar I (10), II (20), III (30), IV (40) or V (50)
        : generateFloor({ ...TIER_ONE, seed, braid: fp.braid });
  exitCenter = floor.grid.cellCenter(floor.exit.x, floor.exit.y);

  // The tier dresses the stage (T2/T3): campaign floors 11–20 wear the Hall
  // of Ancestors palette, 21–30 the Reflecting Gardens, 31–40 the Carnival
  // of Faces, 41–50 the Flood Halls — the same floorAccent lattice
  // re-tinted, tiers 1–10 keep the night-blue tier-one set untouched. The
  // melody moves with it (T3/T4): Durga pentatonic on tier-2 floors, the
  // pastoral pentatonic AND the flute voice (sine) on tier-3, the
  // mischievous pentatonic back on the triangle (the reed's wink) on tier-4
  // — swapped live (next note uses them; the drone root never moves).
  // T5/T1: tier 5 RIDES the carnival groove as the documented stand-in until
  // the dark pentatonic lands (T5/T4 — the retire-the-stand-in pattern).
  // Venue side-floors stay tier-one dressed — scale AND voice: a return
  // from a sponsored floor resets both to the tier-one pair.
  const tier = tierOf(c.floor);
  if (pack === null) {
    const scaleByTier = {
      1: TIER_ONE_SCALE,
      2: TIER_TWO_SCALE,
      3: TIER_THREE_SCALE,
      4: TIER_FOUR_SCALE,
      5: TIER_FOUR_SCALE, // T5/T1 stand-in until T5/T4's dark pentatonic
    } as const;
    const voiceByTier = {
      1: 'triangle',
      2: 'triangle',
      3: 'sine',
      4: 'triangle',
      5: 'triangle', // T5/T1 stand-in until T5/T4
    } as const;
    audio.setScale(scaleByTier[tier]);
    audio.setVoice(voiceByTier[tier]);
  } else {
    audio.setScale(TIER_ONE_SCALE);
    audio.setVoice('triangle');
  }
  // The pack's accents dress the stage: primary on the exit marker (the
  // beacon gate's unlocked tint follows), secondary on the entrance marker.
  const stagePalette =
    pack === null
      ? paletteForTier(tier)
      : { ...TIER_ONE_PALETTE, exit: pack.accent.primary, entrance: pack.accent.secondary };
  // T2/T4 (carried one-liners) — the haze follows the stage: tier-2 halls fog
  // warm-dark brown instead of night-blue, and the walking lantern takes the
  // palette's flame. Tier-1 (and venue) values ARE the boot constants, so
  // those floors render unchanged.
  voidColor.setHex(stagePalette.void);
  voidFog.color.setHex(stagePalette.void);
  lantern.color.setHex(stagePalette.lantern);
  const stage = buildFloorScene(floor, stagePalette);
  sceneBuilt = stage;
  scene.add(stage.group);
  exitMarkerMat = stage.exitMarker.material as THREE.MeshStandardMaterial;
  exitUnlockedTint = exitMarkerMat.emissive.getHex();
  floorDisposers.push(() => {
    scene.remove(stage.group);
    disposeTree(stage.group);
  });

  // Deterministic floor objects + the 2 hero mirrors at the entrance/exit
  // kept as standing mirrors (M2). Their geometry comes from the pure
  // `mirrorSpotFor` (identical to `mirrorSpots` — proven by T2's cross-check
  // test), so binding a MirrorRef to its hero visual is a position match.
  // M5/T4 — the preset picks the hero class: RT heroes on mid/high (at the
  // profile's RT size — 256 mid, 512 high), the no-RT stand-in (reflective
  // fake material, the same fog/crack interface) on low. TRUE mirrors below
  // keep their 256px RT on EVERY preset — their reflection is the
  // gameplay-critical step-through visibility.
  objs =
    pack === null
      ? generateFloorObjects(floor, {
          ...M2_PARAMS,
          beacons: fp.beacons,
          echoes: fp.echoes,
          // T2 — the Hall of Ancestors hangs 2–3 ancestor portraits per floor
          // (the rng's coin on top of the 2 decides the third); tier-1 keeps
          // 0. T3/T1: tier-3 keeps 0 TOO — the gate is `=== 2`, so the
          // Gardens hang water, not ancestors, and the tier-1/3 rng streams
          // stay clean (pinned by the t3 e2e leg: portraits === 0 on 21/30).
          portraits: tierOf(c.floor) === 2 ? 2 : 0,
          // T3/T3 — the Gardens' standing water: 2–4 pools on every tier-3
          // floor (the param is the floor of the range, the rng's int(3) the
          // rest); tier-1/2 and venues keep 0 — their rng streams untouched.
          water: tierOf(c.floor) === 3 ? 2 : 0,
          // T4/T3 — the Carnival's distorting mirrors: 2–3 panes on every
          // tier-4 floor (the param is the floor of the range, one rng coin
          // the third; the draws run LAST-LAST so tiers 1–3 stay pinned);
          // venues keep 0 — no carnival glass on a sponsored floor.
          distort: tierOf(c.floor) === 4 ? 2 : 0,
        })
      : generateFloorObjects(floor, { ...M2_PARAMS, ...vp!.objectOverrides });
  const qp = PROFILES[preset];
  const heroes: HeroMirror[] = [];
  const heroStandIns: CheapMirror[] = [];
  for (const s of mirrorSpots(floor)) {
    if (qp.heroRt) {
      const m = new HeroMirror(s, { size: qp.heroRtSize });
      heroes.push(m);
      scene.add(m.mesh);
    } else {
      const cm = createHeroStandIn(s);
      heroStandIns.push(cm);
      scene.add(cm.mesh);
    }
  }
  heroMirrors = heroes;
  floorDisposers.push(() => {
    for (const m of heroes) {
      scene.remove(m.mesh);
      m.dispose();
    }
    for (const cm of heroStandIns) {
      scene.remove(cm.mesh);
      cm.dispose();
    }
  });
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
  allMirrors = [...objs.mirrors, ...heroRefs];
  mirrorRuntime = initMirrorRuntime(allMirrors);

  // Bind every mirror to its visual (convention pinned at MIRROR_MATCH_EPS).
  const nextTrue: HeroMirror[] = [];
  const nextSilvered: Array<{ ref: MirrorRef; door: SilveredDoor }> = [];
  const cheap: CheapMirror[] = [];
  visuals = allMirrors.map((m) => {
    const hero = heroes.find(
      (h) => Math.hypot(h.mesh.position.x - m.x, h.mesh.position.z - m.z) < MIRROR_MATCH_EPS,
    );
    if (hero) return { bind: hero, hero, state: 'clear' as const };
    // M5/T4 — on the low preset the hero spots are the no-RT stand-ins; the
    // same position match binds them (hero null: no RT pass, no hero slot).
    const standIn = heroStandIns.find(
      (c) => Math.hypot(c.mesh.position.x - m.x, c.mesh.position.z - m.z) < MIRROR_MATCH_EPS,
    );
    if (standIn) return { bind: standIn, hero: null, state: 'clear' as const };
    if (m.kind === 'true') {
      const tm = new HeroMirror(m, { size: 256, frame: true });
      nextTrue.push(tm);
      scene.add(tm.mesh);
      return { bind: tm, hero: tm, state: 'clear' as const };
    }
    if (m.kind === 'silvered' && m.wallDir !== null) {
      const door = createSilveredDoor(m, m.wallDir);
      // The slab coincides exactly with the wall instance it covers — hide that
      // edge now, or the two z-fight from frame one (push-time hide is too late).
      stage.hideWallEdge(m.cellX, m.cellY, m.wallDir);
      nextSilvered.push({ ref: m, door });
      scene.add(door.group);
      return { bind: door.mirror, hero: null, state: 'clear' as const };
    }
    if (m.kind === 'portrait') {
      // T2 — the ancestor: wall-mounted like the standing glass, her dim
      // silhouette deterministic per mirror id; fog/crack ride the same
      // CheapMirror interface, so the shared visual loop needs no cases.
      const pm = createPortraitMirror(m.id);
      pm.mesh.position.set(m.x, 1.35, m.z);
      pm.mesh.rotation.y = m.rotY;
      scene.add(pm.mesh);
      cheap.push(pm);
      return { bind: pm, hero: null, state: 'clear' as const };
    }
    if (m.kind === 'distort') {
      // T4/T3 — the carnival glass: the standing-mirror base in the tier's
      // rose, its plane's vertices bent once at creation (static geometry —
      // reduced-flash safe). Fog/crack ride the same CheapMirror interface;
      // a fogged pane swaps to the shared matte and stops lying.
      const dm = createDistortMirror();
      dm.mesh.position.set(m.x, 1.35, m.z);
      dm.mesh.rotation.y = m.rotY;
      scene.add(dm.mesh);
      cheap.push(dm);
      return { bind: dm, hero: null, state: 'clear' as const };
    }
    const cm = createMirrorMesh(m.kind, pack?.accent.secondary); // M6/T1 — beacon emissive accent
    cm.mesh.position.set(m.x, 1.35, m.z);
    cm.mesh.rotation.y = m.rotY;
    scene.add(cm.mesh);
    cheap.push(cm);
    return { bind: cm, hero: null, state: 'clear' as const };
  });
  trueMirrors = nextTrue;
  silveredDoors = nextSilvered;
  floorDisposers.push(() => {
    for (const tm of nextTrue) {
      scene.remove(tm.mesh);
      tm.dispose();
    }
    for (const { door } of nextSilvered) {
      scene.remove(door.group);
      door.dispose();
    }
    for (const cm of cheap) {
      scene.remove(cm.mesh);
      cm.dispose();
    }
  });

  // T3/T3 — the standing water: one flat translucent patch per pool, a
  // breath above the floor plane (0.03 m — under the 0.06 m markers, over
  // the stage floor). The sheen is STATIC (reduced-flash); a pool's material
  // opacity is the ripple read-out (see syncWaterVisuals). Empty on every
  // tier-1/2/venue floor — objs.water is the gated rng's output.
  waterRt = initWaterRuntime(objs.water);
  waterPatches = objs.water.map((w) => {
    const mat = new THREE.MeshBasicMaterial({
      map: waterSheen(), // null-safe: flat teal when the canvas is unavailable
      transparent: true,
      opacity: WATER_STILL_OPACITY,
      depthWrite: false, // translucent glass over the floor, never occludes
    });
    if (mat.map === null) mat.color.setHex(0x3fae9a); // water-teal fallback
    const mesh = new THREE.Mesh(waterGeometry(), mat);
    mesh.rotation.x = -Math.PI / 2; // lie flat, facing up
    mesh.position.set(w.x, 0.03, w.y);
    scene.add(mesh);
    return mesh;
  });
  floorDisposers.push(() => {
    for (const mesh of waterPatches) {
      scene.remove(mesh);
      (mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    waterPatches = [];
    waterRt = [];
    // the shared geometry + sheen texture are singletons: they stay (their
    // counts never climb across floors — the soak census's witness)
  });

  echoes = initEchoes(objs.echoSpawns, floor.grid, objs.patrolAnchors, performance.now());
  const meshes = echoes.map(() => {
    const mesh = createEchoMesh();
    scene.add(mesh);
    return mesh;
  });
  echoMeshes = meshes;
  floorDisposers.push(() => {
    for (const mesh of meshes) {
      scene.remove(mesh);
      disposeEchoMesh(mesh);
    }
  });

  // M4/T3 — Taal's cameo (floor 5); T2 — his promotion: the Sentinel from
  // floor 11 up, sharing the echoes' patrol anchors. One figure on the stage,
  // one state on the loop; every other floor leaves both null (teardownFloor
  // already cleared them when the previous floor was his). M6/T1 — never on a
  // venue floor: the campaign's beat stays home. T3/T4 — the tier-2-only gate
  // WIDENED to every floor from TAAL_SENTINEL_FLOOR up: the ladder
  // ACCUMULATES Sentinels (spec §4.4 — tier 2 ADDS Taal, tier 3 ADDS Gher),
  // so he keeps the beat through the Gardens beside the Encircler. His touch
  // already catches on every floor that far (taalOutcome). T5/T1 — the gate
  // reads taalPresent() now: the rotation changes nothing for him (he walks
  // every floor 11+ INCLUDING Act II — the one Sentinel who never rests).
  if (pack === null && (c.floor === TAAL_FLOOR || taalPresent(c.floor))) {
    const fig = createTaal();
    scene.add(fig.group);
    taalFigure = fig;
    // the far-anchor spawn (T3/T4, the initGher precedent): the beat-walker
    // starts far from the player's spawn — never on it
    taal = initTaal(objs.patrolAnchors, spawnPlayer(floor));
    fig.group.visible = taal !== null; // degenerate anchorless floor: no cameo
    floorDisposers.push(() => {
      scene.remove(fig.group);
      fig.dispose();
      taalFigure = null;
      taal = null;
    });
  }

  // T3/T2 — Gher the Encircler: from GHER_SENTINEL_FLOOR (21) up he walks
  // every tier-3 floor. No sensing, no beat — pure prediction (see gher.ts)
  // — spawning at the patrol anchor farthest from the player. Same shape as
  // Taal above: one figure on the stage, one state on the loop, null
  // everywhere else. T4/T2 — the gate WIDENED past the Gardens (the ladder
  // accumulated; all three walked the Carnival). T5/T1 — the ROTATION: the
  // accumulation stops — gherPresent() rests him on the Flood Halls
  // (41–49) and calls him down ONLY for the Dwaar V duel (50); floors
  // 21–30 read exactly as always. M6/T1 — never on a venue floor: the
  // campaign's roads stay home.
  if (pack === null && gherPresent(c.floor)) {
    const fig = createGher();
    scene.add(fig.group);
    gherFigure = fig;
    gher = initGher(objs.patrolAnchors, spawnPlayer(floor));
    fig.group.visible = gher !== null; // degenerate anchorless floor: no seal
    floorDisposers.push(() => {
      scene.remove(fig.group);
      fig.dispose();
      gherFigure = null;
      gher = null;
    });
  }

  // T4/T2 — Aavart the Ambusher: from AVART_SENTINEL_FLOOR (31) up he walks
  // every tier-4 floor, BESIDE Taal and Gher (the ladder accumulated — all
  // three walked the Carnival). No sensing, no beat — pure velocity
  // projection (see avart.ts) — spawning at the patrol anchor farthest from
  // the player. Same shape as the two above: one figure on the stage, one
  // state on the loop, null everywhere else. T5/T1 — the ROTATION:
  // aavartPresent() rests him on the Flood Halls (41–49) and calls him down
  // ONLY for the Dwaar V duel (50); floors 31–40 read exactly as always.
  // M6/T1 — never on a venue floor: the campaign's pace stays home.
  if (pack === null && aavartPresent(c.floor)) {
    const fig = createAavart();
    scene.add(fig.group);
    aavartFigure = fig;
    aavart = initAavart(objs.patrolAnchors, spawnPlayer(floor));
    fig.group.visible = aavart !== null; // degenerate anchorless floor: no ambush
    floorDisposers.push(() => {
      scene.remove(fig.group);
      fig.dispose();
      aavartFigure = null;
      aavart = null;
    });
  }

  // T5/T2 — the mirror-you decoys reset with the floor: any attempt's leftover
  // figures die here (teardownFloor already ran the previous floor's disposer,
  // so the arrays are empty — this re-arms the clock on the Flood Halls only,
  // seeded from THIS floor's seed like every other rng stream).
  decoyIdNext = 0;
  decoyRng = createRng(`${seed}:decoys`);
  nextDecoySpawnAt = decoysActiveFloor() ? performance.now() + decoySpawnInterval() : Infinity;
  floorDisposers.push(() => {
    for (const fig of decoyFigures) {
      scene.remove(fig.group);
      fig.dispose();
    }
    decoyFigures = [];
    decoys = [];
  });

  // T7 passages: a silvered ref always gets its door machine here; a rebuild
  // starts every door closed again (the old floor's secrets died with it).
  doorStates = new Map();
  doorById = new Map();
  for (const m of allMirrors) if (m.kind === 'silvered') doorStates.set(m.id, createDoor(m.id));
  for (const { ref, door } of silveredDoors) doorById.set(ref.id, door);

  // Full per-floor reset: everything an attempt owns starts fresh; the house's
  // attempt tally is the one thing that rides along between floors.
  house = { ...initHouseState(), attempts: house.attempts };
  breath = 1;
  hintsUsed = 0; // a fresh floor prices Aaina's hints from the base again
  purchasedHint = null;
  path = []; // Chhaya loses the trail; she hides until the new path ages
  chhaya.visible = false;
  chhayaAnnounced = false; // the new floor's first sighting speaks again
  distortAnnounced = false; // the new floor's first displacement speaks again
  anger60Spoken = anger90Spoken = false; // a fresh house has said nothing
  player = spawnPlayer(floor);
  visited.clear(); // the fog closes in — the new floor starts unexplored
  pings = []; // the old floor's radar is spent
  lastChhayaPingAt = 0;
  waypoints.length = 0; // tactical marks belong to the floor they were laid on
  phase = createFloorRun(); // re-armed — the timer starts on the first input
  dwaarFreeWalk = false;
  descendAt = null;
  markVisited(); // the spawn cell is explored from the first breath
  input.snapshotAndReset(); // nothing banked behind an overlay fires on the new floor
  hud.hideFail();
  hud.hideCleared();
  hud.hideDescend();
  hud.hideTier();
  setExitLocked(true); // the stair door starts sealed behind its beacons
  hud.setFloor(pack === null ? floorChipLabel(c) : `☕ ${pack.name}`);
  hud.setChips({
    beacons: beaconsCaptured(allMirrors, mirrorRuntime),
    timerMs: null,
  });
  updateShardsChip(); // a fresh floor stakes nothing — the purse alone shows
  // T5/T1 — the Act II banner: the FIRST floor-41 build of a session raises
  // `ACT II — THE DECEPTION` + its copying-you line for 3s (once per
  // session — the flag lives for the page's lifetime, never the save).
  // Rebuilds of 41 (a fail, a Stay return) stay quiet; venue floors and
  // every other floor never see it.
  if (pack === null && c.floor === TIER_FOUR_FLOORS + 1 && !actBannerShown) {
    actBannerShown = true;
    hud.showActBanner();
    pushCaption('act', t(lang, 'overlay.actBanner'));
  }
  // M6/T1 — the side-floor banner rises with the pack's floor and falls with
  // every campaign build (the return included). setVenue flips the ⚙ Floors
  // button between Play and Return.
  if (pack === null) hud.hideVenue();
  else showVenueBanner(pack);
  settings.setVenue(pack !== null);
}

/** Compose + raise the venue banner from the pack + the live language (the
 *  🌐 flip re-runs this through refreshChrome, so the banner re-localizes). */
function showVenueBanner(pack: VenuePack): void {
  hud.showVenue({
    title: fill(t(lang, 'venue.banner'), { name: pack.name }),
    tagline: venueString(pack, lang, 'tagline'),
    note: t(lang, 'venue.bannerNote'),
    returnLabel: t(lang, 'venue.return'),
    onReturn: returnToCampaign,
  });
}

/** Fetch + strictly validate a venue pack by id. Null — never a throw — for a
 *  malformed id, a failed fetch, or an invalid document: the venue floor is
 *  an opt-in side excursion, never a boot risk. */
async function loadVenuePack(id: string): Promise<VenuePack | null> {
  if (!/^[a-z0-9-]{3,24}$/.test(id)) return null; // slugs only — no path games
  try {
    const res = await fetch(`/venues/${id}.json`);
    if (!res.ok) return null;
    return validateVenuePack(await res.json());
  } catch {
    return null;
  }
}

/** Leave the venue side-floor. The campaign floor REBUILDS fresh at the same
 *  floor number — mid-floor progress is lost (the banner said so); the
 *  campaign, the save, bests, and the purse were never touched to restore. */
function returnToCampaign(): void {
  if (venue === null) return;
  buildFloor(campaign);
}

/** The ⚙ Floors button: play the DEMO pack's floor, or return once one is
 *  live. A pack that fails to load says so and changes nothing. */
async function toggleDemoVenue(): Promise<void> {
  if (venue !== null) {
    returnToCampaign();
    return;
  }
  const pack = await loadVenuePack(DEMO_VENUE_ID);
  if (pack === null) {
    hud.toast(t(lang, 'toast.venueRejected'));
    return;
  }
  buildFloor(campaign, pack);
}

/** Tier screen → Stay: the cleared Dwaar stays open as a free walk. The shard
 *  and the best are already banked; the echoes respawn for sport and the
 *  timer re-arms, but the clear check stays off (dwaarFreeWalk) so nothing
 *  banks twice. */
function stayInDwaar(): void {
  hud.hideTier();
  dwaarFreeWalk = true;
  phase = createFloorRun(); // sanctioned live floor — ready, clock on first input
  echoes = initEchoes(objs.echoSpawns, floor.grid, objs.patrolAnchors, performance.now());
  input.snapshotAndReset();
}

/** Tier screen → Play again: a whole new campaign on a fresh random base —
 *  floor 1 from the top, chip and all. */
function playAgain(): void {
  campaign = newCampaign(randomSeed());
  save = mergeCampaign(save, campaign);
  persist(true); // part of the tier flow — the new spine banks before it walks
  buildFloor(campaign);
}

// M6/T1 — the venue side-floor boot: `?venue=<pack-id>` fetches + strictly
// validates the pack and builds ITS floor instead of the campaign's (the
// campaign object stays exactly as booted above — the return rebuilds it). A
// malformed id, a failed fetch, or an invalid document falls back to the
// campaign floor: the param is an opt-in, never a boot risk. The await rides
// the same top-level-await window the save load owns, so the debug hook below
// still registers only after the floor exists.
const bootVenueId = urlParams.get('venue');
const bootVenuePack = bootVenueId === null ? null : await loadVenuePack(bootVenueId);
buildFloor(campaign, bootVenuePack); // the first floor arms — chip, beacons, sealed door

// step007/T3 — test mode's two surfaces, created ONLY when the flag is live,
// so a default load never carries either element (e2e asserts the absence):
// the TESTER chip, refreshed with fps + the live seed by the frame loop, and
// the one-time banner that says what just unlocked.
/** The TESTER chip: the diagnostics chip's styling docked bottom-left, its
 *  text `TESTER · {fps} · {seed}` — the live floor seed already encodes
 *  base:floor (`TESTMO:3`), so no separate floor field is owed. */
function createTesterChip(): HTMLElement {
  const chip = document.createElement('div');
  chip.id = 'mh-tester';
  chip.textContent = `TESTER · 0 · ${seed}`;
  document.body.appendChild(chip);
  return chip;
}
/** The one-time banner: rises with the first floor and hides itself after
 *  6s ([hidden], never removed — the element count stays stable for e2e).
 *  Localized like every chrome string. */
function showTesterBanner(): void {
  const banner = document.createElement('div');
  banner.id = 'mh-tester-banner';
  banner.textContent = t(lang, 'tester.banner');
  document.body.appendChild(banner);
  window.setTimeout(() => {
    banner.hidden = true;
  }, 6000);
}
const testerChip = testMode ? createTesterChip() : null;
if (testMode) showTesterBanner();
canvas.addEventListener('click', () => {
  if (mode === 'hybrid') {
    const lock = canvas.requestPointerLock() as unknown as
      { catch?: (cb: () => void) => void } | undefined;
    lock?.catch?.(() => {});
  }
});
// Audio speaks only after the FIRST user gesture — one keydown, one pointer
// press, or one canvas click, whichever comes first. `{ once: true }` retires
// each listener after its own firing; the flag makes the loser of that race a
// no-op.
let audioGestureDone = false;
function startAudioOnGesture(): void {
  if (audioGestureDone) return;
  audioGestureDone = true;
  audio.start();
  pushCaption('audio-start', t(lang, 'caption.audioStarted')); // M5/T3 — the music's first breath
}
window.addEventListener('keydown', startAudioOnGesture, { once: true });
window.addEventListener('pointerdown', startAudioOnGesture, { once: true });
canvas.addEventListener('click', startAudioOnGesture, { once: true });
// [M] and the HUD 🔊 button toggle the mute (M3/T6); the choice persists in
// meta.muted and the next boot re-applies it before the engine ever starts.
function toggleMute(): void {
  const next = !audio.muted;
  audio.setMuted(next);
  save = { ...save, muted: next };
  persist();
  hud.setMuted(next);
  pushCaption(next ? 'muted' : 'unmuted', t(lang, next ? 'caption.muted' : 'caption.unmuted'));
}

// M4/T4 — 💾 export / 📂 import. The File System Access API is the happy
// path where it exists; <a download> / <input type=file> are the fallbacks.
// Import validates strictly, flushes into IDB, and reloads — the boot chain
// then applies the imported save exactly as it would a stored one. A rejected
// file says so via the HUD toast (the per-frame hint line would eat it).
const SAVE_FILE_NAME = 'mirror-house-save.json';
const SAVE_FILE_TYPES = [
  { description: 'Mirror House save', accept: { 'application/json': ['.json'] } },
];
type WritableLike = { write(data: string): Promise<void>; close(): Promise<void> };

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'; // user closed the picker
}

async function exportSave(): Promise<void> {
  const text = serializeSave(save);
  const picker = (
    window as unknown as {
      showSaveFilePicker?: (o: unknown) => Promise<{ createWritable(): Promise<WritableLike> }>;
    }
  ).showSaveFilePicker;
  if (typeof picker === 'function') {
    try {
      const handle = await picker.call(window, {
        suggestedName: SAVE_FILE_NAME,
        types: SAVE_FILE_TYPES,
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      hud.toast(t(lang, 'toast.exported'));
      return;
    } catch (e) {
      if (isAbort(e)) return; // changed their mind — not an error
      // fall through to the download fallback
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = SAVE_FILE_NAME;
  a.click();
  URL.revokeObjectURL(url);
  hud.toast(t(lang, 'toast.exported'));
}

/** Ask the user for one file and read its text; null = cancelled/none. */
async function pickSaveText(): Promise<string | null> {
  const picker = (
    window as unknown as {
      showOpenFilePicker?: (o: unknown) => Promise<Array<{ getFile(): Promise<File> }>>;
    }
  ).showOpenFilePicker;
  if (typeof picker === 'function') {
    try {
      const [handle] = await picker.call(window, { types: SAVE_FILE_TYPES, multiple: false });
      if (!handle) return null;
      return await (await handle.getFile()).text();
    } catch (e) {
      if (isAbort(e)) return null;
      // fall through to <input type=file>
    }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (f) void f.text().then((t) => resolve(t));
      else resolve(null);
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

async function importSave(): Promise<void> {
  const text = await pickSaveText();
  if (text === null) return; // picker dismissed — nothing to say
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    hud.toast(t(lang, 'toast.rejected'));
    return;
  }
  const next = validateSave(parsed);
  if (next === null) {
    hud.toast(t(lang, 'toast.rejected'));
    return;
  }
  // Cancel any pending debounced write FIRST — it would clobber the imported
  // save with the pre-import in-memory state if it fired before the reload.
  if (persistTimer !== null) {
    window.clearTimeout(persistTimer);
    persistTimer = null;
  }
  await idbPut(next);
  // M5/T5 — reload to the bare PATH, not location.reload(): a `?seed=` in the
  // URL wins the boot race over the save, so a reload that kept it would boot
  // the URL's floor 1 and the imported campaign would never resume. The
  // imported save carries its own lang/perf, so nothing in the query is owed
  // a carry-over.
  location.assign(location.pathname); // the boot chain applies the new save from IDB
}
// [V] cycles the view (M3/T3), a keydown press like frost. Pixel ratio is part
// of the mode: quad's four panes render at ratio 1, every other mode restores
// the focus-ratio buffer — the live devicePixelRatio capped by the M5/T4
// preset's rung. The map modes own the 2D canvas's visibility (shown for
// overhead/tactical, hidden and cleared otherwise). The chip names the mode
// you landed in.
function focusPixelRatio(): number {
  return Math.min(window.devicePixelRatio, PROFILES[preset].pixelRatioCap);
}
/** The one door for ratio writes — preset changes and view cycles alike. */
function applyPixelRatio(): void {
  renderer.setPixelRatio(view === 'quad' ? QUAD_PIXEL_RATIO : focusPixelRatio());
}
function setViewMode(next: ViewMode): void {
  view = next;
  applyPixelRatio();
  const mapShowing = showsOverhead(next);
  overheadCanvas.style.display = mapShowing ? 'block' : 'none';
  if (mapShowing) {
    // M4/T7 — entering a map releases a hybrid-mode pointer lock: the lock
    // would keep the cursor captive (and hidden) over the 2D canvas, which
    // needs a free pointer for waypoint clicks. Guarded — the API is missing
    // in some embedders — and a no-op when nothing is locked. The lock returns
    // on the next canvas click (see the requestPointerLock listener).
    document.exitPointerLock?.();
  }
  if (!mapShowing) overhead.clear();
  hud.setView(viewLabel(next));
}

// TACTICAL (M3/T4): T enters the pause from the overhead map (the hint chip
// says so while you walk in overhead). Esc clears the waypoints first — one
// deliberate un-marking press — and the next Esc leaves for focus, so a
// planned route survives the exit and shows while you walk it. T itself is a
// remappable action (the dispatcher below owns it); Esc stays hardwired as
// the everywhere-cancel, and a live rebind capture outranks both.
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (settings.capturingAction() !== null) return; // the capture owns Esc here
  if (e.code === 'Escape' && isTactical(view)) {
    if (waypoints.length > 0) waypoints.length = 0;
    else setViewMode(exitTactical(view));
  }
});

// Waypoints (M3/T4): a tactical-only click toggles the ivory dot on the
// nearest cell (the click's cell — placement is by cell, never sub-cell), max
// WAYPOINT_MAX marks; a full board ignores new clicks until a dot is removed.
overheadCanvas.addEventListener('click', (e) => {
  if (!isTactical(view)) return;
  const cell = overhead.cellAtEvent(e, floor.grid);
  if (cell === null) return;
  const idx = waypoints.findIndex((w) => {
    const c = floor.grid.cellAt(w.x, w.y);
    return c.x === cell.x && c.y === cell.y;
  });
  if (idx >= 0) waypoints.splice(idx, 1);
  else if (waypoints.length < WAYPOINT_MAX) {
    const { cx, cy } = floor.grid.cellCenter(cell.x, cell.y);
    waypoints.push({ x: cx, y: cy });
  }
});

// T7 passages — step-through (Space) and push-doors (E), both keydown presses
// like frost. A pushed door is one-time: its id banks here so it never hints
// or pushes again. The opened wall edge stays open for the rest of the floor
// (fail/restart included — the house remembers its own secrets).
// Silvered doors are one machine (`closed → opening → open`), owned here:
// doorStates is the only truth for "still pushable", doorById only binds the
// mesh that animates. A floor reset does not re-close them; a floor REBUILD
// does (every door machine is minted closed in buildFloor).

/** The door's machine state; a silvered ref always has one (initialised above). */
function doorState(id: number): DoorAnim {
  const st = doorStates.get(id);
  if (st) return st;
  const fresh = createDoor(id);
  doorStates.set(id, fresh);
  return fresh;
}

function activeDoorMirrors(): MirrorRef[] {
  return allMirrors.filter((m) => m.kind !== 'silvered' || doorState(m.id).phase === 'closed');
}

/** The HUD would show 'E — push' right now: no step-through available and a
 *  still-closed silvered door in range and cone (the hint chain's push
 *  branch). While true, E belongs to the door for the fixed step's input. */
function doorHintActive(): boolean {
  return (
    tryTeleport(allMirrors, player, floor.grid) === null &&
    tryPushDoor(activeDoorMirrors(), player) !== null
  );
}

function stepThrough(): void {
  if (!canAct()) return;
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
  if (!canAct()) return;
  const target = tryPushDoor(activeDoorMirrors(), player);
  if (!target || target.wallDir === null) return;
  doorStates.set(target.id, beginDoorSlide(doorState(target.id))); // one push per door — inert from here
  const neighbor = floor.grid.neighborIndex(target.cellX, target.cellY, target.wallDir);
  if (neighbor) {
    floor.grid.setOpen(target.cellX, target.cellY, target.wallDir);
    sceneBuilt.hideWallEdge(target.cellX, target.cellY, target.wallDir);
  } // no neighbor (degenerate boundary mount): the edge cannot open — the door still slides, and goes inert
}

// M5/T2 — the ONE action dispatch: every press-verb routes through
// actionFor(e.code, keymap), so a rebinding is live everywhere at once. The
// spelled-out E-dual semantics: actionFor names the LAST-declared action for
// a shared code (push, declared after turnR), and the CONTEXT lives here —
// pushDoor() itself no-ops without a door in reach/cone, so a shared key
// pushes exactly while the push hint shows (the fixed step below claims that
// key's movement share over the same window) and does nothing otherwise,
// where turning is held-key movement resolved inside keysToMoveInput. Aaina
// is deliberately NOT a pause: the floor keeps simulating while she talks.
// While the ⚙ overlay captures a rebind, the dispatch stands down — the
// pressed key belongs to the capture (its own capture-phase listener eats
// the event; this guard is the belt to that brace).
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (settings.capturingAction() !== null) return;
  // M5 final review — a focused interactive control owns its activation
  // keys: Space toggles the checkbox under it and presses the focused
  // button, Enter/NumpadEnter press it too, so the step key's
  // preventDefault must never eat them (keyboard use of the ⚙/FAQ/Aaina
  // dialogs). `closest` from the event target finds the control whether the
  // press landed on it or inside its label; body/canvas focus matches
  // nothing, so every game key keeps working there. One guard ahead of the
  // whole switch, so the faq/aaina/mute/view/tactical cases stand down the
  // same way — a control's activation key never fires the action behind it.
  // (Arrow*/Shift*/Tab/Escape need no guard: the capture gate and the import
  // gate both refuse to bind them to any action.)
  if (
    (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') &&
    (e.target as HTMLElement | null)?.closest?.('button, input, select, textarea, a[href]')
  )
    return;
  // step007/T2 — a focused free-text control (the 📮 composer's title and
  // body) owns EVERY key while it writes: without this guard, typing the bug
  // report itself would fire H (FAQ), M (mute), V (view), F (frost)… as game
  // verbs behind the composer. The pause gate above already froze the floor;
  // this keeps the dispatch quiet too. Radios and checkboxes are inputs but
  // never text — they keep the M5-final activation-key contract untouched.
  // (instanceof HTMLElement: a document/window target has no closest and no
  // text either — such a press belongs to the game.)
  if (e.target instanceof HTMLElement && e.target.closest('input[type="text"], textarea') !== null)
    return;
  switch (actionFor(e.code, a11y().keyMap)) {
    case 'mute':
      toggleMute();
      break;
    case 'faq':
      faq.toggle();
      break;
    case 'aaina':
      aaina.toggle();
      break;
    case 'frost':
      tryFrost(performance.now());
      break;
    case 'view':
      setViewMode(cycleView(view));
      break;
    case 'tactical':
      if (view === 'overhead') setViewMode('tactical');
      break;
    case 'stepThrough':
      e.preventDefault(); // nothing else in the UI owns the step key
      stepThrough();
      break;
    case 'push':
      pushDoor();
      break;
  }
});

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  // The quad side panes are w/2 × h/2 — same aspect as the window, so they
  // track it here alongside the main camera (T3 review fix).
  for (const s of QUAD_SIDE_YAW) {
    s.cam.aspect = aspect;
    s.cam.updateProjectionMatrix();
  }
}
window.addEventListener('resize', resize);
resize();

/**
 * QUAD (M3/T3): four scissored half-size panes — front top-left (the main
 * camera, every frame), left top-right, right bottom-left, back bottom-right.
 * The three side panes round-robin one per frame (`frameIndex % 3 ===
 * paneIndex % 3` renders; the others keep their last frame — a few frames of
 * staleness in the sides is the perf budget). Two scene renders per frame
 * total, at pixel ratio 1. Left/top panes take `floor(size/2)` and the
 * right/bottom panes the remainder, so on odd pixel sizes the four panes tile
 * the window exactly — no seam column or row belongs to no pane (T3 review
 * fix).
 */
function renderQuad(): void {
  const pw = Math.floor(window.innerWidth / 2); // left column width
  const qw = window.innerWidth - pw; // right column width (the remainder)
  const th = Math.floor(window.innerHeight / 2); // top row height
  const bh = window.innerHeight - th; // bottom row height (the remainder)
  const panes = [
    { cam: camera, x: 0, y: bh, w: pw, h: th }, // 0 front — top-left, every frame
    { cam: QUAD_SIDE_YAW[0]!.cam, x: pw, y: bh, w: qw, h: th }, // 1 left — top-right
    { cam: QUAD_SIDE_YAW[1]!.cam, x: 0, y: 0, w: pw, h: bh }, // 2 right — bottom-left
    { cam: QUAD_SIDE_YAW[2]!.cam, x: pw, y: 0, w: qw, h: bh }, // 3 back — bottom-right
  ];
  renderer.setScissorTest(true);
  panes.forEach((p, i) => {
    if (i > 0 && frameIndex % 3 !== i % 3) return; // not this side pane's frame
    renderer.setViewport(p.x, p.y, p.w, p.h);
    renderer.setScissor(p.x, p.y, p.w, p.h);
    renderer.render(scene, p.cam); // autoClear wipes exactly this pane's rect
  });
}

/**
 * The 2D map (M3/T4): overhead and tactical render NO 3D stage — this draws
 * the fog-of-war map onto the (opaque, full-viewport) 2D canvas instead, so
 * the untouched WebGL buffer underneath never shows through. Expired pings
 * are pruned here with the same decay pingOpacity draws with.
 */
function drawOverhead(now: number): void {
  pings = pings.filter((p) => pingOpacity(p.at, now) !== null);
  overhead.draw({
    grid: floor.grid,
    visited,
    player,
    mirrors: allMirrors.map((m, i) => ({
      x: m.x,
      z: m.z,
      kind: m.kind,
      captured: mirrorRuntime[i]?.captured ?? false,
    })),
    exit: {
      cx: exitCenter.cx,
      cy: exitCenter.cy,
      unlocked: exitUnlocked(allMirrors, mirrorRuntime),
    },
    entrance: floor.grid.cellCenter(floor.entrance.x, floor.entrance.y),
    pings,
    chhaya: chhaya.visible ? { x: chhaya.position.x, y: chhaya.position.z } : null,
    waypoints,
    // T3/T3 — pool dots: teal, dim while the ripple blinds the eye.
    water: waterRt.map((w) => ({ x: w.x, y: w.y, dim: rippleState(w.rippledAt, now) })),
    // T5/T2 — hollow gold player-glyphs: a copy looks like you on the map.
    decoys: decoys.filter((d) => !d.shattered),
    now,
  });
}

let accumulator = 0;
let last = performance.now();
let frames = 0;
let fpsClock = last;
let fps = 0;
let frameIndex = 0;

// M5/T4 — the auto detector's rolling window: the diagnostics counter emits
// one fps sample every 250ms; 20 of them is the 5s average autoPreset reads
// (a sustained read — a single dropped frame cannot flip the preset). The
// window fills after 5s of play; before that, auto holds its 60fps boot
// prior so boot jank cannot pin a weak machine to low on frame one.
const FPS_WINDOW_SAMPLES = 20;
const fpsSamples: number[] = [];
function fpsAverage(): number | null {
  return fpsSamples.length === 0 ? null : fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
}
/** Auto's current read: the average once the window is full, else the prior. */
function detectedPreset(): PerfPreset {
  const avg = fpsAverage();
  return avg === null
    ? autoPreset(60, window.devicePixelRatio)
    : autoPreset(avg, window.devicePixelRatio);
}
/** Land a preset change: sharpness at once; the mirror knobs (hero RT, RT
 *  size) are read at the next buildFloor — "applies on next floor". */
function applyPreset(next: PerfPreset): void {
  if (next === preset) return;
  preset = next;
  applyPixelRatio();
}
/** The settings radio (or the DEV param at boot) changed the choice: a pinned
 *  rung lands at once; auto defers to the detector. */
function setPerfChoice(choice: PerfChoice): void {
  perfChoice = choice;
  applyPreset(choice === 'auto' ? detectedPreset() : choice);
}

function frame(now: number): void {
  const elapsed = Math.min(now - last, 250) / 1000;
  last = now;
  // Fail freeze handoff: at resetAt the machine re-arms (ready) and the floor
  // resets for the next attempt. No simulation on the reset frame itself.
  const { phase: reArmed, shouldReset } = tickFail(phase, now);
  // One gate for the whole simulation: a live floor, no overlay in front of
  // it, and not parked in the tactical view. The FAQ, the 📮 composer and the
  // tactical view are pauses — movement, verbs and catch-up all respect them.
  const simActive =
    active(phase) && faq.root.hidden === true && feedback.root.hidden === true && !isTactical(view);
  if (shouldReset) {
    phase = reArmed;
    resetFloor(now);
    accumulator = 0;
  } else if (simActive) {
    accumulator += elapsed;
    while (accumulator >= FIXED_STEP && active(phase)) {
      let snap = input.snapshotAndReset();
      // Diegetic, not a pause: movement stays live while Aaina talks, but HER
      // KEY is claimed while she is open (M5/T1: generalized to whatever the
      // keyMap binds her to — [I] by default, so the claim is usually a no-op
      // for movement and only bites if a remap puts her on a movement key).
      // The door's claim below is the same pattern.
      if (!aaina.root.hidden) snap = withoutKey(snap, keyOf('aaina'));
      // The push key's dual use, same claim via the same helper: while the
      // push hint shows, a press that pushes the door must not also steer you
      // off the door's cone — drop that key's movement share for the step
      // (mouse and the arrows keep turning, and the key moves you again the
      // moment no door is in reach). M5/T2: the claim follows push's binding
      // wherever the map puts it, so it stays exact for ANY remap.
      if (doorHintActive()) snap = withoutKey(snap, keyOf('push'));
      // M5 minor (landed M6/T4) — while the ⚙ overlay is open its radios own
      // the arrows natively (a focused radio walks its group on Arrow*), so
      // the player stands down: the four hardwired arrow codes leave the
      // snapshot before keysToMoveInput sees it, the same claim pattern as
      // the two above. Mapped keys keep their share — only the arrow
      // alternates yield, and only while the overlay is on screen.
      if (!settings.root.hidden) {
        for (const arrow of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
          snap = withoutKey(snap, arrow);
      }
      const inputFrame =
        mode === 'mouse'
          ? mouseOnlyInput(input.mouseState())
          : keysToMoveInput(snap, mode, a11y().keyMap);
      player = movePlayer(player, inputFrame, floor.grid, FIXED_STEP);
      markVisited(); // fog of war: the cell under your feet is explored
      const inputActive =
        inputFrame.forward !== 0 || inputFrame.strafe !== 0 || inputFrame.turn !== 0;
      if (inputActive) phase = startRun(phase, now); // first input starts the clock
      updateAvatar(avatar, player.x, player.y, player.heading, inputActive, now / 1000);
      breath = updateBreath(breath, FIXED_STEP, false); // recharge per fixed step
      // T3/T3 — the player's one verb against water: step close and it
      // ripples. Only a FRESH ripple lands (still water, or the last ripple
      // spent): the eye shuts at once — before this step's echo sense checks
      // below — and the caption speaks once per ripple event (the feed's
      // dedupe window is far shorter than the TTL; a re-ripple fires anew).
      for (const i of rippleTrigger(player.x, player.y, waterRt)) {
        if (rippleState(waterRt[i]!.rippledAt, now)) continue; // already blind
        waterRt[i]!.rippledAt = now;
        pushCaption('water-ripple', t(lang, 'caption.waterRipple'));
      }
      // T4/T3 — the carnival glass lies about where you are: while ANY
      // unfogged distort mirror sees the player (mirror↔player only — the
      // pane lies to whoever looks), the player's APPARENT position is
      // displaced by that pane's fixed delta. One derivation per fixed step
      // feeds everything downstream: the echo sense check + chase cell, the
      // map radar, and the once-per-attempt caption. Fog the seeing pane and
      // the next step tells the truth again.
      const apparent = computeApparent(player, allMirrors, mirrorRuntime, floor.grid, now);
      const displaced = apparent.x !== player.x || apparent.y !== player.y;
      if (displaced && !distortAnnounced) {
        distortAnnounced = true;
        pushCaption('distort', t(lang, 'caption.distort'));
      }
      // T5/T2 — the mirror-you decoys: on the Flood Halls the spawn clock
      // fires on its jittered cadence (the gate: campaign floor 41–50, sim
      // active — this loop IS the sim gate — and alive < DECOY_MAX_ALIVE,
      // checked inside spawnDecoy). Then every unshattered copy flow-walks
      // toward the exit, so the echoes' sense check below reads fresh
      // positions.
      if (decoysActiveFloor() && now >= nextDecoySpawnAt) {
        nextDecoySpawnAt = now + decoySpawnInterval();
        const spawned = spawnDecoy(decoys, player, floor.grid, decoyRng, decoyIdNext++, now);
        if (spawned !== null) {
          decoys = [...decoys, spawned];
          const fig = createDecoy(look); // an EXACT copy of your look — identical is the point
          fig.group.position.set(spawned.x, 0, spawned.y);
          scene.add(fig.group);
          decoyFigures = [...decoyFigures, fig];
          pushCaption(`decoy-spawn-${spawned.id}`, t(lang, 'caption.decoySpawn'));
        }
      }
      if (decoys.length > 0) decoys = updateDecoys(decoys, floor.grid, floor.exit, FIXED_STEP);
      echoes = echoes.map((e) => {
        const next = updateEcho(
          e,
          player,
          allMirrors,
          mirrorRuntime,
          waterRt,
          floor.grid,
          objs.patrolAnchors,
          now,
          FIXED_STEP,
          apparent,
          decoys, // T5/T2 — the lure: a nearer copy is "the player" to the glass
        );
        // Map radar (T4): a successful sense check is the only writer of
        // loseMemoryAt, so a changed value marks this tick's check — ping at
        // the echo's position. The throttle lives inside updateEcho, so this
        // never double-fires within its SENSE_INTERVAL_MS cadence.
        // T4/T3 — while the carnival glass displaces you, the ping lands at
        // the APPARENT spot instead: the deception itself is visible on the
        // map (fog the pane and the radar snaps back to the truth).
        if (next.loseMemoryAt !== e.loseMemoryAt) {
          pings.push(displaced ? { x: apparent.x, y: apparent.y, at: now } : { x: next.x, y: next.y, at: now });
          // M5/T3 — the caption rides the SAME detection point (never a
          // recompute): one id, one line per ttl window however often the
          // per-echo sense cadence re-fires it.
          pushCaption('echo-sense', t(lang, 'caption.echoSense'));
        }
        // M5/T3 — mode edges: the chase begins, the confusion lands. The
        // captions speak on the transition, so a held state never repeats.
        if (next.mode === 'chase' && e.mode !== 'chase')
          pushCaption('echo-chase', t(lang, 'caption.echoChase'));
        if (next.mode === 'confused' && e.mode !== 'confused')
          pushCaption('echo-confused', t(lang, 'caption.echoConfused'));
        // Stuck bounty: first confusion banks the award flag for this run.
        return next.mode === 'confused' && !next.stuckAwarded
          ? { ...next, stuckAwarded: true }
          : next;
      });
      // The beat-walk (M4/T3): Taal strides the anchor loop at the pulsing
      // speed — same wall-clock now the lantern reads, so stride and glow
      // can never fall out of time.
      if (taal !== null) taal = updateTaal(taal, objs.patrolAnchors, floor.grid, now, FIXED_STEP);
      // The encirclement (T3/T2): the freshest prediction is offered every
      // step — interceptCell reads the player's roads, no senses involved —
      // and updateGher adopts it on the 1s tick (a feint's null lands at
      // once; he holds mid-stride until the player commits again).
      if (gher !== null) {
        gher = updateGher(
          gher,
          interceptCell(player, floor.grid, sentinelObjectives()),
          floor.grid,
          now,
          FIXED_STEP,
        );
      }
      // The ambush (T4/T2): the freshest projection is offered every step —
      // ambushCell reads the player's direction AND speed (the one Sentinel
      // who cares how fast you run) — and updateAavart adopts it on the
      // 1200 ms tick. A null read changes nothing: he finishes the ambush.
      if (aavart !== null) {
        aavart = updateAavart(
          aavart,
          ambushCell(
            { x: player.x, y: player.y, heading: player.heading, speed: playerSpeed(inputFrame) },
            floor.grid,
            sentinelObjectives(),
          ),
          floor.grid,
          now,
          FIXED_STEP,
        );
      }
      // Sprint into a mirror and it cracks: the house angers, the glass tints.
      const sprintMoving =
        inputFrame.sprint && (inputFrame.forward !== 0 || inputFrame.strafe !== 0);
      if (sprintMoving && active(phase)) {
        const target = crackTarget(allMirrors, mirrorRuntime, player, true);
        if (target) {
          house = applyCrack(house, mirrorRuntime, target.id);
          visuals.find((_, i) => allMirrors[i]!.id === target.id)?.bind.setCracked(true);
          if (isCollapse(house)) failFloor('collapse');
        }
      }
      // Chhaya walks the player's path, the floor's delay late — record only
      // while the run is running; after clear/fail she stands wherever the
      // path ended.
      if (phase.kind === 'running') path = recordPath(path, player.x, player.y, now);
      if (active(phase)) {
        for (const e of echoes)
          if (Math.hypot(e.x - player.x, e.y - player.y) < CONTACT_RADIUS) failFloor('caught');
        // Taal's touch — routed by taalOutcome (M4/T3 + T2): the cameo floor
        // angers the house (+20, once per 1.5s, taalTouch gating the wall
        // clock; a touch CAN tip an already-furious house over ANGER_MAX);
        // from TAAL_SENTINEL_FLOOR up he is the SENTINEL — his touch is the
        // standard caught fail, shards forfeited like any capture.
        if (
          taal !== null &&
          Math.hypot(taal.x - player.x, taal.y - player.y) < CONTACT_RADIUS &&
          taalTouch(taal.touchCooldownUntil, now)
        ) {
          taal = { ...taal, touchCooldownUntil: now + TAAL_TOUCH_COOLDOWN_MS };
          if (taalOutcome(campaign.floor) === 'caught') {
            failFloor('caught');
          } else {
            house = { ...house, anger: house.anger + TAAL_TOUCH_ANGER };
            // M5/T3 — one line per touch (dedupe rides out his 1.5s cooldown);
            // captionAnger below picks up any threshold this touch crossed.
            pushCaption('taal-touch', t(lang, 'caption.taal'));
            if (isCollapse(house)) failFloor('collapse');
          }
        }
        const at = sampleDelayed(path, now, chhayaDelayMs());
        if (at !== null && Math.hypot(at.x - player.x, at.y - player.y) < CONTACT_RADIUS)
          failFloor('caught');
        // Gher's touch (T3/T2): the Encircler sealed your road — the standard
        // caught fail. No anger, no cooldown: a seal is a seal.
        if (gher !== null && Math.hypot(gher.x - player.x, gher.y - player.y) < CONTACT_RADIUS)
          failFloor('caught');
        // Aavart's touch (T4/T2): the Ambusher read your pace and got there
        // first — the standard caught fail. Lethal on every floor he walks.
        if (aavart !== null && Math.hypot(aavart.x - player.x, aavart.y - player.y) < CONTACT_RADIUS)
          failFloor('caught');
        // T5/T2 — the copy is fragile, and it is worth shards: a touch within
        // CONTACT_RADIUS shatters it (+DECOY_SHARD banked pending, once per
        // copy — the shattered flag is the gate; a failed floor forfeits the
        // stake like any beacon's). The copies never harm back.
        if (decoys.length > 0) {
          const sh = shatterDecoys(decoys, player, CONTACT_RADIUS);
          if (sh.shards > 0) {
            decoys = sh.decoys;
            house = { ...house, shards: house.shards + sh.shards };
            updateShardsChip();
            pushCaption('decoy-shatter', fill(t(lang, 'caption.decoyShatter'), { n: DECOY_SHARD }));
          }
        }
      }
      accumulator -= FIXED_STEP;
    }
  } else {
    // Frozen (failing), finished (cleared), paused behind the overlay, or
    // parked in the tactical view: no simulation and no catch-up. Drain the
    // collector so a key held during the pause, or mouse movement banked
    // behind the overlay, cannot fire a burst on resume.
    accumulator = 0;
    input.snapshotAndReset();
  }
  echoes.forEach((e, i) => syncEchoMesh(echoMeshes[i]!, e));
  // Taal follows his state, lantern reading the same wall-clock beat his
  // stride does — the glow lurches on the accent and dims into the rest,
  // running even behind a pause: the beat never stops for anyone. The one
  // exception is reduced-flash (M5/T1): beatGlow feeds one constant emissive
  // — the beat lives in his stride, never in his light.
  if (taal !== null && taalFigure !== null) {
    taalFigure.group.position.set(taal.x, 0, taal.y);
    taalFigure.group.rotation.y = -taal.heading; // same convention as the avatar
    taalFigure.setBeat(beatGlow(now, a11y().reducedFlash));
  }
  // Gher follows his state — the steady glide. No setBeat: where Taal's
  // lantern reads the beat, the still-water glass holds one constant glow.
  if (gher !== null && gherFigure !== null) {
    gherFigure.group.position.set(gher.x, 0, gher.y);
    gherFigure.group.rotation.y = -gher.heading; // same convention as the avatar
  }
  // Aavart follows his state — the steady glide, the fastest of the three.
  // No setBeat either: the candle-flame glass holds one constant glow.
  if (aavart !== null && aavartFigure !== null) {
    aavartFigure.group.position.set(aavart.x, 0, aavart.y);
    aavartFigure.group.rotation.y = -aavart.heading; // same convention as the avatar
  }
  // T5/T2 — the copies follow their state (the figures are 1:1 with the
  // states by spawn order). A shattered copy collapses to nothing: one
  // shrink to zero scale — a single shrink, not a flash (reduced-flash safe).
  for (let i = 0; i < decoys.length; i++) {
    const d = decoys[i]!;
    const fig = decoyFigures[i];
    if (fig === undefined) continue; // cannot happen (1:1 by construction)
    if (d.shattered) {
      fig.group.scale.setScalar(0);
      continue;
    }
    fig.group.position.set(d.x, 0, d.y);
  }
  updateChhaya(now);
  // Chhaya's map radar (T4): a ping every CHHAYA_PING_MS while her sample
  // exists on a live, unpaused floor — the same liveness updateChhaya used to
  // place her this frame.
  if (simActive && chhaya.visible && now - lastChhayaPingAt >= CHHAYA_PING_MS) {
    pings.push({ x: chhaya.position.x, y: chhaya.position.z, at: now });
    lastChhayaPingAt = now;
  }
  hud.setChips({
    timerMs: runElapsedMs(phase, now),
    streak: save.streak.count,
    bestMs: save.best[seed] ?? null,
  });
  hud.setBreath(breath);
  hud.setAnger(house.anger / ANGER_MAX);
  // M5/T3 — captions: the thresholds speak once per attempt (per-frame check
  // catches every anger writer), then the bar paints the latest two lines.
  // When the toggle is off the feed empties here, so nothing stale waits to
  // reappear if it comes back on mid-line.
  captionAnger();
  if (!a11y().captions && captions.length > 0) captions = [];
  renderCaptions(hud.captionBar, captions, now);
  // Audio feed (M3/T6): one threat→music intensity per frame — anger, pursuit
  // pressure, failing, cleared — smoothed inside the engine's scheduler.
  audioIntensity = intensityFrom({
    anger: house.anger,
    chasing: echoes.filter((e) => e.mode === 'chase').length,
    failing: phase.kind === 'failing',
    cleared: phase.kind === 'cleared',
  });
  audio.setIntensity(audioIntensity);
  if (!aaina.root.hidden) refreshAaina(); // she reads the floor while you walk it
  syncFogVisuals(now);
  syncWaterVisuals(now); // T3/T3 — the pools' dim follows the ripple TTL
  // Door machine: an opening door advances on frame time, then rests open for
  // the rest of the floor — no further hints, no further pushes.
  for (const [id, st] of doorStates) {
    if (st.phase !== 'opening') continue;
    const next = stepDoor(st, elapsed);
    doorStates.set(id, next);
    doorById.get(id)?.setSlide(next.t);
  }
  const unlocked = exitUnlocked(allMirrors, mirrorRuntime);
  if (
    phase.kind === 'running' && // a same-frame fail+clear must not award a clear (T6 review fix)
    !dwaarFreeWalk && // Stay: the shard is banked, the hall has no objectives left
    unlocked &&
    isAtExit(player.x, player.y, exitCenter.cx, exitCenter.cy)
  ) {
    // The exit is the Stair Door (M4/T2). The phase stays 'cleared' — the sim
    // halts, exactly as before — and what happens NEXT depends on the floor:
    // procedural floors hold 0.8s behind the `descending…` overlay then
    // rebuild one floor deeper; a Dwaar claims its Truth-Shard. Dwaar I (10)
    // descends into the Hall of Ancestors, Dwaar II (20) into the Reflecting
    // Gardens, Dwaar III (30) into the Carnival of Faces and Dwaar IV (40)
    // into the Flood Halls — the interstitial cascade, tier-appropriately
    // worded (T5/T1 ratified: IV joins II and III; the Act I close screen is
    // retired — Act II announces itself with the floor-41 banner instead);
    // Dwaar V (50) raises the TIER V completion screen (the row-9 apex
    // duel's close) — the campaign is terminal there; descend() is a no-op,
    // so the screen is the end of the house until Act III exists.
    phase = clearRun(phase, now);
    if (venue !== null) {
      // M6/T1 — the SIDE-FLOOR clear: the sim halts and NOTHING banks — no
      // best, no shards, no descend, no tier. The pending stake dies here (it
      // was never going to the purse — the chip never showed it), the overlay
      // names the way back, and the floor waits for the return. This branch
      // is the campaign-isolation invariant: not one save write happens.
      house = { ...house, shards: 0 };
      updateShardsChip();
      hud.showVenueCleared(t(lang, 'overlay.venueCleared'));
      pushCaption('venue-clear', t(lang, 'overlay.venueCleared'));
    } else {
      const ms = runElapsedMs(phase, now);
      const wasBest = save.best[seed];
      save = recordRun(save, seed, ms, todayStamp());
      // M5/T5 — bankOnClear gates the clear bonus on the tier state at floor
      // ENTRY: a floor-10 resume of an already-complete tier pays only its
      // re-earned beacons, never a second perfect/stuck bonus.
      save = awardShards(
        save,
        bankOnClear(house, echoes.filter((e) => e.stuckAwarded).length, tierCompleteAtEntry),
      );
      // The stake is in the purse now — zero the pending so the unified chip
      // never counts the same shards as banked AND at stake during the 0.8s hold
      // (the next floor's buildFloor would reset it anyway; this keeps the
      // in-between frames honest).
      house = { ...house, shards: 0 };
      persist(true); // a cleared floor banks NOW — no debounce window
      updateShardsChip(); // chip flips from `banked (+pending)` to plain banked
      if (isDwaar(campaign.floor) && tierOf(campaign.floor) === 5) {
        // Dwaar V (50): Truth-Shard V claims the TIER — the full tier screen
        // (Play again / Stay), the row-9 apex duel's close. No descendAt arms
        // below, and campaign.descend is a no-op at 50 — the house ends here
        // until Act III exists.
        campaign = completeTier(campaign);
        save = mergeCampaign(save, campaign); // the tier close is a save event
        persist(true);
        hud.showTierComplete({ tier: 5, floors: TIER_FIVE_FLOORS, shards: save.shards });
        pushCaption('tier', t(lang, 'overlay.tierTitle5')); // the screen's own line
      } else {
        if (isDwaar(campaign.floor)) {
          // Dwaar I (10), II (20), III (30) and IV (40): the Truth-Shard is
          // claimed and banked — but the descent continues DOWN. The stair
          // door holds 0.8s like any ramp floor, then opens into the next
          // tier's halls; the descent re-arms the tier flag so the new tier's
          // floors pay their first-clear bonus (campaign.descend).
          campaign = completeTier(campaign);
          save = mergeCampaign(save, campaign); // the shard claim is a save event
          persist(true);
          // T2/T5 — the T1 adjudication: the claim is celebrated as a 1.8s
          // interstitial in the tier screen's styling, never the tier screen
          // itself — the descend below proceeds exactly as on any ramp floor.
          // T3/T1: Dwaar II joins Dwaar I. T4/T1: Dwaar III cascades. T5/T1:
          // Dwaar IV joins too (the full screen is the TIER close's now —
          // Dwaar V's) and each banner names its own shard.
          const shardWhich: 1 | 2 | 3 | 4 =
            campaign.floor === DWAAR_FLOOR
              ? 1
              : campaign.floor === TIER_TWO_FLOORS
                ? 2
                : campaign.floor === TIER_THREE_FLOORS
                  ? 3
                  : 4;
          hud.showShardInterstitial(shardWhich);
          pushCaption(
            'tier',
            t(
              lang,
              shardWhich === 1
                ? 'overlay.shardInterstitial'
                : shardWhich === 2
                  ? 'overlay.shardInterstitial2'
                  : shardWhich === 3
                    ? 'overlay.shardInterstitial3'
                    : 'overlay.shardInterstitial4',
            ),
          ); // the interstitial's own line
        }
        hud.showCleared(ms, save.best[seed] ?? null, wasBest === undefined || ms < wasBest);
        hud.showDescend();
        descendAt = now + DESCEND_MS;
        // M5/T3 — clear + descend land as the bar's two lines (short form; the
        // banner above keeps the full best-time sentence).
        pushCaption('clear', fill(t(lang, 'caption.cleared'), { s: `${(ms / 1000).toFixed(1)}s` }));
        pushCaption('descend', t(lang, 'overlay.descend'));
      }
    }
  }
  // Stair Door handoff: once the 0.8s hold elapses, the campaign descends and
  // the next floor arms (buildFloor re-arms the phase — the machine never
  // leaves 'cleared' by any other door).
  if (descendAt !== null && phase.kind === 'cleared' && now >= descendAt) {
    descendAt = null;
    campaign = descend(campaign);
    save = mergeCampaign(save, campaign);
    persist(true); // the stair door banks the new position NOW
    buildFloor(campaign);
  }
  // Tactical pause note (T4) outranks the passage prompts — the verbs are
  // gated off while paused, so naming their keys would only mislead.
  if (isTactical(view)) {
    hud.hint(waypoints.length > 0 ? t(lang, 'hint.tacticalMarks') : t(lang, 'hint.tacticalResume'));
  } else if (active(phase)) {
    // Passage hints (T7), in precedence order: step-through, push-door, the
    // sealed-exit explanation, then the tactical invite — the prompt always
    // names the key that works (M5/T2: through the map, so a remap never
    // leaves the hint naming a dead key).
    if (tryTeleport(allMirrors, player, floor.grid) !== null) {
      hud.hint(fill(t(lang, 'hint.step'), { key: keyLabel(keyOf('stepThrough')) }));
    } else if (tryPushDoor(activeDoorMirrors(), player) !== null) {
      hud.hint(fill(t(lang, 'hint.push'), { key: keyLabel(keyOf('push')) }));
    } else if (!unlocked && Math.hypot(player.x - exitCenter.cx, player.y - exitCenter.cy) < 3) {
      const bc = beaconsCaptured(allMirrors, mirrorRuntime);
      hud.hint(fill(t(lang, 'hint.sealed'), { n: bc.captured, total: bc.total }));
    } else if (view === 'overhead') {
      hud.hint(fill(t(lang, 'hint.tactical'), { key: keyLabel(keyOf('tactical')) })); // the chip that names the map's other door
    } else {
      hud.hint(null);
    }
  } else {
    hud.hint(null);
  }
  camera.position.set(player.x, EYE_HEIGHT, player.y);
  camera.rotation.y = -player.heading;
  lantern.position.set(player.x, EYE_HEIGHT, player.y);
  // The quad side rig rides the same eye, yawed by its fixed offset — the
  // rotation mapping stays `rotation.y = -yaw` for every camera in the game.
  for (const s of QUAD_SIDE_YAW) {
    s.cam.position.set(player.x, EYE_HEIGHT, player.y);
    s.cam.rotation.y = -(player.heading + s.yaw);
  }
  // mirrors update on alternate frames — perf budget (each costs one extra scene render);
  // fogged hero mirrors skip their RT pass entirely (matte material, no
  // reflection). True-mirror pairs share the same budget at 256px (they are
  // never fogged, so their RT always runs when their turn comes). They read
  // the main camera — the quad front pane — so the pass runs unchanged in
  // focus AND quad; the map modes render no 3D at all, so it is skipped there.
  if (!showsOverhead(view)) {
    [...heroMirrors, ...trueMirrors].forEach((m, i) => {
      const v = visuals.find((x) => x.hero === m);
      if (v?.state === 'clear' && frameIndex % 2 === i % 2) m.update(renderer, scene, camera);
    });
  }
  frameIndex++;
  // View dispatch: quad scissored panes, the 2D map for overhead/tactical,
  // else the full focus render.
  if (view === 'quad') {
    renderQuad();
  } else if (showsOverhead(view)) {
    drawOverhead(now);
  } else {
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
  }

  frames++;
  if (now - fpsClock >= 250) {
    fps = Math.round((frames * 1000) / (now - fpsClock));
    frames = 0;
    fpsClock = now;
    diagnostics.textContent =
      `seed ${seed}  fps ${fps}\n` +
      `pos ${player.x.toFixed(1)}, ${player.y.toFixed(1)}  heading ${player.heading.toFixed(2)}`;
    // step007/T3 — the TESTER chip rides the same 250ms tick: fps + the live
    // seed (base:floor on a campaign floor, the daily code on a venue floor).
    if (testerChip !== null) testerChip.textContent = `TESTER · ${fps} · ${seed}`;
    // M5/T4 — feed the rolling 5s window; once it is full and the choice is
    // auto, the average picks the preset (sustained reads only — the boot
    // prior holds until then). A manual pin never reads this path.
    fpsSamples.push(fps);
    if (fpsSamples.length > FPS_WINDOW_SAMPLES) fpsSamples.shift();
    if (perfChoice === 'auto' && fpsSamples.length >= FPS_WINDOW_SAMPLES)
      applyPreset(detectedPreset());
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// M4/T5 — PWA: the service worker registers in PROD builds only, after the
// first frame has painted (two rAFs = one painted frame behind us — the boot
// never waits on it). The dev server must never see a SW: a runtime cache and
// vite's live module graph do not mix, and the e2e suite runs dev on purpose.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      // the SW is an enhancement — a failed registration must never block play
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
    }),
  );
}

// step007/T3 — the faucet exists in DEV builds and, behind the session-only
// `?test=1` flag, in ANY build — PROD included, which is the point: invited
// testers play the deployed game and the TESTER chip + banner above tell
// them the diagnostics are live. `?test=0` is the documented reset (see
// docs/URL-PARAMS.md). The soak runner (M5/T6) keeps its faucet by loading
// this same `?test=1` against its `vite build --mode soak` preview server —
// one gate, three doors: dev, testers, soak.
if (import.meta.env.DEV || testMode) {
  (window as unknown as Record<string, unknown>).__MIRROR_HOUSE_DEBUG__ = {
    getPlayer: () => ({ ...player }),
    // The CURRENT floor's seed (`BASE:1`, `BASE:2`, …) — a getter so it stays
    // live across descends; e2e reads it as the plain string it always was.
    get seed() {
      return seed;
    },
    // M4/T2 — the campaign spine: base seed, current floor, tier flag.
    campaign: () => ({
      base: campaign.seedBase,
      floor: campaign.floor,
      tierComplete: campaign.tierComplete,
    }),
    // T2/T4 — the tier the STAGE is dressed in (palette, scale, Sentinel): a
    // venue side-floor reads tier 1 even mid-tier-2 — the campaign's beat
    // stays home.
    tier: () => (venue === null ? tierOf(campaign.floor) : 1),
    // M6/T1 — the venue side-floor: which pack is live (null id = the campaign
    // floor) and its floor's beacon count (the pack's own — the build witness).
    venue: () => ({
      active: venue !== null,
      id: venue === null ? null : venue.id,
      beacons: venue === null ? 0 : beaconsCaptured(allMirrors, mirrorRuntime).total,
    }),
    look: () => look.name,
    lang: () => lang, // M4/T6 — the live UI language (🌐 cycles it)
    mode: () => mode,
    // M5/T1 — the live a11y block (the ⚙ overlay's writes land here for e2e).
    a11y: () => {
      const a = a11y();
      return {
        reducedFlash: a.reducedFlash,
        captions: a.captions,
        textScale: a.textScale,
        keyMap: { ...a.keyMap },
      };
    },
    view: () => view, // M3/T3 — which ViewMode is showing ([V] cycles)
    viewMode: () => view, // M3/T6 — the same value under its exact hook name
    // M5/T3 — the live caption feed (id + text), the bar's backing store.
    captions: () => captions.map((c) => ({ id: c.id, text: c.text })),
    // step007/T2 — the live error ring behind the composer's diagnostics.
    errorRing: () => errorRing.map((e) => ({ ...e })),
    // M5/T4 — the quality state (the ?perf= e2e reads `preset`): the choice,
    // the effective preset + its profile, the auto window's current average,
    // the live ratio, and the RT census (heroRt 0 on the low path — the
    // no-RT stand-in witness; trueRt keeps its 256px RT on every preset).
    perf: () => ({
      choice: perfChoice,
      preset,
      profile: { ...PROFILES[preset] },
      fpsAvg: fpsAverage(),
      pixelRatio: renderer.getPixelRatio(),
      heroRt: heroMirrors.length,
      trueRt: trueMirrors.length,
    }),
    // M5/T6 — the soak census: geometry/texture counts that climb across
    // floor rebuilds are the leak signature (mirrors dispose per floor;
    // renderer.info is the witness). Calls/triangles contextualize the
    // frame; performance.memory (the JS heap) is sampled from the page side.
    rendererInfo: () => ({
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
    }),
    // M3/T6 — the audio engine's observable state (started/muted) plus the
    // last intensity the frame loop fed it. T3/T4 — the walker's live scale
    // and voice join the read-out: the tier dressing (Gardens = pastoral set
    // + sine flute, venue = the tier-one pair) is witnessable in a live tab.
    audioState: () => ({
      started: audio.started,
      muted: audio.muted,
      intensity: audioIntensity,
      scale: [...audio.scale],
      voice: audio.voice,
    }),
    // M3/T6 dev faucet — bank + save shards at once (e2e seeds Aaina's purse).
    grantShards: (n: number) => {
      save = awardShards(save, n);
      persist();
      updateShardsChip();
    },
    // M3/T6 — Aaina's live panel state: open, the next hint's price, the last
    // purchased line (null until a buy lands and while it is still current).
    aaina: () => ({
      open: !aaina.root.hidden,
      hintCost: hintCost(hintsUsed),
      lastHint: purchasedHint === null ? null : purchasedHint.text,
    }),
    // M3/T4 map hooks — fog, radar, and the player's marks
    visitedCount: () => visited.size,
    pings: () => pings.length,
    waypoints: () => waypoints.map((w) => ({ ...w })),
    // T3 review fix witness: every camera (front + quad sides) tracks the
    // window aspect — the side panes are w/2 × h/2, not square.
    camAspects: () => [camera.aspect, ...QUAD_SIDE_YAW.map((s) => s.cam.aspect)],
    avatarPresent: true,
    streak: () => save.streak.count,
    bestFor: (s: string) => save.best[s] ?? null,
    breath: () => breath,
    echoes: () => echoes.map((e) => ({ id: e.id, x: e.x, y: e.y, mode: e.mode })),
    chhaya: () => sampleDelayed(path, performance.now(), chhayaDelayMs()),
    // M4/T3 — the beat-walker's live state (null off his floor).
    taal: () =>
      taal === null
        ? null
        : {
            x: taal.x,
            y: taal.y,
            anchorIdx: taal.anchorIdx,
            cooldownUntil: taal.touchCooldownUntil,
          },
    // T2/T4 — the Sentinel's exact spot for e2e warps (null off his floors).
    taalPos: () => (taal === null ? null : { x: taal.x, y: taal.y }),
    // T3/T4 — the Encircler's exact spot for e2e warps (null off tier 3).
    gherPos: () => (gher === null ? null : { x: gher.x, y: gher.y }),
    // T4/T4 — the Ambusher's exact spot for e2e warps (null off tier 4).
    avartPos: () => (aavart === null ? null : { x: aavart.x, y: aavart.y }),
    // T5/T2 — the LIVE copies (unshattered only): where each copy of you
    // stands. An empty array everywhere but the Flood Halls.
    decoys: () => decoys.filter((d) => !d.shattered).map((d) => ({ x: d.x, y: d.y })),
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
        // T2/T4 — the ancestor portrait census (kind count; tier-2 floors
        // hang 2–3, tier-1 and venues none).
        portraits: allMirrors.filter((m) => m.kind === 'portrait').length,
        // T3/T4 — the Gardens' standing pools (2–4 on tier-3 floors, 0
        // everywhere else — the gated rng's output, the t3 e2e's census).
        water: waterRt.length,
        // T4/T3 — the Carnival's distorting panes (2–3 on tier-4 floors, 0
        // everywhere else — the LAST-LAST gated rng's output).
        distort: allMirrors.filter((m) => m.kind === 'distort').length,
      };
    },
    // T4/T3 — where the house says the player stands right now: the true
    // position, or the first seeing distort pane's displaced lie (≠ getPlayer
    // while carnival glass watches you; equal again once fogged).
    apparentPlayer: () =>
      computeApparent(player, allMirrors, mirrorRuntime, floor.grid, performance.now()),
    beaconsLeft: () => {
      const bc = beaconsCaptured(allMirrors, mirrorRuntime);
      return bc.total - bc.captured;
    },
    anger: () => house.anger,
    shards: () => save.shards,
    attempts: () => house.attempts,
    enemyCount: () => echoes.length,
    enemyPos: (i: number) => {
      const e = echoes[i];
      return e ? { x: e.x, y: e.y } : null;
    },
    chhayaPos: () => sampleDelayed(path, performance.now(), chhayaDelayMs()),
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
      // M5/T5 — a bad console call must not NaN the renderer: a non-finite
      // argument poisons the avatar/camera matrices for the rest of the
      // session, so the faucet ignores the jump entirely.
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        (heading !== undefined && !Number.isFinite(heading))
      )
        return;
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
      failed: phase.kind === 'failing',
    }),
    metaShards: () => save.shards, // M4/T4: same purse, IDB save v2 now
    fail: (reason: string) => failFloor(reason === 'collapse' ? 'collapse' : 'caught'),
    fogTarget: () => fogTarget(allMirrors, player, floor.grid)?.id ?? null,
    canStepThrough: () => tryTeleport(allMirrors, player, floor.grid) !== null,
    stepThrough,
    doorTarget: () => tryPushDoor(activeDoorMirrors(), player)?.id ?? null,
    pushDoor,
    doorsOpened: () =>
      [...doorStates.values()].filter((d) => d.phase !== 'closed').map((d) => d.id),
    mirrorRefs: () => allMirrors.map((m) => ({ ...m })),
    mirrorRuntime: () => mirrorRuntime.map((r) => ({ ...r })),
    canWalk: (x: number, y: number, d: number) => floor.grid.canWalk(x, y, d as Dir),
  };
}
