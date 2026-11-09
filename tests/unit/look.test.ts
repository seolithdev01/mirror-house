// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { COATS, GLASSES, parseLook } from '../../src/game/look';

describe('parseLook', () => {
  it('parses known names with - or . separators', () => {
    expect(parseLook('teal-white')).toEqual({
      coat: COATS['teal'],
      glass: GLASSES['white'],
      name: 'teal-white',
    });
    expect(parseLook('rose.gold')).toEqual({
      coat: COATS['rose'],
      glass: GLASSES['gold'],
      name: 'rose-gold',
    });
  });
  it('defaults unknown parts and null input', () => {
    expect(parseLook(null).name).toBe('indigo-gold');
    expect(parseLook('banana-gold').name).toBe('indigo-gold');
    expect(parseLook('teal-banana')).toEqual({
      coat: COATS['teal'],
      glass: GLASSES['gold'],
      name: 'teal-gold',
    });
  });
});
