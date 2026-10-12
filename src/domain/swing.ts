/**
 * Golfer + club swing model (blueprint §9.4 "Level 1 estimator").
 *
 * ESTIMATE ONLY — a kinematic one-plane swing driven by body proportions, not motion capture.
 * Every check built on it is labelled `modeled_estimate` and the UI tells the user to verify
 * clearances with slow practice swings.
 *
 * Local frame (right-handed golfer): origin = ball on the hitting surface, +Y up,
 * the golfer stands on −X and faces +X, the target is −Z (toward the screen).
 * Left-handed golfers are the mirror image in X (see `toWorld`).
 */
import type { Vec3 } from './layout';
import { inToM } from './units';

export type ClubId = 'driver' | 'iron7' | 'wedge';
export const CLUB_ORDER: ClubId[] = ['driver', 'iron7', 'wedge'];

type ClubModel = {
  /** Standard men's lengths (USGA measurement convention). */
  lengthM: number;
  spineDeg: number;
  armForwardDeg: number;
  stanceRatio: number;
  /** Ball forward of stance centre, × height (driver off the lead heel). */
  ballForwardRatio: number;
  topDeg: number;
  topHingeDeg: number;
  finishDeg: number;
  finishHingeDeg: number;
  head: { w: number; h: number; d: number };
};

export const CLUBS: Record<ClubId, ClubModel> = {
  driver: {
    lengthM: inToM(45.5), spineDeg: 34, armForwardDeg: 22, stanceRatio: 0.3, ballForwardRatio: 0.07,
    topDeg: -150, topHingeDeg: 78, finishDeg: 172, finishHingeDeg: 95, head: { w: 0.115, h: 0.06, d: 0.11 },
  },
  iron7: {
    lengthM: inToM(37), spineDeg: 39, armForwardDeg: 18, stanceRatio: 0.24, ballForwardRatio: 0.015,
    topDeg: -140, topHingeDeg: 85, finishDeg: 160, finishHingeDeg: 95, head: { w: 0.075, h: 0.045, d: 0.02 },
  },
  wedge: {
    lengthM: inToM(35.25), spineDeg: 42, armForwardDeg: 16, stanceRatio: 0.19, ballForwardRatio: 0,
    topDeg: -122, topHingeDeg: 88, finishDeg: 140, finishHingeDeg: 90, head: { w: 0.075, h: 0.05, d: 0.02 },
  },
};

/** Segment lengths as fractions of stature (Drillis & Contini anthropometry). */
export function bodyOf(h: number) {
  return {
    h,
    ankleY: 0.039 * h,
    hipY: 0.53 * h,
    spine: 0.288 * h,
    neck: 0.052 * h,
    headR: 0.062 * h,
    shoulderHalf: 0.112 * h,
    hipHalf: 0.058 * h,
    upperArm: 0.186 * h,
    forearm: 0.146 * h,
    hand: 0.045 * h,
    thigh: 0.245 * h,
    shank: 0.246 * h,
    footLen: 0.152 * h,
  };
}

export type SwingPose = {
  pelvis: Vec3; chest: Vec3; neck: Vec3; head: Vec3;
  leadShoulder: Vec3; trailShoulder: Vec3; leadElbow: Vec3; trailElbow: Vec3; leadHand: Vec3; trailHand: Vec3;
  leadHip: Vec3; trailHip: Vec3; leadKnee: Vec3; trailKnee: Vec3; leadAnkle: Vec3; trailAnkle: Vec3; leadToe: Vec3; trailToe: Vec3;
  gripEnd: Vec3; clubHead: Vec3; shaftDir: Vec3; faceDir: Vec3;
  /** Shoulder turn (rad, + = toward target) — used to orient the chest. */
  shoulderTurn: number; hipTurn: number; spineAxis: Vec3;
};

// timeline (normalised 0..1)
export const T_TAKEAWAY = 0.1;
export const T_TOP = 0.52;
export const T_IMPACT = 0.66;
export const T_FINISH = 0.84;

// ---------------------------------------------------------------- tiny vector helpers
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3): Vec3 => mul(a, 1 / (len(a) || 1));
const rad = (d: number) => (d * Math.PI) / 180;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};
const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);

function rotate(v: Vec3, axis: Vec3, ang: number): Vec3 {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return add(add(mul(v, c), mul(cross(axis, v), s)), mul(axis, dot(axis, v) * (1 - c)));
}

