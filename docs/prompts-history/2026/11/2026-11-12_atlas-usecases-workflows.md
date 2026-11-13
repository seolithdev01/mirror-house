# System Atlas — use-case catalog, workflow model, animated page

| | |
|---|---|
| **Step** | Documentation milestone (user: "do all three in order") |
| **Local time** | 2026-11-12 (afternoon) |
| **Status** | Complete — committed 6e143ad, pushed |

## Request (verbatim)

> do all three in order: (1) the complete use-case list grounded in the actual shipped code + planned features, (2) the state/workflow model, (3) a single self-contained animated HTML page. Writing the use-case catalog first.

## Response

All three delivered, in order:

1. **[docs/USE-CASES.md](USE-CASES.md)** — 48 use cases in 8 domains (Session, Loop, Knowledge, Views, Settings, Persistence, Meta, Planned), each anchored to the owning module (`frost.ts:applyFog`, `campaign.ts` presence fns, …). Planned-but-unshipped work (iOS build, venue partners, Act IV, composed soundtrack, playtest triage) labeled as such.
2. **[docs/WORKFLOWS.md](WORKFLOWS.md)** — the state/workflow model in motion: 7 Mermaid diagrams (session boot, the GamePhase floor loop, the mirror-pane machine per tier, the 100-floor descent with the final rotation table, persistence, venue excursion, feedback) + the workflow-rules tables. STATE_MACHINES.md stays the normative registry; this is the motion picture.
3. **[docs/atlas.html](atlas.html)** — a single self-contained animated page (zero external resources): the GamePhase machine as an auto-cycling SVG state diagram with step controls, the 100-floor descent grid **computed by a JS port of the shipped `floorParams()`/presence formulas** (click any floor for its facts), the five wardens, the searchable/filterable 48-UC catalog, and the machine registry. Respects `prefers-reduced-motion`. Browser-verified: 100 floors, 48 UCs, search + filters working, zero JS errors.

## Artifacts

- Commit `6e143ad` on main
- New: `docs/USE-CASES.md`, `docs/WORKFLOWS.md`, `docs/atlas.html`
