#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
//
// T15 — the feedback triage bench. The feedback bucket (mirror-house-feedback)
// is private with no read API, so triage happens from the maintainer's
// terminal. Modes:
//
//   node scripts/feedback-triage.mjs                list the newest fb/ reports (default 20)
//   node scripts/feedback-triage.mjs --limit 5      … the newest 5
//   node scripts/feedback-triage.mjs --key <key>    print one report (shot.data replaced by its
//                                                   length) and decode the bare-base64 JPEG
//                                                   into feedback-<stamp>.jpg next to the cwd
//   node scripts/feedback-triage.mjs --del <key>    delete one handled report (wrangler)
//   node scripts/feedback-triage.mjs --sweep-markers
//                                                   list + delete every rate/ marker — the
//                                                   0-byte objects the 4/hour/IP limiter counts
//                                                   with. Safe: markers are only the rate
//                                                   counter; deleting them resets nothing the
//                                                   player sees (the next POST in the swept
//                                                   hour just starts counting from 1 again).
//
// Two facts shape the implementation (both proven on the live bucket in the
// t15 Task 3 report and re-proven by this script's own round-trip):
//   - wrangler v4 has NO `r2 object list` — only object get/put/delete — so
//     listing and the marker sweep go through the same api.cloudflare.com REST
//     endpoint the dashboard uses, authenticated by CLOUDFLARE_API_TOKEN if
//     set, else the OAuth token `npx wrangler login` stored on disk. An
//     expired stored token is refreshed by any wrangler command, so an auth
//     rejection is retried once after `npx wrangler whoami`.
//   - `wrangler r2 object get/put/delete` default to LOCAL miniflare state;
//     every wrangler call here passes --remote to reach the real bucket.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BUCKET = 'mirror-house-feedback';
const REPORTS = 'fb/';
const MARKERS = 'rate/';
const API = 'https://api.cloudflare.com/client/v4';

// 16 MB — a full report is ≤ ~1.6 MB of JSON (FEEDBACK_LIMITS.totalBytes) and
// execSync's default maxBuffer is 1 MB, which a real screenshot would blow.
const cmd = (c) => execSync(c, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const args = process.argv.slice(2);
/** Terminal, expected trouble — thrown so the closing catch prints it once,
 *  prefixed, after the pipes have flushed (process.exit can truncate them). */
class TriageError extends Error {}
const fail = (msg) => {
  throw new TriageError(msg);
};

// ---- auth: the same identity wrangler itself uses ----------------------------
function oauthToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const xdg = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
  const candidates = [
    join(homedir(), '.wrangler', 'config', 'default.toml'),
    join(xdg, 'wrangler', 'config.toml'),
  ];
  for (const p of candidates) {
    try {
      const m = readFileSync(p, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/);
      if (m) return m[1];
    } catch {
      /* no credentials stored at this path */
    }
  }
  return fail('no credentials — run `npx wrangler login` or set CLOUDFLARE_API_TOKEN');
}

/** Resolved inside main() so a failure lands in the clean catch, not a stack. */
let accountId = '';

/** One authenticated REST call; on an auth rejection (an expired stored OAuth
 *  token — wrangler refreshes it during any command) retry once after whoami. */
async function restJson(url, method = 'GET') {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { method, headers: { authorization: `Bearer ${oauthToken()}` } });
    const json = await res.json();
    if (json.success) return json;
    const stale = res.status === 403 || json.errors?.[0]?.code === 10000;
    if (attempt === 0 && stale) {
      console.log('[feedback-triage] stored token looked stale — refreshing via `npx wrangler whoami` …');
      cmd('npx wrangler whoami');
      continue;
    }
    fail(`REST ${method} ${res.status}: ${JSON.stringify(json.errors)}`);
  }
}

