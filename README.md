# Mirror House

A 100-floor, first-person mirror-maze escape game. You descend a century-old palace of glass where reflections deceive you — and the things hunting you. Free, open source, runs in any modern browser, saves live only on your device.

**Status:** m2 — the mirror maze is alive: fog, hunt, escape. See "Run it" below.

- [Design blueprint (step001)](docs/superpowers/specs/2026-11-08-mirror-house-design.md)
- [Prompt/request history](docs/prompts-history/README.md)

## How this repo works

Work proceeds in numbered steps (`#stepNNN`) — one brief per step, archived with its response under `docs/prompts-history/YYYY/MM/`.

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

| HUD button | Mode | How it works |
| --- | --- | --- |
| ⌨ Keys | Keyboard only | `W`/`S` or `↑`/`↓` walk, `←`/`→` or `Q`/`E` turn, `Shift` sprint. No mouse needed. |
| 🖱 Mouse | Mouse only | Hold the **left button** to walk, hold the **right button** to sprint, steer by moving the cursor left or right of center. |
| ⌨+🖱 Both | Hybrid (default) | `WASD` move and strafe, mouse to look (click the view to capture the pointer), `Q`/`E` also turn, `Shift` sprint. |

### House Anger — don't sprint into the glass

Sprinting body-first into a mirror cracks it: +15 anger, once per pane. Seven cracks — 100 anger — and the mirrors collapse: the floor fails and instantly re-arms, and the shards you had banked on it are forfeit. Walking never cracks anything. When glass is near, arrive at a walk.

### Chhaya — the six-second shadow

Chhaya walks your exact path, exactly six seconds behind. Never retrace your steps — you will meet yourself — and never linger where you have been. A True Mirror hop puts you somewhere your trail never went.

### Passages — `Space` and `E`

- `Space` — **step through a True Mirror** to its far pair, emerging facing away from the glass. The HUD hints `Space — step through` when one is in range; it is a committed step, not a cancelable one.
- `E` — **push a silvered door**: a mirror-finished push-wall that slides aside into hidden rooms and shortcuts (the HUD hints `E — push`). A pushed door stays open for good — the house remembers its own secrets.

### Shards

Scored per cleared floor: 5 per beacon captured, +25 for a flawless floor (nothing cracked), +10 per Echo you confused at least once. Beacon shards bank as *pending* and are only paid out when you actually clear — get caught or collapse and they are forfeit. Your banked total (💠 chip) lives on your device beside your streak.

### URL options

- `?seed=CODE` — play a specific floor. Codes are 1–16 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no easily-confused letters). The same code always builds the same maze, so a code shared is a floor shared.
- `?look=coat-glass` — dress your surveyor; you'll meet the result in the mirrors. The separator may be `-` or `.`, unknown parts fall back to the default `indigo-gold`. All 12 combinations are valid:

  | coat \ glass | gold | teal | white |
  | --- | --- | --- | --- |
  | **indigo** (default) | `indigo-gold` | `indigo-teal` | `indigo-white` |
  | **teal** | `teal-gold` | `teal-teal` | `teal-white` |
  | **rose** | `rose-gold` | `rose-teal` | `rose-white` |
  | **ivory** | `ivory-gold` | `ivory-teal` | `ivory-white` |

### Timer, Daily, streak, best

The run timer starts on your first input and stops when you reach the stair door. Clearing a floor records your **best time** for that seed (fastest kept) and grows your **streak** — clear at least one floor every consecutive day to keep it alive. The **★ Daily** button loads the seed derived from today's date: everyone playing the Daily walks the same floor that day.

### FAQ

The **? FAQ** button (top right) or the `H` key opens 16 questions in-game: how to move, how and why to fog, what makes the house angry, why the stair door is sealed, how to shake Chhaya, what seeds are, the Daily, where your data lives, and what's coming next (Aaina the lantern voice; the deeper Sentinels of the floors below).

### Your data stays on your device

Best times, streak, and input mode are kept in your browser's local storage under a single key (`mirrorhouse.meta.v1`). No accounts, no servers, no telemetry — nothing leaves your machine. Clear the key (or all storage) and the game boots fresh with sensible defaults.

> Screenshots of the tier-one art direction — palette, procedural textures, hero mirrors, the surveyor's reflection — will be added here after the art pass is reviewed.

## License

- Code: Apache-2.0 (see [LICENSE](LICENSE))
- Art, music, docs: CC-BY 4.0 (assets are original/procedural; provenance tracked in `PROVENANCE.md` once assets exist)

Both confirmed by the project owner on 2026-11-08 and recorded in the blueprint's decisions log (§0).
