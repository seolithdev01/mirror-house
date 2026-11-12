# Mirror House — Game Design & Product Blueprint

**Step:** #step001 · **Date:** 2026-11-08 · **Status:** Draft for review — nothing gets built until you approve or edit this.

Working title: **Mirror House** (distinctive brand candidate: _Sheesh Mahal: Mirror House_ or _AINA_ — see §11.5).

## 0. Decisions log (defaults taken — override any of these before step002)

| #   | Decision          | Confirmed 2026-11-08                                                                                              | Rationale                                                                                                           |
| --- | ----------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| D1  | License           | **Apache-2.0 (code) + CC-BY 4.0 (art, music, docs)**                                                              | Permissive with an explicit patent grant; attribution preserved; venue packs can carry separate trademark licenses  |
| D2  | Beta platform     | **Web PWA + Android (Play Store) + iOS (App Store)** via Capacitor, web core on Cloudflare Pages                  | Store presence from day one from the same web codebase; adds ~3 weeks and store-account costs to the plan (§8, §13) |
| D3  | Monetization lead | **Venue pilot inside beta** — one real local venture's sponsored floor ships in the beta; donations run alongside | Proves the local-venture model at launch; partner dependency mitigated (§14)                                        |
| D4  | Music at beta     | **Procedural synth score via Web Audio**                                                                          | Zero asset-licensing risk, tiny bundle, beat-synced gameplay (Taal, traps); composed originals can layer in later   |

---

## 1. Vision

You wake on the roof garden of a 100-year-old, 100-storey palace of mirrors. The door you came through is gone. Every floor is a maze of glass in which **reflections lie to you — and to the things hunting you**. You descend floor by floor, floor 1 (top) to floor 100 (ground), out-thinking, not out-shooting, everything between you and the exit.

- **Genre:** first-person tactical escape-puzzle — **Wolfenstein 3D-style flat grid-maze** (uniform wall height, no jumping, no vertical aim, fast strafe-run) with **Prince of Persia-style deliberate verbs and timed trap gauntlets** — no gore, all glass.
- **Session shape:** floors are 2–5 minutes; death restarts the floor in under 2 seconds.
- **Platforms:** any modern browser; installable as a PWA; fully offline.
- **Money & data:** free, open source, no accounts, no telemetry — your save data lives only on your device, exportable as a file.

### Player promise

1. Every death is my mistake, and I can retry instantly.
2. Mirrors are the puzzle _and_ the weapon — I don't break glass, I blind it.
3. The four Sentinels each think differently; learning their minds is the skill.
4. Ten floors at a time I feel smarter; every ten floors the house changes the rules.
5. The guide in my lantern talks back, but knowledge costs shards — I choose what to ask.
6. _I can see myself in the glass_ — my reflection is mine and configurable; the house can't fake it yet. _(confirmed step003)_

---

## 2. Backstory & story arc

### 2.1 The premise

A century ago a master glazier — the records only call him **the Glazier** — built the **Sheesh Mahal**, a hundred-storey palace of mirrors, commissioned to "hold beauty forever." When his daughter drowned, he went mad with a craftsman's grief: if he could not keep her, he would keep _reflections_ of everyone. Every guest who ever entered had their reflection peeled off and pressed into a mirror. The guests left; the copies stayed. The house learned to prefer the copies — they never leave, never age, never stop admiring the glass.

You are **the Surveyor** — a heritage architect sent to appraise the palace before demolition. The house decides you are its best catch in a hundred years. The roof door becomes a mirror.

### 2.2 The helper: Aaina

**Aaina** (Hindi: _mirror_) is a shard of the Glazier's first and only _true_ mirror — the one he cracked on purpose when he realized copies were lying to him. She lives in your lantern. She is the only voice in the house that tells the truth, and she knows it. She answers questions about mechanics and lore, and sells contextual hints for **shards** — deeper answers unlock as your player level rises (your demonstrated mastery buys you trust). At beta she is a hand-authored dialogue tree; an optional LLM-backed Aaina (opt-in, private) is a post-beta experiment.

### 2.3 The three-act descent (100 floors)

