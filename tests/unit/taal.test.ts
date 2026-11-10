// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { Dir, FloorGrid } from '../../src/engine/grid';
import { BEAT_TICK_MS } from '../../src/engine/constants';
import {
  beatGlow,
  beatPulse,
  initTaal,
  taalOutcome,
  taalTouch,
  TAAL_BASE_SPEED,
  TAAL_SENTINEL_FLOOR,
  TAAL_TOUCH_ANGER,
  TAAL_TOUCH_COOLDOWN_MS,
  updateTaal,
} from '../../src/game/taal';

// Same corridor as echo.test.ts: one straight open row across a 5×5 grid —
// row y=2 whose cell centers lie on world y=0 (x = −8..8). The whole
// beat-walk plays on this line.
const openGrid = (): FloorGrid => {
  const g = new FloorGrid(5, 5);
  for (let x = 0; x < 4; x++) g.setOpen(x, 2, Dir.East);
  return g;
};

describe('beatPulse — the 8-tick lurch cycle', () => {
  it('accents even ticks and rests odd ticks, pinned across one full cycle', () => {
    expect(beatPulse(0)).toBe(2.2); // tick 0 — the downbeat
    expect(beatPulse(249)).toBe(2.2); // last ms of tick 0
    expect(beatPulse(250)).toBe(0.3); // tick 1 begins — the rest
    expect(beatPulse(499)).toBe(0.3);
    expect(beatPulse(500)).toBe(2.2); // tick 2
    expect(beatPulse(750)).toBe(0.3); // tick 3
    expect(beatPulse(1000)).toBe(2.2); // tick 4 — theory.beatAccents' other low accent
    expect(beatPulse(1250)).toBe(0.3); // tick 5
    expect(beatPulse(1500)).toBe(2.2); // tick 6
    expect(beatPulse(1750)).toBe(0.3); // tick 7 — the long dark before the wrap
  });

  it('wraps at the 2s cycle boundary: tick 8 is tick 0 again', () => {
    expect(beatPulse(2000)).toBe(2.2); // tick 8 ≡ 0
    expect(beatPulse(2000 + BEAT_TICK_MS)).toBe(0.3); // tick 9 ≡ 1
    expect(beatPulse(2250)).toBe(0.3);
    expect(beatPulse(4000)).toBe(2.2); // two full cycles later
    expect(beatPulse(6000 + 250)).toBe(0.3); // three cycles + one tick
  });

  it('is wall-clock phase — it works with the audio engine muted or unborn', () => {
    // the pulse is a pure function of now: no engine state feeds it
    for (let tick = 0; tick < 16; tick++) {
      const pulse = beatPulse(tick * BEAT_TICK_MS);
      expect(pulse).toBe(tick % 2 === 0 ? 2.2 : 0.3); // parity survives two cycles
    }
  });
});

// M5/T1 — reduced-flash: the lantern's GLOW (luminance) may not strobe with the
// beat, but the beat-walk itself (stride speed) is untouched. beatGlow is the
// emissive the frame loop feeds TaalFigure.setBeat.
describe('beatGlow — the lantern emissive under reduced-flash (M5/T1)', () => {
  it('with reducedFlash the glow is one constant value — no luminance pulse at any now', () => {
    const seen = new Set<number>();
    for (const now of [0, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 123_456]) {
      const glow = beatGlow(now, true);
      seen.add(glow);
      expect(glow).toBe(beatGlow(0, true)); // constant across the whole cycle
    }
    expect(seen.size).toBe(1);
  });

  it('without reducedFlash the glow is the beat pulse (the default experience is unchanged)', () => {
    expect(beatGlow(0, false)).toBe(beatPulse(0)); // 2.2 — the accent
    expect(beatGlow(250, false)).toBe(beatPulse(250)); // 0.3 — the rest
  });

  it('the static value sits between rest and accent — a glow, not a strobe', () => {
    expect(beatGlow(0, true)).toBeGreaterThanOrEqual(0.3);
    expect(beatGlow(0, true)).toBeLessThanOrEqual(2.2);
    expect(beatGlow(0, true)).toBeGreaterThan(0); // visible — the lantern never dies
  });
});

describe('initTaal', () => {
  // T3/T4 — the far-anchor spawn (the initGher precedent): anchors are plain
  // cell centers from a pool that includes the spawn area, so the OLD
  // anchors[0] spawn could sit ON the player — a caught-fail before the
  // first input ever lands.
  it('spawns at the anchor FARTHEST from the player start, walking, touch ready', () => {
    const anchors = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const t = initTaal(anchors, { x: 0, y: 0 });
    expect(t).toMatchObject({
      x: 10,
      y: 0,
      anchorIdx: 1,
      active: true,
      heading: 0,
      touchCooldownUntil: 0,
    });
  });

  it('a distance tie breaks to the earlier anchor (deterministic)', () => {
    const anchors = [
      { x: -8, y: 0 },
      { x: 8, y: 0 },
    ];
    const t = initTaal(anchors, { x: 0, y: 0 });
    expect(t).toMatchObject({ x: -8, y: 0, anchorIdx: 0 });
  });

  it('returns null with no anchors — no loop, no cameo', () => {
    expect(initTaal([], { x: 0, y: 0 })).toBeNull();
  });
});

