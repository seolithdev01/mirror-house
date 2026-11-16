// SPDX-License-Identifier: Apache-2.0
//
// The MOTION PANE (T11/T2) — the robotic mirror: a compact canvas pane that
// mirrors the player's CURRENT motion live — a schematic back-view humanoid
// striding through its walk cycle, leaning into sprints, tilting with
// strafes, raising the frost arm while a cast is fresh, ringed by a heading
// compass — with a motion-state label under the figure.
//
// Browser-only: `createMotionPane` touches the canvas API, so it is never
// imported by the node unit suite; the pure pieces — `walkPhase` (distance →
// cycle phase) and `poseFor` (snapshot → pose + label) — are the exports the
// node suite pins.
//
// The cycle is DISTANCE-DRIVEN, not time-driven: walkPhase advances only
// while you actually move (main accumulates the hypot of every fixed-step
// move), so the figure never moonwalks in place and freezes mid-pose when
// you stop. The label stays ENGLISH by design — 'SPRINT'/'WALK'/… is the
// pane's display-font stencil, the PoD keys bar's kbd-stamp convention, not
// prose; the dock chip that toggles this pane is fully i18n'd (pane.motion).
import { MOTION_H, MOTION_W, SPRINT_SPEED, WALK_CYCLE_LEN, WALK_SPEED } from '../engine/constants';

export type MotionLabel = 'FROST' | 'STEP' | 'SPRINT' | 'WALK' | 'STILL';

export interface MotionSnapshot {
  /** forward/strafe were non-zero this fixed step (the engine's "stepping"). */
  moving: boolean;
  /** strafe share, −1..1 — drives the lateral tilt. */
  mx: number;
  /** forward share, −1..1 — the stride's direction feel. */
  my: number;
  sprint: boolean;
  /** the frost verb landed within MOTION_FROST_POSE_MS (main owns the clock). */
  frost: boolean;
  /** a step-through teleport landed within MOTION_STEP_POSE_MS. */
  step: boolean;
  /** the engine's heading in degrees — 0 = north, clockwise-positive. */
  headingDeg: number;
  /** meters moved, accumulated across the run — the cycle's driver. */
  walkPhaseM: number;
}

/** Pose constants (the schematic's angles). The plan pins MOTION_W/H and
 *  WALK_CYCLE_LEN in constants.ts; these two live with the draw that owns
 *  them. MOTION_MAX_LEAN is exported because poseFor's lean math is
 *  unit-pinned as a ratio of it. */
export const MOTION_MAX_LEAN = 0.3; // rad — the full-sprint forward lean
const STRIDE_MAX = 0.55; // rad — leg swing amplitude at full stride
const ARM_SWING = 0.4; // rad — arm counter-swing at full stride
const TILT_MAX = 0.22; // rad — lateral tilt at a full strafe

/** Distance → walk-cycle phase in [0, 1): one cycle per WALK_CYCLE_LEN
 *  meters. Always wraps positive — a negative input (never happens; distance
 *  only grows, but the pure fn promises the domain anyway) lands back in
 *  [0, 1) instead of breaking the stride sine. Pure — the node suite pins
 *  the period and the membership. */
export function walkPhase(distanceMovedM: number): number {
  const cycles = distanceMovedM / WALK_CYCLE_LEN;
  return cycles - Math.floor(cycles);
}

export interface MotionPose {
  /** rad — forward lean, ∝ speed: walk takes the walk-speed share of the
   *  max, sprint the whole max, still is 0. */
  lean: number;
  /** 0..1 — the leg/arm cycle amplitude; 0 holds the pose (still, or the
   *  step-through's flash-forward hold). */
  stride: number;
  /** 0..1 — the frost arm's raise. */
  armFrost: number;
  label: MotionLabel;
}

/** The label half of poseFor — precedence FROST > STEP > SPRINT > WALK >
 *  STILL. SPRINT needs movement: the sprint key alone moves nothing. */
function labelFor(s: MotionSnapshot): MotionLabel {
  if (s.frost) return 'FROST';
  if (s.step) return 'STEP';
  if (!s.moving) return 'STILL';
  return s.sprint ? 'SPRINT' : 'WALK';
}

