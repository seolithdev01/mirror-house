# Mirror House

A 100-floor, first-person mirror-maze escape game. You descend a century-old palace of glass where reflections deceive you — and the things hunting you. Free, open source, runs in any modern browser, saves live only on your device.

**Status:** m3 — the maze in four views, a lantern that bargains, and a score that breathes with the house. See "Run it" below.

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

### Frost — the only attack you get (`F`)

The Frost Lantern breathes on the mirror you face (press `F` or the **❄ Frost** button): the glass fogs over for 25 seconds and its reflection dies. Echoes see you only through clear glass, so a fogged mirror is a door you just closed in their face — fog enough eyes around one Echo and it stalls, confused, slowly spinning. Each breath spends about a third of your lantern's air; it refills in four seconds.

### Movement — three modes (HUD buttons, top right)

Three fully playable ways to walk — switch anytime with the buttons at the top right. Your choice is remembered between sessions.

| HUD button | Mode             | How it works                                                                                                               |
| ---------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ⌨ Keys     | Keyboard only    | `W`/`S` or `↑`/`↓` walk, `←`/`→` or `Q`/`E` turn, `Shift` sprint. No mouse needed.                                         |
| 🖱 Mouse    | Mouse only       | Hold the **left button** to walk, hold the **right button** to sprint, steer by moving the cursor left or right of center. |
| ⌨+🖱 Both   | Hybrid (default) | `WASD` move and strafe, mouse to look (click the view to capture the pointer), `Q`/`E` also turn, `Shift` sprint.          |

### Views — `V` to cycle, `T` to stop and think

`V` walks **Focus → Quad → Overhead → Focus**. Focus is the first-person view. Quad fills the screen with four live panes — front, left, right, back (the side panes render on alternate frames to hold the frame budget). Overhead is a walking 2D map that shows only what you have explored: corridors fill in as you enter them, and a fading ping marks Chhaya each time she walks. From the Overhead map, `T` enters the **tactical pause**: the floor freezes while you plan — click cells to drop up to eight ivory waypoints, the first `Esc` clears your marks, and the next `Esc` (or any `V`) returns you to your eyes with the route still drawn on the map. The run clock keeps running while you plan: best times are pause-proof by construction.

### House Anger — don't sprint into the glass

Sprinting body-first into a mirror cracks it: +15 anger, once per pane. Seven cracks — 100 anger — and the mirrors collapse: the floor fails and instantly re-arms, and the shards you had banked on it are forfeit. Walking never cracks anything. When glass is near, arrive at a walk.

### Chhaya — the six-second shadow

Chhaya walks your exact path, exactly six seconds behind. Never retrace your steps — you will meet yourself — and never linger where you have been. A True Mirror hop puts you somewhere your trail never went.

### Passages — `Space` and `E`

- `Space` — **step through a True Mirror** to its far pair, emerging facing away from the glass. The HUD hints `Space — step through` when one is in range; it is a committed step, not a cancelable one.
- `E` — **push a silvered door**: a mirror-finished push-wall that slides aside into hidden rooms and shortcuts (the HUD hints `E — push`). A pushed door stays open for good — the house remembers its own secrets.

### Shards

Scored per cleared floor: 5 per beacon captured, +25 for a flawless floor (nothing cracked), +10 per Echo you confused at least once. Beacon shards bank as _pending_ and are only paid out when you actually clear — get caught or collapse and they are forfeit. Your banked total (💠 chip) lives on your device beside your streak.

### Aaina — the lantern speaks (`Q`)

Press `Q` (or the 💬 button) to open Aaina's panel — the FAQ's diegetic sister, docked beside the maze. The floor keeps running while she talks. Her **Hint** tab sells knowledge for shards: ◆5 for the first hint on a floor, ◆10 for the second, ◆15 after that (the price resets on a new floor), and only banked shards — the 💠 chip — can pay, never the pending ones riding the current run. She names her subject before you buy (the beacons, the open stair door, the thing hunting you…) and will not repeat herself until the situation changes. Her **Lore** tab unlocks a memory per cleared floor; shards cannot buy those.

### Sound — alive from your first input

The music is generated live in your browser — raga-inspired classical-fusion, fully original, no samples. It stays silent until your first keypress or click (browsers require a gesture), then follows the house: a calm drone while you explore, tabla and melody sharpening as anger and pursuit climb, silence-hugging calm once the floor is cleared. `M` or the 🔊 button mutes; the choice is remembered on your device.

### URL options

- `?seed=CODE` — play a specific floor. Codes are 1–16 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no easily-confused letters). The same code always builds the same maze, so a code shared is a floor shared.
- `?look=coat-glass` — dress your surveyor; you'll meet the result in the mirrors. The separator may be `-` or `.`, unknown parts fall back to the default `indigo-gold`. All 12 combinations are valid:

  | coat \ glass         | gold          | teal          | white          |
  | -------------------- | ------------- | ------------- | -------------- |
  | **indigo** (default) | `indigo-gold` | `indigo-teal` | `indigo-white` |
  | **teal**             | `teal-gold`   | `teal-teal`   | `teal-white`   |
  | **rose**             | `rose-gold`   | `rose-teal`   | `rose-white`   |
  | **ivory**            | `ivory-gold`  | `ivory-teal`  | `ivory-white`  |

### Timer, Daily, streak, best

The run timer starts on your first input and stops when you reach the stair door. Clearing a floor records your **best time** for that seed (fastest kept) and grows your **streak** — clear at least one floor every consecutive day to keep it alive. The **★ Daily** button loads the seed derived from today's date: everyone playing the Daily walks the same floor that day.

### FAQ

The **? FAQ** button (top right) or the `H` key opens 18 questions in-game: how to move, the views and the tactical map, how and why to fog, what makes the house angry, why the stair door is sealed, how to shake Chhaya, who Aaina is and what her hints cost, where the music comes from, what seeds are, the Daily, where your data lives, and what's coming next (the deeper Sentinels of the floors below).

### Your data stays on your device

Best times, streak, and input mode are kept in your browser's local storage under a single key (`mirrorhouse.meta.v1`). No accounts, no servers, no telemetry — nothing leaves your machine. Clear the key (or all storage) and the game boots fresh with sensible defaults.

> Screenshots of the tier-one art direction — palette, procedural textures, hero mirrors, the surveyor's reflection — will be added here after the art pass is reviewed.

## License

- Code: Apache-2.0 (see [LICENSE](LICENSE))
- Art, music, docs: CC-BY 4.0 (assets are original/procedural; provenance tracked in `PROVENANCE.md` once assets exist)

Both confirmed by the project owner on 2026-11-08 and recorded in the blueprint's decisions log (§0).
