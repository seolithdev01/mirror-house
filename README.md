# Mirror House

A 100-floor, first-person mirror-maze escape game. You descend a century-old palace of glass where reflections deceive you — and the things hunting you. Free, open source, runs in any modern browser, saves live only on your device.

**Status:** **beta** — `0.2.0-beta.1`: the Tier-1 campaign, saves, accessibility, and quality presets of m0–m5, plus m6's venue side-floors (a local venture can host a themed floor — the ☕ Glasshouse Café demo ships in ⚙ → Floors), the Android store build (debug APK proven — [docs/BUILD-STORES.md](docs/BUILD-STORES.md); store submission pending accounts), and the launch kit. **Tier 2 delivered (2026-11-10): floors 11–20 — the Hall of Ancestors, Taal the Sentinel, ancestor portraits, Dwaar II.** **Tier 3 delivered (2026-11-10): floors 21–30 — the Reflecting Gardens, Gher the Encircler, water-mirrors, Dwaar III.** **Tier 4 delivered (2026-11-10): floors 31–40 — the Carnival of Faces, Aavart the Ambusher, distorting mirrors, Dwaar IV — ACT I COMPLETE.** **Tier 5 delivered (2026-11-11): floors 41–50 — the Flood Halls, mirror-you decoys, rising water, sentinel rotation, Dwaar V — ACT II OPENS.** **Play it: <https://mirror-house-8fg.pages.dev>** — or run it locally below.

- [Changelog](CHANGELOG.md) · [Launch kit](docs/LAUNCH.md) · [Store listing](docs/STORE-LISTING.md) · [Store builds](docs/BUILD-STORES.md)
- [Design blueprint (step001)](docs/superpowers/specs/2026-11-08-mirror-house-design.md)
- [Prompt/request history](docs/prompts-history/README.md)

## How this repo works

Work proceeds in numbered steps (`#stepNNN`) — one brief per step, archived with its response under `docs/prompts-history/YYYY/MM/`.

