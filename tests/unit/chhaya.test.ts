// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  CHHAYA_DELAY_MS,
  CHHAYA_PATH_MAX_SAMPLES,
  CHHAYA_PATH_WINDOW_MS,
} from '../../src/engine/constants';
import { createChhaya } from '../../src/game/avatar';
import { bracketSamples, recordPath, sampleDelayed, type PathSample } from '../../src/game/chhaya';

const sample = (x: number, y: number, t: number): PathSample => ({ x, y, t });

// A straight 10m-per-second walk; timestamps need not start at 0 — the floor
// clock starts when the run starts.
const walk: PathSample[] = [sample(0, 0, 1000), sample(10, 4, 2000), sample(20, 4, 3000)];

describe('chhaya constants', () => {
  it('pins the six-second-shadow timing knobs', () => {
    expect(CHHAYA_DELAY_MS).toBe(6000);
    expect(CHHAYA_PATH_WINDOW_MS).toBe(20_000);
    expect(CHHAYA_PATH_MAX_SAMPLES).toBe(1200);
  });
});

describe('recordPath', () => {
  it('appends a sample without mutating the input array', () => {
    const before: PathSample[] = [sample(1, 2, 100)];
    const after = recordPath(before, 3, 4, 200);
    expect(before).toEqual([sample(1, 2, 100)]);
    expect(after).toEqual([sample(1, 2, 100), sample(3, 4, 200)]);
  });

  it('trims the head beyond the 20s window, keeping the sample at the cutoff as bracket anchor', () => {
    let path: PathSample[] = [];
    for (const t of [0, 1000, 2000]) path = recordPath(path, t, 0, t);
    path = recordPath(path, 21_000, 0, 21_000);
    // cutoff = 21000 - 20000 = 1000: t=0 falls out of the window, t=1000 stays
    expect(path.map((s) => s.t)).toEqual([1000, 2000, 21_000]);
  });

  it('keeps the full path inside the window', () => {
    let path: PathSample[] = [];
    for (const t of [0, 1000, 2000]) path = recordPath(path, t, 0, t);
    expect(path.map((s) => s.t)).toEqual([0, 1000, 2000]);
  });

  it('caps the path at 1200 samples (the binding limit at the 120Hz fixed step)', () => {
    let path: PathSample[] = [];
    for (let t = 0; t <= CHHAYA_PATH_MAX_SAMPLES; t++) path = recordPath(path, t, 0, t);
    expect(path).toHaveLength(CHHAYA_PATH_MAX_SAMPLES);
    expect(path[0]!.t).toBe(1); // the oldest sample fell off the back
    expect(path[path.length - 1]!.t).toBe(CHHAYA_PATH_MAX_SAMPLES);
  });
});

describe('sampleDelayed', () => {
  it('null on an empty path', () => {
    expect(sampleDelayed([], 10_000)).toBeNull();
  });

  it('null until the first sample expires — six seconds of grace', () => {
    expect(sampleDelayed(walk, 1000 + CHHAYA_DELAY_MS - 1)).toBeNull(); // target just before the path
    expect(sampleDelayed(walk, 1000 + CHHAYA_DELAY_MS)).toEqual({ x: 0, y: 0 }); // first sample just expired
  });

  it('lands exactly on a sample when now - delay equals its timestamp', () => {
    expect(sampleDelayed(walk, 2000 + CHHAYA_DELAY_MS)).toEqual({ x: 10, y: 4 });
    expect(sampleDelayed(walk, 3000 + CHHAYA_DELAY_MS)).toEqual({ x: 20, y: 4 });
  });

  it('interpolates linearly between the bracketing samples', () => {
    expect(sampleDelayed(walk, 1500 + CHHAYA_DELAY_MS)).toEqual({ x: 5, y: 2 }); // halfway
    expect(sampleDelayed(walk, 1250 + CHHAYA_DELAY_MS)).toEqual({ x: 2.5, y: 1 }); // quarter way
  });

  it('follows after the path ends: she stands at the last recorded position', () => {
    expect(sampleDelayed(walk, 9999 + CHHAYA_DELAY_MS)).toEqual({ x: 20, y: 4 });
  });

  it('honours a custom delay', () => {
    expect(sampleDelayed(walk, 3000, 1000)).toEqual({ x: 10, y: 4 }); // target 2000 — exact
    expect(sampleDelayed(walk, 2500, 1000)).toEqual({ x: 5, y: 2 }); // target 1500 — mid
  });
});

describe('bracketSamples', () => {
  it('null when the path is empty or the target predates it', () => {
    expect(bracketSamples([], 0)).toBeNull();
    expect(bracketSamples(walk, 999)).toBeNull();
  });

  it('returns the straddling pair; past the end, the last pair — heading keeps the last movement direction', () => {
    expect(bracketSamples(walk, 1500)).toEqual({ a: walk[0], b: walk[1] });
    expect(bracketSamples(walk, 2500)).toEqual({ a: walk[1], b: walk[2] });
    expect(bracketSamples(walk, 5000)).toEqual({ a: walk[1], b: walk[2] });
  });
});

describe('createChhaya', () => {
  it('same four-piece silhouette as the avatar, every object on layer 0 (world + mirrors)', () => {
    const c = createChhaya();
    expect(c.children).toHaveLength(4); // body, head, arm, lantern — createAvatar parity
    const masks: number[] = [];
    c.traverse((o) => masks.push(o.layers.mask));
    expect(masks).toHaveLength(5); // the group itself + 4 meshes
    expect(masks.every((m) => m === 1)).toBe(true); // layer 0's mask is 1
  });

  it('wears the shadow palette: near-black coat, dim rose lantern glass', () => {
    const c = createChhaya();
    const body = c.children[0] as THREE.Mesh<THREE.CapsuleGeometry, THREE.MeshStandardMaterial>;
    const arm = c.children[2] as THREE.Mesh<THREE.CapsuleGeometry, THREE.MeshStandardMaterial>;
    const lantern = c.children[3] as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    expect(body.material.color.getHex()).toBe(0x14141c);
    expect(arm.material.color.getHex()).toBe(0x14141c);
    expect(lantern.material.color.getHex()).toBe(0x8a3a5c);
    expect(lantern.material.emissive.getHex()).toBe(0x8a3a5c);
  });
});
