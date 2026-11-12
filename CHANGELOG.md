# Changelog

One line per milestone — the full step-by-step record (every request and
response) lives under [docs/prompts-history/](docs/prompts-history/README.md),
and the arc from first brief to blueprint is
[the design doc](docs/superpowers/specs/2026-11-08-mirror-house-design.md).
Versions follow the store line: `0.1.0` carried everything through M5,
`0.2.0-beta.1` is the public beta.

## [t10] — 2026-11-12 — the Foundations (Tier 10, floors 91–100) — THE FINALE: the 100-floor house is complete

The campaign runs to one hundred — the finale tier, where the house runs out of mirrors on purpose and the Glazier himself walks his Foundations. The 100-floor spec from the first brief is delivered, floor by floor.

- **Floors 91–100** — the Foundations: a tier-10 ramp with **zero mirrors of
  any kind** (no standing glass, no portraits, no pools, no distort panes, no
  true pair, no heroes — `floorObjects` gates the whole glass roster off, and
  the mirror-you decoy stream stops at 90: a copy is glass, and there is none
  down here — pinned per floor), six Echoes on every floor (the one crowd the
  Foundations keep), four beacons (floor 100's are the pedestals), braids at
  `0.10 + 0.002·(f−91)` — the tightest tread in the game — with the Ground
  itself looser at 0.08, Chhaya 2.9 s behind tightening to 2.5 s by floor 99
  (2.2 s on the Ground), the `L91 · T10` floor chip, near-black stone dressing
  (void `0x050508`, pale-stone — the Glazier's own coat hue — in the teal
  slot, ash in the rose slot; the LAST tier-one stand-in retires and every
  tier of the house dresses as itself), and the three-note scale `[0,5,7]` on
  the sine hushed through `TIER_TEN_INTENSITY_CEILING` 0.4 — the sparsest
  music in the game. The save validator widened to 100 in the same commit as
  the ramp (**the binding held a NINTH and LAST time**; 101 is the first
  rejection, round-trips pinned at 95 and 100).
- **The rotation closes (spec §4.6 row 10)** — the hunt ends: all four
  Sentinels rest the ENTIRE Foundations (Taal's and Gher's open `>= 80` tails
  capped at `≤ 90`, Aavart's open `f > 70` tail closed the same way; Chhaya
  has no gate and keeps none) — the loneliest tier: you, the Echoes, and the
  house holding its breath. Truth table extended with rows 91/95/99/100 (all
  pin `F,F,F`, the hunt ended) and the identity oracle widened to a full 1–90
  sweep against t9's shipped table. The campaign's terminus moved one last
  time: 90 → 91 is a real descent (the T9-era no-op retired, the
  terminus-retirement pattern's sixth turn), **Dwaar IX joined the interstitial
  cascade** like every elder Dwaar, and `descend()` now rests at floor 100 —
  the machine's final state.
- **The Glazier** (`src/game/glazier.ts`) — the house's master, the last
  entity, floor 100 only (`GLAZIER_FLOOR`): a teleport-walker who needs no
  senses, no mirrors, no noise — every `GLAZIER_TELEPORT_S` (12 s) he
  relocates to the open cell FARTHEST from the player (`glazierTarget`, the
  bfs-farthest read the exit picker has always used), and between teleports
  flow-walks straight at the player at `GLAZIER_SPEED` (2.0 m/s) on the same
  flow field every walker rides. Never lured, never blinded, never slowed —
  there is no glass left to fog and he IS the fog. Contact is the standard
  caught; the once-per-attempt `He is here.` line marks his approach (≤ 3 m),
  the first teleport speaks `The Glazier walks his Foundations.` He wears the
  pale-stone coat and the full-white lantern — the only pure-white thing in
  the house — and the additive `glazierPos()` faucet is his witness.
- **The Ground Door** — floor 100 is `GROUND_LAYOUT` (95 open cells, plain by
  design — no ring, no rooms, no wall band; 180°-asymmetric on purpose, the
  master owes the house no ceremony; the exit (11,11) uniquely farthest at 20
  steps), NOT a Dwaar: `isFinale(floor)` is the one new predicate, clearing
  the Ground claims **✦ Truth-Shard X** (the campaign's last shard), and the
  tier screen is REPLACED by the finale — `ACT III COMPLETE — THE GROUND
  DOOR OPENS`, the full-campaign stats (one hundred floors and banked shards,
  Truth-Shard X folded into the middle clause), `One hundred floors. One
  door. You walked out.` (en/hi) beneath them, Play again / Stay riding the
  same buttons. No descend arms below — the finale screen is the end of the
  house.
- **Close-out** — §4.6 row 10 delivered, §2.3 marked **`THE 100-FLOOR SPEC IS
  COMPLETE`** (all ten tiers delivered 2026-11-08 → 12; Act III closed at the
  Ground Door) and §13.1's scope note refreshed to t10 (the full 1→100 spine,
  terminal at 100). §4.4's delivered note gains the hunt's end (the
  Foundations rest the wheel; Chhaya walks all ten tiers). README gains the
  Tier 10 + THE FINALE section (its Tier 9 section re-marks the cascade; the
  frost, Daily and FAQ sections gain the mirrorless close); the FAQ grows to
  50 (the Foundations — the hunt ends; the Ground Door — what happens after:
  "You walked out. The house keeps its copies. Act IV, someday, is
  theirs."), with the stale marks the delivery retires (the beta roadmap's
  Foundations line, the what-hunts-me tail, the Dwaar-IX-end-of-the-house
  claim). STATE_MACHINES' Campaign section refreshed for 100 floors — the
  machine's FINAL state (`descend()` a no-op at 100, `isFinale` claiming
  Truth-Shard X, the `GROUND_LAYOUT` Ground beside the nine Dwaar halls, the
  tier-10 ramp row, the `L94 · T10` / `L100 · THE GROUND` chips), the
  rotation table's close column, the finale interstitial and the Glazier
  content-entity note (the decoy precedent one tier deeper; no new
  machines). **The t6 minors rider**: the last heat read that bypassed the
  shared production gate — the Gher decoy-ward feed's bare `heatOn` — now
  routes through `heatActiveFloor()` (`venue === null` included), and the
  heat look-alike row documents the one-definition contract: every heat read
  (dressing, fog duration, crack anger, Aaina's `heatNear`, the ward feed,
  the DEV `heat()` read-out) shares the gated derivation, so a venue
  side-floor reads tier-one heat everywhere, exactly as it plays. 965 unit +
  48/48 e2e green; build ok — bundle checked on the artifact.

## [t9] — 2026-11-12 — the Warden's Warrens (Tier 9, floors 81–90) — ACT III opens

The campaign runs to ninety — the apex tier, where all four Sentinels hunt together on every floor, every mastered mechanic returns as thin texture, and the Ground Door's banner opens Act III.

- **Floors 81–90** — the Warden's Warrens: a tier-9 ramp (four beacons, braids
  to 0.432 by floor 89, Chhaya 3.0 s behind tightening to 2.5 s, 2.3 s in
  Dwaar IX) carrying **five Echoes on every procedural floor, Dwaar IX ALONE
  carrying six — the apex duel carries one more than every elder duel hall's
  five; its teeth are the all-four hunt and the returned texture, not the
  echo count** — the `L84 · T9` floor chip, and **Dwaar IX** at floor 90:
  the Warden's own warren (85 open cells — the tightest hall in the house,
  fewer than every elder hall but Dwaar I's 83), a waist band with exactly
  three doors, twelve dead ends, zero 3×3 rooms, no lane longer than five,
  180°-symmetric (the exit mirrors the entrance), one connected component,
  and the exit UNIQUELY farthest at exactly 20 BFS steps — the elder halls'
  traverse pin, hill-climbed until a tie or a deeper cell could not steal it.
  The save validator widened to 90 in the same commit as the ramp (**the
  binding held an eighth time**; 91 is the first rejection, round-trips
  pinned at 85 and 90).
