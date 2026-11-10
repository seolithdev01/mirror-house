// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { makePortraitCanvas, portraitSpec } from '../../src/game/textures';

// T2 — the ancestor silhouettes. portraitSpec is the PURE half of the portrait
// visual: the deterministic per-id shape parameters (a small rng draw), so the
// node suite can pin determinism without a canvas. makePortraitCanvas is the
// browser half — node-guarded like every other texture factory here.
describe('portraitSpec — the ancestor silhouette parameters (T2)', () => {
  it('is deterministic per mirror id', () => {
    for (const id of [0, 1, 2, 7, 41]) {
      expect(portraitSpec(id), `id ${id}`).toEqual(portraitSpec(id));
    }
  });

  it('distinct ids paint distinct ancestors (the ids are not one figure)', () => {
    const specs = new Set<string>();
    for (let id = 0; id < 8; id++) specs.add(JSON.stringify(portraitSpec(id)));
    expect(specs.size).toBeGreaterThan(1);
  });

  it('every shape parameter stays inside the glass (0..1 canvas space)', () => {
    for (let id = 0; id < 16; id++) {
      const s = portraitSpec(id);
      for (const v of [s.headX, s.headY, s.headR, s.robeW, s.robeH, s.lean, s.hood]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('pins the amber glass tint the tier-2 hall wears', () => {
    for (let id = 0; id < 4; id++) expect(portraitSpec(id).glass).toBe(0xc98a3d);
  });
});

describe('makePortraitCanvas — the node guard (T2)', () => {
  it('returns null outside the browser, like every other texture factory', () => {
    expect(typeof document === 'undefined').toBe(true); // this suite runs in node
    expect(makePortraitCanvas(portraitSpec(0))).toBeNull();
  });
});
