// SPDX-License-Identifier: Apache-2.0
//
// T15 — the production ingest for player feedback. A thin shell on purpose:
// every rule lives in src/game/feedbackNet.ts (shared with the client), so
// what the browser builds is byte-for-byte what this accepts. Here: parse,
// rate-limit by an R2 hour-prefix count, store one self-contained JSON
// object, answer JSON. No read path exists — reports leave via the wrangler
// triage script only.

/// <reference types="@cloudflare/workers-types" />

import {
  FEEDBACK_LIMITS,
  feedbackRatePrefix,
  feedbackStorageKey,
  parseFeedbackPayload,
} from '../../src/game/feedbackNet';

interface Env {
  FEEDBACK: R2Bucket;
}

/** Reports per client per UTC hour — generous for humans, hostile to floods. */
const RATE_PER_HOUR = 4;
const RAND_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // unambiguous set

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
  });

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
    },
  });

export const onRequestPost = async (ctx: { request: Request; env: Env }): Promise<Response> => {
  const req = ctx.request;
  const mime = (req.headers.get('content-type') ?? '').split(';')[0] ?? '';
  if (mime.trim() !== 'application/json') {
    return json(400, { ok: false, error: 'content-type must be application/json' });
  }
  const raw = await req.text();
  if (raw.length > FEEDBACK_LIMITS.totalBytes) {
    return json(413, { ok: false, error: 'payload too large' });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return json(400, { ok: false, error: 'invalid JSON' });
  }
  const verdict = parseFeedbackPayload(parsed);
  if (!verdict.ok) return json(400, { ok: false, error: verdict.error });

  // Identity: a truncated SHA-256 of the connecting IP — enough to rate-limit
  // and correlate a burst, not enough to reverse. The bucket is private.
  const ip = req.headers.get('cf-connecting-ip') ?? 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  const ipHash = [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
  const now = new Date();
  const hourUtc = now.toISOString().slice(0, 13);

  const recent = await ctx.env.FEEDBACK.list({ prefix: feedbackRatePrefix(hourUtc, ipHash), limit: RATE_PER_HOUR + 1 });
  if (recent.objects.length >= RATE_PER_HOUR) {
    return json(429, { ok: false, error: 'too many reports this hour — try again later' });
  }

  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const rand = [...bytes].map((b) => RAND_CHARS[b % RAND_CHARS.length]).join('');
  const key = feedbackStorageKey(now.toISOString(), ipHash, rand);
  const record = {
    receivedAt: now.toISOString(),
    ...verdict.value,
    meta: {
      ipHash16: ipHash,
      colo: (req as unknown as { cf?: { colo?: string } }).cf?.colo ?? null,
      country: (req as unknown as { cf?: { country?: string } }).cf?.country ?? null,
    },
  };
  await ctx.env.FEEDBACK.put(key, JSON.stringify(record), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
  // Each accepted report also drops one marker under the hour prefix — these
  // markers ARE the counter the next POST's list reads (the report key above
  // is fb/-scoped, so without a marker the count would never climb). The
  // suffix is the report key's basename: as unique as the report itself.
  await ctx.env.FEEDBACK.put(`${feedbackRatePrefix(hourUtc, ipHash)}${key.slice(key.lastIndexOf('/') + 1)}`, '');
  return json(201, { ok: true });
};

// Fail closed for every method but POST/OPTIONS: Pages calls this generic
// handler only when no verb-specific export above matched (onRequestPost /
// onRequestOptions win for their verbs), so anything else — GET, PUT, the
// lot — gets the contract's JSON 405 instead of a bare static 404.
export const onRequest = (): Response => json(405, { ok: false, error: 'method not allowed' });
