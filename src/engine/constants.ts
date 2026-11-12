// SPDX-License-Identifier: Apache-2.0
export const CELL_SIZE = 4; // meters
export const WALL_THICKNESS = 0.2; // meters
export const WALL_HEIGHT = 3.2; // meters — uniform, Wolfenstein constraint
export const EYE_HEIGHT = 1.7; // meters
export const PLAYER_RADIUS = 0.4; // meters
export const WALK_SPEED = 3.5; // m/s
export const SPRINT_SPEED = 6; // m/s
export const MAX_STEP_DT = 1 / 30; // seconds — clamps tunneling
export const TURN_SENSITIVITY = 0.003; // radians per mouse pixel
export const KEY_TURN_PER_STEP = 0.045; // radians per fixed step in keyboard mode
export const MOUSE_TURN_PER_STEP = 0.06; // radians per fixed step in mouse-only mode
export const FIXED_STEP = 1 / 120; // seconds

// Frost Lantern (M2) — fog, breath, beacon capture
export const FOG_DURATION_MS = 25000; // ms a fogged standing mirror stays matte
export const FOG_COST = 0.34; // breath spent per fog
export const BREATH_RECHARGE_PER_S = 0.25; // breath per second (full refill in 4s)
export const FOG_RANGE = 5; // meters — farthest foggable mirror
// cos(60°) = 0.5, which is also sin(30°): the lantern covers a 60° cone
// (±30° around the heading). A target at bearing θ is inside iff it is ahead
// (dot > 0) and its lateral component sin(θ) does not exceed this value.
export const FROST_CONE_COS = Math.cos(Math.PI / 3);
export const SHARD_BEACON = 5; // shards pending per captured beacon (awarded at clear by T6)

// Echoes (M2) — mirror-sight sensing, flow-field pursuit, confusion
export const ECHO_SPEED = 2.2; // m/s
export const CONTACT_RADIUS = 0.7; // m — echo touch fails the floor ('caught')
export const SENSE_RANGE = 13; // m — max echo–mirror AND player–mirror sight distance
export const SENSE_INTERVAL_MS = 250; // ms between sense checks per echo
export const CHASE_MEMORY_MS = 2000; // ms an echo remembers its last sensed player cell
export const CONFUSE_FOGGED_R = 6; // m — fogged mirrors this close count toward confusion
export const CONFUSE_UNFOGGED_R = 8; // m — one unfogged eye this close prevents confusion

// Chhaya (M2) — the six-second shadow walking the player's recorded path
export const CHHAYA_DELAY_MS = 6000; // ms behind the player she walks
export const CHHAYA_PATH_WINDOW_MS = 20_000; // ms of path history retained
export const CHHAYA_PATH_MAX_SAMPLES = 1200; // hard cap (10s at the 120Hz fixed step)

// House state (M2/T6) — anger, cracks, fail/restart, shards
export const CRACK_ANGER = 15; // anger per cracked mirror (once per mirror)
export const ANGER_MAX = 100; // anger at which the house collapses (7 cracks)
export const CRACK_RANGE = 1.0; // m — sprint-contact distance that cracks a mirror
export const CRACK_TINT = 0x4a4038; // tint a cracked mirror's glass takes on
export const SHARD_PERFECT = 25; // clear bonus when no mirror was cracked this run
export const SHARD_STUCK = 10; // per echo that was confused at least once this run
export const FAIL_FREEZE_MS = 1200; // ms of frozen input between fail and restart
export const EXIT_LOCKED_EMISSIVE = 0x5c2a2a; // exit marker while beacons remain

// Overhead map (M3/T4) — pings on the tactical map
export const PING_TTL_MS = 4000; // ms a map ping stays visible before it is dropped
export const CHHAYA_PING_MS = 2000; // ms between Chhaya's map pings while her sample exists

// Passages (M2/T7) — true-mirror step-through, silvered push-doors
export const PASSAGE_RANGE = 1.4; // m — nearest-mirror range for step-through and push
export const DOOR_SLIDE_M = 1.2; // m a silvered door slides along its wall
export const DOOR_SLIDE_MS = 400; // ms the slide takes (linear lerp in the frame loop)

// Procedural audio (M3) — raga-mood theory + WebAudio engine
export const AUDIO_ROOT_HZ = 110; // A2 — drone root; melody window sits one octave above
export const AUDIO_GAIN_CEILING = 0.5; // master gain cap (mute = 0)