/** Two-bone IK: returns the middle joint. Out-of-reach targets straighten the limb. */
function ik(root: Vec3, target: Vec3, l1: number, l2: number, pole: Vec3): Vec3 {
  const d = sub(target, root);
  const dist = Math.min(len(d), l1 + l2 - 1e-6);
  const dir = norm(d);
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const hgt = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const p = norm(sub(pole, mul(dir, dot(pole, dir))));
  return add(add(root, mul(dir, a)), mul(p, hgt));
}

// ---------------------------------------------------------------- address set-up (per height × club)

type Setup = {
  B: ReturnType<typeof bodyOf>;
  club: ClubModel;
  C: Vec3; // swing centre = shoulder centre at address
  hipCentre: Vec3;
  spineAxis: Vec3;
  e1: Vec3; // in-plane unit vector from C toward the ball
  e2: Vec3; // in-plane unit vector toward the target
  reach: number; // C → hands
  shaft: number; // hands → clubhead centre
  alphaImpact: number;
  delta: number; // shaft angle − arm angle at impact
  ankles: { lead: Vec3; trail: Vec3 };
};

const setupCache = new Map<string, Setup>();

function setupOf(heightM: number, clubId: ClubId): Setup {
  const key = `${heightM.toFixed(3)}|${clubId}`;
  const hit = setupCache.get(key);
  if (hit) return hit;
  const B = bodyOf(heightM);
  const club = CLUBS[clubId];
  const tau = rad(club.spineDeg);
  const beta = rad(club.armForwardDeg);
  const reach = (B.upperArm + B.forearm + B.hand * 0.5) * 0.95;
  const shaft = club.lengthM - 0.1;
  const hipY = B.hipY - 0.03 * B.h; // knee flex
  const cy = hipY + B.spine * Math.cos(tau);
  const handsY = cy - reach * Math.cos(beta);
  const handsX = -Math.sqrt(Math.max(0.05, shaft * shaft - handsY * handsY));
  const cx = handsX - reach * Math.sin(beta);
  const stance = club.stanceRatio * B.h;
  const stanceZ = club.ballForwardRatio * B.h; // stance centre sits behind the ball (+Z = away from target)
  const C: Vec3 = [cx, cy, stanceZ * 0.5];
  const hipCentre: Vec3 = [cx - B.spine * Math.sin(tau), hipY, stanceZ * 0.6];
  const ankleX = cx - 0.06 * B.h;
  const ankles = { lead: [ankleX, B.ankleY, stanceZ - stance / 2] as Vec3, trail: [ankleX, B.ankleY, stanceZ + stance / 2] as Vec3 };

  const ball: Vec3 = [0, 0.02, 0];
  const toBall = sub(ball, C);
  const R0 = len(toBall);
  const e1 = norm(toBall);
  const target: Vec3 = [0, 0, -1];
  const e2 = norm(sub(target, mul(e1, dot(target, e1))));
  // impact triangle C–hands–ball: |hands| = reach, |ball − hands| = shaft
  const cosA = (reach * reach + R0 * R0 - shaft * shaft) / (2 * reach * R0);
  const alphaImpact = Math.acos(Math.min(1, Math.max(-1, cosA)));
  const hands: [number, number] = [reach * Math.cos(alphaImpact), reach * Math.sin(alphaImpact)];
  const psi = Math.atan2(0 - hands[1], R0 - hands[0]);
  const s: Setup = {
    B, club, C, hipCentre, spineAxis: norm(sub(C, hipCentre)), e1, e2, reach, shaft,
    alphaImpact, delta: psi - alphaImpact, ankles,
  };
  setupCache.set(key, s);
  return s;
}

/** Arm angle α and wrist hinge γ (rad) along the swing timeline. */
function phaseAngles(s: Setup, t: number): { alpha: number; hinge: number } {
  const ai = s.alphaImpact;
  const top = rad(s.club.topDeg);
  const fin = rad(s.club.finishDeg);
  if (t <= T_TAKEAWAY) return { alpha: ai, hinge: 0 };
  if (t <= T_TOP) {
    const u = easeInOut((t - T_TAKEAWAY) / (T_TOP - T_TAKEAWAY));
    return { alpha: ai + (top - ai) * u, hinge: -rad(s.club.topHingeDeg) * smooth(0.12, 0.85, u) };
  }
  if (t <= T_IMPACT) {
    const u = (t - T_TOP) / (T_IMPACT - T_TOP);
    const e = u ** 1.7;
    return { alpha: top + (ai - top) * e, hinge: -rad(s.club.topHingeDeg) * (1 - smooth(0.45, 1, u)) };
  }
  if (t <= T_FINISH) {
    const u = 1 - (1 - (t - T_IMPACT) / (T_FINISH - T_IMPACT)) ** 2;
    return { alpha: ai + (fin - ai) * u, hinge: rad(s.club.finishHingeDeg) * smooth(0.4, 1, u) };
  }
  return { alpha: fin, hinge: rad(s.club.finishHingeDeg) };
}

