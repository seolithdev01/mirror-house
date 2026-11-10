# Invite — TEMPLATE (example, redacted)

This is the committed, redacted shape of the beta-tester invitation. The
real invitations — with real addresses and live seed tags — live beside
this file as `invite-<TAG>.md` and `_all.md`, and are **git-ignored by
design** (`.gitignore`: `docs/invites/*` with this one file let back in).
Copy this template, replace every `<placeholder>`, and never commit the
result. Placeholders:

- `<tester-email>` — the tester's real address (git-ignored files only)
- `<TAG>` — their personal seed base (A–Z, 2–9; no I L O 0 1)
- `<greeting>` — one warm line, varied per tester

---

**To:** `<tester-email>`
**Subject:** You're invited: the Mirror House beta — 15 minutes, in your browser, free

`<greeting>`

Mirror House is a first-person mirror-maze escape game: fog the glass,
outwit what hunts you, and walk down — every floor is a 2–5 minute puzzle.
It's free, runs entirely in your browser (nothing to install, no account),
and everything you do stays on your device.

Your personal start link:

```
https://mirror-house-8fg.pages.dev/?seed=<TAG>&test=1
```

It opens the game in tester mode: you'll see a one-time "TESTER MODE"
banner and a small chip bottom-left reading `TESTER · {fps} · <TAG>:1`.
That chip is your seed and floor — the same seed always builds the same
house, so a report that says "<TAG>:3" puts any of us in the exact room
you stood in. No accounts, no telemetry; that chip is the whole mechanism.

Two ways to help — pick either:

- **The 15-minute smoke** — 8 quick steps:
  [docs/TESTERS.md](https://github.com/seolithdev01/mirror-house/blob/main/docs/TESTERS.md)
- **The full suite** — 31 cases, 20–30 minutes:
  [docs/TEST-CASES.md](https://github.com/seolithdev01/mirror-house/blob/main/docs/TEST-CASES.md)

To report, the in-game **📮 button** (top right) is best: pick 🐞 Bug /
💡 Suggestion / 💙 A kind word, write a line or two — it auto-attaches a
diagnostics block (version, seed, floor, quality, language) so you never
have to guess what we need, and nothing is sent until you press the
button. Or file an issue directly at
[github.com/seolithdev01/mirror-house/issues](https://github.com/seolithdev01/mirror-house/issues).
For anything else, just reply to this email.

If you could send even one report — "smoke passed, 60fps, nothing weird"
counts — **within a week**, that's the whole ask.

Privacy, because it matters: the game runs entirely in your browser, saves
live only on your device, and nothing is uploaded
([PRIVACY.md](https://github.com/seolithdev01/mirror-house/blob/main/PRIVACY.md)).

Thank you for kicking the mirrors.

— The Mirror House team
