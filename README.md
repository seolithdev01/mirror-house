# Mirror House

A 100-floor, first-person mirror-maze escape game. You descend a century-old palace of glass where reflections deceive you — and the things hunting you. Free, open source, runs in any modern browser, saves live only on your device.

**Status:** step003 — playable mirror-maze walker with self-reflection. See "Run it" below.

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

## Controls & options

### Input modes (HUD buttons, top right)

Three fully playable ways to walk — switch anytime with the buttons at the top right. Your choice is remembered between sessions.

| HUD button | Mode | How it works |
| --- | --- | --- |
| ⌨ Keys | Keyboard only | `W`/`S` or `↑`/`↓` walk, `←`/`→` or `Q`/`E` turn, `Shift` sprint. No mouse needed. |
| 🖱 Mouse | Mouse only | Hold the **left button** to walk, hold the **right button** to sprint, steer by moving the cursor left or right of center. |
| ⌨+🖱 Both | Hybrid (default) | `WASD` move and strafe, mouse to look (click the view to capture the pointer), `Q`/`E` also turn, `Shift` sprint. |

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

The **? FAQ** button (top right) or the `H` key opens 12 questions in-game: how to move, what seeds are, the Daily, where your data lives, and what's coming next (Aaina the lantern voice; the Echoes and Sentinels that will hunt you in deeper floors).

### Your data stays on your device

Best times, streak, and input mode are kept in your browser's local storage under a single key (`mirrorhouse.meta.v1`). No accounts, no servers, no telemetry — nothing leaves your machine. Clear the key (or all storage) and the game boots fresh with sensible defaults.

> Screenshots of the tier-one art direction — palette, procedural textures, hero mirrors, the surveyor's reflection — will be added here after the art pass is reviewed.

## License

- Code: Apache-2.0 (see [LICENSE](LICENSE))
- Art, music, docs: CC-BY 4.0 (assets are original/procedural; provenance tracked in `PROVENANCE.md` once assets exist)

Both confirmed by the project owner on 2026-11-08 and recorded in the blueprint's decisions log (§0).
