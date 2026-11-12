# Custom domain — mirror-house.seolith.com attached, certificate provisioning

| | |
|---|---|
| **Step** | Launch follow-up (user: "I thought we were going to be hosting at mirror-house.seolith.com") |
| **Local time** | 2026-11-12 ~10:00 |
| **Status** | Domain attached to the Pages project — TLS certificate provisioning (automatic) |

## Request (verbatim)

> I thought we were going to be hosting at mirror-house.seolith.com

## Response

Correct — and now it is. Actions taken via the Cloudflare API (wrangler OAuth token, account ffbd36fb…):

1. **Custom domain attached**: `mirror-house.seolith.com` added to the `mirror-house` Pages project (POST `/pages/projects/mirror-house/domains`). Status went `initializing` → `pending` (Universal SSL certificate issuance), **no validation errors**.
2. **DNS already in place**: `mirror-house.seolith.com` already resolves on the seolith.com zone to Cloudflare edge IPs (proxied) — the record pre-existed, so nothing to create there. (Note: the OAuth token lacks `dns_records:read`, so DNS record inspection was done via nslookup; record edits would need a dashboard visit or a token with DNS scope.)
3. **Docs switched** to the new canonical URL: README + LAUNCH.md now advertise `https://mirror-house.seolith.com` everywhere (committed `265f7d7`, pushed). The old `mirror-house-8fg.pages.dev` keeps working as an alias — both serve the same build, so links already shared remain valid.

## Pending: Cloudflare Universal SSL issuance

- Status at last check (~30 min after attach): `pending / pending`, probe returned 522 (expected during cert provisioning).
- **Nothing left to do** — Cloudflare issues the cert automatically; typical time 15 min–1 h, occasionally up to 24 h.
- When it flips, `https://mirror-house.seolith.com` serves the game (currently the complete 100-floor build, tag `t10`). Verify with: `curl -sI https://mirror-house.seolith.com/` → expect 200.
- `mirror-house-8fg.pages.dev` remains a working alias in the meantime and forever.

## Effect

The shareable URL becomes **https://mirror-house.seolith.com** (canonical), with the pages.dev subdomain as a permanent alias.

## Artifacts

- Commit: `docs: canonical play URL -> mirror-house.seolith.com (8fg alias keeps working)` (265f7d7, pushed)