/** The pose for a motion snapshot. Label and limbs are orthogonal on
 *  purpose: frost is an ARM state (the legs keep striding through a cast),
 *  and a STEP hold is a POSE state (the cycle freezes, stride 0). Pure. */
export function poseFor(s: MotionSnapshot): MotionPose {
  const speed = s.sprint ? SPRINT_SPEED : WALK_SPEED;
  return {
    lean: s.moving ? (speed / SPRINT_SPEED) * MOTION_MAX_LEAN : 0,
    stride: s.moving && !s.step ? 1 : 0,
    armFrost: s.frost ? 1 : 0,
    label: labelFor(s),
  };
}

// The pane's palette — the PoD plate family the minimap uses, plus a state
// hue per label (gold the default, teal frost, rose sprint).
const COLOR = {
  plate: '#10131f',
  ring: 'rgba(58, 74, 102, 0.55)', // the compass ring's steel
  tickDim: 'rgba(148, 158, 176, 0.55)',
  tickNorth: '#d9a441',
  letterDim: 'rgba(148, 158, 176, 0.7)',
  figure: '#cfd8e6', // the robot's steel-light shell
  figureStep: '#eef3f8', // the flash-forward outline's bright pass
  frostGlow: 'rgba(46, 196, 182, 0.55)', // the lantern's teal bloom
  label: {
    FROST: '#2ec4b6',
    STEP: '#d9a441',
    SPRINT: '#e05252',
    WALK: '#d9a441',
    STILL: 'rgba(148, 158, 176, 0.6)',
  } as Record<MotionLabel, string>,
} as const;

const FONT_DISPLAY = '"Big Shoulders Display", "Arial Narrow", sans-serif';

