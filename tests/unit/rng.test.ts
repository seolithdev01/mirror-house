// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/engine/rng';

describe('createRng', () => {
  it('same seed produces identical sequences', () => {
    const a = createRng('SHEESH');
    const b = createRng('SHEESH');
    const seqA = Array.from({ length: 16 }, () => a.next());
    const seqB = Array.from({ length: 16 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds diverge', () => {
    expect(createRng('AAA').next()).not.toBe(createRng('BBB').next());
  });

  it('next() stays in [0,1)', () => {
    const rng = createRng('X');
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() stays in range', () => {
    const rng = createRng('X');
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(15);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(15);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('shuffle() is a deterministic permutation', () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = createRng('S').shuffle(src);
    const b = createRng('S').shuffle(src);
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // input untouched
  });
});
