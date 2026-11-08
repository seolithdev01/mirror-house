# Prompt History — Convention

Every user request and its response for this project is archived here, verbatim.

## Structure

```
docs/prompts-history/
  YYYY/            ← year
    MM/            ← month
      YYYY-MM-DD_HHMMSS_stepNNN-slug.md   ← one file per request/response pair
```

Example: `docs/prompts-history/2026/11/2026-11-08_091943_step001-mirror-house-brief-blueprint.md`

## File format

Each file contains:

1. **Metadata** — step tag, local date/time, status
2. **Request** — the user's message, verbatim, in a blockquote
3. **Response** — the assistant's substantive reply (full text or faithful record + links to artifacts)
4. **Artifacts** — links to every file produced during that step

## Monthly consolidation

When a new month begins (first working session after the month rolls over):

1. Merge the previous month's individual files into a single `YYYY-MM-consolidated.md` inside that month's folder (chronological, full contents preserved).
2. Delete the merged individual files so the tree stays small.
3. The year/month hierarchy itself is never flattened.

## Why

The project's brief (step001) requires it: a durable, browsable record of every decision and its reasoning, organized by time, so any future contributor (human or agent) can reconstruct why the game is what it is.
