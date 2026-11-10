// SPDX-License-Identifier: Apache-2.0
//
// step007/T3 — tester mode. `?test=1` unlocks the diagnostics hook (the
// `__MIRROR_HOUSE_DEBUG__` faucet) and the TESTER chip in ANY build — PROD
// included, which is the point: invited testers play the real deployed game.
// `?test=0` is the documented reset. The flag is session-only by nature: it
// lives in the URL, nothing ever persists it, and a plain load of the site
// never sees a trace of it. Pure on the raw query string (leading `?`
// included — the shape `window.location.search` hands over) so the unit
// suite can walk every shape without a browser.

/**
 * Parse the tester-mode flag from a query string: true iff `test=1` appears
 * AND `test=0` does not — an explicit 0 always wins, whatever the order, so
 * appending `&test=0` to any link is a guaranteed reset. Junk values
 * (`test=yes`, `test=2`, empty) are off; only the exact string `1` unlocks.
 */
export function parseTestMode(search: string): boolean {
  const values = new URLSearchParams(search).getAll('test');
  return values.includes('1') && !values.includes('0');
}
