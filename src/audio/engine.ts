// SPDX-License-Identifier: Apache-2.0
// Procedural WebAudio engine — browser-only. Under node (unit tests) the
// factory returns an inert stub, mirroring the canvas guards in textures.ts.
// All randomness flows through createRng; all scheduling flows through theory.
import { AUDIO_GAIN_CEILING, AUDIO_ROOT_HZ } from '../engine/constants';
import { createRng } from '../engine/rng';
import type { Rng } from '../engine/rng';
import { beatAccents, midiToHz, nextMelodySemi, TIER_ONE_SCALE } from './theory';

export interface AudioEngine {
  /** Idempotent; creates/resumes the AudioContext. Call on first gesture. */
  start(): void;
  /** 0..1, clamped; smoothed internally by the scheduler. */
  setIntensity(x: number): void;
  setMuted(m: boolean): void;
  /** Swap the melody walker's scale live (T2/T3): the NEXT scheduled note
   *  walks the new set; the drone root and tempo never move. */
  setScale(scale: readonly number[]): void;
  /** Swap the melody osc's timbre live (T3/T4): 'sine' is the Gardens' flute
   *  lead, 'triangle' the tier-1/2 voice every reset returns to (venue floors
   *  included — buildFloor re-sets scale AND voice together), 'sawtooth' the
   *  Frozen Atrium's cold strings (T8/T3). */
  setVoice(kind: 'triangle' | 'sine' | 'sawtooth'): void;
  readonly started: boolean;
  readonly muted: boolean;
  /** The walker's current scale — the node test seam (no AudioContext needed
   *  to witness a setScale swap). */
  readonly scale: readonly number[];
  /** The melody osc's current kind — the setVoice test seam, same contract. */
  readonly voice: 'triangle' | 'sine' | 'sawtooth';
}

const SCHEDULE_MS = 50; // scheduler wake-up
const LOOKAHEAD_S = 0.12; // how far ahead events are placed
const TICK_S = 0.25; // 8-tick teental-ish cycle = 2s
const NOTE_S_LO = 0.45; // melody note period at intensity 0
const NOTE_S_HI = 0.22; // ...at intensity 1
const MELODY_OCTAVE_SEMI = 57; // A3 — walk window [57, 69]

function inertEngine(): AudioEngine {
  // Audio-inert, but the scale and voice are still tracked: the node suite
  // witnesses setScale/setVoice swaps through them (the test seams documented
  // on the interface).
  let scale: readonly number[] = TIER_ONE_SCALE;
  let voice: 'triangle' | 'sine' | 'sawtooth' = 'triangle';
  return {
    start: () => {},
    setIntensity: () => {},
    setMuted: () => {},
    setScale: (s: readonly number[]) => {
      scale = s;
    },
    setVoice: (kind: 'triangle' | 'sine' | 'sawtooth') => {
      voice = kind;
    },
    get started() {
      return false;
    },
    get muted() {
      return false;
    },
    get scale() {
      return scale;
    },
    get voice() {
      return voice;
    },
  };
}

