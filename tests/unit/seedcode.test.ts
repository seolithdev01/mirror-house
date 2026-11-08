// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { isValidSeed, normalizeSeed, randomSeed, SEED_ALPHABET } from '../../src/game/seedCode';

describe('seedCode', () => {
  it('accepts uppercase alphanumeric codes up to 16 chars', () => {
    expect(isValidSeed('A')).toBe(true);
    expect(isValidSeed('PLAYTEST7')).toBe(true);
    expect(isValidSeed('')).toBe(false);
    expect(isValidSeed('has space')).toBe(false);
    expect(isValidSeed('ABCDEFGHIJKLMNOPQRS')).toBe(false); // 17 chars
    expect(isValidSeed('play')).toBe(false); // lowercase
  });

  it('normalizeSeed uppercases, strips foreign chars, caps at 16', () => {
    expect(normalizeSeed(' play-2 ')).toBe('PLAY2');
    expect(normalizeSeed('a'.repeat(30))).toBe('A'.repeat(16));
  });

  it('randomSeed returns 8 chars from the alphabet', () => {
    for (let i = 0; i < 20; i++) {
      const s = randomSeed();
      expect(s).toHaveLength(8);
      for (const ch of s) expect(SEED_ALPHABET.includes(ch)).toBe(true);
    }
  });

  it('two random seeds differ (probabilistic but 8 chars base31)', () => {
    const set = new Set(Array.from({ length: 50 }, () => randomSeed()));
    expect(set.size).toBe(50);
  });
});
