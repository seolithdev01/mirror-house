# T7 — Whisper Library (merged, live)

| | |
|---|---|
| **Step** | Tier 7 content milestone (user: "continue") |
| **Local time** | 2026-11-11 12:01:01 |
| **Status** | Complete — merged to `main` (tag `t7`), pushed, deployed live |

## Request (verbatim)

> continue

## Response

Tier 7 executed per plan `docs/superpowers/plans/2026-11-11-t7-whisper-library.md` (4 tasks + final review + one docs fix). **777 unit + 42 e2e; 191.6 KB gz.** Floors 61–70 playable — the tier where the house stops showing you and starts listening.

**Shipped:**
- **Echoes go blind and grow ears** — tier-7 Echoes (sense-mode 'ears' set from tierOf at spawn) skip mirror-sight entirely: no glass eyes, no lure, no distort displacement. They track the **noise ring** instead: sprint rings 7 m every step, walk rings 4 m per 500 ms, frost/push/step ping 2.5 m, and from floor 66 **Taal's beat rings 7 m at Taal's own position** — the loudest thing in the library, and a live lure the wardens cannot refuse. Stand still and every ring dies in ≤1.2 s.
- **The movement-noise economy** — the tier's whole fight is tempo: creep the stacks silent, walk soft between aisles, sprint only in bursts you can afford. Aaina sells the lesson: *"They are blind here — but they listen. Walk. Never run the stacks."* First noise-chase per floor speaks: *"A shelf-warden heard you."*
- **Rotation** — Taal rests 51–65 and **returns at 66** (the beat in the silence); Gher joins only for the **Dwaar VII stacks duet** (Taal + Gher + Chhaya); Aavart rests all tier 7 (returns tier 8).
- **Moonlit library** — lavender-grey palette, scale [0,2,3,7,8], sine whisper with a ×0.55 intensity ceiling (the sparsest tier's music). Dwaar VII: shelf-wall stacks, 95 cells, Truth-Shard VII.
- t4 minors rider landed earlier in the tier (creep relabel, CELL_SIZE import, Stay label).

**Process:** the implementer caught my plan contradicting itself (truth-table rows vs formulas for Taal's return floor) and resolved per the design intent — ratified. The final review caught the one release blocker: README + FAQ claimed decoy *footsteps* on tier 7, but the copies walk silent there (only Echo glass-eyes were replaced by ears; the lure never learned to stomp) — copy corrected pre-merge, plus a noiseChaseAnnounced per-attempt consistency reset option noted.

**Live:** https://mirror-house-8fg.pages.dev (200 OK) · github.com/seolithdev01/mirror-house @ `t7`.

## Artifacts

- Commits `487b4d3..a981ae5` on main (7), tag `t7`
- New: `game/noise`; modified: echo (sense-mode), campaign (70 + rotation + Dwaar VII), palette/theory, main (noise feed), docs