const inPlane = (s: Setup, r: number, ang: number): Vec3 =>
  add(s.C, add(mul(s.e1, r * Math.cos(ang)), mul(s.e2, r * Math.sin(ang))));

/** Club-only kinematics (cheap; used for the arc and clearance checks). */
export function clubAt(heightM: number, clubId: ClubId, t: number): { hands: Vec3; head: Vec3; gripEnd: Vec3; shaftDir: Vec3 } {
  const s = setupOf(heightM, clubId);
  const { alpha, hinge } = phaseAngles(s, t);
  const hands = inPlane(s, s.reach, alpha);
  const psi = alpha + s.delta + hinge;
  const shaftDir = norm(add(mul(s.e1, Math.cos(psi)), mul(s.e2, Math.sin(psi))));
  return { hands, head: add(hands, mul(shaftDir, s.shaft)), gripEnd: sub(hands, mul(shaftDir, 0.1)), shaftDir };
}

export function swingPose(heightM: number, clubId: ClubId, t: number): SwingPose {
  const s = setupOf(heightM, clubId);
  const B = s.B;
  const { alpha } = phaseAngles(s, t);
  const club = clubAt(heightM, clubId, t);

  const rel = alpha - s.alphaImpact;
  const impactOpen = rad(18) * smooth(T_TOP, T_IMPACT, t) * (1 - smooth(T_IMPACT, T_FINISH, t) * 0.2);
  const shoulderTurn = Math.max(rad(-95), Math.min(rad(100), 0.6 * rel)) + (t > T_TOP ? impactOpen * (rel < 0 ? 1 : 0.4) : 0);
  const hipTurn = Math.max(rad(-45), Math.min(rad(80), 0.5 * shoulderTurn + (t > T_TOP ? rad(25) * smooth(T_TOP, T_FINISH, t) : 0)));

  const up: Vec3 = [0, 1, 0];
  const pelvis = s.hipCentre;
  const hipOff: Vec3 = [0, 0, -B.hipHalf];
  const leadHip = add(pelvis, rotate(hipOff, up, hipTurn));
  const trailHip = add(pelvis, rotate(mul(hipOff, -1), up, hipTurn));

  // chest: spine tilts slightly toward the trail side at the top, posture held
  const axis = s.spineAxis;
  const C = s.C;
  const shOff: Vec3 = [0, 0, -B.shoulderHalf];
  const leadShoulder = add(C, rotate(shOff, axis, shoulderTurn));
  const trailShoulder = add(C, rotate(mul(shOff, -1), axis, shoulderTurn));
  const neck = add(C, mul(axis, B.neck * 0.6));
  const lookUp = smooth(T_IMPACT + 0.02, T_FINISH, t);
  const headDir = norm(add(mul(axis, 1), mul([0.55 - 0.45 * lookUp, 0, -0.35 * lookUp], 1)));
  const head = add(neck, mul(headDir, B.neck * 0.4 + B.headR));

  const leadHand = sub(club.hands, mul(club.shaftDir, 0.035));
  const trailHand = add(club.hands, mul(club.shaftDir, 0.045));
  const armL1 = B.upperArm;
  const armL2 = B.forearm + B.hand * 0.5;
  const poleLead: Vec3 = norm(add(mul(axis, -1), [0, 0, -0.3]));
  const poleTrail: Vec3 = norm(add(mul(axis, -1), [-0.4, 0, 0.6]));
  const leadElbow = ik(leadShoulder, leadHand, armL1, armL2, poleLead);
  const trailElbow = ik(trailShoulder, trailHand, armL1, armL2, poleTrail);

  // legs: ankles planted; trail heel releases in the finish
  const release = smooth(T_IMPACT, T_FINISH, t);
  const leadAnkle = s.ankles.lead;
  const trailAnkle: Vec3 = add(s.ankles.trail, [0.04 * release * B.h, 0.035 * release * B.h, -0.06 * release * B.h]);
  const kneePole: Vec3 = [1, 0, 0];
  const leadKnee = ik(leadHip, leadAnkle, B.thigh, B.shank, rotate(kneePole, up, hipTurn * 0.3 - 0.15));
  const trailKnee = ik(trailHip, trailAnkle, B.thigh, B.shank, rotate(kneePole, up, hipTurn * 0.6 + 0.15));
  const toe = (a: Vec3, flare: number, lift = 0): Vec3 => add(a, [B.footLen * 0.72 * Math.cos(flare), -a[1] + 0.012 + lift, B.footLen * 0.72 * Math.sin(flare)]);

  return {
    pelvis, chest: add(C, mul(axis, -B.spine * 0.32)), neck, head,
    leadShoulder, trailShoulder, leadElbow, trailElbow, leadHand, trailHand,
    leadHip, trailHip, leadKnee, trailKnee, leadAnkle, trailAnkle,
    leadToe: toe(leadAnkle, -0.35), trailToe: toe(trailAnkle, 0.25 + release * 0.6, 0),
    gripEnd: club.gripEnd, clubHead: club.head, shaftDir: club.shaftDir,
    faceDir: norm(cross(club.shaftDir, s.e2)),
    shoulderTurn, hipTurn, spineAxis: axis,
  };
}

