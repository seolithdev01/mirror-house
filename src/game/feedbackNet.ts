// SPDX-License-Identifier: Apache-2.0
//
// T15 — the feedback wire contract, shared by the browser client and the
// Cloudflare Pages Function (functions/api/feedback.ts). ONE module owns the
// payload shape, the limits, and the only validator: what the client builds
// is exactly what the server accepts, and every rejection reason is a test
// here. Pure TypeScript — no DOM, no fetch, no R2 — so vitest can hold the
// whole contract in a node process.

/** The three kinds the composer's radio offers — mirrored from the GitHub
 *  mapping in game/feedback (bug/suggestion/love). Repeated here as a
 *  literal set so the wire contract never widens by accident. */
export const FEEDBACK_KINDS = ['bug', 'suggestion', 'love'] as const;
export type WireKind = (typeof FEEDBACK_KINDS)[number];

/** Hard caps — the server rejects anything over them (413/400); the client
 *  never builds anything over them by construction. */
export const FEEDBACK_LIMITS = {
  title: 120,
  body: 4000,
  /** base64 characters of screenshot data (~675 KB of JPEG). */
  shotChars: 900_000,
  /** max JSON body size the Function will even read (413 above this). */
  totalBytes: 1_600_000,
} as const;

export interface ShotWire {
  w: number;
  h: number;
  mime: 'image/jpeg';
  data: string; // bare base64, no data: prefix
}
/** The plan's Produces list names the wire shot ShotInput — an alias so both
 *  names resolve to the one type (ShotWire stays the primary name; the plan's
 *  cross-task consistency note pins it). */
export type ShotInput = ShotWire;
export interface FeedbackCtx {
  floor: number;
  tier: number;
  mode: string;
  view: string;
  lang: string;
  preset: string;
  seed: string;
  dpr: number;
  ua: string;
  /** MiB usedJSHeapSize where the browser exposes it; null otherwise. */
  heap: number | null;
}
export interface FeedbackPayload {
  v: string;
  kind: WireKind;
  title: string;
  body: string;
  shot: ShotWire;
  ctx: FeedbackCtx;
}

/** The validator's two answers, named so the Function (Task 3) can narrow
 *  `ok` with the exact names the plan's contract lists. */
export type ParseOk = { ok: true; value: FeedbackPayload };
export type ParseErr = { ok: false; error: string };

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const str = (v: unknown): v is string => typeof v === 'string';
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Validate one untrusted payload (the Function's only ingest gate). Unknown
 *  keys are stripped (forward-compatible widening), everything else must
 *  type-check or the whole payload is refused — never partially accepted. */
export function parseFeedbackPayload(raw: unknown): ParseOk | ParseErr {
  if (!isRecord(raw)) return { ok: false, error: 'payload must be an object' };
  const { v, kind, title, body, shot, ctx } = raw;
  if (!str(v) || v.length === 0 || v.length > 40) return { ok: false, error: 'bad v' };
  if (!str(kind) || !(FEEDBACK_KINDS as readonly string[]).includes(kind)) return { ok: false, error: 'bad kind' };
  if (!str(title) || title.length === 0 || title.length > FEEDBACK_LIMITS.title) return { ok: false, error: 'bad title' };
  if (!str(body) || body.length > FEEDBACK_LIMITS.body) return { ok: false, error: 'bad body' };
  if (!isRecord(shot)) return { ok: false, error: 'bad shot' };
  if (!num(shot.w) || shot.w < 1 || shot.w > 8192) return { ok: false, error: 'bad shot.w' };
  if (!num(shot.h) || shot.h < 1 || shot.h > 8192) return { ok: false, error: 'bad shot.h' };
  if (shot.mime !== 'image/jpeg') return { ok: false, error: 'bad shot.mime' };
  if (!str(shot.data) || shot.data.length === 0 || shot.data.length > FEEDBACK_LIMITS.shotChars) return { ok: false, error: 'bad shot.data size' };
  if (!BASE64.test(shot.data)) return { ok: false, error: 'bad shot.data encoding' };
  if (!isRecord(ctx)) return { ok: false, error: 'bad ctx' };
  const { floor, tier, mode, view, lang, preset, seed, dpr, ua, heap } = ctx;
  if (!num(floor) || floor < 0 || floor > 100) return { ok: false, error: 'bad ctx.floor' };
  if (!num(tier) || tier < 0 || tier > 10) return { ok: false, error: 'bad ctx.tier' };
  if (!str(mode) || mode.length > 20) return { ok: false, error: 'bad ctx.mode' };
  if (!str(view) || view.length > 20) return { ok: false, error: 'bad ctx.view' };
  if (!str(lang) || lang.length > 10) return { ok: false, error: 'bad ctx.lang' };
  if (!str(preset) || preset.length > 20) return { ok: false, error: 'bad ctx.preset' };
  if (!str(seed) || seed.length > 80) return { ok: false, error: 'bad ctx.seed' };
  if (!num(dpr) || dpr < 0 || dpr > 10) return { ok: false, error: 'bad ctx.dpr' };
  if (!str(ua) || ua.length > 300) return { ok: false, error: 'bad ctx.ua' };
  if (heap !== null && !num(heap)) return { ok: false, error: 'bad ctx.heap' };
  return {
    ok: true,
    value: { v, kind: kind as WireKind, title, body, shot: { w: shot.w, h: shot.h, mime: 'image/jpeg', data: shot.data }, ctx: { floor, tier, mode, view, lang, preset, seed, dpr, ua, heap } },
  };
}

/** What the client builds: strip the `data:` prefix, hand over bare base64.
 *  The output always satisfies parseFeedbackPayload by construction. */
export interface BuildInput {
  v: string;
  kind: WireKind;
  title: string;
  body: string;
  shot: { w: number; h: number; dataUrl: string };
  ctx: FeedbackCtx;
}
export function buildFeedbackPayload(input: BuildInput): FeedbackPayload {
  const mark = 'base64,';
  const i = input.shot.dataUrl.indexOf(mark);
  const data = i === -1 ? '' : input.shot.dataUrl.slice(i + mark.length);
  return { v: input.v, kind: input.kind, title: input.title, body: input.body, shot: { w: input.shot.w, h: input.shot.h, mime: 'image/jpeg', data }, ctx: input.ctx };
}

/** Fit (w, h) inside a maxW × maxW box, preserving aspect, minimum 1px: the
 *  long side lands exactly on the cap, the short side rounds up (one pixel
 *  of over-aspect is invisible; a zero is not — hence ceil, not round).
 *  Pure so the capture path needs no canvas to test. */
export function targetShotSize(w: number, h: number, maxW: number): [number, number] {
  if (w <= maxW && h <= maxW) return [Math.max(1, w), Math.max(1, h)];
  const s = maxW / Math.max(w, h);
  return w >= h
    ? [maxW, Math.max(1, Math.ceil(h * s))]
    : [Math.max(1, Math.ceil(w * s)), maxW];
}

/** R2 object key for one report: date-scoped, sorts chronologically,
 *  unique by (time, ip-hash, rand). `iso` = the received-at instant. */
export function feedbackStorageKey(iso: string, ipHash: string, rand: string): string {
  const day = iso.slice(0, 10);
  const compact = iso.slice(0, 19).replaceAll(':', '');
  return `fb/${day}/${compact}Z-${ipHash}-${rand}.json`;
}

/** The per-hour rate bucket prefix: at most FEEDBACK_LIMITS_RATE (the
 *  Function's constant) objects may exist under it for one client hour. */
export function feedbackRatePrefix(hourUtc: string, ipHash: string): string {
  return `rate/${hourUtc}/${ipHash}/`;
}