describe('updateTaal — the beat-walk', () => {
  it('even tick: lurches toward the anchor at base speed × accent (pinned)', () => {
    const g = openGrid();
    const anchors = [
      { x: -8, y: 0 },
      { x: 8, y: 0 },
    ];
    // he starts ON anchors[0]: arrival rotates the loop to anchors[1] at +8,
    // so the first step walks east along the corridor
    let t = initTaal(anchors, { x: 0, y: 0 })!;
    t = updateTaal(t, anchors, g, 0, 1 / 120); // tick 0, pulse 2.2
    expect(t.anchorIdx).toBe(1);
    expect(t.x).toBeCloseTo(-8 + (TAAL_BASE_SPEED * 2.2) / 120);
    expect(t.y).toBeCloseTo(0);
    expect(t.heading).toBeCloseTo(Math.PI / 2); // east; heading 0 = north = −y
  });

  it('odd tick: near-frozen — crawls at base speed × rest (pinned)', () => {
    const g = openGrid();
    const anchors = [
      { x: -8, y: 0 },
      { x: 8, y: 0 },
    ];
    const t = updateTaal(initTaal(anchors, { x: 0, y: 0 })!, anchors, g, 250, 1 / 120); // tick 1, pulse 0.3
    expect(t.x).toBeCloseTo(-8 + (TAAL_BASE_SPEED * 0.3) / 120); // ~6mm: a swaying stop
    expect(t.x - -8).toBeLessThan(0.005);
  });

  it('seeded corridor walk: monotone per leg, the loop closes, the beat wrap survives', () => {
    const g = openGrid();
    const anchors = [
      { x: -8, y: 0 },
      { x: 8, y: 0 },
    ];
    let t = initTaal(anchors, { x: 0, y: 0 })!;
    let prevX = t.x;
    let prevIdx = t.anchorIdx;
    let hitFarEnd = false; // arrival at +8 rotated the patrol home…
    let loopClosed = false; // …and arrival back at −8 set out east again
    // 20s of fixed steps (2400 × 1/120) spans ten beat cycles incl. wraps —
    // the 16 m crossing at ~2 m/s average takes ~8s, so the loop must close
    for (let i = 0; i < 2400; i++) {
      const now = i * (1000 / 120);
      t = updateTaal(t, anchors, g, now, 1 / 120);
      expect(Number.isFinite(t.x)).toBe(true);
      expect(Number.isFinite(t.y)).toBe(true);
      if (t.anchorIdx === 1) {
        // east leg (bound for +8): never backward — odd ticks still creep forward
        expect(t.x).toBeGreaterThanOrEqual(prevX - 1e-9);
        if (prevIdx === 0 && i > 0) loopClosed = true;
      } else {
        // west leg (bound for −8): never forward
        expect(t.x).toBeLessThanOrEqual(prevX + 1e-9);
        if (prevIdx === 1) hitFarEnd = true;
      }
      prevX = t.x;
      prevIdx = t.anchorIdx;
    }
    expect(hitFarEnd).toBe(true);
    expect(loopClosed).toBe(true);
    expect(t.anchorIdx).toBe(1); // mid third leg, east again — 20s ≈ two crossings + a bit
    expect(t.x).toBeGreaterThan(-8);
    expect(t.x).toBeLessThan(8);
  });

  it('holds still once retired (active false)', () => {
    const g = openGrid();
    const anchors = [{ x: 8, y: 0 }];
    const t0 = { ...initTaal(anchors, { x: 0, y: 0 })!, active: false };
    const t = updateTaal(t0, anchors, g, 0, 0.5);
    expect(t).toMatchObject({ x: 8, y: 0 });
    expect(t).toBe(t0); // retired is a no-op, reference and all
  });

  it('never mutates its input state', () => {
    const g = openGrid();
    const anchors = [
      { x: -8, y: 0 },
      { x: 8, y: 0 },
    ];
    const t0 = initTaal(anchors, { x: 0, y: 0 })!;
    const before = { ...t0 };
    updateTaal(t0, anchors, g, 0, 1 / 120);
    expect(t0).toEqual(before);
  });
});

describe('taalTouch — the 1.5s anger cooldown gate', () => {
  it('opens only once the cooldown has elapsed (boundary-inclusive)', () => {
    expect(taalTouch(1500, 1499)).toBe(false);
    expect(taalTouch(1500, 1500)).toBe(true);
    expect(taalTouch(1500, 9999)).toBe(true);
  });

  it('a freshly spawned Taal can touch at once', () => {
    expect(taalTouch(0, 0)).toBe(true);
  });

  it('pins the cameo contract: +20 anger per touch, 1.5s between touches, no death', () => {
    expect(TAAL_TOUCH_ANGER).toBe(20);
    expect(TAAL_TOUCH_COOLDOWN_MS).toBe(1500);
    expect(TAAL_BASE_SPEED).toBe(1.6);
  });
});

// T2 — the promotion: floor 5's teaser becomes the Hall of Ancestors' killer.
// taalOutcome is the ONE place the floor decides which contact path main.ts
// walks: 'anger' (the cameo touch, house +20) or 'caught' (the standard fail).
describe('taalOutcome — cameo anger vs sentinel catch (T2)', () => {
  it('pins the promotion floor at 11, the first Hall of Ancestors floor', () => {
    expect(TAAL_SENTINEL_FLOOR).toBe(11);
  });

  it('every tier-1 floor keeps the cameo contract: anger, never caught', () => {
    for (let f = 1; f <= 10; f++) expect(taalOutcome(f)).toBe('anger');
  });

  it('the boundary: floor 10 angers, floor 11 catches', () => {
    expect(taalOutcome(10)).toBe('anger');
    expect(taalOutcome(11)).toBe('caught');
  });

  it('every tier-2 floor 11..20 catches, Dwaar II included', () => {
    for (let f = TAAL_SENTINEL_FLOOR; f <= 20; f++) expect(taalOutcome(f)).toBe('caught');
  });
});