State is explicit: every lifecycle is a discriminated-union machine with pure transitions, mapped in [docs/STATE_MACHINES.md](docs/STATE_MACHINES.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:5173 — add ?seed=YOURCODE for a specific floor
npm test             # unit tests (deterministic maze/rng/movement)
npm run e2e          # playwright smoke (first run: npx playwright install chromium)
```

## How to play

Every floor is one loop: **frost every 🪞 beacon mirror, then reach the gold stair door** — before the glass catches you. Two to five minutes, sharable by seed, fully offline.

### The descent — floors, the Dwaar, the Truth-Shard

You start on floor 1 of a ten-floor tier and go down. Clearing a floor turns its exit into the **Stair Door**: walking in holds a beat behind a `descending…` banner, then the next floor arms — the ramp adds Echoes and beacons, braids the maze tighter, and shortens Chhaya's leash. The **floor chip** in the HUD's chip row says where you stand: `L01`…`L09` on the ramp, `L10 · DWAAR I ✦` for the tier's threshold.

Floor 5 has a visitor: **Taal**, the beat-walker — a gold-lantern silhouette lurching in time with the music (wall-clock phase, so he keeps the beat even muted). His touch is a temper, not a kill: +20 anger per touch, 1.5 s between touches, and he never takes the floor from you.

Floor 10 is the **Dwaar** — Chhaya's threshold hall, a fixed hand-authored 13×13 labyrinth instead of a procedural floor. Clear it and you claim **✦ Truth-Shard I**: a brief golden banner (`✦ Truth-Shard I claimed — the house deepens…`) and the descent continues — and from floor 11 the house is dressed for Tier 2. Your position in the house is saved; close the tab mid-tier and you resume on the floor you left.

### Tier 2 — the Hall of Ancestors (floors 11–20)

Below the Dwaar the palace changes register. The halls go warm and dark — amber glass, brown stone, deep-teal trim — the music's melody walker moves to a Durga pentatonic, and the floor chip reads `L11 · T2` … `L19 · T2`. The loop never changes — frost the beacons (four a floor), reach the stair door — but the house deepens around it:

- **Taal is the Sentinel now.** The floor-5 cameo only made the house angrier; from floor 11 his touch **catches**, failing the floor like any Echo. He walks every tier-2 floor on the music's beat — surging on it, nearly still between beats, on a two-second loop you can read in his lantern: bright he strides, dim he crawls. **Cross his corridor on the dim beat.** Frost cannot blind him (he walks the floor, not the glass); the beat is the only telegraph you get.
- **The ancestors hang in the glass.** Two or three dim portrait silhouettes wall-mount on every tier-2 floor. They are mirrors like any other — the Echoes see you through their clear panes, and one breath of the Frost Lantern fogs their eyes shut for 25 seconds. Fog them like any glass you would rather they did not watch you through.
- The ramp tightens: five to six Echoes, braids drawn closer, Chhaya 4.5 s behind and tightening to 4.1 s by floor 19.
- **Floor 20 is Dwaar II** — Taal's threshold hall, a second hand-authored 13×13 layout, broader and more open than Dwaar I (96 open cells — the Sentinel needs room to walk his beat). Clear it to claim **✦ Truth-Shard II** — and since the house keeps opening below, the claim shows Dwaar I's brief banner and the descent continues; every full screen now lives deeper, ending at Dwaar IV's act close.

### Tier 3 — the Reflecting Gardens (floors 21–30)

Below Dwaar II the palace turns green: moss walls, water-teal glass, ivory light, hedges for partitions — and the music changes voice with the scenery, a flute leading the pastoral melody from the first note of the tier. The floor chip reads `L21 · T3` … `L29 · T3`. The loop never changes — frost the beacons, reach the stair door — but the house deepens around it:

- **Both Sentinels walk the Gardens.** The ladder accumulates: Taal keeps the beat he learned in the Hall (cross him on the dim beat as ever), and **Gher the Encircler** joins at floor 21. Gher does not chase and cannot be blinded — he watches nothing, no glass, no eyes. He reads your commit and glides at one steady pace to seal the road about three cells ahead of you. The counter is the **feint**: commit one way until he turns for it, then break the commit and take the other way — the moment your heading leaves the path, his prediction dies and he holds while you walk.
- **Water-mirrors.** Two to four still pools stand on every Gardens floor — flat teal cells that are Echo eyes like any clear glass: the hollow ones can see you across the hall through them. You cannot fog water; your one verb is the **ripple** — walk within arm's reach and the surface breaks, its eye closing for ten seconds (the caption says so; its dot on the overhead map dims until the water stills). Cross wide, or ripple first and move while it is blind.
- The ramp tightens: six Echoes on every floor, four beacons, Chhaya 4.2 s behind tightening to 3.7 s (3.4 s in Dwaar III). No portraits down here — the Gardens hang water, not ancestors.
- **Floor 30 is Dwaar III** — the garden hall, the most open threshold in the house: dotted hedge runs (never a solid wall) and two sightlines clear across it, because the water needs the long view. Clear it to claim **✦ Truth-Shard III** — and since the Carnival opened below, the claim takes Dwaar I's brief banner too and the descent continues; the full screen is the act close's now.
- For testers (`?test=1`): the Gardens read straight out of the diagnostics hook — `gherPos()` (the Encircler's live spot), `mirrors().water` (the pool census), and `audioState().scale`/`.voice` (the live scale and lead voice: `[0,2,5,7,9]` + `sine` down here, the tier-one pair on venue floors).

### Tier 4 — the Carnival of Faces (floors 31–40) — ACT I COMPLETE

Below Dwaar III the palace throws a carnival: rose and magenta glass over plum-dark walls, candle-glow diamonds on the floor lattice — and the music turns mischievous, the melody flattening its third and handing the lead back to the reed. The floor chip reads `L31 · T4` … `L39 · T4`. The loop never changes — frost the beacons, reach the stair door — but the house plays its last tricks of the act:

- **All three Sentinels walk the Carnival.** The ladder accumulates one last time: Taal keeps his beat (cross him on the dim beat), Gher keeps reading your heading (feint him) — and **Aavart the Ambusher** joins at floor 31, the fourth and fastest Sentinel, and the one who reads your **pace**. He projects where your stride is committed — up to 1.8 seconds of travel ahead at a full sprint, barely a step if you stand still — and runs at 2.4 m/s to cut the corner before you reach it. Frost cannot blind him (he watches nothing but your stride); the counter is the **pace trick**: walk where you meant to sprint, stop dead mid-corridor — his projection only retargets every 1.2 seconds, so a pace changed inside that window leaves him ambushing an empty road.
- **Distorting mirrors — the carnival glass.** Two or three bent rose panes hang on every floor (the wavy rose squiggle on your overhead map marks each one), and while one can see you it **lies about where you are**: every Echo's mirror-sight — and the map's red pings — read you a cell or two off from your true standing, so the hunt chases the spot the glass shows instead of you. They are eyes like any standing glass: one breath of the Frost Lantern (F) fogs a pane for 25 seconds and the house remembers where you truly stand — fogging can even shake a chase outright, if the Echo was following the lie.
- The ramp tightens one last notch: **five Echoes on every floor** — a deliberate step back from the Gardens' six, the playability call that lets three lethal Sentinels own the stage — four beacons, Chhaya 3.8 s behind tightening to 3.3 s. No portraits, no water down here — the Carnival hangs bent glass.
- **Floor 40 is Dwaar IV** — the funhouse hall: four offset alcoves (one per wall, never compass-aligned) around a central carousel ring you circle while the Sentinels circle you. Clear it to claim **✦ Truth-Shard IV** — **ACT I closes** here, and since Act II opened below, the claim takes the same brief golden banner as the Dwaars above and the stairs descend into the Flood Halls (the full screen now belongs to Dwaar V's tier close).
- For testers (`?test=1`): the Carnival reads straight out of the diagnostics hook — `avartPos()` (the Ambusher's live spot), `mirrors().distort` (the carnival-glass census), `apparentPlayer()` (where the house says you stand right now — the truth, or a pane's displaced lie), and `audioState().scale`/`.voice` (`[0,2,3,7,9]` + `triangle` down here).

### Tier 5 — the Flood Halls (floors 41–50) — ACT II OPENS

Below Dwaar IV the palace drowns: drowned indigo-green walls, teal glass, lantern light gone pale — and the music submerges with the scenery, the melody walking a dark pentatonic (`[0,3,5,7,10]`) on the triangle. The floor chip reads `L41 · T5` … `L49 · T5`. The loop never changes — frost the beacons, reach the stair door — but **ACT II — THE DECEPTION** announces itself here: the first floor-41 build of a session raises a three-second banner (`ACT II — THE DECEPTION — The house has begun copying you.`), and the house plays its new tricks:

- **The house copies you — mirror-you decoys.** Every 45 seconds or so (36–54, jittered) the house plants a glass copy of you at a cell 8–12 cells away — an exact clone of your coat and lantern — and it walks toward the exit at its own steady pace, ignoring you completely. It cannot hurt you, frost does not touch it, and it never drowns. But the Echoes cannot tell a copy from the original: **an Echo chases whichever of you is nearer**, so a copy between you and the hunt is a shield you can spend. Walk into a copy and it shatters — **+5 shards** banked toward the clear, forfeited with any fail like beacon shards; two copies may stand at once, the caption names each one the house sends, and on the overhead map the copy is your arrow drawn hollow while the solid gold arrow is the you that is real.
- **The halls flood.** From your first step the water rises — **3 minutes to 1.2 m deep**, a translucent teal-green plane climbing the walls. Past 0.6 m **everyone wades at 85 % speed** (you, the Echoes, the Sentinels — the copies excepted: they never drown); past 0.9 m **the standing glass sinks far enough that it stops being an eye** — the flood blinds the mirrors for you, no frost spent. The glass visibly drowns as it goes, its panes shrinking toward half height; the caption warns once (`The halls are flooding…`). In **Dwaar V's sunken arena the flood runs on a faster clock — 2 minutes** — so the duel is also a race.
- **The rotation — the house rotates its wardens.** The ladder stops accumulating and starts rotating: **Taal never rests** (his beat walks every floor from 11 down, Act II included — cross him on the dim beat as ever), while **Gher and Aavart sit the 41–49 ramp out** and are **called down together for one hall only — the Dwaar V duel**. The ramp hunts you with your shadow and the beat alone; the tier's teeth are the water and the copies. The escalation returns at the threshold: floor 50 is the first hall where **all four Sentinels walk together**.
- The ramp itself eases the Echo count to make room: **four Echoes on every procedural floor** (a step back from the Carnival's five — the flood and the decoys are the teeth now), four beacons, braids drawn tighter to 0.332 by floor 49, Chhaya 3.6 s behind tightening to 3.1 s (2.9 s in Dwaar V — the arena floods, she does not wait).
- **Floor 50 is Dwaar V** — the sunken arena: concentric rings, a two-cell promenade outside a mid ring wall with exactly four gates at the compass midpoints, an inner corridor circling the 3×3 sanctum — 180°-symmetric (the exit mirrors the entrance), fully connected, 101 open cells of room for four wardens. Clear it to claim **✦ Truth-Shard V** and the **full tier screen** (`✦ Truth-Shard V claimed — Tier V complete`, fifty floors and banked shards counted, ↻ Play again or Stay). **That screen is the end of the house for now**: the campaign is terminal at 50 — the rest of Act II (floors 51–80) and Act III (81–100) are future content.
- For testers (`?test=1`): the Flood Halls read straight out of the diagnostics hook — `tier()` (5), `waterLevel()` (the live depth in meters, `0` off the flood floors), `decoys()` (the live copies — the e2e uses the `forceDecoy()` dev faucet to skip the 45 s clock), and `audioState().scale`/`.voice` (`[0,3,5,7,10]` + `triangle` down here).

### Frost — the only attack you get (`F`)

The Frost Lantern breathes on the mirror you face (press `F` or the **❄ Frost** button): the glass fogs over for 25 seconds and its reflection dies. Echoes see you only through clear glass, so a fogged mirror is a door you just closed in their face — fog enough eyes around one Echo and it stalls, confused, slowly spinning. Each breath spends about a third of your lantern's air; it refills in four seconds.

### Movement — three modes (HUD buttons, top right)

Three fully playable ways to walk — switch anytime with the buttons at the top right. Your choice is remembered between sessions.

| HUD button | Mode             | How it works                                                                                                               |
| ---------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ⌨ Keys     | Keyboard only    | `W`/`S` or `↑`/`↓` walk, `←`/`→` or `Q`/`E` turn, `Shift` sprint. No mouse needed.                                         |
| 🖱 Mouse    | Mouse only       | Hold the **left button** to walk, hold the **right button** to sprint, steer by moving the cursor left or right of center. |
| ⌨+🖱 Both   | Hybrid (default) | `WASD` move and strafe, mouse to look (click the view to capture the pointer), `Q`/`E` also turn, `Shift` sprint.          |

### Accessibility

The house is meant to be survivable by everyone it hunts. The front door is the **⚙ Settings** overlay (next to 🌐): **Display** (text size) · **Access** (reduce flashing, captions) · **Performance** (quality presets) · **Controls** (remap every key) — every change applies at once and is saved on your device.

- **Four ways to see it** — `V` cycles Focus (first person), Quad (all four walls at once), Overhead (a walking 2D map of what you have explored), and `T`'s tactical pause (the floor freezes while you plan; click to mark up to eight waypoints). The map views are first-class play, not minimaps — low-vision players run whole floors from Overhead.
- **One-handed play** — the 🖐 Mouse mode is complete on its own: left button walks toward the cursor, right button sprints. Keyboard-only (⌨ Keys) is equally complete with no mouse at all.
- **Remap every key** — ⚙ → Controls: all 15 actions rebind (click a row, press a key); the conflict guard stops double-binding, arrows/Shift stay hardwired as universal alternates, and Reset returns to defaults. Close hints and prompts always name the live key.
- **Reduce flashing** (⚙ → Access) steadies every pulsing light and fades overlays instead of popping them; **captions** print sound cues as text, bottom-centre; **text size** scales the whole HUD 100/125/150%.
- Every icon button carries a screen-reader label (English and हिंदी), overlays are real dialogs (Tab cycles inside, `Esc` closes), and the page's `lang` follows the 🌐 button.
- **Quality presets** (⚙ → Performance): Auto follows your frame rate; Low/Medium/High are one click, with sharpness applied at once and mirror detail on the next floor.

The full statement — every mode named with the file that implements it, the who's-who entity identity audit (silhouette + motion + caption, never colour alone), and the reduced-flash audit — is [docs/A11Y.md](docs/A11Y.md).

### Views — `V` to cycle, `T` to stop and think

`V` walks **Focus → Quad → Overhead → Focus**. Focus is the first-person view. Quad fills the screen with four live panes — front, left, right, back (the side panes render on alternate frames to hold the frame budget). Overhead is a walking 2D map that shows only what you have explored: corridors fill in as you enter them, and a fading ping marks Chhaya each time she walks. From the Overhead map, `T` enters the **tactical pause**: the floor freezes while you plan — click cells to drop up to eight ivory waypoints, the first `Esc` clears your marks, and the next `Esc` (or any `V`) returns you to your eyes with the route still drawn on the map. The run clock keeps running while you plan: best times are pause-proof by construction.

### House Anger — don't sprint into the glass

Sprinting body-first into a mirror cracks it: +15 anger, once per pane. Seven cracks — 100 anger — and the mirrors collapse: the floor fails and instantly re-arms, and the shards you had banked on it are forfeit. Walking never cracks anything. When glass is near, arrive at a walk.

### Chhaya — the shadow behind you

Chhaya walks your exact path, seven seconds behind on floor 1 — and closer with every floor you descend (4.6 s by floor 9, 4 s in the Dwaar). Never retrace your steps — you will meet yourself — and never linger where you have been. A True Mirror hop puts you somewhere your trail never went.

### Passages — `Space` and `E`

- `Space` — **step through a True Mirror** to its far pair, emerging facing away from the glass. The HUD hints `Space — step through` when one is in range; it is a committed step, not a cancelable one.
- `E` — **push a silvered door**: a mirror-finished push-wall that slides aside into hidden rooms and shortcuts (the HUD hints `E — push`). A pushed door stays open for good — the house remembers its own secrets.

### Shards

Scored per cleared floor: 5 per beacon captured, +25 for a flawless floor (nothing cracked), +10 per Echo you confused at least once. Beacon shards bank as _pending_ and are only paid out when you actually clear — get caught or collapse and they are forfeit. Your banked total (💠 chip) lives on your device beside your streak.

### Aaina — the lantern speaks (`I`)

Press `I` (or the 💬 button) to open Aaina's panel — the FAQ's diegetic sister, docked beside the maze. The floor keeps running while she talks. Her **Hint** tab sells knowledge for shards: ◆5 for the first hint on a floor, ◆10 for the second, ◆15 after that (the price resets on a new floor), and only banked shards — the 💠 chip — can pay, never the pending ones riding the current run. She names her subject before you buy (the beacons, the open stair door, the thing hunting you…) and will not repeat herself until the situation changes. Her **Lore** tab unlocks a memory per cleared floor; shards cannot buy those.

### Sound — alive from your first input

The music is generated live in your browser — raga-inspired classical-fusion, fully original, no samples. It stays silent until your first keypress or click (browsers require a gesture), then follows the house: a calm drone while you explore, tabla and melody sharpening as anger and pursuit climb, silence-hugging calm once the floor is cleared. `M` or the 🔊 button mutes; the choice is remembered on your device.

### URL options

- `?seed=CODE` — play a specific campaign. Codes are 1–16 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no easily-confused letters). The code is the campaign's base: the same code always builds the same floors, so a code shared is a house shared. (Dev builds also accept `&floor=N` to jump straight to a floor.)
- `?look=coat-glass` — dress your surveyor; you'll meet the result in the mirrors. The separator may be `-` or `.`, unknown parts fall back to the default `indigo-gold`. All 12 combinations are valid:

  | coat \ glass         | gold          | teal          | white          |
  | -------------------- | ------------- | ------------- | -------------- |
  | **indigo** (default) | `indigo-gold` | `indigo-teal` | `indigo-white` |
  | **teal**             | `teal-gold`   | `teal-teal`   | `teal-white`   |
  | **rose**             | `rose-gold`   | `rose-teal`   | `rose-white`   |
  | **ivory**            | `ivory-gold`  | `ivory-teal`  | `ivory-white`  |

### Timer, Daily, streak, best

The run timer starts on your first input and stops when you reach the stair door. Clearing a floor records your **best time** for that floor — every floor of a base is its own bucket (`BASE:floor`), so floor 3 never competes with floor 7 — and grows your **streak** — clear at least one floor every consecutive day to keep it alive. The **★ Daily** button loads the seed derived from today's date: everyone playing the Daily starts the same fifty-floor spine that day — Act I's whole descent plus Act II's opening tier.

### FAQ

The **? FAQ** button (top right) or the `H` key opens 40 questions in-game: how to move, the views and the tactical map, how the floors and descending work (Dwaar included, and why the floor-5 Taal only makes you angrier), what the Hall of Ancestors below floor 10 is, how to cross Taal now that his touch catches (the dim beat), who the figures in the portrait mirrors are (fog them like any glass), what the Reflecting Gardens below floor 20 are (still water you ripple, not fog), how to fool Gher the Encircler (the feint), what the distorting mirrors of the Carnival of Faces below floor 30 do (glass that lies about where you stand), how to slip Aavart the Ambusher (the pace trick), what the Flood Halls below floor 40 are (Act II opens — the house copies you), how to survive the flooding halls, why the house rotates its wardens (where the Sentinels go), how and why to fog, what makes the house angry, why the stair door is sealed, how to shake Chhaya, who Aaina is and what her hints cost, where the music comes from, what seeds are, the Daily, where your data lives and what the export file is, whether it works offline and in which languages, what the captions say and where to turn them on, a tour of ⚙ settings and everything you can change there, what a sponsored (venue) floor is and why it never touches your campaign, and the privacy statement in plain words.

### Feedback — 📮

The **📮 button** (top right, beside ⓘ — or the Feedback entry inside ⚙) opens a short composer: pick **🐞 Bug**, **💡 Suggestion** or **💙 a kind word**, write a title and a line or two, and the message box already carries a diagnostics block — version, language, quality preset, your seed (`BASE:floor`), the campaign base, the floor, the run phase, the venue pack if one is live, your accessibility flags, how many keys you remapped (a count, never the bindings), your browser's user agent, and the last few runtime errors this tab saw. **Nothing is sent until you press a button** — review the text, delete anything you'd rather not share, then choose **[Open GitHub issue]** (a prefilled issue at [github.com/seolithdev01/mirror-house/issues](https://github.com/seolithdev01/mirror-house/issues), where the [bug](https://github.com/seolithdev01/mirror-house/issues/new?template=bug_report.md), [suggestion](https://github.com/seolithdev01/mirror-house/issues/new?template=feature_request.md) and [playtest](https://github.com/seolithdev01/mirror-house/issues/new?template=playtest.md) templates also live for the repo-savvy) or **[Email instead]** (the same text into a mail to `itsupport01@seolith.com`). The seed is the important line: the same code always rebuilds the same floor, so a bug with a seed reproduces itself.

### Beta — kick the mirrors

The beta is open, and the kit for testing it ships with the repo. The **ⓘ button** (top right, beside 🌐 — or ⚙ → About) opens the About card: the version, a two-line pitch, the beta status, credits, and the four links (source · privacy · provenance · license). Testing happens on the deployed site — the URL is the whole mechanism, nothing to install and no account:

- **`?test=1` — tester mode.** Session-only (never persisted) and it works on the live site, because testers should play exactly what players get: it unlocks the diagnostics machinery behind the 📮 composer's prefilled block and pins a small **TESTER chip** bottom-left (`TESTER · {fps} · {seed}`) with a one-time banner; `?test=0` is the explicit off. It changes no difficulty and unlocks none of the dev-only params.
- **[docs/TESTERS.md](docs/TESTERS.md)** — the tester guide: your personal seed link, the 5-minute smoke path, and how to send a report worth reading.
- **[docs/TEST-CASES.md](docs/TEST-CASES.md)** — the full manual suite: 31 cases across smoke, campaign, views, accessibility, saves, audio, the venue side-floor, and mobile/touch.
- **[docs/URL-PARAMS.md](docs/URL-PARAMS.md)** — every URL parameter (`seed`, `look`, `lang`, `venue`, `test`, and the honestly-documented dev-only `floor`/`perf`), examples included.
- **[docs/invites/TEMPLATE.example.md](docs/invites/TEMPLATE.example.md)** — the redacted tester-invite template; the real invites (with real addresses) are git-ignored by design and never enter the repo.

Found something? The 📮 composer above is the door — it carries the diagnostics so you never have to guess what we need.

### Your data stays on your device — and can travel

Everything persistent — your look, input mode, mute, language, shards, streak, best times, and your floor in the campaign — lives in one IndexedDB record inside your own browser. No accounts, no servers, no telemetry; nothing leaves your machine unless you carry it yourself. (A legacy localStorage save from earlier milestones migrates itself once on boot.) The full statement — cookies, the export file's exact contents, the CSP — is [PRIVACY.md](PRIVACY.md); where every byte of code, art, and audio comes from is [PROVENANCE.md](PROVENANCE.md); and [PLAYTEST.md](PLAYTEST.md) is the kit for running five strangers through their first floor.

- **💾 export** — writes your whole save as pretty JSON to `mirror-house-save.json` (a save dialog where the browser supports one, a plain download otherwise).
- **📂 import** — picks a save file back up. It is validated strictly — field by field, version checked — before anything is stored; a tampered or truncated file is rejected with a toast, never executed. The page then reloads onto the imported save.

A rejected or corrupt stored save reads as absent: the game boots fresh with sensible defaults rather than trusting junk.

### Install it — it works offline

Mirror House is a PWA. On the production build, use your browser's _Install app_ / _Add to Home Screen_ action: it gets its own window, its own icon (the gold lantern), and a service worker caches the shell and assets — installed once, it loads and plays with the network cut. The whole game ships as a single ~187 KB (gzipped) bundle, so the first load is quick and the offline copy is small.

### नमस्ते — English and Hindi

The HUD speaks two languages: the **🌐 button** cycles English ↔ हिंदी (its label names the language you would switch to), `?lang=hi` forces it from the URL, and your choice is remembered. Buttons, chips, overlays and hint prompts are localized; Aaina's dialogue, the FAQ answers and the lore stay English for now — they are content, and the content pipeline owns them.

> Screenshots of the tier-one art direction — palette, procedural textures, hero mirrors, the surveyor's reflection — will be added here after the art pass is reviewed.

## License

- Code: Apache-2.0 (see [LICENSE](LICENSE))
- Art, music, docs: CC-BY 4.0 — everything is original and procedural; the dependency table with licenses lives in [PROVENANCE.md](PROVENANCE.md)

Both confirmed by the project owner on 2026-11-08 and recorded in the blueprint's decisions log (§0).