// Campaign (M4) — Tier-1 floor ladder, Taal's beat
export const TIER_ONE_FLOORS = 10; // floors 1–9 procedural ramp, 10 = Dwaar I
export const DWAAR_FLOOR = 10; // tier-complete threshold hall (fixed layout)
export const TAAL_FLOOR = 5; // the beat-walker's cameo floor
export const BEAT_TICK_MS = 250; // Taal's lurch clock — 8-tick cycle (2s)
export const DESCEND_MS = 800; // ms the descending overlay holds before the next floor arms

// T2 — the Hall of Ancestors: floors 11–19 procedural ramp, 20 = Dwaar II
// (Taal's threshold hall — the LAST floor doubles as the Dwaar II floor).
export const TIER_TWO_FLOORS = 20;
export const TAAL_SENTINEL_FLOOR = 11; // from here Taal's touch catches, not angers

// T3 — the Reflecting Gardens: floors 21–29 procedural ramp, 30 = Dwaar III
// (the garden hall; Truth-Shard III ends the tier — Gher arrives in T3/T2).
export const TIER_THREE_FLOORS = 30;
export const GHER_SENTINEL_FLOOR = 21; // from here Gher walks every tier-3 floor
export const GHER_INTERCEPT_MS = 1000; // his reaction time: how often the prediction retargets
// T4/T2 — Aavart the Ambusher: from here he walks every tier-4 floor beside
// Taal and Gher (the ladder accumulates — all three walk the Carnival).
export const AVART_SENTINEL_FLOOR = 31; // from here Aavart walks every tier-4 floor
export const AVART_INTERCEPT_MS = 1200; // his reaction time: how often the projection retargets
export const AVART_LEAD_S = 1.8; // seconds of travel projected at a full sprint
// T4 — the Carnival of Faces: floors 31–39 procedural ramp, 40 = Dwaar IV
// (the funhouse hall). Truth-Shard IV banks mid-descent (T5/T1: IV joins the
// interstitial cascade) and the stairs at 40 open into Act II.
export const TIER_FOUR_FLOORS = 40;
// T5 — the Flood Halls: floors 41–49 procedural ramp, 50 = Dwaar V (the
// sunken arena; the row-9 apex duel, all four Sentinels — Truth-Shard V
// claims the tier mid-descent as the interstitial, T6/T1: the full screen
// moved to Dwaar VI).
export const TIER_FIVE_FLOORS = 50;
// T6 — the Furnace Wings: floors 51–59 procedural ramp, 60 = Dwaar VI (the
// crucible forge; Truth-Shard VI claims the tier mid-descent — the duet-tier
// close below it). T7 retired the terminus at 60: the stairs open into the
// Whisper Library and descend() walks on.
export const TIER_SIX_FLOORS = 60;
// T7 — the Whisper Library: floors 61–69 procedural ramp, 70 = Dwaar VII (the
// reading room; the Taal+Gher duet — Truth-Shard VII closes the tier on the
// 1.8s interstitial, T8/T1: the full screen moved to Dwaar VIII and the
// T7-era terminal close retired downward with it).
export const TIER_SEVEN_FLOORS = 70;
// T8 — the Frozen Atrium: floors 71–79 procedural ramp, 80 = Dwaar VIII (the
// all-four-Sentinel duel — Truth-Shard VIII cascades to the 1.8s interstitial
// as of T9; the full tier screen moved down with the Warrens).
export const TIER_EIGHT_FLOORS = 80;
// T9 — the Warden's Warrens (Act III opens): floors 81–89 procedural ramp,
// 90 = Dwaar IX (the all-four apex duel in the warren — Truth-Shard IX
// closes the tier; T10/T1 retired the T9-era terminal: IX's claim cascades
// to the 1.8s interstitial and descend() walks on to the Foundations).
// ACT_III_FLOOR is the Ground Door banner's floor — the first Warrens build
// of a session raises `ACT III — THE GROUND DOOR` once.
export const TIER_NINE_FLOORS = 90;
export const ACT_III_FLOOR = 81;
// T10 — THE FINALE: the Glazier's tier. Floors 91–99 are the FOUNDATIONS —
// the ramp's last procedural floors, stripped of every mirror and Sentinel —
// and 100 is the GROUND: the Glazier's own floor (hand-authored layout, no
// Dwaar — the ending has the Glazier and the Door, not a threshold hall).
// The validator widens to TIER_TEN_FLOORS = 100 in the SAME commit (the
// ×9 binding held eight times; this is the last widening).
export const TIER_TEN_FLOORS = 100;
// T10/T2 — the master's floor: the Glazier spawns on the Ground (100) and
// NOWHERE else — the Foundations (91–99) are walked alone, the Ground is his.
export const GLAZIER_FLOOR = 100;
// T7 — the beat-walker's RETURN: Taal's rest (his first, 51–59 in T6)
// extends through 65 and he walks the Library's last five floors (66–70) —
// his beat ticks are noise he ignores but you cannot miss.
export const TAAL_RETURN_FLOOR = 66;
// T7/T2 — the noise economy: the Library's Echoes are blind (`ears`, not
// `glass`) and track the player's NOISE instead of mirrors. A sprint rings
// loud (every fixed step), a walk rings soft (one ping per
// NOISE_WALK_EVERY_MS), frost/push/step-through ping once at the action, and
// Taal's accent ticks ring a sprint-sized ping at his own position — the
// loudest thing in the stacks. Pings live NOISE_TTL_MS and the ring holds at
// most NOISE_MAX_EVENTS (drop-oldest beyond the cap). The events are
// invisible by design: the economy is audio and knowledge, never the map.
export const NOISE_SPRINT_R = 7; // m — a sprint's ring (every fixed step)
export const NOISE_WALK_R = 4; // m — a walk's soft ring
export const NOISE_ACTION_R = 2.5; // m — frost/push/step-through's single ping
export const NOISE_WALK_EVERY_MS = 500; // ms between walk pings
export const NOISE_TTL_MS = 1200; // ms a ping stays hearable
export const NOISE_MAX_EVENTS = 24; // ring cap — drop-oldest beyond it
// T8 — the Frozen Atrium's inversion: the frost verb THAWS the frozen panes
// (frost.ts routes by state), and a thawed pane is a live eye PLUS a lure —
// every echo within THAW_LURE_RADIUS of the thaw event adopts the pane's cell
// as its patrol override and walks there to linger, watching. Frost on a
// THAWED pane cold-fogs it for COLD_FOG_MS — ten minutes, never meaningfully
// expiring within an attempt: the eye closes and the lure ends for good.
export const THAW_LURE_RADIUS = 10; // m — how far a thaw's pull reaches
export const COLD_FOG_MS = 600000; // ms a cold fog holds (the attempt's rest)
// T4/T3 — the distorting mirrors: while UNfogged carnival glass sees the
// player, every enemy's mirror-sight reads them displaced by the mirror's
// fixed per-id delta — axis-aligned cells, capped here. Fog the glass and the
// house remembers where you truly stand.
export const DISTORT_MAX_CELLS = 2;
// T3 — the water-mirrors: standing pools are Echo eyes the lantern cannot
// fog; the player's step is the only blindness they know.
export const WATER_RIPPLE_MS = 10_000; // ms a rippled pool's eye stays shut
export const WATER_RIPPLE_RADIUS = 1.4; // m — how close the player must come to ripple a pool

