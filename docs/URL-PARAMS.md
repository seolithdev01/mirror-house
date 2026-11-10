# URL Parameters — Mirror House

Every override is a query-string parameter on the game's URL. Nothing is
account-based, nothing phones home: the URL is the whole mechanism, and every
choice below applies to that browser session only unless the doc says it
persists (a few "sticks" params save to your device's own storage, never to a
server).

> **Tester quick links:** your personal link looks like
> `https://mirror-house-8fg.pages.dev/?seed=TESTIS&test=1` — a personal base
> seed plus tester mode. See [TESTERS.md](TESTERS.md) for what to do with it.

Combining is free — order never matters:

```
?seed=PLAYTEST&test=1
?seed=TEALTEST&look=teal-white&lang=hi
?seed=MAPTEST&test=1&venue=demo-glasshouse-cafe
```

## The parameters

### `?seed=` — the campaign base seed

Names the campaign's **base seed**. `?seed=PLAYTEST` starts floor 1 of that
base; the same base always generates the same floors, so two people (or you,
twice) see the exact same mazes. This is how testers share "the house I was
in".

- **Alphabet:** `A–Z` and `2–9` (no easily-confused `I L O 0 1`), up to 16
  characters. Lowercase is normalized up; invalid characters are stripped.
- **Examples:** `?seed=PLAYTEST` · `?seed=TESTIS` · `?seed=teal` (→ `TEAL`)
- A value that normalizes to nothing valid is ignored — the game boots your
  saved campaign instead.
- Progress you make (cleared floors, shards, bests) saves to your device as
  usual; the seed only picks the house.
- The ★ Daily button in the HUD is this same mechanism with today's date as
  the seed.

### `?floor=` — jump to a floor **(dev builds only)**

Jumps straight to floor _N_ (1–10) of the named base: `?seed=PLAYTEST&floor=5`
boots floor 5 directly. **The guard, honestly:** this is a development and
test-suite affordance — the boot ignores `floor=` entirely in production/deployed
builds (and always starts such a seeded campaign at floor 1). Tester-mode
`?test=1` does **not** unlock it. Testers reach deeper floors by descending the
honest way (or resuming a save that is already there).

- **Example (dev):** `?seed=PLAYTEST&floor=7`
- **In production:** ignored — no error, just floor 1.

### `?look=` — avatar palette

Your reflection's coat and glass, `coat-glass` (a `.` separator works too):

- **Coats:** `indigo` · `teal` · `rose` · `ivory`
- **Glass:** `gold` · `teal` · `white`
- **Examples:** `?look=teal-white` · `?look=rose-gold` · `?look=ivory-teal`
- Unknown parts heal to the default `indigo-gold`. The resolved look becomes
  your saved preference (it sticks across visits; the ⚙ panel's future look
  picker will own it from there).

### `?lang=` — interface language

`en` (English) or `hi` (Hindi), exact codes only — `?lang=HINDI` is not a
choice. The URL beats your saved preference beats your browser's language.
Like `look`, the resolved language is saved (so `?lang=hi` sticks; the 🌐
button flips it live afterwards).

- **Examples:** `?lang=hi` · `?seed=HINDII&lang=hi`

### `?perf=` — quality preset **(dev builds only)**

Pins the quality preset for the visit: `auto` · `low` · `mid` · `high`.
**Guard, same honest deal as `floor=`:** production builds ignore `perf=` —
use ⚙ → Performance there (that choice persists properly). Dev/CI use it to
boot a fixed rung, e.g. to test the no-render-target low path.

- **Example (dev):** `?perf=low&seed=PERFLOW`

### `?venue=` — sponsored side-floor

Boots a venue pack's side-floor instead of the campaign floor:
`?venue=demo-glasshouse-cafe` plays the Glasshouse Café demo floor on its own
daily seed. The id must be a slug (`a–z`, `0–9`, `-`, 3–24 chars) naming a pack
the build ships. A malformed id, a missing pack, or an invalid document falls
back to the campaign floor — the param is an opt-in excursion, never a boot
risk. Venue floors never touch your campaign, shards, or bests (⚙ → Floors
plays/returns the demo too).

- **Example:** `?venue=demo-glasshouse-cafe`

### `?test=` — tester mode (diagnostics unlock)

`?test=1` turns on **tester mode for that session, in any build — including
the deployed production site** (that is its whole point: you test what players
actually get):

- the diagnostics hook (the machinery that pre-fills the 📮 composer's
  diagnostics block) becomes available;
- a small **TESTER chip** appears bottom-left — `TESTER · {fps} · {seed}` —
  the live frame rate and the current floor's seed (the seed already encodes
  base:floor, e.g. `TESTIS:3`);
- a one-time banner, "TESTER MODE — diagnostics unlocked for this session",
  confirms it is on.

Rules, exactly:

- `?test=1` → on (this session only — nothing is ever persisted)
- `?test=0` → **the explicit reset** — off, and it wins over any `test=1` in
  the same URL
- absent, or any other value (`yes`, `2`, empty) → off; the default
  experience carries no tester surface at all

- **Examples:** `?seed=TESTMO&test=1` (on) · `?test=0` (reset/off)
- To leave tester mode: drop the param, or make it `?test=0`.
- `test=1` does **not** unlock `floor=` (dev-only, see above) and changes no
  difficulty — the house you test is the house players get.

## Persistence cheat-sheet

| Param   | Persists?                                      |
| ------- | ---------------------------------------------- |
| `seed`  | No (progress made under it saves normally)     |
| `floor` | No — and dev builds only                       |
| `look`  | Yes — becomes the saved look                   |
| `lang`  | Yes — becomes the saved language               |
| `perf`  | No — and dev builds only (use ⚙ in production) |
| `venue` | No (return via ⚙ → Floors)                     |
| `test`  | Never — session-only by design                 |
