# Privacy — Mirror House

Mirror House is a single-page game that runs entirely in your browser. Short version: **we cannot see you play.**

## No accounts, no cookies, no telemetry

- There is **no account system** — nothing to sign up for, nothing to log into.
- The game sets **no cookies**. Ever.
- There is **no telemetry, analytics, or crash reporting**. No beacon, no fingerprint, no "phone home": the bundle contains no network-call code beyond fetching its own assets, and the Content-Security-Policy (below) would block anything else.

## Your save lives on your device

Everything persistent — your look, input mode, mute and language choices, shards, streak, best times, accessibility settings, and your floor in the campaign — is one record in your browser's **IndexedDB** (database `mirror-house`, store `save`, key `main`). A legacy save from earlier milestones sat in `localStorage` and migrates itself to IndexedDB once on boot; nothing is written there afterwards.

Clearing the site's browser data (or the IndexedDB record) deletes your progress completely and unrecoverably. That is the only way it ever leaves.

## The export file contains gameplay data only

The 💾 **export** button writes `mirror-house-save.json` — pretty-printed JSON of that same record: version, look name, input mode, mute/language, shards, streak, best times, campaign position, accessibility settings, and the quality preference. **No personal data exists to export** — no name, email, device identifiers, or tracking tokens, because none are ever collected. The 📂 **import** button reads such a file back; it is validated field-by-field before anything is stored and rejected with a toast if tampered or truncated.

If you choose to send someone your save file, you are sending floor codes and timings. Nothing else is in it.

## Content-Security-Policy

The served site locks the browser down with a strict CSP (`public/_headers`):

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; connect-src 'self'; font-src 'self';
frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

Scripts and connections may only come from this origin — so even a hypothetical injected script could not exfiltrate anywhere. `frame-ancestors 'none'` forbids embedding the game elsewhere.

## Offline

Mirror House is installable (PWA) and plays with the network cut. Once the service worker has cached the shell, the game never needs the network again to run.

## Contact

Questions about any of this: open an issue at **github.com/seolithdev01/mirror-house/issues**. Bugs can be filed with a seed code — a seed reproduces a floor layout and contains no information about you.