// T5 — the mirror-you decoys (Act II's first form): the house sends glass
// copies of the player ahead of them. A copy spawns every
// DECOY_SPAWN_EVERY_MS (± jitter) at an open cell 8–12 BFS cells from the
// player, walks BFS toward the EXIT, lures Echoes when nearer than the
// player, never harms anyone, never drowns — and shatters for DECOY_SHARD
// shards when the player touches it (once per copy, via the shattered flag).
export const DECOY_SPAWN_EVERY_MS = 45000; // ms between spawn attempts (jittered 0.8–1.2×)
export const DECOY_MAX_ALIVE = 2; // unshattered copies on a floor at once
export const DECOY_SHARD = 5; // shards pending per shattered copy (banked at clear)
export const DECOY_SPEED = 2.0; // m/s — the copy's stride toward the exit
// T5/T3 — the rising water: the run floods from its first input. The level is
// a pure derived function of the run clock (waterLevel.ts) — min(WATER_MAX_M,
// elapsed/WATER_FULL_S · WATER_MAX_M), so the halls stand 1.2 m deep at
// WATER_FULL_S. Past 0.6 m everyone wades at ×WATER_SLOW (the DECOYS are
// exempt — copies don't drown); past WATER_EYE_OFF_M the standing glass is
// eye-blind (echo.sensesPlayer skips it). Dwaar V (the sunken arena) floods
// on DWAAR_V_WATER_S — the duel runs against a faster clock.
export const WATER_FULL_S = 180; // s from run start to full depth (1.2 m)
export const WATER_MAX_M = 1.2; // m — the deepest the halls flood
export const WATER_SLOW = 0.85; // speed multiplier while level > 0.6 m
export const WATER_EYE_OFF_M = 0.9; // m above which mirrors stop being eyes
export const DWAAR_V_WATER_S = 120; // s to full depth in the sunken arena