export function createMotionPane(canvas: HTMLCanvasElement): {
  draw(s: MotionSnapshot): void;
  setVisible(visible: boolean): void;
  /** The last drawn pose's label (init STILL) — the DEV hook's motionLabel()
   *  witness, so the e2e can read the canvas stencil (the label is drawn with
   *  fillText on the pane, not a DOM node). Additive, T11/T3. */
  label(): MotionLabel;
} {
  const ctx = canvas.getContext('2d')!;
  let lastLabel: MotionLabel = 'STILL';

  /** One robotic limb: a round-capped stroke from the joint, angle 0 hanging
   *  straight down, rotating about the joint, its own stroke width. */
  function limb(jx: number, jy: number, len: number, angle: number, width: number): [number, number] {
    ctx.save();
    ctx.translate(jx, jy);
    ctx.rotate(angle);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, len);
    ctx.stroke();
    ctx.restore();
    // the limb's end (hand/foot) in pane space — the frost lantern rides it
    return [jx + Math.sin(angle) * len, jy + Math.cos(angle) * len];
  }

  function draw(s: MotionSnapshot): void {
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.max(1, Math.round(MOTION_W * dpr));
    const bh = Math.max(1, Math.round(MOTION_H * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pose = poseFor(s);
    lastLabel = pose.label; // the DEV hook's label witness rides every draw
    const reduced = document.body.classList.contains('mh-reduced-flash');
    // Reduced-flash: NO cycling — the pose freezes at a fixed mid-stride
    // (phase 0.25) whatever the distance, so the pane never animates; the
    // label alone carries the state. A step hold freezes at 0.25 too — the
    // flash-forward's static split stance.
    const phase = reduced || s.step ? 0.25 : walkPhase(s.walkPhaseM);

    // The bezel behind the figure.
    ctx.fillStyle = COLOR.plate;
    ctx.fillRect(0, 0, MOTION_W, MOTION_H);

    // THE HEADING COMPASS RING — ticks + N/E/S/W letters rotating with
    // −headingDeg (heading 0 = north at the top; turn east, the cardinals
    // walk west around the ring).
    const cx = MOTION_W / 2;
    const cy = 78;
    const R = 52;
    const headingRad = (s.headingDeg * Math.PI) / 180;
    ctx.strokeStyle = COLOR.ring;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `800 8px ${FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const CARDINALS = ['N', 'E', 'S', 'W'] as const;
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 - headingRad; // clockwise from north
      const sx = Math.sin(a);
      const sy = -Math.cos(a);
      const north = k === 0;
      ctx.strokeStyle = north ? COLOR.tickNorth : COLOR.tickDim;
      ctx.lineWidth = north ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + sx * (R - 6), cy + sy * (R - 6));
      ctx.lineTo(cx + sx * (R + 1), cy + sy * (R + 1));
      ctx.stroke();
      ctx.fillStyle = north ? COLOR.tickNorth : COLOR.letterDim;
      ctx.fillText(CARDINALS[k]!, cx + sx * (R - 14), cy + sy * (R - 14));
    }

    // THE FIGURE — a back-view schematic robot. Lateral tilt rotates the
    // whole body about the hips (∝ strafe); the forward lean foreshortens
    // the torso+head column (∝ speed) — tipping "away" down the screen.
    const tilt = s.mx * TILT_MAX;
    const hipY = cy + 20;
    const torsoLen = 30;
    const torsoDraw = torsoLen * Math.cos(pose.lean * 1.8); // the lean's pitch
    const legLen = 26;
    const swing = pose.stride * STRIDE_MAX * Math.sin(phase * Math.PI * 2);

    ctx.save();
    ctx.translate(cx, hipY);
    ctx.rotate(tilt);
    ctx.strokeStyle = COLOR.figure;
    ctx.lineCap = 'round';

    // the legs — stride swings them about the hips, opposite phases
    limb(-4, 0, legLen, swing, 5); // left leg
    limb(4, 0, legLen, -swing, 5); // right leg

    // the torso capsule — hip to the (lean-pitched) shoulder line
    const shoulderY = -torsoDraw;
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, shoulderY);
    ctx.stroke();

    // the arms — counter-swing to the legs, hang from the shoulder line
    const armLen = 20;
    limb(-9, shoulderY + 3, armLen, -swing * ARM_SWING * 2.2, 4); // left arm
    let rx = 9;
    let ry = shoulderY + 3 + armLen;
    if (pose.armFrost > 0) {
      // THE FROST ARM — raised beside the head, lantern lit: a static teal
      // bloom at the hand (no pulse — the glow holds while the pose holds).
      [rx, ry] = limb(9, shoulderY + 3, armLen, -2.35, 4);
      const grad = ctx.createRadialGradient(rx, ry, 1, rx, ry, 16);
      grad.addColorStop(0, COLOR.frostGlow);
      grad.addColorStop(1, 'rgba(46, 196, 182, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(rx, ry, 16, 0, Math.PI * 2);
      ctx.fill();
    } else {
      limb(9, shoulderY + 3, armLen, swing * ARM_SWING * 2.2, 4);
    }

    // the head — a circle above the shoulders, dropped by the lean's pitch
    ctx.fillStyle = COLOR.figure;
    ctx.beginPath();
    ctx.arc(0, shoulderY - 8 * Math.cos(pose.lean * 1.8), 7, 0, Math.PI * 2);
    ctx.fill();

    // THE STEP-THROUGH — the whole figure holds a flash-forward pose: a
    // bright double outline, drawn once, static (phase already pinned 0.25).
    if (s.step) {
      ctx.strokeStyle = COLOR.figureStep;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, shoulderY - 8, 9.5, 0, Math.PI * 2);
      ctx.moveTo(-13, 4);
      ctx.lineTo(0, -torsoDraw - 4);
      ctx.lineTo(13, 4);
      ctx.stroke();
    }
    ctx.restore();

    // THE LABEL — the state stencil under the ring, display font, en (the
    // kbd-stamp convention; the toggling chip carries the i18n'd name).
    ctx.font = `800 11px ${FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COLOR.label[pose.label];
    ctx.fillText(pose.label, cx, MOTION_H - 12);
  }

  function setVisible(visible: boolean): void {
    canvas.style.display = visible ? 'block' : 'none';
  }

  function label(): MotionLabel {
    return lastLabel;
  }

  return { draw, setVisible, label };
}