// ---------------------------------------------------------------- world mapping + envelope

export type GolferFrame = { origin: Vec3; handed: 'right' | 'left' };

export function toWorld(p: Vec3, f: GolferFrame): Vec3 {
  const m = f.handed === 'right' ? 1 : -1;
  return [f.origin[0] + m * p[0], f.origin[1] + p[1], f.origin[2] + p[2]];
}

export type SwingSample = { t: number; head: Vec3; hands: Vec3; gripEnd: Vec3; headR: number };

/** World-space samples of the club over the full motion (takeaway → finish). */
export function swingSamples(heightM: number, clubId: ClubId, f: GolferFrame, n = 160): SwingSample[] {
  const out: SwingSample[] = [];
  const headR = Math.max(CLUBS[clubId].head.w, CLUBS[clubId].head.d) / 2;
  for (let i = 0; i <= n; i++) {
    const t = T_TAKEAWAY + ((T_FINISH - T_TAKEAWAY) * i) / n;
    const c = clubAt(heightM, clubId, t);
    out.push({ t, head: toWorld(c.head, f), hands: toWorld(c.hands, f), gripEnd: toWorld(c.gripEnd, f), headR });
  }
  return out;
}

/** Highest point reached by any part of the club (head top), world Y. */
export function swingTopY(samples: SwingSample[]): { y: number; at: Vec3 } {
  let best = { y: -Infinity, at: [0, 0, 0] as Vec3 };
  for (const s of samples) {
    for (const p of [s.head, s.gripEnd]) {
      const y = p[1] + (p === s.head ? s.headR : 0.02);
      if (y > best.y) best = { y, at: p };
    }
  }
  return best;
}

export type Aabb = { min: Vec3; max: Vec3 };

function pointAabbDistance(p: Vec3, b: Aabb): number {
  const dx = Math.max(b.min[0] - p[0], 0, p[0] - b.max[0]);
  const dy = Math.max(b.min[1] - p[1], 0, p[1] - b.max[1]);
  const dz = Math.max(b.min[2] - p[2], 0, p[2] - b.max[2]);
  return Math.hypot(dx, dy, dz);
}

/** Minimum clearance between the club (shaft + head) and a box; ≤ 0 means contact. */
export function clubClearanceToBox(samples: SwingSample[], box: Aabb): { distance: number; at: Vec3 } {
  let best = { distance: Infinity, at: [0, 0, 0] as Vec3 };
  for (const s of samples) {
    for (let k = 0; k <= 6; k++) {
      const u = k / 6;
      const p: Vec3 = [
        s.gripEnd[0] + (s.head[0] - s.gripEnd[0]) * u,
        s.gripEnd[1] + (s.head[1] - s.gripEnd[1]) * u,
        s.gripEnd[2] + (s.head[2] - s.gripEnd[2]) * u,
      ];
      const r = k === 6 ? s.headR : 0.012;
      const d = pointAabbDistance(p, box) - r;
      if (d < best.distance) best = { distance: d, at: p };
    }
  }
  return best;
}

/** Club extents in X/Z (for wall checks). */
export function swingExtents(samples: SwingSample[]): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const s of samples) {
    for (const p of [s.head, s.gripEnd]) {
      minX = Math.min(minX, p[0] - s.headR); maxX = Math.max(maxX, p[0] + s.headR);
      minZ = Math.min(minZ, p[2] - s.headR); maxZ = Math.max(maxZ, p[2] + s.headR);
    }
  }
  return { minX, maxX, minZ, maxZ };
}
