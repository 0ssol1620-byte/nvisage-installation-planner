import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Layout, Vec3 } from '../domain/layout';
import type { ClubId, SwingPose } from '../domain/swing';
import { bodyOf, CLUBS, swingPose } from '../domain/swing';
import { useSwingClock } from '../store/swingClock';

/**
 * Procedural golfer + club (estimate model, blueprint §9.3: no licensed rig yet).
 * Built in the right-handed local frame of `swing.ts`; the group is mirrored for left-handers.
 * Transforms are written imperatively every rendered frame — no React re-render per frame.
 */
const LOOK = {
  shirt: '#E9EDEA',
  shirtShade: '#C9D0CC',
  pants: '#2A3034',
  skin: '#C99A7C',
  shoe: '#F2F2EE',
  sole: '#1B1E20',
  cap: '#2B3133',
  capBrim: '#D6E033',
  glove: '#FAFAF7',
  grip: '#151718',
  shaft: '#B9BEC2',
  head: '#1C1F22',
  face: '#9AA1A6',
};

type Seg = 'uArmL' | 'uArmR' | 'fArmL' | 'fArmR' | 'thighL' | 'thighR' | 'shinL' | 'shinR' | 'neck';

const Y = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

function placeSegment(m: THREE.Object3D | null, a: Vec3, b: Vec3) {
  if (!m) return;
  tmpA.set(a[0], a[1], a[2]);
  tmpB.set(b[0], b[1], b[2]);
  const len = tmpA.distanceTo(tmpB);
  m.position.copy(tmpA).add(tmpB).multiplyScalar(0.5);
  tmpB.sub(tmpA).normalize();
  m.quaternion.setFromUnitVectors(Y, tmpB);
  m.scale.set(1, Math.max(len, 1e-4), 1);
}

function placePoint(m: THREE.Object3D | null, p: Vec3) {
  if (m) m.position.set(p[0], p[1], p[2]);
}

const basis = new THREE.Matrix4();
const bx = new THREE.Vector3();
const by = new THREE.Vector3();
const bz = new THREE.Vector3();