export function createAudioEngine(seed: string): AudioEngine {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') {
    return inertEngine();
  }

  const rng: Rng = createRng(seed + ':audio');
  let ctx: AudioContext | undefined;
  let master: GainNode;
  let melodyOsc: OscillatorNode | undefined;
  let melodyGain: GainNode;
  let padGain: GainNode;
  let taFilter: BiquadFilterNode;
  let noiseBuffer: AudioBuffer;

  let started = false;
  let muted = false;
  let intensityTarget = 0.2;
  let intensity = intensityTarget;
  let melodyScale: readonly number[] = TIER_ONE_SCALE;
  let melodyVoice: 'triangle' | 'sine' | 'sawtooth' = 'triangle';
  let prevSemi = MELODY_OCTAVE_SEMI;
  let tick = 0;
  let nextTickTime = 0;
  let nextNoteTime = 0;

  // Everything sustained is created exactly once, here on first gesture.
  function build(): void {
    ctx = new window.AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : AUDIO_GAIN_CEILING;
    master.connect(ctx.destination);

    // Drone: two detuned triangles an octave below the root, through a lowpass.
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 320;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.16;
    droneFilter.connect(droneGain).connect(master);
    for (const detune of [-5, 5]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = AUDIO_ROOT_HZ / 2;
      osc.detune.value = detune;
      osc.connect(droneFilter);
      osc.start();
    }

    // Melody: one lead voice (triangle tier-1/2, sine = the Gardens' flute,
    // sawtooth = the Atrium's cold strings), portamento via linear frequency
    // ramps. build() reads melodyVoice so a pre-start setVoice lands on the
    // osc the moment it exists.
    melodyOsc = ctx.createOscillator();
    melodyOsc.type = melodyVoice;
    melodyOsc.frequency.value = midiToHz(MELODY_OCTAVE_SEMI);
    melodyGain = ctx.createGain();
    melodyGain.gain.value = 0;
    melodyOsc.connect(melodyGain).connect(master);
    melodyOsc.start();

    // Pad: two detuned saws through a slowly wobbling lowpass; gain tracks intensity.
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 500;
    padGain = ctx.createGain();
    padGain.gain.value = 0;
    padFilter.connect(padGain).connect(master);
    for (const detune of [-8, 8]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = AUDIO_ROOT_HZ;
      osc.detune.value = detune;
      osc.connect(padFilter);
      osc.start();
    }
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 220;
    lfo.connect(lfoDepth).connect(padFilter.frequency);
    lfo.start();

    // Percussion: shared bandpass for the "ta" noise burst; buffer built once.
    taFilter = ctx.createBiquadFilter();
    taFilter.type = 'bandpass';
    taFilter.frequency.value = 3200;
    taFilter.Q.value = 0.8;
    taFilter.connect(master);
    const noiseBytes = Math.floor(ctx.sampleRate * 0.3);
    noiseBuffer = ctx.createBuffer(1, noiseBytes, ctx.sampleRate);
    const noise = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBytes; i++) noise[i]! = rng.next() * 2 - 1;
  }

  function thump(t: number): void {
    // "dhin" — a sine dropping through the root, quick decay.
    const osc = ctx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(AUDIO_ROOT_HZ, t);
    osc.frequency.exponentialRampToValueAtTime(AUDIO_ROOT_HZ / 2, t + 0.12);
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  function slap(t: number, iv: number): void {
    // "ta" — filtered noise burst, louder as the house heats up.
    const src = ctx!.createBufferSource();
    src.buffer = noiseBuffer;
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.08 + 0.14 * iv, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(g).connect(taFilter);
    src.start(t);
    src.stop(t + 0.1);
  }

  function melodyNote(t: number, period: number, iv: number): void {
    // read the scale at note time — a setScale swap takes effect on the NEXT note
    prevSemi = nextMelodySemi(rng, melodyScale, prevSemi, iv, MELODY_OCTAVE_SEMI);
    melodyOsc!.frequency.linearRampToValueAtTime(midiToHz(prevSemi), t + 0.04);
    melodyGain.gain.setValueAtTime(Math.max(melodyGain.gain.value, 0.0001), t);
    melodyGain.gain.linearRampToValueAtTime(0.12 + 0.1 * iv, t + 0.02);
    melodyGain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.08, period * 0.9));
  }

  function schedule(): void {
    if (!ctx) return;
    intensity += (intensityTarget - intensity) * 0.12;
    padGain.gain.setTargetAtTime(0.02 + 0.12 * intensity, ctx.currentTime, 0.4);
    const horizon = ctx.currentTime + LOOKAHEAD_S;
    // Background tabs throttle setInterval to >=1s while ctx.currentTime keeps
    // running; without this clamp the loops below would schedule every missed
    // tick in the past and they would all fire at once on wake. Skip the missed
    // interval entirely — never schedule anything with a timestamp in the past.
    if (nextTickTime < ctx.currentTime) nextTickTime = ctx.currentTime + 0.05;
    if (nextNoteTime < ctx.currentTime) nextNoteTime = ctx.currentTime + 0.1;
    while (nextTickTime < horizon) {
      const accents = beatAccents(tick, intensity);
      if (accents.low) thump(nextTickTime);
      if (accents.high) slap(nextTickTime, intensity);
      tick++;
      nextTickTime += TICK_S;
    }
    while (nextNoteTime < horizon) {
      const period = NOTE_S_LO + (NOTE_S_HI - NOTE_S_LO) * intensity;
      melodyNote(nextNoteTime, period, intensity);
      nextNoteTime += period;
    }
  }

  return {
    start() {
      if (started) return;
      started = true;
      build();
      if (ctx!.state === 'suspended') void ctx!.resume().catch(() => {});
      nextTickTime = ctx!.currentTime + 0.1;
      nextNoteTime = nextTickTime;
      window.setInterval(schedule, SCHEDULE_MS);
    },
    setIntensity(x: number) {
      intensityTarget = Math.min(1, Math.max(0, x));
    },
    setMuted(m: boolean) {
      muted = m;
      if (ctx) master.gain.setTargetAtTime(m ? 0 : AUDIO_GAIN_CEILING, ctx.currentTime, 0.02);
    },
    setScale(scale: readonly number[]) {
      melodyScale = scale;
    },
    setVoice(kind: 'triangle' | 'sine' | 'sawtooth') {
      melodyVoice = kind;
      if (melodyOsc !== undefined) melodyOsc.type = kind;
    },
    get started() {
      return started;
    },
    get muted() {
      return muted;
    },
    get scale() {
      return melodyScale;
    },
    get voice() {
      return melodyVoice;
    },
  };
}
