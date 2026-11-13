# deps-audit — the 9 moderate npm advisories cleared

|                |                                                             |
| -------------- | ----------------------------------------------------------- |
| **Step**       | deps-audit                                                  |
| **Local time** | 2026-11-13 ~07:30                                           |
| **Status**     | `npm audit`: 0 vulnerabilities; CI green on `0078969`, live |

## Requests (verbatim)

> fix the 9 moderate npm advisories

> Yes, stop them

(answering: "Should I stop the leftover Vite dev servers for this project?")

> add the prompts-history record for the npm advisories fix

## Response

**Diagnosis**

- All nine advisories traced to one package: `minimatch` 10.2.6
  (GHSA-g3hv-75wg-m249, denial of service via glob-parts amplification;
  affected range 7.0.0–11.0.0). It arrives through `eslint` →
  `@eslint/config-array` and `typescript-eslint` →
  `@typescript-eslint/typescript-estree`; the other eight entries are those
  parents, flagged for depending on it.
- Dev-only: nothing in the shipped bundle depends on it (the CI gate,
  `npm audit --omit=dev --audit-level=high`, was already passing).
- The patched line is 11.0.1+. Both parents still ask for `^10.2.x`, and
  there is no patched 10.x release, so a normal update could not fix it.
  npm's suggested `audit fix --force` was a downgrade to eslint 9.

**Fix** (commit `0078969`)

- `package.json`: `"overrides": { "minimatch": "^11.0.8" }`; lockfile
  regenerated. Every `minimatch` in the tree is now 11.0.8 (engines
  `20 || >=22`; CI runs Node 22).

**Verified**

- `npm audit`: 0 vulnerabilities.
- The override forces a major version the parents did not ask for, so eslint
  was checked both ways: the repo lints clean, and a deliberately bad probe
  file is still reported (`no-var`, `no-unused-vars`).
- typecheck, 975 unit tests, build green locally; GitHub CI green on a clean
  `npm ci` (check, e2e, deploy), `mirror-house.seolith.com` 200.

**Housekeeping**

- A local `npm ci` failed with EPERM: 12 leftover Vite dev servers for this
  project (from e2e runs and earlier sessions) held the rolldown native
  binary open. `npm install` restored `node_modules`; the 12 servers were
  stopped on the owner's yes.

## Follow-up

- Remove the override once `eslint` and `typescript-eslint` depend on
  minimatch ≥ 11.0.1 themselves.

## Open items (need the owner)

1. **Donations** — still no GitHub Sponsors / Ko-fi account; set
   `VITE_SUPPORT_URL` once one exists.
2. **Token expiry** — the CI deploy token expires 2027-11-12.

## Artifacts

- Commit `0078969` — `chore(deps): clear the 9 moderate dev advisories (minimatch GHSA-g3hv-75wg-m249)`
- CI run `43426545647` (check, e2e, deploy: success)
- [package.json](../../../../package.json)
