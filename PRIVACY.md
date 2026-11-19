# Privacy — Mirror House

Mirror House is a single-page game that runs entirely in your browser. Short version: **nothing reaches us unless you send it — and the only thing you can send is the feedback you explicitly write.**

## No accounts, no cookies, no telemetry

- There is **no account system** — nothing to sign up for, nothing to log into.
- The game sets **no cookies**. Ever.
- There is **no telemetry, analytics, or crash reporting**. No beacon, no fingerprint, no "phone home": the bundle's only network calls are fetching its own assets and — when you explicitly press SEND in the 📮 composer — one POST of your feedback to this same origin (see Feedback below). The Content-Security-Policy (below) allows no third party at all.

## Your save lives on your device

Everything persistent — your look, input mode, mute and language choices, shards, streak, best times, accessibility settings, and your floor in the campaign — is one record in your browser's **IndexedDB** (database `mirror-house`, store `save`, key `main`). A legacy save from earlier milestones sat in `localStorage` and migrates itself to IndexedDB once on boot; nothing is written there afterwards.

Clearing the site's browser data (or the IndexedDB record) deletes your progress completely and unrecoverably. Nothing sends it anywhere on its own.

## The export file contains gameplay data only

The 💾 **export** button writes `mirror-house-save.json` — pretty-printed JSON of that same record: version, look name, input mode, mute/language, shards, streak, best times, campaign position, accessibility settings, and the quality preference. **No personal data exists to export** — no name, email, device identifiers, or tracking tokens, because none are ever collected. The 📂 **import** button reads such a file back; it is validated field-by-field before anything is stored and rejected with a toast if tampered or truncated.

If you choose to send someone your save file, you are sending floor codes and timings. Nothing else is in it.

## Feedback — the one thing that leaves (only when you press SEND)

The 📮 composer ships three things in one POST to this site's own `/api/feedback`, and only when you press SEND: your note (the exact text you see and can edit — it carries the diagnostics block: version, language, quality preset, your seed, floor and tier, run phase, venue pack, accessibility flags, a count of remapped keys, your browser's user agent, and the last few runtime errors this tab saw), one screenshot (the moment you opened the form — previewed in the form itself), and a small technical context read at open time (floor, tier, input mode, view, language, quality preset, seed, device-pixel ratio, user agent, and the JS heap size where the browser exposes it). The GitHub-issue and email buttons are always there instead — nothing auto-sends.

What the server does with it: validates the payload against the same contract the browser builds it with, rate-limits to 4 reports per hour per IP (keyed on a truncated, one-way hash of your IP — enough to count a burst, not enough to reverse), and stores one self-contained JSON object in a **private** R2 bucket (`mirror-house-feedback`) together with the connection's Cloudflare datacenter code and country. There is no public read path and no dashboard — reports leave the bucket only when the maintainer reads or deletes them from their own terminal.

## Content-Security-Policy

The served site locks the browser down with a strict CSP (`public/_headers`):

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; connect-src 'self'; font-src 'self';
frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

Scripts and connections may only come from this origin — so even a hypothetical injected script could not exfiltrate to any third party; the only writable network door is this origin's own, schema-validated and rate-limited feedback endpoint. `frame-ancestors 'none'` forbids embedding the game elsewhere.

## Offline

Mirror House is installable (PWA) and plays with the network cut. Once the service worker has cached the shell, the game never needs the network again to run.

## Contact

Questions about any of this: open an issue at **github.com/seolithdev01/mirror-house/issues**. Bugs can be filed with a seed code — a seed reproduces a floor layout and contains no information about you.
