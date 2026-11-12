# hardening-1 — security, performance, monetization: implemented, deployed, verified

|                |                                                                         |
| -------------- | ----------------------------------------------------------------------- |
| **Step**       | hardening-1                                                             |
| **Local time** | 2026-11-12 ~14:30                                                       |
| **Status**     | Live on `mirror-house-8fg.pages.dev` (commit `8fc963d`); custom domain still blocked on DNS |

## Request (verbatim)

> Get up to speed. I want you to improve security, performance, monetization and implement and deploy and verify.

## Response

**Security**

- CSP no longer carries `'unsafe-inline'`. Inline `<style>` blocks are allowed
  by sha256 hashes stamped into `dist/_headers` by the build
  (`vite.config.ts` → `mhPostBuild`); a `style=""` attribute fails the build.
  Trusted Types are required (`require-trusted-types-for 'script'`, one
  policy `mh` that mints only `/sw.js`). Added `object-src 'none'`,
  `worker-src`, `manifest-src`, `upgrade-insecure-requests`.
- New headers: HSTS (1 y), COOP, CORP on `/assets/*` + `/sw.js`, a wider
  Permissions-Policy.
- `SECURITY.md` + `/.well-known/security.txt`.
- CI: actions pinned to commit SHAs, `persist-credentials: false`, job
  timeouts, `npm audit --omit=dev --audit-level=high` gate, deploy job ships
  the artifact `check` built.
- `.tmp/` probe screenshots untracked and ignored.

**Performance**

- three.js in its own content-hashed chunk (536 kB raw / 132 kB br) — cached
  across game releases; game code is 194 kB raw / 65 kB br. Module-preloaded.
- Service worker precaches the hashed assets at install (offline after the
  first visit) and names its cache by build hash (old release swept on
  activate). `/index.html` removed from the precache.

**Monetization**

- `/host-a-floor` — static venue-sponsorship pitch page with a prefilled
  enquiry mailto.
- About panel: `☕ Host a floor`, plus an optional donation link when the
  build sets `VITE_SUPPORT_URL` (https + known donation platforms only —
  `src/game/support.ts`).
- Venue banner: "Your venue here? Host a floor →".
- `.github/FUNDING.yml` → the repo's Sponsor button.

**Verified**

- typecheck, lint, 975 unit tests, 48 Playwright e2e — all green locally.
- Production build served through `wrangler pages dev` and on the live
  origin: game renders with zero CSP / Trusted Types console errors, service
  worker activates and precaches both chunks, style hashes match for `/`,
  `/host-a-floor` and the 404 page, all headers present.

## Open items (need the owner)

1. **Custom domain** — `mirror-house.seolith.com` still returns 522. The
   Pages API reports `CNAME record not set`: the name currently resolves via
   the zone's wildcard record, not a record for this project. Fix: in the
   seolith.com DNS, add `CNAME mirror-house → mirror-house-8fg.pages.dev`
   (proxied). Then flip `SITE_ORIGIN` in `src/game/support.ts`, the
   `og:url`/`og:image` tags and `FUNDING.yml` to the custom domain.
2. **Donations** — no GitHub Sponsors listing or Ko-fi account exists; create
   one, then set `VITE_SUPPORT_URL` and add the handle to `FUNDING.yml`.
3. **CI deploy** — the repo has no `CF_API_TOKEN` secret, so the CI deploy job
   cannot run; deploys remain manual (`wrangler pages deploy dist`). The e2e
   job also times out on GitHub's runners in two tier tests (passes locally).

## Artifacts

- Commit `8fc963d` — `feat(hardening-1): strict CSP, split bundle + precache, host-a-floor sponsor door`
- Deployment `096ef700` (Cloudflare Pages, production)
- [CHANGELOG.md](../../../../CHANGELOG.md) · [SECURITY.md](../../../../SECURITY.md) · [public/\_headers](../../../../public/_headers) · [vite.config.ts](../../../../vite.config.ts) · [src/game/support.ts](../../../../src/game/support.ts) · [public/host-a-floor.html](../../../../public/host-a-floor.html)
