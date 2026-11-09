// SPDX-License-Identifier: Apache-2.0
//
// M5/T6 — the shared overlay dialog semantics: role=dialog + aria-modal, a
// Tab cycle that never escapes the box, Escape-to-close (where the overlay has
// a close), and focus bookends — focus lands on the first control when the
// dialog opens and returns to whatever triggered it when the dialog closes.
// Self-managing: the overlays keep their plain `root.hidden` toggles; a
// MutationObserver on `hidden` engages and releases the machinery, so every
// existing open path (button, key, backdrop click) gets the semantics for
// free. The keydown listener stands down while its dialog is hidden, so four
// live traps never fight over one press.
//
// M5 minor (landed M6/T4) — the open-order stack: dialogs stack (⚙ open, then
// H opens the FAQ on top of it, then I docks Aaina beside that…), and Escape
// must peel exactly ONE layer — the topmost. Each trap pushes its root on
// open and removes it on close; an Escape press is answered only by the trap
// whose root is the stack's head, and Tab is cycled only by that trap (a
// covered dialog never steals the keyboard). One Chromium subtlety: the
// browser drains MutationObserver microtasks BETWEEN window listeners, so the
// closing topmost's removal can land mid-dispatch — each Escape press carries
// a claim token (the event itself) so the dialogs under it stand down for the
// rest of that dispatch regardless.

export interface DialogTrap {
  /** Tear the trap down outright (module teardown; the four overlays never do). */
  release(): void;
}

/** Everything a Tab press could land on, in DOM order. */
const FOCUSABLE =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

function focusablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hidden && (el.checkVisibility?.() ?? true),
  );
}

/** M5 minor (M6/T4) — the open dialogs, oldest first; the LAST entry is the
 *  topmost and the only one whose trap answers an Escape. */
const openOrder: HTMLElement[] = [];

/** Push `root` as the topmost open dialog (idempotent — a re-open just lifts
 *  an existing entry to the top). */
function pushOpen(root: HTMLElement): void {
  const i = openOrder.indexOf(root);
  if (i >= 0) openOrder.splice(i, 1);
  openOrder.push(root);
}

/** Drop `root` from the open order (hidden or released — same thing here). */
function dropOpen(root: HTMLElement): void {
  const i = openOrder.indexOf(root);
  if (i >= 0) openOrder.splice(i, 1);
}

/** The Escape press already answered this dispatch (each event object is
 *  unique, so a stale claim can never match a later press). */
let claimedEscape: KeyboardEvent | null = null;

export function trapDialog(
  root: HTMLElement,
  opts: { labelledBy?: string; onEscape?: () => void } = {},
): DialogTrap {
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  if (opts.labelledBy !== undefined) root.setAttribute('aria-labelledby', opts.labelledBy);
  let restoreTo: HTMLElement | null = null;

  function opened(): void {
    pushOpen(root); // M5 minor (M6/T4) — the newest open dialog is the topmost
    const prev = document.activeElement;
    restoreTo = prev instanceof HTMLElement && !root.contains(prev) ? prev : null;
    focusablesIn(root)[0]?.focus(); // an empty dialog simply keeps focus put
  }
  function closed(): void {
    dropOpen(root); // M5 minor (M6/T4) — a closed dialog leaves the open order
    restoreTo?.focus();
    restoreTo = null;
  }

  const observer = new MutationObserver(() => {
    if (root.hidden) closed();
    else opened();
  });
  observer.observe(root, { attributes: true, attributeFilter: ['hidden'] });

  // Bubble phase, after the settings capture-phase rebind listener — a live
  // capture eats its own Escape (cancel the rebind) before this ever runs.
  function onKeyDown(e: KeyboardEvent): void {
    if (root.hidden) return; // not this dialog's press
    const topmost = openOrder[openOrder.length - 1] === root;
    if (e.code === 'Escape') {
      // M5 minor (M6/T4) — only the TOPMOST open dialog answers, so a stacked
      // session peels one layer per press. The claim token is the event
      // itself: Chromium drains MutationObserver microtasks BETWEEN window
      // listeners, so the closing dialog's dropOpen can land mid-dispatch and
      // briefly make the dialog under it look topmost — the claim pins the
      // press to its one true owner no matter who runs next.
      if (claimedEscape === e) return; // a higher dialog already took this press
      if (!topmost) return;
      claimedEscape = e;
      opts.onEscape?.();
      return;
    }
    if (!topmost) return; // Tab belongs to the dialog actually on top (M6/T4)
    if (e.code !== 'Tab') return;
    const items = focusablesIn(root);
    if (items.length === 0) {
      e.preventDefault(); // nothing to tab to — the press dies inside, never escapes
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !root.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !root.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }
  window.addEventListener('keydown', onKeyDown);
  if (!root.hidden) opened(); // a trap minted on an already-open dialog

  return {
    release: () => {
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      closed();
    },
  };
}
