// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { CELL_SIZE, MINIMAP_PADDING_PX, MINIMAP_SIZE_PX } from '../../src/engine/constants';
import { fitScale } from '../../src/ui/minimap';

// T11/T1 — the Pac-minimap's one pure helper. Everything else in minimap.ts
// is 2D-canvas drawing (browser-only, the overhead.ts precedent): the scale
// fit is the piece the maze's legibility rides on, so it is unit-pinned.
describe('fitScale (T11 minimap)', () => {
  it('a square grid in the 176px pane: padding-honored width and height agree', () => {
    const s = fitScale(MINIMAP_SIZE_PX, MINIMAP_SIZE_PX, { width: 15, height: 15 });
    const avail = MINIMAP_SIZE_PX - 2 * MINIMAP_PADDING_PX;
    expect(s).toBeCloseTo(avail / (15 * CELL_SIZE), 12);
    expect(s).toBeGreaterThan(0);
  });

  it('a portrait grid is height-constrained', () => {
    const s = fitScale(MINIMAP_SIZE_PX, MINIMAP_SIZE_PX, { width: 11, height: 25 });
    const avail = MINIMAP_SIZE_PX - 2 * MINIMAP_PADDING_PX;
    expect(s).toBeCloseTo(avail / (25 * CELL_SIZE), 12);
  });

  it('a landscape grid is width-constrained', () => {
    const s = fitScale(MINIMAP_SIZE_PX, MINIMAP_SIZE_PX, { width: 25, height: 11 });
    const avail = MINIMAP_SIZE_PX - 2 * MINIMAP_PADDING_PX;
    expect(s).toBeCloseTo(avail / (25 * CELL_SIZE), 12);
  });

  it('a non-square pane picks the tighter axis', () => {
    const s = fitScale(200, 100, { width: 15, height: 15 });
    const availW = 200 - 2 * MINIMAP_PADDING_PX;
    const availH = 100 - 2 * MINIMAP_PADDING_PX;
    expect(s).toBeCloseTo(Math.min(availW / 60, availH / 60), 12);
    expect(s).toBeCloseTo(availH / 60, 12); // the short side wins
  });

  it('honors the 6px padding — growing the pane by the padding ring grows the drawn area by it too', () => {
    expect(fitScale(176, 176, { width: 15, height: 15 })).toBeCloseTo(164 / (15 * CELL_SIZE), 12);
    expect(fitScale(188, 188, { width: 15, height: 15 })).toBeCloseTo(176 / (15 * CELL_SIZE), 12);
  });

  it('padding clamp: a pane smaller than the padding ring stays positive (never NaN/0/negative)', () => {
    for (const px of [0, 1, 8, MINIMAP_PADDING_PX * 2]) {
      const s = fitScale(px, px, { width: 15, height: 15 });
      expect(Number.isFinite(s), `${px}px`).toBe(true);
      expect(s, `${px}px`).toBeGreaterThan(0);
    }
  });

  it('a single-cell grid fills the whole padded pane', () => {
    const s = fitScale(176, 176, { width: 1, height: 1 });
    expect(s).toBeCloseTo((176 - 2 * MINIMAP_PADDING_PX) / CELL_SIZE, 12);
  });
});