- **The apex (spec §4.6 row 9)** — the rotation ends: `taalPresent` and
  `gherPresent`'s `=== 80` crucible-only calls widened to open `>= 80` tails
  (`aavartPresent`'s `f > 70` already walked it untouched) — **all four hunt
  together on every floor 81–90; no one rests**. Truth table extended with
  rows 81/85/89/90 (all pin `T,T,T`) and the identity oracle widened to a
  full 1–80 sweep against t8's shipped table. The campaign's terminus moved
  with it: 80 → 81 is a real descent again (the T8-era no-op retired, the
  terminus-retirement pattern's fifth turn), and `descend()` now rests at
  floor 90.
- **The texture stack** — every mastered mechanic returns thin:
  **heat** re-lights (`heatOn` = `(51–60) ∥ (81–90)` via
  `HEAT_FLOOR_RETURN 81` — 12 500 ms fogs, 25-anger cracks, the furnace
  dressing and Aaina's `heatNear` flowing from the same derivation);
  **water pools** return (tier 9 asks 2, the count roll `int(2)` → 2–3
  pools; the Gardens keep `int(3)`, 2–4); **distort panes** return (ask 1
  plus the `int(2)` coin → 1–2). One ask, `textureParamsForTier(tier)`,
  replaced `buildFloor`'s four inline per-kind gates; the new draws append
  AFTER each kind's existing rng streams — floors 1–80 byte-identical,
  swept and pinned per floor.
- **Act III opens** — the FIRST floor-81 build of a session raises
  `ACT III — THE GROUND DOOR` + `The door is real. So is what guards it.`
  (en/hi) for 3 s, once per session — the Act II banner's contract, with
  `hud.showActBanner(act?: 2 | 3)` parameterized so a `setLang`
  re-localizes whichever banner is visible. The interstitial cascade grows
  downward once more: **Dwaar VIII joins the 1.8 s claim banner** and the
  full screen moves to **Dwaar IX's tier close** (`✦ Truth-Shard IX claimed
  — Tier IX complete`, ninety floors and banked shards counted, ↻ Play
  again / Stay) — the campaign's terminal screen. Iron dressing: the
  iron/steel palette (void `0x0a0c0e`, warden-steel glass `0x5a9a9a`,
  iron-red rose, slate-steel walls — the LAST tier-one stand-in retires;
  every tier 1–9 dresses as itself) and the iron pentatonic `[0,1,3,7,8]`
  on the sawtooth — the warden's own voice.
- **Close-out** — §4.6 row 9 delivered, §2.3's Act III row marked opened
  (the banner raises on floor 81; the ten-Shard ground door and the
  mirrorless Foundations stay tier 10's; mistaken-for-a-copy stays
  deferred) and §4.4's delivered note extended with the wheel's end in the
  spec; §13.1's scope note refreshed to t9 (Act III opened, the Foundations
  what remains, terminal at 90). README gains the Tier 9 + ACT III OPENS
  section (its Tier 8 section re-marks the cascade and the iron descent;
  the frost/anger paragraphs gain the re-lit furnace; the Daily runs the
  ninety-floor spine); the FAQ grows to 48 (the Warrens — ACT III opens,
  everything at once, thin; the apex exam — "you will not out-fight them.
  Out-think them, or die in the iron."), with the stale marks the delivery
  retires (41–80 → 41–90 for the decoys, the rotation/Taal tails, the
  Atrium's end-of-the-house claim, the beta roadmap). STATE_MACHINES'
  Campaign section refreshed for 90 floors / nine Dwaars (the DWAAR_IX
  warren, the tier-9 ramp row, the interstitial cascade to Dwaar IX's
  screen, the `L84 · T9` / `L90 · DWAAR IX ✦` chips), the rotation table's
  apex column, the heat extension (the look-alike now two-band) and the
  tier-9 content note. 899→900 unit (the Warrens pair test) + 46/46 e2e
  green; build ok — ~195 KB gzip, wiring grepped in the artifact.

## [t8] — 2026-11-11 — the Frozen Atrium (Tier 8, floors 71–80) — ACT II freezes

The campaign runs to eighty — Act II's last tier, where every mirror arrives iced, the frost lantern thaws instead of fogs, and waking glass draws the wardens.

- **Floors 71–80** — the Frozen Atrium: a tier-8 ramp (four beacons, braids
  to 0.412 by floor 79, Chhaya 3.2 s behind tightening to 2.7 s, 2.5 s in
  Dwaar VIII) carrying **four Echoes on every procedural floor, Dwaar VIII
  alone carrying five — the all-four crucible is the tier's apex, and its
  teeth are the frozen panes and the thaw-to-lure economy, not the echo
  count** — the `L74 · T8` floor chip, and **Dwaar VIII** at floor 80: the
  frozen atrium (97 open cells), a grand central ring (a chebyshev-radius-3
  wall ring around a fully-open 5×5 court with EXACTLY 4 compass-midpoint
  gaps) plus four radial gallery walls on the ring-corner→hall-corner
  diagonals and nothing else wall, 180°-symmetric (the exit mirrors the
  entrance) and one connected component — the crucible needs the ring to
  walk and the galleries to seal. The save validator widened to 80 in the
  same commit as the ramp (**the binding held a seventh time**; 81 is the
  first rejection, round-trips pinned at 75 and 80).
- **The inversion (spec §4.6 row 8)** — `MirrorRuntime` gains `frozen` +
  `thawed` (`src/game/frost.ts`); `initMirrorRuntime` takes
  `{ frozenSpawn?: boolean }` and freezes the fogable glass
  (standing/portrait/distort — never beacons, never the true pair) at spawn
  (`frozenSpawnFloor()` = campaign tier 8; no opts keeps every pre-T8 call
  site byte-identical, and the freeze rides OPTS, not floorObjects — the rng
  streams stay pinned). `applyFog` **routes by the pane's state**: frost on
  a FROZEN pane THAWS it (`frozen=false, thawed=true, foggedUntil=null` —
  permanent for the attempt; the caller's duration is ignored); frost on a
  THAWED pane cold-fogs it (`foggedUntil = now + COLD_FOG_MS` 600000 — cold
  holds ten minutes; on tier 8 a cold-fogged pane refuses further frost —
  the ≤ 7 refresh semantics untouched); the `MirrorVisual` union grows
  `'frozen'` (precedence captured → frozen → fogged → clear), and a THAWED
  pane reads `'clear'` — it is a live eye again, `thawed` riding the runtime
  beside the union for the lure, never a visual state. `isFogged` keeps its
  one definition: frozen counts blind, thawed counts sighted. A reset
  re-freezes (the thaw is permanent FOR THE ATTEMPT); the once-per-FLOOR
  caption "The ice gives way — the glass watches." (en+hi) marks the first
  thaw, and Aaina sells the rule (`frozenNear`, slotted after `whisperNear`):
  "The Atrium freezes every pane. Your breath thaws them — and thawed glass
  draws the wardens. Choose what they watch."
- **The lure** — `src/game/echo.ts` (pure): a thaw emits
  `lureAt(echoes, paneCell, THAW_LURE_RADIUS 10, grid)`; echoes in radius
  adopt `patrolOverrideCell` and patrol TO the glass (the override's cell
  comes before the anchors; arrival ≤ 0.15 m → LINGER — target null, the
  wardens stand watching). Chase overrides AND clears the lure (seeing you
  through the pane you just thawed drops the glass); confusion keeps it;
  `releaseLure` frees only that pane's audience; `initEchoes` spawns null
  and `resetFloor` clears it with the attempt. Emergent tier texture, no
  extra code: the all-blind atrium feeds the fogged census, so the wardens
  open confused and every thaw both opens an eye and pulls its audience.
- **The rotation's fourth turn (spec §4.4)** — the sleeper wakes:
  **Aavart returns** (`aavartPresent` = `(31–40) ∥ (50–60) ∥ f > 70` — his
  t7 rest was an explicit `≤ 60` bound, extended so 61–70 stay rest and
  71–80 walk) and **Chhaya + Aavart own the ramp**; **Taal and Gher rest
  71–79** (taal `(11–50) ∥ 66–70 ∥ 80`, gher `(21–40) ∥ (50–60) ∥ 70 ∥ 80`
  — the Dwaar VII duet disbands into the ice) and **Dwaar VIII at 80 calls
  all four down — the third all-four hall**. Truth table extended with rows
  71/75/79/80 (79 pins `F,F,T`, the Ambusher alone with her shadow; 80 pins
  `T,T,T`); a full 1–70 sweep re-proves every older row against t7's
  shipped table as an identity oracle.
- **Ice dressing** — the ice-on-deep-void-blue palette (void `0x08101a`,
  ice glass `0x9ad4e8`, frost-blue rose, pale slate walls — the stand-in
  retired per the per-tier pattern) and the austere suspended pentatonic
  `[0,2,5,7,10]` on the **sawtooth** (`setVoice` union grows `'sawtooth'` —
  the cold strings). The overhead map draws frozen panes frost-white and
  thawed panes ice-teal (cold-fogged draw nothing). Interstitial cascade
  grows once more: **Dwaar VII joins the 1.8 s claim banner** and the full
  screen moves down to **Dwaar VIII's tier close** (`✦ Truth-Shard VIII
  claimed — Tier VIII complete`, eighty floors and banked shards counted,
  ↻ Play again / Stay) — the campaign's terminal screen, the house's end
  until Act III exists. New tester hook fields: `mirrors().frozen`/`.thawed`
  counts, `mirrorState(id)` (the MirrorVisual read-out) and
  `los(x1, y1, x2, y2)` — additive, dev/tester-only.
- **Close-out** — §4.6 row 8 delivered, §2.3's Act II row marked deepened
  (the tier turns the tool around — the house starts eye-blind and the
  Surveyor's breath opens eyes; mistaken-for-a-copy stays deferred to Act
  III) and the §4.4 delivered note extended with the wheel's fourth turn in
  the spec; §13.1's scope note refreshed to t8 (Act III is what remains).
  README gains the Tier 8 + ACT II FREEZES section (and its Tier 7 section
  re-marks the duet's cascade and the promise kept); the FAQ grows to 46
  (the Atrium — every pane arrives iced; the thaw-to-lure inversion — choose
  what the house watches); STATE_MACHINES' Campaign section refreshed for
  80 floors, the rotation table's tier-8 column, the MirrorVisual frozen
  row + the frost-as-modifier note (§2), the lure override (§4) and the
  tier-8 content note. 839 unit + 44 e2e green.

## [t7] — 2026-11-11 — the Whisper Library (Tier 7, floors 61–70) — ACT II listens

The campaign runs to seventy — the listening tier, where the Echoes go blind and grow ears, the noise economy becomes the whole fight, and the beat returns mid-tier.

- **Floors 61–70** — the Whisper Library: a tier-7 ramp (four beacons, braids
  to 0.392 by floor 69, Chhaya 3.3 s behind tightening to 2.8 s, 2.6 s in
  Dwaar VII) carrying **four Echoes on every procedural floor, Dwaar VII
  alone carrying five — the Taal+Gher duet is the tier's apex, and its
  teeth are the hearing Echoes and the noise economy, not the echo count**
  — the `L64 · T7` floor chip, and **Dwaar VII** at floor 70: the library
  stacks (95 open cells), four long parallel shelf-wall runs (rows 3/5/7/9)
  separated by fully-open single-cell reading aisles, four reading alcoves
  tucked at the shelf ends (180°-mirrored pairs (3,3)↔(9,9) and
  (9,5)↔(3,7)), 180°-symmetric (the exit mirrors the entrance) and one
  connected component — the duet needs the room to walk its beats and the
  blind Echoes need stacks to listen past. The save validator widened to 70
  in the same commit as the ramp (**the binding held a sixth time**; 71 is
  the first rejection, round-trips pinned at 65 and 70).
- **The noise economy** — `src/game/noise.ts` (pure): `NoiseEvent
  {x, y, r, at}` pings in a TTL ring (`emit` appends and drops — 1200 ms
  time-to-hear, 24-event cap drop-oldest; `hears` is the boundary-inclusive
  radius check; `loudestAt` returns the NEAREST audible ping as the chase
  target). `main.ts` feeds the ring while the sim is live: **a sprint rings
  loud (7 m) every fixed step, a walk rings soft (4 m) per 500 ms,
  standing still and turning in place are silent, and frost / push /
  step-through ping once (2.5 m) at the action** — the verbs are noise.
  The ring is invisible by design: no map draws, no floorObjects draws
  (the rng streams stay pinned) — the economy is audio and knowledge.
- **The Echoes hear, not see (spec §4.6 row 7)** — every echo gains a
  spawn-time `sense: 'glass' | 'ears'` axis (`echoSenseForFloor()` =
  tier 7 on the campaign, glass everywhere else; venue floors always
  tier-one). An **ears** echo skips the confusion census and the
  mirror/lure eye logic entirely — a fog blinds nothing down here and the
  ≥2-fogged-eyes stall does not work — and on the usual sense tick it
  chases `loudestAt(...)` with the same 2 s chase memory: ring it and it
  hunts, go quiet and it forgets. **Glass echoes are noise-immune**
  (unit-pinned: a ping landing exactly on a tier-1 echo moves nothing).
  The first noise-caused chase per floor speaks the caption "A
  shelf-warden heard you." (en+hi), and Aaina sells the tier's standing
  rule (`whisperNear`, slotted before the shadow's warning): "They are
  blind here — but they listen. Walk. Never run the stacks."
- **The rotation's third turn (spec §4.4)** — the wheel hushes: **Taal's
  rest lengthens through 65** (`taalPresent` = `(11–50) ∥ f ≥ 66` — the
  ratified net change on the old floors is 60–65 gaining rest, so the
  Dwaar VI crucible replays as the Gher+Aavart hall) and **the beat
  returns at 66** (`TAAL_RETURN_FLOOR`) — mid-tier, walking 66–70, where
  his every even-beat accent tick rings a 7 m ping at HIS position: noise
  he ignores and the blind wardens cannot refuse to chase — the bait you
  cannot miss and the best decoy in the house. **Gher keeps the Furnace
  (50–60), rests 61–69, and joins ONLY at the Dwaar VII duet (70)**;
  **Aavart rests all of tier 7 and returns in tier 8**; Chhaya never
  rests. Truth table extended with rows 61/65/66/69/70 — and row 60
  re-pinned `F,T,T` (the extended rest); rows 1–59 identical to t6's.
- **Whispered dressing** — the moonlit lavender-grey palette (void
  `0x0a0a12`, lavender glass, dusk rose, slate walls — the stand-in retired
  per the per-tier pattern) and the whispered set `[0,2,3,7,8]` on the
  sine, under `TIER_SEVEN_INTENSITY_CEILING` 0.55: the tier-7 audio feed
  multiplies the intensity blend by 0.55, so a full chase tops out ≈ 0.52
  and a calm floor sits ≈ 0.11 — the melody stays sparse whatever the
  wardens do. Interstitial cascade grows once more: **Dwaar VI joins the
  1.8 s claim banner** and the full screen moves down to **Dwaar VII's
  tier close** (`✦ Truth-Shard VII claimed — Tier VII complete`, seventy
  floors and banked shards counted, ↻ Play again / Stay) — the campaign's
  terminal screen, the house's end until tier 8 exists. New tester hook
  fields: `noise()` (the live ring's size) and `echoMode(i)` (the ears
  witness).
- **Close-out** — §4.6 row 7 delivered, §2.3's Act II row marked deepened
  (the Echoes' inversion — they hear, not see — is live; mistaken-for-a-copy
  stays deferred) and the §4.4 delivered note extended with the wheel's
  third turn in the spec; §13.1's scope note refreshed to t7. README gains
  the Tier 7 + ACT II LISTENS section (and its Tier 6 section re-marks the
  crucible's replay without Taal); the FAQ grows to 44 (the Library — walk,
  don't run; how the noise works — hearing vs seeing); STATE_MACHINES'
  Campaign section refreshed for 70 floors, the rotation table's tier-7
  column, the echo sense axis (§4), the tier-7 content note and the noise
  ring look-alike row. 777 unit + 42 e2e green.

## [t6] — 2026-11-11 — the Furnace Wings (Tier 6, floors 51–60) — ACT II deepens

The campaign runs to sixty — the burning tier, where the heat melts your frost, the rotation turns, and the house starts guarding its copies.

- **Floors 51–60** — the Furnace Wings: a tier-6 ramp (four beacons, braids to
  0.352 by floor 59, Chhaya 3.5 s behind tightening to 2.9 s, 2.8 s in
  Dwaar VI) carrying **four Echoes on every procedural floor, Dwaar VI alone
  carrying five — the crucible duel is the tier's apex, and its teeth are
  the heat and the guarded copies, not the echo count** — the `L54 · T6`
  floor chip, and **Dwaar VI** at floor 60: the crucible forge (101 open
  cells), twin parallel forge corridors — two 3-wide halls running the
  forge's length, the campaign's longest — joined at the ends by the open
  cross runs and joined in the middle by a central 3×3 crucible chamber
  through EXACTLY 4 connecting gaps, 180°-symmetric (the exit mirrors the
  entrance) and one connected component. The save validator widened to 60
  in the same commit as the ramp (**the binding held a fifth time**; 61 is
  the first rejection).
- **The heat** — `src/game/heat.ts` (pure): on 51–60 a fogged pane
  **evaporates in half the time** (`FOG_DURATION_MS × 0.5` — 12.5 s, not
  25 s; `applyFog` gained a caller-owned duration so frost stays
  heat-blind) and every sprint-crack **burns 25 anger, not 15**
  (`applyCrack` gained the caller-owned amount; Taal's +20 touch is anger,
  not a crack, and never routes through it). Furnace dressing rides
  `buildFloor`, never the frame loop: the scene haze shifts warm charcoal,
  one low ember point light, and a **static** heat-shimmer gradient quad
  (reduced-flash safe by construction — nothing animates; the plan's
  "slow sine" was retired). Aaina's `heatNear` hint sells the warning:
  "The furnace breathes — your frost melts fast, and every crack you leave
  burns wider."
- **The rotation turns (spec §4.4)** — the wheel's second half-turn:
  **Taal takes his first rest** — `taalPresent` = `(11–50) ∥ 60`; the
  beat-walker who walked every floor from 11 through 50 sits the Wings out
  (the beat-water pairing was the Flood's gimmick, the Furnace is
  Gher+Aavart's home, the heat re-tunes the fight) — while **Gher and
  Aavart walk every floor 51–60** (`(21/31–40) ∥ f ≥ 50` — their ratified
  41–49 rest window unchanged, the t5 e2e's floor-41 pins holding). Chhaya
  never rests. **Dwaar VI (60) calls all four down — the second
  all-four-Sentinel hall.** Truth table extended with rows 51/55/59/60;
  rows 1–50 byte-identical to t5's.
- **The house guards its copies (Act II's deception deepens)** — the decoy
  stream widens to 41–60 (`tierOf ≥ 5`; **the water does not** — the flood
  stays the Flood Halls' own, the Furnace burns dry), and `gherObjectives`
  extends the Encircler's objective candidates with the **alive decoy
  cells**: a copy crossing his sector pulls the seal straight onto it
  (`sealsDecoyCell` is the caption's eye — once per floor build,
  "The warden guards the copy.", en+hi; `gherSeal()` joins the debug
  faucet as the ward's live witness). Aavart keeps the bare objectives —
  the Ambusher reads the player, the Warden reads the house. Shard-farming
  a copy is genuinely risky now.
- **Furnace dressing** — the ember/copper-on-charcoal palette (the teal
  slot wears ember, the rose slot copper, the lattice glows ember-gold)
  and the urgent Phrygian-adjacent pentatonic `[0,1,5,7,8]` with the
  melody on the triangle. New tester hook field: `heat()`; `gherSeal()`
  landed with the ward. Interstitial cascade grows again: **Dwaar V joins
  the 1.8 s claim banner** and the full screen moves down to **Dwaar VI's
  tier close** (`✦ Truth-Shard VI claimed — Tier VI complete`, sixty floors
  and banked shards counted, ↻ Play again / Stay) — the campaign's terminal
  screen, the house's end until tier 7 exists.
- **Close-out** — §4.6 row 6 delivered, §2.3's Act II row marked deepened
  (the decoys' second element — enemies protect the copies — is live;
  mistaken-for-a-copy stays deferred) and the §4.4 delivered note extended
  with the rotation's turn in the spec; §13.1's scope note refreshed to t6.
  README gains the Tier 6 + ACT II DEEPENS section; the FAQ grows to 42
  (the Furnace, the rotation's turn — Taal rests there); STATE_MACHINES'
  Campaign section refreshed for 60 floors, the rotation table's tier-6
  column, the tier-6 content note and the heat look-alike row. 715 unit +
  40 e2e green.

## [t5] — 2026-11-11 — the Flood Halls (Tier 5, floors 41–50) — ACT II opens

The campaign runs to fifty and the second act begins — the drowned tier, where the house starts copying you.

- **Floors 41–50** — the Flood Halls: a tier-5 ramp (four beacons, braids to
  0.332 by floor 49, Chhaya 3.6 s behind tightening to 3.1 s, 2.9 s in
  Dwaar V) carrying **four Echoes on every procedural floor, Dwaar V alone
  carrying five — a step back from the Carnival's five, the playability call
  that gives the tier's new teeth room: the water and the copies own the
  stage, not the echo count** — the `L44 · T5` floor chip, and **Dwaar V** at
  floor 50: the sunken arena (101 open cells), concentric rings — a two-cell
  outer promenade, a mid ring wall with exactly four gates at the compass
  midpoints, an inner corridor circling the 3×3 sanctum — 180°-symmetric
  (the exit mirrors the entrance) and one connected component, because four
  Sentinels need the room. The save validator widened to 50 in the same
  commit as the ramp (the binding held a fourth time; 51 is the first
  rejection).
- **ACT II opens (spec §2.3)** — the first floor-41 build of a session raises
  the act banner (`ACT II — THE DECEPTION — The house has begun copying
  you.`, en+hi) for 3 s, once per session (rebuilds of 41 stay quiet). The
  interstitial cascade grows: Dwaar IV joins Dwaar I/II/III's 1.8 s claim
  banner, and the full screen moves down to **Dwaar V's tier close**
  (`✦ Truth-Shard V claimed — Tier V complete`, floors and banked shards
  counted, ↻ Play again / Stay) — the campaign's terminal screen, the house's
  end until tier 6 exists.
- **Mirror-you decoys (Act II's first form)** — `src/game/decoy.ts`: every
  ~45 s (36–54 s, jittered) the house plants an exact glass clone of your
  avatar 8–12 BFS cells away (two alive at most) and it flow-walks toward the
  exit at 2.0 m/s, forever — it cannot hurt you, frost ignores it, and it
  never drowns. The lure: **an Echo chases the nearer of you and a copy**.
  The bounty: walk into a copy and it shatters once for **+5 pending shards**
  (forfeited with any fail, like beacon shards). On the overhead map the copy
  is the hollow gold ring, your arrow the solid one. The full Act II form —
  enemies protecting the decoys, you being mistaken for one — is documented
  in spec §2.3 as deferred to the deeper tiers. Dev faucet `forceDecoy()`
  skips the spawn clock (disclosed; the e2e rides it).
- **The halls flood** — `src/game/waterLevel.ts`: from your first input the
  water rises **linearly for 180 s to 1.2 m** (Dwaar V's sunken arena: 120 s
  — the duel is a race). Past 0.6 m everyone wades at **×0.85** (the copies
  exempt — copies don't drown); past 0.9 m **the standing glass stops being
  an eye** (`sensesPlayer` skips it — the flood blinds mirrors for free);
  the glass visibly sinks toward half height as it goes, the translucent
  teal-green plane climbing with the level, and the caption warns once
  (`The halls are flooding…`). The level is pure derived data — a function of
  the run clock, nothing stored.
- **The rotation begins (spec §4.4)** — the ladder stops accumulating and
  starts rotating: the bare `>=` gates became presence functions
  (`taalPresent`/`gherPresent`/`aavartPresent`, floors 1–40 pinned
  byte-identical by truth-table tests). **Taal never rests** (every floor
  ≥ 11, Act II included); **Gher (21–40) and Aavart (31–40) sit the 41–49
  ramp out** and both return for one hall — **Dwaar V, the first
  all-four-Sentinel duel**, row 9's apex (the Warden's Warrens) previewed at
  the close of Act II's opening tier.
- **Flood dressing** — the drowned indigo-green palette (the teal slot wears
  the water's kin tone; the lattice glows lantern-pale) and the dark
  pentatonic `[0,3,5,7,10]` with the melody back on the triangle. New tester
  hook fields: `tier()`, `waterLevel()`, `decoys()`.
- **t4 minors rider** — the three recorded review minors land here:
  the FAQ's Aavart answer no longer says "turn a corner at a crawl" (a
  creep-speed control the shipped game never had — the counter now reads
  "stand still or change your pace"); the e2e distortion assertion imports
  `CELL_SIZE` instead of the literal `4`; and the tier screen's Stay button
  relabels to **"Stay — walk the hall"** (hi: हॉल में चलें).
- **Close-out** — §4.6 row 5 delivered and the §2.3 Act II row marked opened
  in the spec (the §4.4 delivered note now carries the rotation table —
  Taal ≥ 11 always; Gher 21–40 + Dwaar V; Aavart 31–40 + Dwaar V; row 9's
  full apex stays future; §13.1's scope note and §13.4's playtest INVITED
  mark refreshed); README gains the Tier 5 + ACT II OPENS section; the FAQ
  grows to 40 (the Flood Halls, the flooding halls, the wardens' rotation —
  the decoy entry landed with the copies); STATE_MACHINES' Campaign section
  refreshed for 50 floors, the presence/rotation table, the decoy content
  note and the water-level look-alike. 651 unit + 38 e2e green.

## [t4] — 2026-11-10 — the Carnival of Faces (Tier 4, floors 31–40) — ACT I closes

The campaign runs to forty and the first act ends — the funhouse tier, where the glass lies about you.

- **Floors 31–40** — the Carnival of Faces: a tier-4 ramp (four beacons, braids
  to 0.312 by floor 39, Chhaya 3.8 s behind tightening to 3.3 s, 3.0 s in
  Dwaar IV) carrying **five Echoes on every floor, Dwaar IV included — a
  deliberate step DOWN from tier three's six, the ratified playability call:
  three lethal Sentinels walk tier 4, so the echoes yield the stage** — the
  `L34 · T4` floor chip, and **Dwaar IV** at floor 40: the funhouse hall (101
  open cells), four offset alcoves — one per wall, each rotated one position
  on from the last, never compass-aligned — around a central carousel ring (a
  radius-2 wall ring with four compass gaps, its 3×3 heart standing open). The
  save validator widened to 40 in the same commit as the ramp (the binding T2
  lesson; 41 is the first rejection).
- **Act I closes (spec §2.3)** — Dwaar III's clear now cascades to Dwaar
  I/II's interstitial banner (`✦ Truth-Shard III claimed — the house
  deepens…`, en+hi), and **Dwaar IV's clear raises the act-completion
  screen**: the tier-complete overlay re-styled as the act close —
  `ACT I COMPLETE — The Trap`, the forty floors and banked shards counted,
  `Act II: The Deception — the house will start copying you…` for the note
  line, the card dressed in the carnival's rose, ↻ Play again / Stay. The
  campaign is **terminal at 40**: `descend()` there is a no-op returning the
  same object (pinned) — the act screen is the end of the house until Act II
  exists.
- **Aavart the Ambusher** — the fourth Sentinel (`src/game/avart.ts`), and he
  reads the one thing the others ignore: your **pace**. `ambushCell`
  projects 1.8 s of travel along your heading, scaled by stride (a sprint
  reaches ~3 cells ahead; standing still collapses the lead onto your own
  next step), onto the BFS path to your nearest goal and takes the
  corner-cut; an off-road projection sends him to the objective itself to
  wait. `updateAavart` runs him there at 2.4 m/s — the fastest Sentinel —
  adopting a fresh read only every 1.2 s: the counter is to change your pace
  inside that window (Aaina: "He leaps where you are GOING — the faster you
  run, the further he reaches. Change your pace.").
- **The ladder accumulates — all four walk by tier 4 (spec §4.4).** Found
  during t4's Aavart wiring: Gher's spawn gate was still tier-3-only, so it
  was widened to **every floor from 21 down** (the same widening Taal got at
  t3 for ≥ 11) — Chhaya always, Taal ≥ 11, Gher ≥ 21, Aavart ≥ 31: Taal and
  Gher walk the whole Carnival beside the newcomer (pinned by e2e — all
  three Sentinel positions non-null on floor 31).
- **Distorting mirrors** — 2–3 bent rose panes a floor, the rng draws
  LAST-LAST so the tier-1/2/3 streams stay byte-identical, and each pane's
  fixed lie derives from its id (axis-aligned, ±`DISTORT_MAX_CELLS` = 2
  cells). While an unfogged pane sees you, `apparentPlayer()` displaces your
  **apparent position** by that pane's delta: the echo sense check, the
  chase cell AND the map pings all read where you appear, not where you are
  — the deception visible on the map (pings bloom offset from your arrow),
  warned once per attempt by caption ("The glass shows you somewhere you are
  not.", en+hi). They fog exactly like standing glass (25 s, banks nothing) —
  fog the seeing pane and the house remembers where you truly stand. The
  displacement is derived per fixed step: a look-alike, not a state machine.
- **Carnival dressing** — the rose/magenta-on-night palette (the teal slot
  wears the carnival's magenta; the diamond lattice glows candle-flame), the
  mischievous fourth scale `[0,2,3,7,9]` — the Durga frame with its third
  flattened — and the melody voice back on the triangle, the reed's wink
  after the Gardens' flute. New tester hook fields: `avartPos()`,
  `mirrors().distort`, `apparentPlayer()`.
- **Close-out** — §4.6 row 4 delivered and the §2.3 Act I row closed in the
  spec (the §4.4 ladder note now reads all-four-walk-by-tier-4; §13.1 notes
  Acts II/III remain future content); README gains the Tier 4 + ACT I
  COMPLETE section; the FAQ grows to 36 (the Carnival, Aavart's pace trick —
  the carnival-glass entry landed with the mirrors); STATE_MACHINES'
  Campaign section refreshed for 40 floors, the terminal note, and the
  distort look-alike under MirrorVisual. 562 unit + 36 e2e green.

## [t3] — 2026-11-10 — the Reflecting Gardens (Tier 3, floors 21–30)

The campaign deepens to thirty — a garden tier where the water watches.

- **Floors 21–30** — the Reflecting Gardens: a tier-3 ramp (six Echoes on
  every floor, four beacons, braids to 0.272 by floor 29, Chhaya 4.2 s behind
  tightening to 3.7 s), the `L24 · T3` floor chip, and **Dwaar III** at floor 30 — the
  garden hall, the most open threshold yet (107 open cells: dotted hedge
  runs, never a solid wall, two 11-cell sightlines for the water's long
  view). Dwaar II's clear now takes Dwaar I's interstitial banner (Act II
  continues into the Gardens); the full tier screen is Dwaar III's —
  `✦ Truth-Shard III claimed — Tier III complete`. The save validator
  widened to 30 in the same commit as the ramp (the binding T2 lesson).
- **Gher the Encircler** — the third Sentinel, and he does not sense at all:
  pure prediction. He reads your commit against the road ahead and glides at
  one steady 1.9 m/s to seal the corridor ~3 cells ahead of you (a 1 s
  retarget tick). The counter is the **feint** — break the commit and his
  prediction dies while he holds. The ladder **accumulates** (spec §4.4):
  Taal stays — his spawn gate widened to every floor from 11 — so both
  Sentinels walk the Gardens; both now always spawn at the patrol anchor
  farthest from you (the fairness fix that killed a caught-at-spawn seed).
- **Water-mirrors** — 2–4 still pools a floor, Echo eyes you cannot fog:
  walk within arm's reach to ripple one blind for ten seconds (its overhead
  dot dims; the water stills again on its own). The ripple is derived TTL
  data (a look-alike, not a state machine); the pools consume into the echo
  senses and the map, and never touch the tier-1/2 rng streams.
- **Gardens dressing** — the green/water-teal/ivory palette, the pastoral
  pentatonic scale `[0,2,5,7,9]`, and the melody voice switching to sine —
  the flute leads tier 3 from its first note (venue floors reset to the
  tier-one scale AND voice). New tester hook fields: `gherPos()`,
  `mirrors().water`, `audioState().scale`/`.voice`.
- **Close-out** — §4.6 row 3 and the §4.4 ladder annotated delivered in the
  spec; README gains the Tier 3 section; the FAQ grows to 33 (the Gardens,
  Gher's feint — the water entry landed with the pools); STATE_MACHINES'
  Campaign section refreshed for 30 floors and the accumulating Sentinels.
  487 unit + 34 e2e green.

## [t2] — 2026-11-10 — the Hall of Ancestors (Tier 2, floors 11–20)

The first post-beta content milestone — the campaign doubles downward.

- **Floors 11–20** — the Hall of Ancestors: a tier-2 ramp (echoes 5–6,
  beacons 4 a floor, tighter braids, Chhaya 4.5 s behind tightening to 4.1),
  the `L14 · T2` floor chip, and Dwaar II at floor 20 — a second
  hand-authored 13×13 threshold hall, broader than Dwaar I (96 open cells)
  because the Sentinel needs room to walk his beat.
- **Taal promoted to Sentinel** — from floor 11 through Dwaar II he walks
  every tier-2 floor and his touch **catches** (the floor-5 cameo stays
  anger-only); `taalOutcome` pins that boundary in one pure place. He surges
  on the 2-second beat and crawls between — cross on the dim beat.
- **Ancestor portraits** — 2–3 dim procedural silhouettes wall-mounted on
  every tier-2 floor; mirrors like any other, fogged like any glass.
- **Tier-2 art + music** — the amber/brown/deep-teal palette (void haze and
  walking lantern re-dress per floor), and the melody walker finally plays
  the Durga pentatonic (`setScale`, live at every floor build; venue
  side-floors stay tier-one dressed).
- **Truth-Shard I interstitial** — Dwaar I's clear now celebrates with a 1.8 s
  auto-dismiss banner (`✦ Truth-Shard I claimed — the house deepens…`, en+hi)
  and the descent continues into the Hall; floor 20 keeps the full
  tier-complete screen.
- **Close-out** — §4.6 row 2 and §13.1 annotated delivered in the spec; the
  full 2h desktop soak closed **PASSED 2026-11-10: 2181 cycles, 0 crashes,
  heap stable post-warmup (14.5MB flat final hour)**; README gains the Tier 2
  section; the FAQ grows to 30 (the Hall, crossing Taal, the portraits);
  STATE_MACHINES' Campaign section refreshed for 20 floors. 415 unit + 32
  e2e green.

## [0.2.0-beta.1] — 2026-11-09 — the beta (M6)

- **Venue side-floors** — local ventures can host a themed floor of the game:
  a strict, fully validated JSON pack (name, tagline in en+hi, two accent
  colours, maze shape) builds an isolated side-floor that never touches the
  campaign, shards, or bests; ships with the ☕ Glasshouse Café demo pack,
  reachable via ⚙ → Floors or `?venue=`.
- **Store builds** — Capacitor wraps the same web bundle for Android
  (`com.amtocsoft.mirrorhouse`, `versionName 0.2.0-beta.1`), with the
  build/sign/runbook in [docs/BUILD-STORES.md](docs/BUILD-STORES.md) and the
  ready-to-paste listing copy in [docs/STORE-LISTING.md](docs/STORE-LISTING.md).
  The debug APK builds green from a clean tree (4.08 MiB, manifest
  `aapt`-verified; unsigned release APK proven too) — Play submission waits
  on the store account.
- **Launch kit** — beta announcement drafts (en+hi), the venue-pilot pitch and
  pack checklist, and the launch-day checklist:
  [docs/LAUNCH.md](docs/LAUNCH.md). This changelog. Version bumped to
  `0.2.0-beta.1`.
- **Service worker turned** — cache `mh-v5`, and the demo venue pack rides the
  precache (with `/venues/*` served cache-first), so the shipped side-floor
  works offline with the shell.
- **Carried minors** — Escape closes only the topmost of stacked dialogs (one
  layer per press); the arrow alternates stand down while ⚙ is open (its
  radios own Arrow* — the player stops moving); Aaina refuses hint sales on
  venue floors ("Return to your campaign to ask Aaina", en+hi); FAQ gains the
  sponsored-floor entry (25 questions).

### step007 — the tester & feedback kit (2026-11-09)

- **About ⓘ + launch meta** — the About panel (the small ⓘ beside 🌐, or
  ⚙ → About: version, pitch, beta status, credits, the four launch links) and
  the share-card meta tags (description, og/twitter, `/og-image.png`) so link
  previews stop guessing.
- **📮 Feedback & suggestions** — the in-game composer (top right): pick
  🐞 Bug / 💡 Suggestion / 💙 a kind word, and the message comes pre-carried
  with a read-only diagnostics block — version, seed (`BASE:floor`), preset,
  language, accessibility flags, a remap _count_ (never the bindings), venue,
  user agent, the last runtime errors. Nothing is sent until you press a
  button: it opens a prefilled GitHub issue (bug/suggestion/playtest
  templates live in the repo) or a mailto — you see the exact text first.
- **Tester mode `?test=1`** — session-only, never persisted, and live on the
  deployed site: unlocks the diagnostics hook (the dev gate became "dev OR
  tester" — one gate, three doors: dev, testers, soak) and shows the TESTER
  chip (`TESTER · {fps} · {seed}`) plus a one-time banner; `?test=0` resets.
- **The kit** — the tester guide with the 5-minute smoke
  ([docs/TESTERS.md](docs/TESTERS.md)), the 31-case manual suite
  ([docs/TEST-CASES.md](docs/TEST-CASES.md)), every URL parameter documented
  ([docs/URL-PARAMS.md](docs/URL-PARAMS.md)), and personalized tester invites
  (git-ignored; only the redacted
  [template](docs/invites/TEMPLATE.example.md) is committed). 366 unit +
  30 e2e green.

## [0.1.0] — 2026-11-08/09 — the road to beta (M0–M5)

- **m0 — scaffold.** Vite+TS scaffold with eslint/prettier/vitest, CI
  (lint/type/test/build/e2e), Cloudflare Pages deploy, CSP headers.
- **m1 — the first floor.** Deterministic seeded maze generation (xmur3 +
  mulberry32, backtracker with braiding and rooms), Wolf3D-lineage movement
  (strafe-run, wall clamp+slide), the FOCUS first-person view on a fixed-step
  loop, seed share codes, and the Playwright smoke suite.
- **step003 — the house gets dressed.** Tier-one art direction (palette,
  procedural floor/wall textures), the configurable surveyor avatar with real
  planar-RT self-reflection at hero mirrors, three complete input modes
  (keyboard-only, mouse-only, hybrid), and the meta layer: floor timer, local
  bests, daily seed, streak.
- **m2 — the glass wakes.** The Frost Lantern (fog mirrors to blind them),
  Echoes hunting through clear glass, Chhaya replaying your exact path, house
  anger from sprint-cracked mirrors, beacon-gated exits, and the shard
  economy's pending/banked split.
- **step004/005 — explicit state machines.** Every lifecycle rebuilt as a
  discriminated-union machine with pure transitions (the GamePhase master,
  mirror frost, doors), mapped in
  [docs/STATE_MACHINES.md](docs/STATE_MACHINES.md).
- **m3 — views, voice, music.** Quad (four live panes) and the Overhead map
  with fog-of-war, radar pings and the tactical waypoint pause; Aaina's
  diegetic panel with the shard-priced hint economy and lore unlocks;
  procedural raga-inspired audio that follows the house's temper.
- **m4 — the descent.** The ten-floor campaign spine (Stair Door, ramp,
  Taal's beat-walker cameo, the hand-authored Dwaar and Truth-Shard I),
  IndexedDB saves with strict validation + 💾 export / 📂 import, the PWA
  (manifest, runtime-cache service worker, offline play), and the en/hi
  bilingual HUD.
- **m5 — hardening.** The ⚙ settings overlay with full key remapping
  (conflict-guarded), reduced-flash, captions for sound cues and text scale;
  auto/manual quality presets; a11y aria + real dialog semantics (Lighthouse
  97/97); privacy, provenance and playtest docs; round-trip, timing and soak
  tests.

- Note: Taal's spawn-at-farthest-anchor fairness fix (tier 3 work) also moves his
  floor-5 cameo start position — he no longer can spawn on top of the player.
