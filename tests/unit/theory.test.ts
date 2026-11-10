// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { ANGER_MAX } from '../../src/engine/constants';
import { createRng } from '../../src/engine/rng';
import { createAudioEngine } from '../../src/audio/engine';
import {
  beatAccents,
  intensityFrom,
  midiToHz,
  nextMelodySemi,
  TIER_ONE_SCALE,
  TIER_THREE_SCALE,
  TIER_TWO_SCALE,
} from '../../src/audio/theory';

const OCT = 57; // A3 — the engine's melody window

describe('scales', () => {
  it('tier one is the Ahir-Bhairav-inspired heptatonic set', () => {
    expect(TIER_ONE_SCALE).toEqual([0, 1, 4, 5, 7, 8, 11]);
  });

  it('tier two is the Durga-inspired pentatonic set', () => {
    expect(TIER_TWO_SCALE).toEqual([0, 2, 4, 7, 9]);
  });

  // T3/T4 — the Gardens' pastoral third scale (spec §6.1 row 3: flute-lead).
  it('tier three is the pastoral pentatonic set', () => {
    expect(TIER_THREE_SCALE).toEqual([0, 2, 5, 7, 9]);
  });
});

describe('midiToHz', () => {
  it('concert A maps to 440Hz', () => {
    expect(midiToHz(69)).toBe(440);
  });

  it('is the standard equal-temperament mapping', () => {
    expect(midiToHz(45)).toBeCloseTo(110, 10); // A2 root
    expect(midiToHz(81)).toBeCloseTo(880, 10); // one octave above A4
  });
});

describe('nextMelodySemi', () => {
  it('same rng seed yields the same 16 notes', () => {
    const walk = () => {
      const rng = createRng('RAGA');
      let semi = OCT + 7;
      return Array.from({ length: 16 }, () => {
        semi = nextMelodySemi(rng, TIER_ONE_SCALE, semi, 0.5, OCT);
        return semi;
      });
    };
    expect(walk()).toEqual(walk());
  });

  it('stays inside the octave window over a long walk', () => {
    const rng = createRng('SPAN');
    let semi = OCT;
    for (let i = 0; i < 500; i++) {
      semi = nextMelodySemi(rng, TIER_ONE_SCALE, semi, 0.5, OCT);
      expect(semi).toBeGreaterThanOrEqual(OCT);
      expect(semi).toBeLessThanOrEqual(OCT + 12);
    }
  });

  it('honours the window for both scales from any start inside it', () => {
    for (const scale of [TIER_ONE_SCALE, TIER_TWO_SCALE, TIER_THREE_SCALE]) {
      for (let start = OCT; start <= OCT + 12; start += 3) {
        const rng = createRng(`SPAN-${start}`);
        let semi = start;
        for (let i = 0; i < 200; i++) {
          semi = nextMelodySemi(rng, scale, semi, 0.9, OCT);
          expect(semi).toBeGreaterThanOrEqual(OCT);
          expect(semi).toBeLessThanOrEqual(OCT + 12);
        }
      }
    }
  });

  // T3/T4 — the flute walks the pastoral set only: every emitted note is a
  // tier-three member inside the window (pcs of [0,2,5,7,9] rooted at A=9).
  it('after a tier-three swap the walk only emits pastoral members in the window', () => {
    const rng = createRng('GARDEN-WALK');
    let semi = OCT;
    const pastoral = new Set(TIER_THREE_SCALE.map((s) => (OCT + s) % 12));
    for (let i = 0; i < 200; i++) {
      semi = nextMelodySemi(rng, TIER_THREE_SCALE, semi, 0.7, OCT);
      expect(semi).toBeGreaterThanOrEqual(OCT);
      expect(semi).toBeLessThanOrEqual(OCT + 12);
      expect(pastoral.has(semi % 12)).toBe(true);
    }
  });

  it('walks wider on average at intensity 0.9 than at 0.2 (seeded statistics)', () => {
    const avgLeap = (seed: string, intensity: number): number => {
      const rng = createRng(seed);
      let semi = OCT + 7; // mid-window start keeps clamping unbiased
      let total = 0;
      const N = 240;
      for (let i = 0; i < N; i++) {
        const next = nextMelodySemi(rng, TIER_ONE_SCALE, semi, intensity, OCT);
        total += Math.abs(next - semi);
        semi = next;
      }
      return total / N;
    };
    const calm = avgLeap('CALM-WALK', 0.2);
    const hot = avgLeap('HOT-WALK', 0.9);
    expect(calm).toBeGreaterThan(0);
    expect(hot).toBeGreaterThan(calm);
  });
});

