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

export function trapDialog(
  root: HTMLElement,
  opts: { labelledBy?: string; onEscape?: () => void } = {},
): DialogTrap {
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  if (opts.labelledBy !== undefined) root.setAttribute('aria-labelledby', opts.labelledBy);
  let restoreTo: HTMLElement | null = null;

  function opened(): void {
    const prev = document.activeElement;
    restoreTo = prev instanceof HTMLElement && !root.contains(prev) ? prev : null;
    focusablesIn(root)[0]?.focus(); // an empty dialog simply keeps focus put
  }
  function closed(): void {
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
    if (e.code === 'Escape') {
      opts.onEscape?.();
      return;
    }
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
