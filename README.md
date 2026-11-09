# Mirror House

A 100-floor, first-person mirror-maze escape game. You descend a century-old palace of glass where reflections deceive you — and the things hunting you. Free, open source, runs in any modern browser, saves live only on your device.

**Status:** **beta** — `0.2.0-beta.1`: the Tier-1 campaign, saves, accessibility, and quality presets of m0–m5, plus m6's venue side-floors (a local venture can host a themed floor — the ☕ Glasshouse Café demo ships in ⚙ → Floors), the Android store build (debug APK proven — [docs/BUILD-STORES.md](docs/BUILD-STORES.md); store submission pending accounts), and the launch kit. **Play it: <https://mirror-house-8fg.pages.dev>** — or run it locally below.

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

Floor 10 is the **Dwaar** — Chhaya's threshold hall, a fixed hand-authored 13×13 labyrinth instead of a procedural floor. Clear it and you claim **✦ Truth-Shard I**: the tier screen counts your floors and banked shards, then offers ↻ Play again (a fresh random base, a new ten-floor spine) or Stay — a free walk through the hall you earned. Your position in the house is saved; close the tab mid-tier and you resume on the floor you left.

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

- `?seed=CODE` — play a specific campaign. Codes are 1–16 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no easily-confused letters). The code is the campaign's base: the same code always builds the same ten floors, so a code shared is a tier shared. (Dev builds also accept `&floor=N` to jump straight to a floor.)
- `?look=coat-glass` — dress your surveyor; you'll meet the result in the mirrors. The separator may be `-` or `.`, unknown parts fall back to the default `indigo-gold`. All 12 combinations are valid:

  | coat \ glass         | gold          | teal          | white          |
  | -------------------- | ------------- | ------------- | -------------- |
  | **indigo** (default) | `indigo-gold` | `indigo-teal` | `indigo-white` |
  | **teal**             | `teal-gold`   | `teal-teal`   | `teal-white`   |
  | **rose**             | `rose-gold`   | `rose-teal`   | `rose-white`   |
  | **ivory**            | `ivory-gold`  | `ivory-teal`  | `ivory-white`  |

### Timer, Daily, streak, best

The run timer starts on your first input and stops when you reach the stair door. Clearing a floor records your **best time** for that floor — every floor of a base is its own bucket (`BASE:floor`), so floor 3 never competes with floor 7 — and grows your **streak** — clear at least one floor every consecutive day to keep it alive. The **★ Daily** button loads the seed derived from today's date: everyone playing the Daily starts the same ten-floor spine that day.

### FAQ

The **? FAQ** button (top right) or the `H` key opens 25 questions in-game: how to move, the views and the tactical map, how the floors and descending work (Dwaar included, and why Taal only makes you angrier), how and why to fog, what makes the house angry, why the stair door is sealed, how to shake Chhaya, who Aaina is and what her hints cost, where the music comes from, what seeds are, the Daily, where your data lives and what the export file is, whether it works offline and in which languages, what the captions say and where to turn them on, a tour of ⚙ settings and everything you can change there, what a sponsored (venue) floor is and why it never touches your campaign, and the privacy statement in plain words.

### Your data stays on your device — and can travel

Everything persistent — your look, input mode, mute, language, shards, streak, best times, and your floor in the campaign — lives in one IndexedDB record inside your own browser. No accounts, no servers, no telemetry; nothing leaves your machine unless you carry it yourself. (A legacy localStorage save from earlier milestones migrates itself once on boot.) The full statement — cookies, the export file's exact contents, the CSP — is [PRIVACY.md](PRIVACY.md); where every byte of code, art, and audio comes from is [PROVENANCE.md](PROVENANCE.md); and [PLAYTEST.md](PLAYTEST.md) is the kit for running five strangers through their first floor.

- **💾 export** — writes your whole save as pretty JSON to `mirror-house-save.json` (a save dialog where the browser supports one, a plain download otherwise).
- **📂 import** — picks a save file back up. It is validated strictly — field by field, version checked — before anything is stored; a tampered or truncated file is rejected with a toast, never executed. The page then reloads onto the imported save.

A rejected or corrupt stored save reads as absent: the game boots fresh with sensible defaults rather than trusting junk.

### Install it — it works offline

Mirror House is a PWA. On the production build, use your browser's _Install app_ / _Add to Home Screen_ action: it gets its own window, its own icon (the gold lantern), and a service worker caches the shell and assets — installed once, it loads and plays with the network cut. The whole game ships as a single ~168 KB (gzipped) bundle, so the first load is quick and the offline copy is small.

### नमस्ते — English and Hindi

The HUD speaks two languages: the **🌐 button** cycles English ↔ हिंदी (its label names the language you would switch to), `?lang=hi` forces it from the URL, and your choice is remembered. Buttons, chips, overlays and hint prompts are localized; Aaina's dialogue, the FAQ answers and the lore stay English for now — they are content, and the content pipeline owns them.

> Screenshots of the tier-one art direction — palette, procedural textures, hero mirrors, the surveyor's reflection — will be added here after the art pass is reviewed.

## License

- Code: Apache-2.0 (see [LICENSE](LICENSE))
- Art, music, docs: CC-BY 4.0 — everything is original and procedural; the dependency table with licenses lives in [PROVENANCE.md](PROVENANCE.md)

Both confirmed by the project owner on 2026-11-08 and recorded in the blueprint's decisions log (§0).
