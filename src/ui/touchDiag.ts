// SPDX-License-Identifier: Apache-2.0
//
// t12 hotfix — the `?diag=1` touch diagnostics overlay. The ground-truth tool
// when a real phone misbehaves: the desktop gates dispatched synthetic pointer
// events at window and never hit-tested, so a green desktop run says nothing
// about what a phone's hit-testing + gesture claiming actually deliver. This
// panel logs the LAST 10 pointer events exactly as the browser surfaced them —
// `#id · pointerType · down/move/up/cancel · x,y · target-tag` — under a
// header naming the resolved input mode, the `(pointer: coarse)` match and the
// `body.compact` state. It taps window in the CAPTURE phase (before any
// target handler can stop or re-route anything — input.ts's own collector is
// untouched) and exists ONLY when the URL carries `diag=1`: param-gated like
// `?test=1`, PROD-usable, session-only, nothing persisted.

/**
 * Parse the diag flag from a query string: true iff `diag=1` appears AND
 * `diag=0` does not — the exact `parseTestMode` contract (an explicit 0 is
 * the reset, junk values are off). Pure on the raw query string (leading `?`
 * included — the shape `window.location.search` hands over) so the unit
 * suite walks every shape without a browser.
 */
export function parseDiagMode(search: string): boolean {
  const values = new URLSearchParams(search).getAll('diag');
  return values.includes('1') && !values.includes('0');
}

/** The four pointer event types the overlay tracks, already shortened to the
 *  word the row renders (`down`/`move`/`up`/`cancel`). */
export type TouchDiagType = 'down' | 'move' | 'up' | 'cancel';

/** Map a DOM pointer event `type` to its row word; unknown types (new or
 *  exotic) return null and the DOM layer drops them — the overlay only ever
 *  renders the four words it documents. Pure. */
export function diagEventType(type: string): TouchDiagType | null {
  switch (type) {
    case 'pointerdown':
      return 'down';
    case 'pointermove':
      return 'move';
    case 'pointerup':
      return 'up';
    case 'pointercancel':
      return 'cancel';
    default:
      return null;
  }
}

/** One row's data, field-by-field plain — the DOM layer builds these from
 *  PointerEvents, the unit suite builds them by hand (no DOM globals). */
export interface TouchDiagEvent {
  pointerId: number;
  pointerType: string;
  type: TouchDiagType;
  x: number;
  y: number;
  target: string;
}

/** Render one row exactly the documented contract: the pointer's id, its
 *  type, the event word, the client point, and the hit-tested target's tag. */
export function formatDiagRow(e: TouchDiagEvent): string {
  return `#${e.pointerId} · ${e.pointerType} · ${e.type} · ${e.x},${e.y} · ${e.target}`;
}

/** The header line: the resolved input mode (main's live `mode`), whether
 *  `(pointer: coarse)` matched at boot, and whether `body.compact` sits on
 *  the document right now. */
export function formatDiagHeader(mode: string, coarse: boolean, compact: boolean): string {
  return `DIAG · mode=${mode} · coarse=${coarse ? 'Y' : 'N'} · compact=${compact ? 'Y' : 'N'}`;
}

/** Ring-buffer cap: the newest row in, the oldest out, at most 10 kept —
 *  extracted pure so the suite can pin the churn without a DOM. */
export const TOUCH_DIAG_ROWS = 10;

export function pushDiagRow(rows: readonly TouchDiagEvent[], row: TouchDiagEvent): TouchDiagEvent[] {
  const next = [row, ...rows];
  return next.length > TOUCH_DIAG_ROWS ? next.slice(0, TOUCH_DIAG_ROWS) : next;
}

export interface TouchDiagOptions {
  /** The LIVE resolved input mode, read at render time (main passes a getter
   *  over its `mode` let — the header follows mode flips at once). */
  mode: () => string;
  /** Whether `(pointer: coarse)` matched — main passes hasCoarsePointer. */
  coarse: boolean;
}

export interface TouchDiag {
  root: HTMLElement;
  /** Fold one pointer event into the panel (the capture listener calls this;
   *  also callable by hand — the live probes dispatch synthetic events). */
  record(e: PointerEvent): void;
  /** Detach every listener (symmetry with input.attach's dispose). */
  stop(): void;
}

/**
 * Mount the overlay into `host` (main passes document.body) and tap window in
 * the capture phase for pointerdown/move/up/cancel. Display-only chrome: the
 * panel is pointer-events:none (it never intercepts a touch of its own) and
 * touch-action:none (it never offers the browser a gesture either). Renders
 * on every event and on resize (the compact state can flip mid-session).
 */
export function createTouchDiag(host: HTMLElement, opts: TouchDiagOptions): TouchDiag {
  const root = document.createElement('div');
  root.id = 'mh-touch-diag';
  host.appendChild(root);

  let rows: TouchDiagEvent[] = [];
  function render(): void {
    const compact = document.body.classList.contains('compact');
    root.textContent = [formatDiagHeader(opts.mode(), opts.coarse, compact), ...rows.map(formatDiagRow)].join(
      '\n',
    );
  }

  const onPointer = (e: PointerEvent): void => {
    const type = diagEventType(e.type);
    if (type === null) return;
    rows = pushDiagRow(rows, {
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      type,
      x: Math.round(e.clientX),
      y: Math.round(e.clientY),
      target: e.target instanceof Element ? e.target.tagName : '—',
    });
    render();
  };
  const onResize = (): void => render();
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const) {
    window.addEventListener(t, onPointer, true); // capture — before any target
  }
  window.addEventListener('resize', onResize);
  render();

  return {
    root,
    record: onPointer,
    stop: () => {
      for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const) {
        window.removeEventListener(t, onPointer, true);
      }
      window.removeEventListener('resize', onResize);
    },
  };
}
