# Security Policy

Mirror House is a static, client-only game: no accounts, no backend, no
analytics. Saves live in the browser's own storage on the player's device.

## Reporting a vulnerability

Please report privately — do not open a public issue for a security problem.

- **GitHub:** [open a private advisory](https://github.com/seolithdev01/mirror-house/security/advisories/new)
- **Email:** <itsupport01@seolith.com>

Include what you found, how to reproduce it, and the URL or commit you
tested. You can expect an acknowledgement within a few days.

## Scope

- The deployed game (`mirror-house.seolith.com`, `mirror-house-8fg.pages.dev`)
- This repository's code, build, and CI configuration
- The venue-pack format and its validator (`src/game/venue.ts`)
- Save import/export (`src/game/save.ts`)

## What the deployment enforces

- A strict Content-Security-Policy with **no** `'unsafe-inline'`: scripts are
  same-origin only, inline `<style>` blocks are allowed by build-time sha256
  hash, and Trusted Types are required for script sinks.
- HSTS, `frame-ancestors 'none'`, `nosniff`, `no-referrer`, a same-origin
  opener policy, and a deny-by-default Permissions-Policy.
- No third-party requests of any kind — `connect-src 'self'`.

The policy source is [`public/_headers`](public/_headers); the hashes are
stamped by the build ([`vite.config.ts`](vite.config.ts)).