describe('beatAccents', () => {
  it('pins the 8-tick cycle at low intensity', () => {
    const low = Array.from({ length: 8 }, (_, t) => beatAccents(t, 0.2).low);
    const high = Array.from({ length: 8 }, (_, t) => beatAccents(t, 0.2).high);
    expect(low).toEqual([true, false, false, false, true, false, false, false]);
    expect(high).toEqual([false, true, false, false, false, false, false, false]);
  });

  it('pins the 8-tick cycle at high intensity (extra dhin on 2, ta on every odd tick)', () => {
    const low = Array.from({ length: 8 }, (_, t) => beatAccents(t, 0.8).low);
    const high = Array.from({ length: 8 }, (_, t) => beatAccents(t, 0.8).high);
    expect(low).toEqual([true, false, true, false, true, false, false, false]);
    expect(high).toEqual([false, true, false, true, false, true, false, true]);
  });

  it('wraps the cycle via the modulo of the tick index', () => {
    expect(beatAccents(8, 0.2)).toEqual(beatAccents(0, 0.2));
    expect(beatAccents(13, 0.8)).toEqual(beatAccents(5, 0.8));
  });
});

describe('intensityFrom', () => {
  const base = { anger: 0, chasing: 0, failing: false, cleared: false };

  it('cleared floors to a calm 0.1 regardless of other inputs', () => {
    expect(
      intensityFrom({ ...base, anger: ANGER_MAX, chasing: 1, failing: true, cleared: true }),
    ).toBe(0.1);
  });

  it('failing spikes to 1', () => {
    expect(intensityFrom({ ...base, failing: true })).toBe(1);
  });

  it('calm house rests at 0.2', () => {
    expect(intensityFrom({ ...base })).toBe(0.2);
  });

  it('blends anger and pursuit pressure', () => {
    expect(intensityFrom({ ...base, anger: ANGER_MAX / 2, chasing: 0.5 })).toBeCloseTo(0.5, 10);
    expect(intensityFrom({ ...base, anger: ANGER_MAX, chasing: 1 })).toBeCloseTo(0.8, 10);
  });

  it('clamps the blended branch at 0.95', () => {
    expect(intensityFrom({ ...base, anger: ANGER_MAX * 1.5, chasing: 1 })).toBe(0.95);
  });
});

describe('createAudioEngine (node)', () => {
  it('returns an inert engine outside the browser', () => {
    const engine = createAudioEngine('SHEESH');
    expect(engine.started).toBe(false);
    expect(engine.muted).toBe(false);
    expect(() => {
      engine.start();
      engine.setIntensity(0.7);
      engine.setMuted(true);
    }).not.toThrow();
    expect(engine.started).toBe(false);
    expect(engine.muted).toBe(false);
  });

  // T2/T3 — the scale test seam: the engine exposes the melody walker's live
  // scale so node can witness setScale without an AudioContext. The walker
  // reads the swapped scale on its NEXT note (nextMelodySemi call), and the
  // drone root is untouched by the swap.
  it('setScale swaps the melody walker scale live (starts tier-one)', () => {
    const engine = createAudioEngine('DURGA');
    expect(engine.scale).toEqual(TIER_ONE_SCALE);
    expect(() => engine.setScale(TIER_TWO_SCALE)).not.toThrow();
    expect(engine.scale).toEqual([0, 2, 4, 7, 9]);
    // swap is repeatable both ways — buildFloor re-sets it on every floor
    engine.setScale(TIER_ONE_SCALE);
    expect(engine.scale).toEqual(TIER_ONE_SCALE);
  });

  it('after a tier-two swap the walk only emits Durga members in the window', () => {
    const rng = createRng('SWAPPED');
    let semi = OCT;
    // the pcs of the Durga set rooted at A (57): A B C# E F#
    const durga = new Set([9, 11, 1, 4, 6]);
    for (let i = 0; i < 200; i++) {
      semi = nextMelodySemi(rng, TIER_TWO_SCALE, semi, 0.7, OCT);
      expect(semi).toBeGreaterThanOrEqual(OCT);
      expect(semi).toBeLessThanOrEqual(OCT + 12);
      expect(durga.has(semi % 12)).toBe(true);
    }
  });

  // T3/T4 — the voice test seam: the engine exposes the melody osc's live
  // kind so node can witness setVoice without an AudioContext. The flute is
  // tier-3's lead (sine); triangle is the tier-1/2 default every reset
  // returns to (venue floors included — buildFloor re-sets both scale+voice).
  it('setVoice swaps the melody voice live (starts triangle)', () => {
    const engine = createAudioEngine('FLUTE');
    expect(engine.voice).toBe('triangle');
    expect(() => engine.setVoice('sine')).not.toThrow();
    expect(engine.voice).toBe('sine');
    // swap is repeatable both ways — buildFloor re-sets it on every floor
    engine.setVoice('triangle');
    expect(engine.voice).toBe('triangle');
  });
});
