# domain-live — DNS record added, links switched to mirror-house.seolith.com

|                |                                                                              |
| -------------- | ---------------------------------------------------------------------------- |
| **Step**       | domain-live                                                                  |
| **Local time** | 2026-11-12 ~18:00                                                            |
| **Status**     | Live on `mirror-house.seolith.com` (commit `7090072`, deployment `d0ee1873`) |

## Requests (verbatim)

> Yes, add it

(answering: "Should I add the missing DNS record through your Cloudflare
dashboard in Chrome?")

> Signed in, continue

> Yes, click it

(answering: "May I click the "Last used" Google account button on that
sign-in page myself?")

> Yes, switch them

(answering: "Switch the in-game links, og tags and FUNDING.yml to
mirror-house.seolith.com and redeploy?")

> update the tester docs and add the prompts-history record

## Response

**DNS**

- The Cloudflare dashboard tab was signed out; sign-in was left to the owner,
  then done with the one-click Google button on the owner's explicit yes (no
  password or code prompt appeared).
- seolith.com zone: no existing `mirror-house` record. Added
  `CNAME mirror-house → mirror-house-8fg.pages.dev`, proxied, TTL auto.
  Nothing else in the zone was touched.
- `https://mirror-house.seolith.com/` went from 522 to 200 about a minute
  later, with the hardening-1 headers; `/host-a-floor` 200.

**Link switch** (commit `7090072`)

- `SITE_ORIGIN` in `src/game/support.ts`, `og:url` / `og:image` in
  `index.html`, `og:image` in `public/host-a-floor.html`,
  `.github/FUNDING.yml`, the README host-a-floor link, CHANGELOG
  `[domain-live]`.
- typecheck, lint, unit tests, build green; Playwright e2e not re-run for
  this link-only change.
- Deployed (`wrangler pages deploy dist`), verified on the live domain: og
  tags, the in-game Host a floor URL in the shipped bundle, `og-image.png`.

**Tester docs**

- `docs/TEST-CASES.md`, `docs/TESTERS.md`, `docs/URL-PARAMS.md` and
  `docs/invites/TEMPLATE.example.md` now cite `mirror-house.seolith.com`.
- The already-generated per-tester invites (`docs/invites/invite-*.md`,
  `_all.md`, git-ignored) were left as sent; their pages.dev links keep
  working.

## Open items (need the owner)

1. **Donations** — still no GitHub Sponsors / Ko-fi account; set
   `VITE_SUPPORT_URL` once one exists.
2. **CI deploy** — no `CF_API_TOKEN` repo secret; deploys remain manual.

## Artifacts

- Commit `7090072` — `chore(domain): point site links at mirror-house.seolith.com`
- Deployment `d0ee1873` (Cloudflare Pages, production)
- [CHANGELOG.md](../../../../CHANGELOG.md) · [src/game/support.ts](../../../../src/game/support.ts) · [docs/TEST-CASES.md](../../../TEST-CASES.md) · [docs/TESTERS.md](../../../TESTERS.md)
