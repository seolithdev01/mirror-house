// SPDX-License-Identifier: Apache-2.0
//
// T12/T2 — the touch UI. Three PURE predicates (unit-pinned in the node
// suite) decide WHEN the touch chrome and the responsive declutter apply;
// `createTouchUi` builds the DOM itself: a floating virtual stick (ink base
// ring + yellow nub, the PoD plate language) and a hairline look-zone
// divider at the collector's 45% boundary. The layer is a pure VISUAL —
// pointer-events:none throughout, keyboard-focusable nothing: input stays
// in the input.ts collector, and this DOM only mirrors its stick pointer
// state, fed once per frame by main (update(input.touchSnapshot())).

import { COMPACT_BREAKPOINT_PX, TOUCH_NUB_RADIUS_PX, TOUCH_STICK_RADIUS_PX } from '../engine/constants';
import type { InputMode, TouchSnapshot } from '../engine/input';

/**
 * May the touch overlay show? The mode gates (no stick visual in keyboard/
 * mouse/hybrid — a hybrid player's taps stay plain taps), and the device
 * corroborates: a coarse primary pointer (matchMedia('(pointer: coarse)'))
 * shows it at once, while a fine-pointer device must have SEEN a touch first
 * (the touchscreen laptop that booted hybrid and switched modes — the stick
 * appears on its first `touchstart`, never before). Pure.
 */
export function shouldShowTouchUi(hasCoarse: boolean, seenTouch: boolean, mode: InputMode): boolean {
  return mode === 'touch' && (hasCoarse || seenTouch);
}

/**
 * Is the viewport in the COMPACT declutter layout? True at or under
 * COMPACT_BREAKPOINT_PX (the boundary pixel itself is compact — ≤, not <) or
 * whenever the primary pointer is coarse: a 1200px tablet gets the declutter
 * too, because the thumb, not the window, is what needs the room. Pure;
 * main calls it at boot and on every resize to drive the body class.
 */
export function isCompactLayout(width: number, hasCoarse: boolean): boolean {
  return width <= COMPACT_BREAKPOINT_PX || hasCoarse;
}

/** The minimap/motion pane boot defaults: desktop (wide window, fine
 *  pointer, a non-touch mode) keeps the shipped always-on panes; compact or
 *  touch boots them HIDDEN — the dock's MAP/MOTION chips summon them as
 *  overlays (session vars, never persisted; a chip press flips the same
 *  toggle KeyN/KeyB always have). Pure. */
export interface PaneDefaults {
  map: boolean;
  motion: boolean;
}

export function panesDefault(compact: boolean, touch: boolean): PaneDefaults {
  const shown = !compact && !touch;
  return { map: shown, motion: shown };
}

// ---- the DOM mirror (browser-only) ------------------------------------------

export interface TouchUiLabels {
  stick: string;
  look: string;
}

export interface TouchUi {
  root: HTMLElement;
  /** Show/hide the whole layer (main feeds shouldShowTouchUi's verdict). */
  setVisible(show: boolean): void;
  /** One frame's mirror update: with the stick pointer up the base ring
   *  parks in its bottom-left rest spot (dimmed); with it down the ring
   *  jumps to the down-point origin and the nub rides origin + clamped
   *  vector — the thumb's shadow, exactly the collector's state. */
  update(snap: TouchSnapshot): void;
  /** Re-apply the localized aria labels (main calls from refreshChrome). */
  setLabels(labels: TouchUiLabels): void;
}

/**
 * Mount the touch overlay into `host` (main passes document.body). Sizes
 * come from the constants — the base ring is 2×TOUCH_STICK_RADIUS_PX (the
 * vector's normalizer, so a rim-grazing nub reads a magnitude of exactly 1)
 * and the nub 2×TOUCH_NUB_RADIUS_PX, centered by half-radius negative
 * margins so the drag transform stays a plain translate3d.
 */
export function createTouchUi(host: HTMLElement, initialLabels: TouchUiLabels): TouchUi {
  let labels: TouchUiLabels = { ...initialLabels };
  const root = document.createElement('div');
  root.id = 'mh-touch';
  root.hidden = true;
  // The look-zone hairline: the only thing the right 55% ever paints — a
  // quiet ink divider at the collector's exact 0.45 boundary (CSS matches
  // classifyZone's math; the zone itself stays invisible per the plan).
  const divider = document.createElement('div');
  divider.id = 'mh-touch-divider';
  const stick = document.createElement('div');
  stick.id = 'mh-touch-stick';
  const r = TOUCH_STICK_RADIUS_PX;
  stick.style.width = `${r * 2}px`;
  stick.style.height = `${r * 2}px`;
  const nub = document.createElement('div');
  nub.id = 'mh-touch-nub';
  const nr = TOUCH_NUB_RADIUS_PX;
  nub.style.width = `${nr * 2}px`;
  nub.style.height = `${nr * 2}px`;
  nub.style.marginLeft = `${-nr}px`; // dead-center without a transform, so
  nub.style.marginTop = `${-nr}px`; // the drag offset stays one clean translate3d
  stick.appendChild(nub);
  root.append(divider, stick);
  host.appendChild(root);

  function applyLabels(): void {
    // Pointer surfaces, never focus stops (the plan's a11y constraint): the
    // two zones describe themselves to assistive tech as named images.
    stick.setAttribute('role', 'img');
    stick.setAttribute('aria-label', labels.stick);
    divider.setAttribute('role', 'img');
    divider.setAttribute('aria-label', labels.look);
  }
  applyLabels();

  function update(snap: TouchSnapshot): void {
    if (!snap.stick.active) {
      stick.classList.remove('mh-touch-live'); // the CSS rest spot (parked, dimmed)
      stick.style.transform = '';
      nub.style.transform = '';
      return;
    }
    stick.classList.add('mh-touch-live'); // jumps to the thumb (left/top 0 + transform)
    stick.style.transform = `translate3d(${snap.origin.x - r}px, ${snap.origin.y - r}px, 0)`;
    const nx = snap.stick.dx * r; // the snapshot is normalized by r — scale back to px
    const ny = snap.stick.dy * r;
    nub.style.transform = `translate3d(${nx.toFixed(2)}px, ${ny.toFixed(2)}px, 0)`;
  }

  return {
    root,
    setVisible: (show) => {
      root.hidden = !show;
      if (!show) update({ stick: { active: false, dx: 0, dy: 0 }, lookDx: 0, origin: { x: 0, y: 0 } });
    },
    update,
    setLabels: (next) => {
      labels = { ...labels, ...next };
      applyLabels();
    },
  };
}