/** Every object under a prefix (paginated): { key, size, last_modified }. */
async function listUnder(prefix) {
  const out = [];
  let cursor = '';
  for (;;) {
    const q = new URLSearchParams({ prefix, per_page: '1000' });
    if (cursor) q.set('cursor', cursor);
    const json = await restJson(`${API}/accounts/${accountId}/r2/buckets/${BUCKET}/objects?${q}`);
    out.push(...json.result);
    if (!json.result_info?.is_truncated || !json.result_info?.cursor) return out;
    cursor = json.result_info.cursor;
  }
}

/** REST delete of one URL-encoded key (the sweep's path; --del uses wrangler). */
async function deleteViaRest(key) {
  const url = `${API}/accounts/${accountId}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`;
  await restJson(url, 'DELETE');
}

async function main() {
  if (!accountId) {
    accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? '';
    if (!accountId) {
      const m = cmd('npx wrangler whoami').match(/\b[0-9a-f]{32}\b/);
      if (!m) fail('no Cloudflare account id found — set CLOUDFLARE_ACCOUNT_ID');
      accountId = m[0];
    }
  }

  // --del: one handled report out, then stop.
  const delIdx = args.indexOf('--del');
  if (delIdx !== -1) {
    const key = args[delIdx + 1];
    if (!key || key.startsWith('-')) fail('usage: feedback-triage.mjs --del <key>');
    cmd(`npx wrangler r2 object delete ${BUCKET}/${key} --remote`);
    console.log(`deleted ${key}`);
    return;
  }

  // --sweep-markers: every rate/ object out (safe — see the header).
  if (args.includes('--sweep-markers')) {
    const markers = await listUnder(MARKERS);
    console.log(`${markers.length} marker(s) under ${MARKERS}`);
    for (const m of markers) {
      await deleteViaRest(m.key);
      console.log(`  deleted ${m.key}`);
    }
    console.log(
      `swept ${markers.length} marker(s) — the hour counter restarts for anyone mid-sweep; nothing a player sees changes.`,
    );
    return;
  }

  // Default: list the newest reports; --key prints one and decodes its shot.
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? Number(args[limitIdx + 1]) || 20 : 20;
  const reports = await listUnder(REPORTS);
  const newest = [...reports].sort((a, b) => (a.last_modified < b.last_modified ? 1 : -1));
  console.log(`${reports.length} report(s) under ${REPORTS} — newest ${Math.min(limit, newest.length)}:`);
  for (const o of newest.slice(0, limit)) {
    console.log(`${o.last_modified}  ${String(o.size).padStart(7)}  ${o.key}`);
  }

  const keyIdx = args.indexOf('--key');
  if (keyIdx !== -1) {
    const key = args[keyIdx + 1];
    if (!key || key.startsWith('-')) fail('usage: feedback-triage.mjs --key <key>');
    const report = JSON.parse(cmd(`npx wrangler r2 object get ${BUCKET}/${key} --remote --pipe`));
    const shotChars = typeof report?.shot?.data === 'string' ? report.shot.data.length : 0;
    console.log('\n--- report ---');
    console.log(JSON.stringify({ ...report, shot: { ...report.shot, data: `<${shotChars} b64 chars>` } }, null, 2));
    if (shotChars === 0) fail('this record carries no shot.data — nothing to decode');
    // the full basename minus .json — key names carry dashes (the date, the
    // ip hash), so splitting on '-' would stamp every decode `feedback-2026`
    // and overwrite the previous decode instead of naming its own report
    const stamp = (key.split('/').pop() ?? 'unknown').replace(/\.json$/, '');
    const file = `feedback-${stamp}.jpg`;
    writeFileSync(file, Buffer.from(report.shot.data, 'base64'));
    console.log(`\nscreenshot decoded (stored bare base64 → jpeg) → ${file}`);
  }
}

main().catch((err) => {
  const msg =
    err instanceof TriageError
      ? err.message
      : (typeof err?.stderr === 'string' && err.stderr.trim()) ||
        err?.message ||
        String(err);
  console.error(`[feedback-triage] ${msg}`);
  process.exitCode = 1;
});