| Act                       | Floors              | Arc                                                                                                                                                                                                                                    |
| ------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I — The Trap**          | 1–40 (Tiers 1–4)    | Learn the house's rules. Meet Aaina. Discover the Echoes are former guests' peeled reflections. First truth: _the house keeps people by copying them._ — **closed 2026-11-10 (t4)**: all forty floors delivered (§4.6 rows 1–4); Dwaar IV's clear raises the act-completion screen (`ACT I COMPLETE — The Trap`, the campaign's floors and banked shards counted, with the Act II tease)                                   |
| **II — The Deception**    | 41–80 (Tiers 5–8)   | The house starts impersonating _you_ — mirror-you decoys that enemies protect and you may be mistaken for. Allies behind glass may be copies. Second truth: _the house can no longer tell originals from copies — including itself._ — **opened 2026-11-11 (t5)**: floors 41–50 delivered (§4.6 row 5), the first floor-41 build raising `ACT II — THE DECEPTION` (the house has begun copying you); the decoys' **first form — lures** — is live (an Echo reads the nearer of you and a copy as "you"; touching a copy shatters it for shards). **Deepened 2026-11-11 (t6)**: floors 51–60 delivered (§4.6 row 6 — the Furnace Wings); the decoys' **second element — enemies _protect_ the copies — is live** (Gher's seal reads alive decoy cells as objectives: a copy crossing his sector pulls the Encircler onto it, the caption admits it once per floor — "The warden guards the copy." — so shard-farming a copy is genuinely risky now). **Deepened 2026-11-11 (t7)**: floors 61–70 delivered (§4.6 row 7 — the Whisper Library); **the Echoes go blind and grow ears — the tier's own deception inverts the mirror**: mirror-sight is gone on 61–70, and the hunt tracks **noise** instead (a sprint rings loud, a walk rings soft, frost/push/step-through ping once — and from floor 66 Taal's returning beat is the loudest thing in the stacks, bait the blind wardens cannot refuse); the third element — _you_ may be mistaken for a copy — remains deferred to the deeper tiers. **Deepened 2026-11-11 (t8)**: floors 71–80 delivered (§4.6 row 8 — the Frozen Atrium); **the tier turns the Surveyor's oldest tool around**: every fogable pane arrives **frozen** — the house starts eye-blind — and frost no longer fogs ice but **thaws** it, so _you_ open the eyes: a thawed pane is a live Echo eye **and a lure** (wardens within radius walk to the glass and stand watching it), and frosting a thawed pane cold-fogs it blind again — the fight is choosing what the house watches; the third element — _you_ may be mistaken for a copy — remains deferred to Act III   |
| **III — The Ground Door** | 81–100 (Tiers 9–10) | The Foundations have no mirrors at all — nothing to hide behind, nothing to hide _behind you_. The door opens only for someone carrying all **ten Truth-Shards** (one per tier, from each Sentinel hall) — proof of being an original. — **opened 2026-11-12 (t9)**: floors 81–90 delivered (§4.6 row 9), the first floor-81 build raising `ACT III — THE GROUND DOOR` (the door is real. So is what guards it.); the Warden's Warrens hunt with all four Sentinels at once, and every mastered mechanic returns as thin texture — heat, water, distortion; the ten-Shard ground door itself and the mirrorless Foundations (91–100) remain tier 10's, and the third deception — _you_ may be mistaken for a copy — stays deferred |

**Endings (post-beta):** _Escape_ (any completion), _True Escape_ (all ten shards — the house lets go), and a hidden _Stay_ ending (you choose the glass). Beta delivers Act I's opening fully polished.

### 2.4 Themes

Identity, imitation vs. original, grief as craftsmanship, descent as self-examination. The descent literally goes down while the story digs deeper — the building is the antagonist's mind.

---

## 3. Purpose & positioning

- **For players:** bite-sized tactical escape puzzles wrapped in an FPS body — for people who liked the _idea_ of Pac-Man's thinking ghosts but wanted agency and depth, and DOOM's pace without the gore.
- **For the project:** an open-source showpiece (code + original procedural art/audio) that becomes a platform local ventures can sponsor with their own themed floors.
- **Explicitly not:** gore horror, a twitch shooter, a live-service game, a data-harvesting game.

---

## 4. Core gameplay

### 4.1 The floor loop (2–5 minutes)

1. **Enter** the floor (stairwell landing). Beacon count and exit location shown.
2. **Scout** — FOCUS view + OVERHEAD map (fog of war: only visited/seen cells).
3. **Capture objectives** — snuff/frost the floor's **Beacon mirrors** (1–4 per floor; the "capture/defeat" objective).
4. **Manage the hunt** — fog corridors to blind enemies, lure them into mirror-box traps, or route around them.
5. **Exit** — the Stair Door unlocks when all beacons are captured. Optional: rescue a trapped reflection-NPC for bonus shards.

### 4.2 The Frost Lantern (core verb)

You carry the Glazier's **Frost Lantern**. Aim at any standing mirror and fog it (a "breath" on the glass) for 20–30 seconds:

- A fogged mirror **reflects nothing** — enemies that see only through mirrors lose you in that zone.
- Fully fogging all mirrors in an enclosed room creates a **mirror box**: enemies inside become confused, wander, collide, and get **stuck** — your trap.
- The lantern has a **breath meter** (recharges); fogging is your only "attack" on the environment.

### 4.3 Mirror rules (the physics of deception)

| Mirror type                      | Behavior                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Standing mirrors** (most)      | Reflective; fogable; cracking (melee/sprinting into them) raises **House Anger**                                                                                                |
| **True Mirrors** (1–2 per floor) | Unfogable, always honest; **step through** to teleport to their paired mirror — routing puzzles; Sentinels cannot use them                                                      |
| **Silvered doors**               | Secret mirror-finished doors (the Wolfenstein push-wall lineage): push to reveal hidden rooms, shortcuts, or ready-made trap boxes; found by their tell — they frost _unevenly_ |
| **Beacon mirrors**               | Objectives; frost to capture; emit light enemies gather around                                                                                                                  |
| **Sentinel Glass**               | The tethered panes a Sentinel patrols among; fogging these _angers_ that Sentinel                                                                                               |

- **House Anger:** rises when you crack mirrors; at full anger a mirror wall **collapses** — the floor soft-fails (instant restart). _You never want to collapse mirrors_ — exactly as briefed. Collapse is a fail-state, not a tool.
- **Deceptions against you:** angled mirrors show corridors that don't exist; some reflections render _you_ slightly delayed (fake player = decoy bait); in Tier 4+, distorting mirrors displace your apparent position to enemy mirror-sight.

### 4.4 Enemies

**Echoes (the zombies).** Hollow reflections of past guests, glassy and slow. Patrol set paths; lethal on contact; shatter into glass (no gore) when lured into a trap or the Stair Door seals behind you. **They see only through mirrors** — in mirror-dead space they are blind.

**The four Sentinels** — the Glazier's apprentices, bound into glass. Each thinks differently (pursuit _personalities_, not copied characters — original names are common Hindi words tied to their mechanic):

| Sentinel   | Meaning       | Behavior                                                                                                                                                | Player counter                                                                       |
| ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Chhaya** | _shadow_      | Follows a recording of your path, ~6 seconds behind — your own trail made hostile; the Prince of Persia shadow-through-the-mirror moment, made systemic | Break line-of-path through fog zones and True-Mirror hops                            |
| **Taal**   | _rhythm/beat_ | Patrols on the music's beat; stationary between beats, bursts on them; gets faster as the tier's track intensifies                                      | Time movement to the soundtrack — the audio _is_ the telegraph                       |
| **Gher**   | _to encircle_ | Doesn't chase; moves to seal off the exit or corridor you're heading toward                                                                             | Feint toward one exit, take another; fog the door-side mirrors so it can't watch you |
| **Aavart** | _cycle/whirl_ | Predicts your destination from direction and speed and cuts the corner to ambush                                                                        | Change pace, use True Mirrors mid-route, let Chhaya's ghost-trail bait it            |

Tier ladder: Tier 1 introduces Chhaya → Tier 2 adds Taal → Tier 3 Gher → Tier 4 Aavart → Tiers 5–10 escalate combinations, speeds, sense ranges, and tier mechanics. Each tier ends in a **Dwaar** (threshold) — that tier's lead Sentinel in a handcrafted duel-hall, guarding the floor's **Truth-Shard**.

> **Delivered note (recorded 2026-11-11, t5; the wheel turns again — t6, t7,
> t8; the wheel ends — t9).** The
> ladder **accumulates** — a new tier's Sentinel joins, the old ones stay:
> **all four walk by tier 4** — Chhaya always (from floor 1), Taal from 11 (his
> spawn gate was widened from "the tier-2 floors" to _every floor from 11
> down_), Gher from 21 (the same widening landed with t4, found while wiring
> Aavart), and Aavart from 31 — Chhaya, Taal and Gher walk the whole Carnival
> of Faces beside Aavart. Tier 5 then began the **rotation** — the escalation
> of §4.6's "escalate combinations" without compounding the cast: Gher (21–40)
> and Aavart (31–40) sat the Flood Halls' procedural ramp out (41–49) and both
> returned for the Dwaar V duel at floor 50 — the first all-four-Sentinel
> arena, row 9's apex previewed at the close of Act II's opening tier. **Tier 6
> turns the wheel the other way (t6): the Furnace Wings are Gher and Aavart's
> home — both walk every floor 51–60, returning from rest — while Taal takes
> the rotation's first true rest (51–59); the beat-walker who never missed a
> floor from 11 through 50 sits the Wings out, and the Dwaar VI crucible at 60
> calls him back down — the second all-four hall.** **Tier 7 hushes the wheel
> (t7): the Whisper Library belongs to the hearing Echoes, and the wardens
> keep the silence — Taal's rest lengthens through 65 (the t7 ratified net
> change on the old floors: the Dwaar VI crucible now replays as the
> Gher+Aavart hall, its call-down deferred) until the beat itself returns at
> 66 — the beat in the silence, and in a house where the wardens listen his
> accent ticks are the noise they cannot refuse to chase; Gher keeps the
> Furnace he has always walked (50–60), rests the Library ramp 61–69, and is
> called down for exactly one hall — the Dwaar VII duet at 70, Taal + Gher in
> the stacks (a duet, not an apex — row 9's all-four Warrens stay tier 9's);
> Aavart sits all of tier 7 out and returns in tier 8.** **Tier 8 wakes the
> sleeper (t8): the Frozen Atrium is Chhaya and Aavart's home — the
> Ambusher's rest ends exactly where the rotation promised, and he walks
> every floor 71–79 (`aavartPresent` = `(31–40) ∥ (50–60) ∥ f > 70`); Taal
> and Gher rest the whole ramp (Taal's gate narrows back to
> `(11–50) ∥ 66–70 ∥ 80`, Gher's to `(21–40) ∥ (50–60) ∥ 70 ∥ 80` — the
> duet disbands into the ice), and the Dwaar VIII hall at 80 calls BOTH down
> to join the walking pair — the third all-four crucible, row 9's apex
> previewed in a frozen atrium where every pane starts blind.** **Tier 9 ends
> the wheel (t9): the Warden's Warrens ARE row 9's apex — all four hunt
> together on every floor 81–90** (`taalPresent` = `(11–50) ∥ 66–70 ∥ f ≥ 80`,
> `gherPresent` = `(21–40) ∥ (50–60) ∥ 70 ∥ f ≥ 80`, `aavartPresent` =
> `(31–40) ∥ (50–60) ∥ f > 70` — Aavart's open tail already walked the apex
> untouched; the two `=== 80` crucible-only calls widened to open `≥ 80`
> tails, and every rest in the house ends). Every mastered mechanic returns
> as thin texture on the iron: the heat re-lights (fog halved, cracks 25
> again), 2–3 water pools and 1–2 distort panes hang beside them (new draws
> appended AFTER each kind's existing streams — floors 1–80 byte-identical,
> swept and pinned), and Dwaar IX at 90 is the Warden's own warren — the
> tightest hall in the house (85 open cells, a three-door waist, twelve dead
> ends) walked by all four with six Echoes, one more than every elder duel
> hall.** Chhaya never
> rests at all: she replays every path in the house on every floor of all
> nine tiers.
> The bare `>=` gates became presence functions
> (`taalPresent`/`gherPresent`/`aavartPresent`) — floors 1–40 read
> byte-identical, pinned by truth-table tests (rows 51/55/59/60 added with
> t6; 61/65/66/69/70 with t7 — row 60 re-pinned `F,T,T`, Taal's extended
> rest; 71/75/79/80 with t8 — row 79 `F,F,T`, the Ambusher alone with her
> shadow, row 80 `T,T,T`, the crucible; 81/85/89/90 with t9 — every row
> `T,T,T`, the apex).

### 4.5 Economy & progression

- **Shards** (score/currency): from beacons, trapped enemies, perfect floors (zero cracks), rescued NPCs.
- Spend on **Aaina hints** (contextual to your current floor state) and lore unlocks.
- **Player level** (mastery, not grind): unlocks deeper Aaina answers and cosmetic lantern glasses.
- Per-tier and per-floor best times kept **locally**; shareable **seed codes** let friends play the exact same floor layout.

### 4.6 Difficulty architecture (10 tiers × 10 floors)

| Tier | Floors | Setting              | New mechanic                                          | Music mood                                       |
| ---- | ------ | -------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| 1    | 1–10   | The Glass Gallery    | Frost Lantern, Echoes, Chhaya                         | Dawn-hope raga (Bhairav-family mood)             |
| 2    | 11–20  | Hall of Ancestors    | Taal; portrait mirrors show _other_ floors            | Reverent, slow pulse — delivered 2026-11-10 (t2) |
| 3    | 21–30  | Reflecting Gardens   | Water-mirrors (can't fog water — ripple them), Gher   | Pastoral, flute-lead — delivered 2026-11-10 (t3) |
| 4    | 31–40  | Carnival of Faces    | Distorting mirrors displace your mirror-image, Aavart | Playful, mischievous groove — delivered 2026-11-10 (t4) |
| 5    | 41–50  | The Flood Halls      | Rising water halves mirror height; Act II begins      | Submerged, filtered — delivered 2026-11-11 (t5)  |
| 6    | 51–60  | The Furnace Wings    | Heat fogs mirrors at range but cracks spread faster   | Urgent, percussive — delivered 2026-11-11 (t6)   |
| 7    | 61–70  | The Whisper Library  | Sound-based Echoes (they hear, not see)               | Sparse, whispered — delivered 2026-11-11 (t7)    |
| 8    | 71–80  | The Frozen Atrium    | All mirrors pre-fogged — _you_ unfog to lure          | Austere, cold strings — delivered 2026-11-11 (t8) |
| 9    | 81–90  | The Warden's Warrens | All four Sentinels hunt together                      | Dread, low drone — delivered 2026-11-12 (t9)     |
| 10   | 91–100 | The Foundations      | No mirrors at all — pure maze, the Glazier himself    | Resolve; silence between notes                   |

### 4.7 Movement & trap language (Wolfenstein feet, Prince of Persia hands)

The two lineages split cleanly: **locomotion is Wolfenstein 3D** — flat grid, no jump, no vertical look, fast strafe-run. **Verbs and hazards are Prince of Persia** — deliberate, weighty, timing-driven.

- **Stances:** sprint (fast, loud, cracks what you run over) · walk · creep (silent) · **careful-step** (auto edge-stop at ledges and pressure glass — the Prince's cautious step).
- **Committed verbs:** the Frost Lantern breath has a wind-up and recovery; the True Mirror step is a committed step-through you cannot cancel. Arcade feet, deliberate hands.
- **Trap families (all glass, all timing, learn-by-dying like PoP):**
  - _Swinging glass blades_ — synced to the tier track's beat; the safe window is the music itself.
  - _Pressure-crack floors_ — glass tiles that fracture under sprint; careful-step or creep across (fall = instant floor restart).
  - _Guillotine mirror doors_ — slam on the track's pattern; frost their side-panels to jam them open.
  - _Pendulum shard chimes_ — passive lures: ring them to pull Echoes off your route.

---

## 5. UX / UI

### 5.1 View modes (the DOOM-ish multi-viewport promise, made affordable)

| Mode         | What you see                                                     | When                                         | Cost                                                    |
| ------------ | ---------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| **FOCUS**    | Full-screen first-person + micro-map strip                       | Default, combat, mobile default              | 1 full render                                           |
| **QUAD**     | Front / left / right / back views in four panes + small map      | Sweep a room, Sentinel math, tense corridors | Main pane full; side panes half-res on alternate frames |
| **OVERHEAD** | Whole floor, 2D tactical map, fog of war, enemy last-known pings | Planning, routing, post-death study          | 2D canvas — no 3D cost                                  |
| **TACTICAL** | Paused OVERHEAD + route sketching                                | Puzzles, accessibility (play at your pace)   | None (game paused)                                      |

One key cycles FOCUS→QUAD→OVERHEAD (V / gamepad select / mobile triple-tap). Sentinels always announced by silhouette + sound _first_, color second (colorblind-safe by design).

### 5.2 HUD

- Top-left: floor + tier (`L07 · DWAAR I`), House Anger meter.
- Top-right: shards.
- Bottom-left: health as glass panes; Frost Lantern breath meter.
- Bottom-right: beacon counter, minimap toggle, view-mode key hint.
- **Aaina button** ([Q]) — dialogue wheel: _Ask / Hint / Lore_. Subtitled always.

### 5.3 Controls

| Input            | Scheme                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| Keyboard + mouse | WASD + mouse look; F frost; V view; Q Aaina; Shift creep (quiet) vs sprint (loud); Space True-Mirror step |
| Gamepad          | Twin sticks; face buttons mirror the scheme; standard mapping, remappable                                 |
| Touch            | Left virtual stick; right half drag-look; frost/sprint/view as thumb buttons; QUAD panes tap-to-enlarge   |

### 5.4 Onboarding & failure

- Floor 1 teaches exactly one verb per room (move → look → fog → trap an Echo) — no text dumps; Aaina speaks one line per room, subtitled.
- Death = floor restart in <2s with the **same seed** (the puzzle stays honest); optional reroll for a fresh layout.
- Every Dwaar is a checkpoint; saves are automatic.

### 5.5 Accessibility (beta table stakes)

Reduced-flash mode (mirror glints are core aesthetic — this mode is mandatory, not optional) · colorblind-safe Sentinel identity (silhouette + audio motif) · full captions/subtitles · remappable inputs · text scale · one-handed desktop scheme · TACTICAL pause mode doubles as a cognitive-accessibility mode · no timed QTEs ever · **three input modes — keyboard-only, mouse-only, hybrid — each fully playable alone, with on-screen mode buttons** _(confirmed step003)_.

### 5.6 Art direction (step003)

Tier 1 palette: deep indigo void/fog, warm ivory-plaster walls, a patterned floor in teal/ivory/gold/rose (procedural canvas textures — zero external assets), teal entrance marker, gold exit marker, warm lantern light. The M1 gray-box look was a placeholder, not the identity.

### 5.7 Meta layer, device-local (step003 lite; full dashboard in M4)

FAQ screen (rule-based; later doubles as Aaina's knowledge base) · best time per seed (local) · daily-play streak · date-derived daily-challenge seed button · run timer with floor-cleared overlay. Retention is measured **on-device only** — no telemetry, ever; the privacy promise outranks growth metrics.

---

## 6. Audio identity (original, Indian classical-fusion)

**Philosophy:** the Rahman-ish quality — classical Indian melody and warmth fused with modern arrangement and groove — lives in _orchestration idioms_ (drone, raga melody with glides, tabla-family rhythm, string pads, big breathy reverb), never in imitated melodies or sampled recordings. All music is **generated live by code** at beta: fully original, zero licensing surface, and adaptive to threat.

### 6.1 The procedural engine (Web Audio)

- **Drone:** tanpura-style additive drone, one root per tier.
- **Melody:** a raga-mood scale-walker per tier (see §4.6) with **meend**-style pitch glides and grace notes; density and register rise with threat.
- **Rhythm:** synthesized tabla-family percussion (FM dayan/bayan patches); **Taal's patrols literally sync to this track** — the soundtrack is a gameplay channel.
- **Pads:** detuned string pad bed, low-passed, slow LFO — the "film strings" warmth.
- **Mix:** intensity layers keyed to House Anger, Sentinel proximity, and floor completion.

### 6.2 SFX (all synthesized)

Glass chimes, frost hiss, mirror hairline crack tick, footstep textures per surface, Sentinel motifs (one instrument each), Stair Door seal thunk, Aaina's bell.

### 6.3 Roadmap

Post-beta: invite community composers to record **original** tier themes (CLA + CC-BY 4.0, provenance-tracked) layered as alternates. Never: samples, borrowed melodies, or any artist's name in marketing (§11.2).

---

## 7. Technical architecture — what works and how

### 7.1 Stack

- **TypeScript (strict) + Vite** build; **three.js** (WebGL2, WebGL1 fallback) renderer; **Web Audio** for all sound; **IndexedDB** (via idb-keyval) for saves; hand-rolled service worker for PWA offline.
- No engine (Godot-web wasm is 30–50MB — wrong for a snappy CF Pages static site); no frontend framework (UI is a small state→DOM layer).
- **Tests:** Vitest units (maze generation, PRNG determinism, AI senses, save migrations, economy math); Playwright smoke (load → move → fog a mirror → save → export). CI: GitHub Actions → lint, test, build, deploy.
- **State machines:** all lifecycle behaviour is modeled as explicit discriminated-union state machines with pure transition functions, one owning module each, documented in [STATE_MACHINES.md](../../STATE_MACHINES.md). New features add machines, not scattered flags.

### 7.2 Repo layout (from step002)

```
src/engine/    grid, ecs-lite, prng, pathfinding, input, save
src/game/      maze-gen, mirrors, enemies, lantern, floors, tiers, economy
src/audio/     drone, melody, percussion, sfx, mixer
src/ui/        hud, views, dialogue, menus, i18n (en, hi)
src/data/      tier manifests, dialogue trees, venue-pack schema
public/        icons, manifest, _headers
tools/         seed-explorer, floor-provenance linter
tests/         unit + e2e
docs/          specs, plans, prompts-history
```

### 7.3 Determinism & content scale (how "100 floors" is actually built)

- Every floor = `seed → archetype × variation`. Ten tier archetypes, parameterized (size 15×15 → 25×25 cells, mirror density, corridor styles, mechanic sets). **Not 100 handcrafted floors** — that's the classic death march; instead 10 handcrafted Dwaar halls + deterministic seeded generation with quality-gated parameters (always solvable, always fair: capture-objective placement validated by solver at generation time).
- PRNG: xmur3 hash + mulberry32; seeds are shareable codes.

### 7.4 Rendering & performance budgets

| Budget         | Target                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------- |
| Initial bundle | ≤ 3 MB gzipped (three.js ~170KB gz tree-shaken + app + fonts; audio adds ~0 — procedural) |
| Framerate      | 60 fps mid desktop / 30 fps low-tier Android                                              |
| Memory         | < 300 MB heap                                                                             |

Geometry stays Wolfenstein-constrained — uniform wall height, axis-aligned walls on the grid — so draw calls are tiny and the QUAD viewport budget holds even on low-end mobile.

Mirror techniques (the expensive fantasy, made cheap):

- **Avatar & self-reflection (step003):** a low-poly Surveyor avatar (configurable coat + lantern glass colors) on a dedicated render layer — invisible to the first-person camera, visible to mirror cameras — so the player sees _themselves_ in glass. The signature shot of the game.
- **Hero mirrors** (True Mirrors, 1–2/floor): planar render-to-texture portals @ 512px, wall-mounted at deterministic spots (entrance/exit cells), global clip plane at the mirror surface during the RT pass.
- **Standing mirrors:** cheap SSR-lite pass on high preset; baked cubemap on low; **fogged = swap to matte material — near-zero cost** (the core mechanic is a performance _win_: fogging makes the scene cheaper).
- Instanced meshes for walls/mirrors; vertex-baked AO; one dynamic light (your lantern) + emissives.
- QUAD side-panes half-res on alternate frames; OVERHEAD is a 2D canvas overlay, never a 3D render.
- Quality presets (low/mid/high) auto-selected from device pixel ratio + rolling FPS, user-overridable.

### 7.5 AI

- Flow-field pathfinding per floor (grid-sized, recomputed only on fog changes — microseconds).
- Echo senses: mirror-reflected line-of-sight only.
- Sentinel senses: short direct cone + mirror-sight + hearing (sprint vs creep) — each personality is a scoring function over the same sense data (cheap, debuggable, testable).

### 7.6 Saves — "all data on your devices," for real

- IndexedDB, one profile: settings, progress (tier/floor/checkpoint), shards, Aaina unlocks, best times.
- `schemaVersion` + migration chain; corrupt/foreign files rejected gracefully, never executed.
- **Export/import** a single `.json` save file (File System Access API, download fallback) — device migration without accounts. Loading screen states it plainly: _your data never leaves this device._

### 7.7 Cloudflare Pages deployment

- Static asset output; `_headers` with strict CSP (`default-src 'self'`, `frame-ancestors 'none'`), immutable hashed assets.
- GitHub integration: PR → preview URL, `main` → production. Free tier comfortably covers beta.
- Post-beta optional Worker: **opt-in** leaderboard (alias + score only; server-validated replays; no PII).

---

## 8. Cross-platform

| Surface          | Story at beta                                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Desktop browsers | Chrome / Edge / Firefox / Safari 16+; KBM + gamepad                                                                                                                                                                                                          |
| Android          | Chrome; PWA install; touch controls                                                                                                                                                                                                                          |
| iOS              | Safari 16.4+; Add to Home Screen; touch controls                                                                                                                                                                                                             |
| Native stores    | **In beta (D2)** — Capacitor wrappers for Google Play and the App Store, cut from the same web build in M6. Requires: Apple Developer ($99/yr) + Google Play ($25 one-time) accounts, IARC rating questionnaire, static privacy-policy URL (already planned) |

i18n: English + Hindi at beta (theme-true and audience-true), i18n layer from day one. All numeric/audio cues language-independent.

---

## 9. Monetization (open-source compatible, honest)

1. **Donations at beta** — GitHub Sponsors + Ko-Fi link in README and credits screen.
2. **Venue floors (the local-venture tie-in — one real pilot ships _inside the beta_, D3):** a sponsor's themed floor ships as a **venue pack** — a versioned JSON manifest + assets loaded optionally, never merged into core. Legal shape: venue grants the project a license to use its trademarks _inside its own pack only_; core game stays MIT/CC-BY; packs may be distributed under their own terms. A venue-pack review checklist (brand safety, content rating, accessibility) gates publication. The format is designed in from step002 so this never needs re-architecture.
3. **Supporter cosmetics** (lantern glasses, Aaina voice packs) post-beta — sold as donation perks, accepting that anything open-licensed can be forked; the perk is the support, not the lock.
4. **Merch** print-on-demand if the brand lands.
5. **Never:** ads, paywalled core floors, energy systems, crypto/NFT, selling player data (there is none).

---

## 10. Security

- **Threat model:** static, single-player, no accounts, no server at beta → the real risks are repo supply-chain, XSS via any future remote content, and (post-beta) the Worker endpoint.
- **Runtime:** all content bundled (zero remote loads at beta → no runtime supply chain); strict CSP via `_headers`; no `eval`; DOM updates through text nodes/templates only.
- **Repo:** lockfile + `npm audit` and Dependabot in CI; `PROVENANCE.md` tracks origin/license of every asset; signed releases when published.
- **Inputs:** save imports schema-validated and version-gated; share codes restricted to `[A-Z2-9]{1,16}` (no injection surface).
- **Post-beta Worker (if built):** rate-limited, replay-validated scores, pseudonymous aliases, no PII, documented data boundary.

---

## 11. Compliance & IP hygiene (no infringement, by construction)

### 11.1 Distance from the inspirations

- **Pac-Man:** the brief's ghost names (one of which, as typed, is also an ethnic slur in common English — worth a clean break on its own) are replaced wholesale. What we keep is unprotectable _genre thinking_: pursuit personalities. What we never touch: names, character designs, trade dress. Our Sentinels are lantern-headed figures in glass armor — tall, humanoid, mirrored masks; visually and narratively unrelated to any ghost IP.
- **DOOM:** the pace and confidence, nothing else. No assets, names, HUD layouts, or level homages. Public copy says "retro-FPS-inspired," never "DOOM-like."
- **Wolfenstein 3D & Prince of Persia (lineage refined in step001 review):** mechanics only — the flat-grid corridor feel, push-wall secrets (our silvered doors), PoP's deliberate timed-trap rhythm, and the shadow-through-the-mirror _idea_ (Chhaya, Act II decoys). Never: names, characters, settings, guard/Prince likenesses, or art.
- Rule of thumb recorded for all contributors: _mechanics may be inspired; expression must be original._

### 11.2 Music originality

Ragas and Indian classical orchestration are traditional, public-domain frameworks — safe to build on. Never: samples, transcriptions, or imitations of any living composer's melodies; never any artist's name in marketing copy (publicity-rights hygiene). Community compositions require a CLA and provenance record.

### 11.3 Licenses

Apache-2.0 for code; CC-BY 4.0 for art/music/docs (D1, confirmed 2026-11-08). Third-party deps permissive-only (MIT/Apache-2.0/BSD/ISC). `PROVENANCE.md` is the single source of truth.

### 11.4 Privacy, safety, ratings

- **Privacy by emptiness:** no accounts, no cookies, no telemetry → GDPR, India's DPDP Act 2023, and COPPA burdens are met by _not collecting anything_. A one-screen privacy note says exactly that.
- **Content:** stylized fantasy violence — enemies are glass and shatter; no gore, no human likeness harm. Self-assessed 10+ (aligns to PEGI 7 / ESRB E10+ if ever wrapped for stores).
- **Photosensitivity:** glint/flash warning at first launch + mandatory reduced-flash mode.

### 11.5 Trademark (pre-beta to-do)

"Mirror House" alone is generic — run a clearance search before public launch; candidates: _Sheesh Mahal: Mirror House_, _AINA: The Mirror House_. Check the matching Cloudflare Pages subdomain and, if it matters, an IN/US trademark filing. (Names inside the game — Aaina, Chhaya, Taal, Gher, Aavart — are common words used descriptively; still verified at search time.)

---

## 12. What will NOT work — and what we do instead

| ❌ Won't work                             | Why                                                                               | ✅ Instead                                                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 100 handcrafted floors                    | Content death march; untestable                                                   | 10 tier archetypes × seeded variation + 10 handcrafted Dwaar halls, solver-validated                                     |
| Real planar reflections on every mirror   | GPU budget gone in one corridor                                                   | 1–2 hero RT mirrors per floor; SSR-lite/cubemaps elsewhere; fogged = matte (cheaper _and_ the mechanic)                  |
| Four full-res live 3D viewports on mobile | Melts low-end GPUs                                                                | QUAD side-panes at half-res on alternate frames; OVERHEAD is 2D canvas                                                   |
| Recorded orchestral OST at beta           | Cost, time, licensing paperwork                                                   | Procedural Web Audio score; community originals with CLAs later                                                          |
| LLM-powered helper NPC at beta            | Breaks offline/local promise; cost; privacy                                       | Hand-authored dialogue tree + hint economy; LLM post-beta as opt-in                                                      |
| Accounts & cloud saves                    | Contradicts the core promise                                                      | Device-local IndexedDB + file export/import                                                                              |
| Server leaderboards at beta               | Server surface, moderation, privacy                                               | Local best times + shareable seed codes; opt-in Worker board post-beta                                                   |
| Multiplayer                               | Scope catastrophe for a solo-built beta                                           | Single-player; maybe async ghost-racing (seed + replay) later                                                            |
| Breaking mirrors as combat                | Brief explicitly forbids collapse as a tool                                       | Mirrors unbreakable; collapse = soft-fail; frost is the only "attack"                                                    |
| Store-first development                   | Review cycles are punishing on unfinished builds                                  | Web core ships continuously to CF Pages; Capacitor wraps cut from the same build in M6 — stores never block the web beta |
| Analytics SDKs                            | Privacy promise                                                                   | None; feedback link + local diagnostics page the player can export                                                       |
| Open-world free movement                  | Kills determinism, AI cost, snappiness                                            | Grid maze — fast, fair, testable                                                                                         |
| Platforming: jumping, vertical aim        | Wrong lineage for a grid escape game; complicates mobile controls and determinism | Flat Wolfenstein 3D-style grid — PoP timing lives in traps and committed interactions, not jumps                         |

---

## 13. Beta plan

### 13.1 Beta scope (one vertical slice, complete)

- **Tier 1, floors 1–10 + Dwaar I duel** (Chhaya hall) — full loop, story beats, Aaina dialogue tree (~40 Q&A nodes), hint economy.
- Frost Lantern, mirror-box traps, Echoes + Chhaya + Taal cameo, True Mirrors, House Anger.
- Silvered-door secrets + one PoP-style timed trap family (beat-synced swinging glass blades).
- Venue pilot floor: one real local venture's sponsored pack (partner signed by M3; if the partner slips, beta launches without it and the pilot fast-follows).
- Capacitor store builds (Android + iOS), store listings, IARC ratings.
- All four view modes; HUD; touch + KBM + gamepad; en + hi; accessibility set (§5.5).
- Procedural score: Tier 1 + Tier 2 moods; all SFX.
- Saves + export/import; PWA offline; quality presets; CF Pages production URL.

> **Playtest gate — OPEN (recorded 2026-11-09, m4).** The slice itself is
> delivered — 10 floors + Dwaar I, saves with export/import, PWA offline,
> en/hi chrome — and machine-gated green (242 unit + 19 e2e). The one unmet
> M4 criterion is the human one: **five strangers completing Tier 1 unaided**.
> It needs real humans: recruit them, watch them, close this line.

> **Scope today (recorded 2026-11-12, t9).** This section is the Tier 1 beta
> scope, delivered as written above; on top of it, the post-beta content
> milestones have **opened Act II — and, with tier 9, Act III** —
> **Tier 2, floors 11–20**
> (§4.6 row 2: the Hall of Ancestors, Taal the lethal Sentinel, ancestor
> portraits, Dwaar II), **Tier 3, floors 21–30** (§4.6 row 3: the Reflecting
> Gardens, Gher the Encircler, water-mirrors, Dwaar III), **Tier 4, floors
> 31–40** (§4.6 row 4: the Carnival of Faces, Aavart the Ambusher, distorting
> mirrors, Dwaar IV — Act I closes), **Tier 5, floors 41–50** (§4.6 row 5:
> the Flood Halls — the mirror-you decoys' first form, the rising water, the
> sentinel rotation and the all-four Dwaar V duel; the act opens with the
> `ACT II — THE DECEPTION` banner on floor 41), **Tier 6, floors 51–60**
> (§4.6 row 6: the Furnace Wings — the heat that melts frost and widens
> cracks, the warden-guarded decoys and the Dwaar VI crucible), **Tier 7,
> floors 61–70** (§4.6 row 7: the Whisper Library — the Echoes go
> blind and grow ears, the noise economy is the fight, Taal's beat returns at
> 66 and the Dwaar VII duet closes the tier in the stacks) and **Tier 8,
> floors 71–80** (§4.6 row 8: the Frozen Atrium — every fogable pane arrives
> frozen and the frost lantern THAWS instead of fogs, the thawed pane a live
> eye and a warden lure, Aavart back from rest and the all-four Dwaar VIII
> crucible closing Act II's descent) and **Tier 9, floors 81–90** (§4.6 row
> 9: the Warden's Warrens — all four Sentinels hunting together on every
> floor, the heat/water/distortion texture stack returned thin, the
> `ACT III — THE GROUND DOOR` banner opening Act III on floor 81 and the
> all-four Dwaar IX warren closing the tier).
> 899 unit + 46 e2e green. **Act III is OPENED — the Foundations (floors
> 91–100) remain future content**: the campaign is
> terminal at floor 90 — `descend()` is a no-op there and the Dwaar IX tier
> screen is the end of the house until the Foundations are built.

### 13.2 Milestones (part-time, ~13 weeks)

| M   | Weeks | Deliverable                                                                             | Acceptance                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ----- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0  | 1     | Repo scaffold, CI, empty deploy to CF Pages                                             | PR preview + prod URL live; lint/test/build green                                                                                                                                                                                                                                                                                                                                                                          |
| M1  | 2–3   | Grid + movement + seeded maze-gen + FOCUS view                                          | Deterministic floors from seed; 60fps mid desktop                                                                                                                                                                                                                                                                                                                                                                          |
| M2  | 4–5   | Mirrors + frost + Echoes + Chhaya + traps                                               | One playable floor loop, winnable and losable                                                                                                                                                                                                                                                                                                                                                                              |
| M3  | 6–7   | QUAD/OVERHEAD/TACTICAL + HUD + Aaina v1 + audio engine                                  | All views ≤ budget; hint economy works — delivered 2026-11-09 (m3)                                                                                                                                                                                                                                                                                                                                                         |
| M4  | 8–9   | Tier 1 content (10 floors + Dwaar I), saves, PWA, i18n                                  | Playtest 5 strangers complete Tier 1 unaided — delivered 2026-11-09 (m4); playtest gate OPEN, see §13.1                                                                                                                                                                                                                                                                                                                    |
| M5  | 10–11 | Polish, a11y pass, perf presets, beta hardening                                         | Exit criteria below all green; web beta launches here — delivered 2026-11-09 (m5); the human/pre-beta lines stay OPEN, see §13.3                                                                                                                                                                                                                                                                                           |
| M6  | 12–13 | Capacitor store builds, listings, IARC ratings; venue pilot pack published; full launch | Android + iOS pass review; venue pack live with partner sign-off; beta live on web + both stores — delivered 2026-11-09 (m6): web beta LIVE at the Pages URL (m5 build serves today; `0.2.0-beta.1` auto-deploys on merge to `main`); venue machinery + DEMO pack live (partner sign-off OPEN); Android debug APK built green (store submission OPEN pending Play account); iOS runbook shipped (Mac required) — see §13.4 |

### 13.3 Exit criteria

Annotated at M5 close-out (2026-11-09). **[x] = machine-proven green this milestone; [ ] = OPEN** (a human or pre-beta runbook item); the last two belong to M6 by the §13.2 split and are listed for completeness.

- [x] **No crash in 2h soak on mid desktop + one Android** — machine evidence green: the 10-min soak on the preview build ran 182 fail-restart cycles with heap Δ 0.00 MB (9.5 → 9.5 MB), geometries/textures/draw calls flat, fps 43–46 (`scripts/soak.mjs`, `npm run soak`). The full 2h desktop run — the pre-beta runbook step `npm run soak -- --minutes 120` — is closed: **PASSED 2026-11-10: 2181 cycles, 0 crashes, heap stable post-warmup (14.5MB flat final hour)** (re-run on the t2 tree, so it covers the tier-two stage + Sentinel + portraits too); the Android device leg rides the M6 store-build runbook.
- [x] **Floor restart < 2s** — e2e `m5: warp-caught restart returns the player to spawn within 2000ms` asserts contact → spawn ≤ 2000 ms; measured ~1.3–1.4 s.
- [x] **Export/import round-trips** — e2e `m5: export/import round-trip through a real file`: real download, rewrite to a distinct campaign, file-chooser import, boots onto the rewritten save.
- [x] **Offline install verified on Android + desktop** — proven at M4 (PWA manifest + service worker e2e green; desktop install exercised; `PRIVACY.md` carries the offline note). Device-matrix re-verification rides the M6 store builds.
- [x] **Reduced-flash pass** — shipped M5/T1–T3: every overlay/banner/caption fades ≥ 320 ms under the mode, Taal's lantern holds a static emissive, beacons pulse-free; full audit in `docs/A11Y.md`.
- [ ] **5/5 external playtesters reach floor 10 without developer help** — OPEN (the human gate carried from m4): the kit is shipped (`PLAYTEST.md` — session script, what to watch, feedback questions); recruit and run the strangers pre-beta.
- [x] **Lighthouse a11y ≥ 90** — Lighthouse a11y 97 desktop + 97 mobile (2026-11-09, chrome-devtools MCP) (chrome-devtools MCP `lighthouse_audit`, desktop + mobile, against this branch's preview before merge; findings ≥ Critical/serious fixed in-task).
- [x] **Privacy + license + provenance files present** — `PRIVACY.md` (no accounts/cookies/telemetry, CSP), `PROVENANCE.md` (origin + dependency/license table), `LICENSE` (Apache-2.0) + the README license section; shipped M5/T6.
- **Android + iOS builds pass store review** — deferred to M6 by the §13.2 split; at m6 close-out (2026-11-09) the Android build is machine-proven: debug APK 4,278,439 bytes + unsigned release APK 3,281,351 bytes, `aapt`-verified manifest (`com.amtocsoft.mirrorhouse`, versionCode 1 / `0.2.0-beta.1`, minSdk 24 / target 36, hi label आईना घर, web shell + demo venue pack bundled) — see `docs/BUILD-STORES.md`. Store review itself stays OPEN pending the user-owned Play/App Store accounts; the listing/IARC/Data-Safety answers are drafted in `docs/STORE-LISTING.md`. iOS is runbook-only on this Windows host (Mac required).
- **Venue pilot live with partner sign-off** — deferred to M6 by the §13.2 split; at m6 close-out the venue machinery is LIVE with the fictional DEMO pack (⚙ → Floors / `?venue=`, e2e-proven); the signed real-partner pilot stays OPEN — recruit per `docs/LAUNCH.md` §3.

### 13.4 Launch & feedback

Production on CF Pages (custom subdomain) **first** — the web beta never waits on store review — then Google Play and App Store releases, source public on GitHub, announcement to 2–3 playtest communities; feedback via GitHub issues + a form link; "diagnostics export" button for bug reports (local counters only, user-attached).

> **M6 close-out (2026-11-09).** Production-first held: the Pages URL
> <https://mirror-house-8fg.pages.dev> is live (200, serving the m5 build —
> the `0.2.0-beta.1` bundle rides the CI deploy when this branch merges to
> `main`). Launch-kit state: venue machinery + DEMO pack live ✓ (partner
> sign-off OPEN); Android debug APK built green from this tree ✓ (unsigned
> release APK proven too; Play submission OPEN pending the user's account —
> runbook `docs/BUILD-STORES.md`); iOS runbook ✓ (Mac required); listings/
> IARC/Data-Safety answers drafted ✓ (`docs/STORE-LISTING.md`). The
> operational launch-day checklist with per-item witnesses is `docs/LAUNCH.md`
> §4; announcements, the venue pilots, and the §13.1 five-stranger playtest
> gate remain OPEN human actions.
>
> **step007 close-out (2026-11-09).** The tester kit is shipped: the About ⓘ
> panel + share-card meta, the 📮 feedback composer (user-initiated GitHub
> issue / mailto with a read-only diagnostics block — nothing phones home;
> the plan's "form link" resolved to GitHub issues + the composer, its
> "diagnostics export" to the composer's prefilled block), tester mode
> `?test=1` on the deployed site, the tester guide + 31-case manual suite +
> URL-params doc, and personalized invites drafted with real addresses
> git-ignored (only the redacted template is committed). Kickoff is pending
> the user sending the invites — labels + the public kickoff issue ride the
> merge (no addresses in it); the §13.1 five-stranger gate then runs through
> this kit.
>
> **Playtest INVITED (2026-11-10).** The gate's clock started: the five
> personalized invites went out via Gmail (the drafts stay git-ignored in
> `docs/invites/`; the redacted template remains the committed record), each
> naming its tester's seed link and the kit (`docs/TESTERS.md`,
> `docs/TEST-CASES.md`, `?test=1`). Reports arrive as labeled GitHub issues
> or replies to the feedback email; the §13.1 gate closes on 5/5 strangers
> reaching floor 10 without developer help.

---

## 14. Risks

| Risk                                    | Mitigation                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Low-end mobile perf                     | Quality presets from M1; fog-makes-it-cheaper mechanic; OVERHEAD fallback                                        |
| Scope creep (the 100-floor fantasy)     | §12 anti-list is contractual; beta = Tier 1 only                                                                 |
| Solo-dev burnout                        | 10-week timeboxes; milestone gates; cutlines documented                                                          |
| Original-music quality risk             | Tier 1 mood playable by M3 (early); community-composed path exists                                               |
| "Mirror House" name collision           | Trademark search scheduled pre-launch; distinctive fallbacks chosen                                              |
| Difficulty tuning (Sentinels)           | Personalities are pure scoring functions — data-tunable; seed-explorer tool for batch playtest simulation        |
| Venue partner on the critical path (D3) | Recruit two candidates by M2; the venue floor is an optional pack — beta launches regardless, pilot fast-follows |
| Store review surprises (D2)             | Web beta on CF Pages launches on schedule; store releases follow within days of any review fix                   |

---

## 15. Next steps

1. **You review this spec** — edit or approve (especially D1–D4 in §0 and the Sentinel/Tier design).
2. On approval → **step002: implementation plan** (writing-plans skill) for M0–M1: repo scaffold, CI, CF Pages deploy, grid + seeded maze + FOCUS-view tech spike.
3. Parallel quick task at step002: trademark name search note + venue-pack schema draft.

_Prepared as #step001. Every request/response pair for this project is archived under `docs/prompts-history/`._
