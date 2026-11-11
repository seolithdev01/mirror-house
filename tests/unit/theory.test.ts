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
  TIER_FIVE_SCALE,
  TIER_FOUR_SCALE,
  TIER_ONE_SCALE,
  TIER_SEVEN_INTENSITY_CEILING,
  TIER_SEVEN_SCALE,
  TIER_SIX_SCALE,
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

  // T4/T4 — the Carnival's mischievous fourth scale (spec §6.1 row 4): the
  // Durga frame with the major third flattened a semitone — the minor-leaning
  // hiccup that makes the funhouse grin.
  it('tier four is the mischievous pentatonic set', () => {
    expect(TIER_FOUR_SCALE).toEqual([0, 2, 3, 7, 9]);
  });

  // T5/T4 — the Flood Halls' dark pentatonic (spec §6.1 row 5): the minor
  // frame with no second and no sixth — flat third, open fourth and fifth,
  // flat seventh. The submerged scale the drowned halls hum.
  it('tier five is the dark pentatonic set', () => {
    expect(TIER_FIVE_SCALE).toEqual([0, 3, 5, 7, 10]);
  });

  // T6/T4 — the Furnace Wings' urgent scale (spec §6.1 row 6): the
  // Phrygian-adjacent pentatonic — root, flat second (the Phrygian bite),
  // fourth, fifth, flat sixth — the tense rung the crucible hums while the
  // heat climbs.
  it('tier six is the urgent Phrygian-adjacent pentatonic set', () => {
    expect(TIER_SIX_SCALE).toEqual([0, 1, 5, 7, 8]);
  });

  // T7/T3 — the Whisper Library's whispered pentatonic (spec §6.1 row 7):
  // root, second, flat third, fifth, flat sixth — the moonlit set the flute
  // breathes through the stacks, played sparse under the whisper ceiling.
  it('tier seven is the whispered pentatonic set', () => {
    expect(TIER_SEVEN_SCALE).toEqual([0, 2, 3, 7, 8]);
  });

  // T7/T3 — the whisper ceiling: the Library's melody intensity never rises
  // past 0.55. Main applies it as the multiplier on the raw threat blend (the
  // input never exceeds 1, so ×ceiling IS the ceiling — the calm 0.2 floor
  // hushes to 0.11), disclosed there; this pins the constant itself.
  it('the whisper ceiling is exact (0.55)', () => {
    expect(TIER_SEVEN_INTENSITY_CEILING).toBe(0.55);
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

  // T4/T4 — the carnival walker walks the mischievous set only: every emitted
  // note is a tier-four member inside the window (pcs of [0,2,3,7,9]).
  it('after a tier-four swap the walk only emits mischievous members in the window', () => {
    const rng = createRng('CARNIVAL-WALK');
    let semi = OCT;
    const mischievous = new Set(TIER_FOUR_SCALE.map((s) => (OCT + s) % 12));
    for (let i = 0; i < 200; i++) {
      semi = nextMelodySemi(rng, TIER_FOUR_SCALE, semi, 0.7, OCT);
      expect(semi).toBeGreaterThanOrEqual(OCT);
      expect(semi).toBeLessThanOrEqual(OCT + 12);
      expect(mischievous.has(semi % 12)).toBe(true);
    }
  });

  // T5/T4 — the flood walker walks the dark set only: every emitted note is a
  // tier-five member inside the window (pcs of [0,3,5,7,10]).
  it('after a tier-five swap the walk only emits dark-pentatonic members in the window', () => {
    const rng = createRng('FLOOD-WALK');
    let semi = OCT;
    const dark = new Set(TIER_FIVE_SCALE.map((s) => (OCT + s) % 12));
    for (let i = 0; i < 200; i++) {
      semi = nextMelodySemi(rng, TIER_FIVE_SCALE, semi, 0.7, OCT);
      expect(semi).toBeGreaterThanOrEqual(OCT);
      expect(semi).toBeLessThanOrEqual(OCT + 12);
      expect(dark.has(semi % 12)).toBe(true);
    }
  });

  // T6/T4 — the furnace walker walks the urgent set only: every emitted note
  // is a tier-six member inside the window (pcs of [0,1,5,7,8]).
  it('after a tier-six swap the walk only emits urgent-pentatonic members in the window', () => {
    const rng = createRng('FURNACE-WALK');
    let semi = OCT;
    const urgent = new Set(TIER_SIX_SCALE.map((s) => (OCT + s) % 12));
    for (let i = 0; i < 200; i++) {
      semi = nextMelodySemi(rng, TIER_SIX_SCALE, semi, 0.7, OCT);
      expect(semi).toBeGreaterThanOrEqual(OCT);
      expect(semi).toBeLessThanOrEqual(OCT + 12);
      expect(urgent.has(semi % 12)).toBe(true);
    }
  });

  // T7/T3 — the whisper walker walks the whispered set only: every emitted
  // note is a tier-seven member inside the window (pcs of [0,2,3,7,8]).
  it('after a tier-seven swap the walk only emits whispered members in the window', () => {
    const rng = createRng('LIBRARY-WALK');
    let semi = OCT;
    const whispered = new Set(TIER_SEVEN_SCALE.map((s) => (OCT + s) % 12));
    for (let i = 0; i < 200; i++) {
      semi = nextMelodySemi(rng, TIER_SEVEN_SCALE, semi, 0.55, OCT);
      expect(semi).toBeGreaterThanOrEqual(OCT);
      expect(semi).toBeLessThanOrEqual(OCT + 12);
      expect(whispered.has(semi % 12)).toBe(true);
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
