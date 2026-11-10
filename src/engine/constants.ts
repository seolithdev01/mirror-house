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
