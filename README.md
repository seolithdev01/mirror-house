# Mirror House

A 100-floor, first-person mirror-maze escape game. You descend a century-old palace of glass where reflections deceive you — and the things hunting you. Free, open source, runs in any modern browser, saves live only on your device.

**Status:** M0–M1 complete — playable seeded-maze walking prototype. See "Run it" below.

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

## License

- Code: Apache-2.0 (see [LICENSE](LICENSE))
- Art, music, docs: CC-BY 4.0 (assets are original/procedural; provenance tracked in `PROVENANCE.md` once assets exist)

Both confirmed by the project owner on 2026-11-08 and recorded in the blueprint's decisions log (§0).