/** Orients `m` so local Y follows `up` and local X follows `side` (orthogonalised). */
function orient(m: THREE.Object3D | null, center: Vec3, up: Vec3, side: Vec3) {
  if (!m) return;
  by.set(up[0], up[1], up[2]).normalize();
  bx.set(side[0], side[1], side[2]);
  bx.addScaledVector(by, -bx.dot(by)).normalize();
  bz.crossVectors(bx, by).normalize();
  basis.makeBasis(bx, by, bz);
  m.quaternion.setFromRotationMatrix(basis);
  m.position.set(center[0], center[1], center[2]);
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mid = (a: Vec3, b: Vec3, k = 0.5): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

export function Golfer({ layout, club, visible }: { layout: Layout; club: ClubId; visible: boolean }) {
  const h = layout.golfer.heightM;
  const B = useMemo(() => bodyOf(h), [h]);
  const seg = useRef<Partial<Record<Seg, THREE.Mesh>>>({});
  const joints = useRef<THREE.Mesh[]>([]);
  const torso = useRef<THREE.Group>(null);
  const pelvis = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const footL = useRef<THREE.Group>(null);
  const footR = useRef<THREE.Group>(null);
  const handL = useRef<THREE.Mesh>(null);
  const handR = useRef<THREE.Mesh>(null);
  const shaft = useRef<THREE.Mesh>(null);
  const grip = useRef<THREE.Mesh>(null);
  const clubHead = useRef<THREE.Group>(null);
  const lastKey = useRef('');

  const mats = useMemo(() => ({
    shirt: new THREE.MeshStandardMaterial({ color: LOOK.shirt, roughness: 0.78 }),
    sleeve: new THREE.MeshStandardMaterial({ color: LOOK.shirtShade, roughness: 0.8 }),
    pants: new THREE.MeshStandardMaterial({ color: LOOK.pants, roughness: 0.85 }),
    skin: new THREE.MeshStandardMaterial({ color: LOOK.skin, roughness: 0.6 }),
    shoe: new THREE.MeshStandardMaterial({ color: LOOK.shoe, roughness: 0.5 }),
    sole: new THREE.MeshStandardMaterial({ color: LOOK.sole, roughness: 0.7 }),
    cap: new THREE.MeshStandardMaterial({ color: LOOK.cap, roughness: 0.7 }),
    brim: new THREE.MeshStandardMaterial({ color: LOOK.capBrim, roughness: 0.6 }),
    glove: new THREE.MeshStandardMaterial({ color: LOOK.glove, roughness: 0.6 }),
    grip: new THREE.MeshStandardMaterial({ color: LOOK.grip, roughness: 0.8 }),
    shaft: new THREE.MeshStandardMaterial({ color: LOOK.shaft, roughness: 0.25, metalness: 0.9 }),
    clubHead: new THREE.MeshStandardMaterial({ color: LOOK.head, roughness: 0.3, metalness: 0.6 }),
    face: new THREE.MeshStandardMaterial({ color: LOOK.face, roughness: 0.35, metalness: 0.85 }),
  }), []);

  const apply = (p: SwingPose) => {
    const s = seg.current;
    placeSegment(s.uArmL ?? null, p.leadShoulder, p.leadElbow);
    placeSegment(s.uArmR ?? null, p.trailShoulder, p.trailElbow);
    placeSegment(s.fArmL ?? null, p.leadElbow, p.leadHand);
    placeSegment(s.fArmR ?? null, p.trailElbow, p.trailHand);
    placeSegment(s.thighL ?? null, p.leadHip, p.leadKnee);
    placeSegment(s.thighR ?? null, p.trailHip, p.trailKnee);
    placeSegment(s.shinL ?? null, p.leadKnee, p.leadAnkle);
    placeSegment(s.shinR ?? null, p.trailKnee, p.trailAnkle);
    placeSegment(s.neck ?? null, p.neck, p.head);
    const pts = [p.leadShoulder, p.trailShoulder, p.leadElbow, p.trailElbow, p.leadHip, p.trailHip, p.leadKnee, p.trailKnee, p.leadAnkle, p.trailAnkle];
    joints.current.forEach((m, i) => placePoint(m, pts[i]!));
    // torso: from pelvis to the shoulder line, oriented by the shoulders
    const shoulderMid = mid(p.leadShoulder, p.trailShoulder);
    orient(torso.current, mid(p.pelvis, shoulderMid, 0.55), sub(shoulderMid, p.pelvis), sub(p.trailShoulder, p.leadShoulder));
    orient(pelvis.current, p.pelvis, p.spineAxis, sub(p.trailHip, p.leadHip));
    orient(head.current, p.head, sub(p.head, p.neck), sub(p.trailShoulder, p.leadShoulder));
    orient(footL.current, p.leadAnkle, [0, 1, 0], sub(p.leadToe, p.leadAnkle));
    orient(footR.current, p.trailAnkle, [0, 1, 0], sub(p.trailToe, p.trailAnkle));
    placePoint(handL.current, p.leadHand);
    placePoint(handR.current, p.trailHand);
    placeSegment(shaft.current, p.gripEnd, p.clubHead);
    const gripEnd2: Vec3 = [p.gripEnd[0] + p.shaftDir[0] * 0.27, p.gripEnd[1] + p.shaftDir[1] * 0.27, p.gripEnd[2] + p.shaftDir[2] * 0.27];
    placeSegment(grip.current, p.gripEnd, gripEnd2);
    orient(clubHead.current, p.clubHead, p.shaftDir, p.faceDir);
  };

  useFrame(() => {
    const t = useSwingClock.getState().t;
    const key = `${t.toFixed(4)}|${h}|${club}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    apply(swingPose(h, club, t));
  });

  const m = layout.golfer.frame.handed === 'right' ? 1 : -1;
  const o = layout.golfer.frame.origin;
  const r = (k: number) => k * h;
  const segMesh = (name: Seg, radTop: number, radBot: number, mat: THREE.Material) => (
    <mesh key={name} ref={(el) => { if (el) seg.current[name] = el; }} castShadow material={mat}>
      <cylinderGeometry args={[radTop, radBot, 1, 14, 1]} />
    </mesh>
  );
  const head3 = CLUBS[club].head;

  return (
    <group position={o} scale={[m, 1, 1]} visible={visible}>
      {segMesh('uArmL', r(0.024), r(0.02), mats.sleeve)}
      {segMesh('uArmR', r(0.024), r(0.02), mats.sleeve)}
      {segMesh('fArmL', r(0.019), r(0.015), mats.skin)}
      {segMesh('fArmR', r(0.019), r(0.015), mats.skin)}
      {segMesh('thighL', r(0.043), r(0.032), mats.pants)}
      {segMesh('thighR', r(0.043), r(0.032), mats.pants)}
      {segMesh('shinL', r(0.031), r(0.023), mats.pants)}
      {segMesh('shinR', r(0.031), r(0.023), mats.pants)}
      {segMesh('neck', r(0.026), r(0.028), mats.skin)}
      {[0.026, 0.026, 0.02, 0.02, 0.045, 0.045, 0.033, 0.033, 0.024, 0.024].map((rad, i) => (
        <mesh key={i} ref={(el) => { if (el) joints.current[i] = el; }} castShadow material={i < 2 ? mats.sleeve : i < 4 ? mats.skin : mats.pants}>
          <sphereGeometry args={[r(rad), 14, 10]} />
        </mesh>
      ))}
      <group ref={torso}>
        <mesh castShadow scale={[r(0.118), r(0.17), r(0.072)]} material={mats.shirt}>
          <sphereGeometry args={[1, 24, 16]} />
        </mesh>
      </group>
      <group ref={pelvis}>
        <mesh castShadow scale={[r(0.07), r(0.058), r(0.1)]} position={[0, r(0.012), 0]} material={mats.pants}>
          <sphereGeometry args={[1, 18, 12]} />
        </mesh>
      </group>
      <group ref={head}>
        <mesh castShadow scale={[B.headR * 0.86, B.headR * 1.05, B.headR * 0.92]} material={mats.skin}>
          <sphereGeometry args={[1, 20, 14]} />
        </mesh>
        {/* cap */}
        <mesh castShadow position={[0, B.headR * 0.38, 0]} scale={[B.headR * 0.9, B.headR * 0.62, B.headR * 0.95]} material={mats.cap}>
          <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        {/* brim points where the golfer looks (head-local −Z) */}
        <mesh position={[0, B.headR * 0.42, -B.headR * 0.95]} rotation-x={-0.18} material={mats.brim}>
          <boxGeometry args={[B.headR * 1.25, B.headR * 0.07, B.headR * 0.85]} />
        </mesh>
      </group>
      {[footL, footR].map((ref, i) => (
        <group key={i} ref={ref}>
          <mesh castShadow position={[B.footLen * 0.3, -B.ankleY * 0.55, 0]} material={mats.shoe}>
            <boxGeometry args={[B.footLen, B.ankleY * 1.1, B.footLen * 0.38]} />
          </mesh>
          <mesh position={[B.footLen * 0.3, -B.ankleY * 1.08, 0]} material={mats.sole}>
            <boxGeometry args={[B.footLen * 1.02, B.ankleY * 0.18, B.footLen * 0.4]} />
          </mesh>
        </group>
      ))}
      <mesh ref={handL} castShadow material={mats.glove}>
        <sphereGeometry args={[r(0.03), 12, 10]} />
      </mesh>
      <mesh ref={handR} castShadow material={mats.skin}>
        <sphereGeometry args={[r(0.028), 12, 10]} />
      </mesh>
      {/* club */}
      <mesh ref={shaft} castShadow material={mats.shaft}>
        <cylinderGeometry args={[0.0062, 0.0045, 1, 8, 1]} />
      </mesh>
      <mesh ref={grip} castShadow material={mats.grip}>
        <cylinderGeometry args={[0.0125, 0.0105, 1, 10, 1]} />
      </mesh>
      <group ref={clubHead}>
        {club === 'driver' ? (
          <mesh castShadow position={[head3.w * 0.42, 0.012, -head3.d * 0.3]} scale={[head3.w * 0.55, head3.h * 0.5, head3.d * 0.5]} material={mats.clubHead}>
            <sphereGeometry args={[1, 20, 12]} />
          </mesh>
        ) : (
          <mesh castShadow position={[head3.w * 0.42, 0.01, 0]} material={mats.face}>
            <boxGeometry args={[head3.w, head3.h, head3.d]} />
          </mesh>
        )}
      </group>
    </group>
  );
}
