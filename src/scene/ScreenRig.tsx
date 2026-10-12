import { Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Layout, Vec3 } from '../domain/layout';
import type { ScreenMaterialId } from '../data/carls';
import screenUrl from '../assets/screens/murlie-screen.jpg';

/** MURLIE software screenshot (MURLIE Marketing Assets / Murlie1.png), 1800 × 944. */
const IMAGE_ASPECT = 1800 / 944;

/** Loads once per URL without suspending the canvas; re-renders on arrival. */
function useImageTexture(url: string) {
  const invalidate = useThree((s) => s.invalidate);
  return useMemo(() => {
    const tex = new THREE.TextureLoader().load(url, () => invalidate());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [url, invalidate]);
}

/** Cover-fit the image onto the screen aspect (crop, never stretch). */
function coverFit(tex: THREE.Texture, w: number, h: number) {
  const scr = w / h;
  tex.repeat.set(scr < IMAGE_ASPECT ? scr / IMAGE_ASPECT : 1, scr < IMAGE_ASPECT ? 1 : IMAGE_ASPECT / scr);
  tex.offset.set((1 - tex.repeat.x) / 2, (1 - tex.repeat.y) / 2);
}

/** Lit: projected image, slightly darker on the high-contrast gray fabric. Unlit: bare fabric. */
const FABRIC: Record<ScreenMaterialId, { lit: string; bare: string }> = {
  standard: { lit: '#F4F4F2', bare: '#CFD1CD' },
  preferred: { lit: '#F8F8F6', bare: '#D5D7D3' },
  premium: { lit: '#FFFFFF', bare: '#DADCD8' },
  gray: { lit: '#C9CCCC', bare: '#8C9090' },
};

/** Impact screen (flat or curved) showing the MURLIE screen, plus the Carl's Place enclosure frame. */
export function ScreenRig({ layout, material, showEnclosure }: { layout: Layout; material: ScreenMaterialId; showEnclosure: boolean }) {
  const scr = layout.screen;
  const tex = useImageTexture(screenUrl);
  const lit = !!layout.projector;

  useEffect(() => {
    if (scr) coverFit(tex, scr.widthM, scr.heightM);
  }, [scr, tex]);

  if (!scr) return null;
  const fabric = FABRIC[material];
  const face = (
    <meshBasicMaterial map={lit ? tex : null} color={lit ? fabric.lit : fabric.bare} toneMapped={false} side={THREE.DoubleSide} />
  );
  const enc = layout.enclosure;
  return (
    <group>
      {scr.curve ? (
        <CurvedScreen scr={scr} curve={scr.curve}>{face}</CurvedScreen>
      ) : (
        <group position={scr.center}>
          {!enc && (
            <mesh position={[0, 0, -0.012]} receiveShadow>
              <boxGeometry args={[scr.widthM + 0.06, scr.heightM + 0.06, 0.02]} />
              <meshStandardMaterial color="#101415" roughness={0.8} />
            </mesh>
          )}
          <mesh>
            <planeGeometry args={[scr.widthM, scr.heightM]} />
            {face}
          </mesh>
        </group>
      )}
      {showEnclosure && enc && <Enclosure enc={enc} />}
    </group>
  );
}

/** Circular arc through the published chord (width at projection plane) and arc length (width at curve). */
function CurvedScreen({ scr, curve, children }: { scr: NonNullable<Layout['screen']>; curve: NonNullable<NonNullable<Layout['screen']>['curve']>; children: React.ReactNode }) {
  const half = curve.arcM / curve.radiusM / 2;
  const r = curve.radiusM;
  // Circle centre sits in front of the screen (towards the golfer); the deepest point is the screen plane.
  // Mirrored in X so the image reads left-to-right from inside the curve.
  return (
    <group position={[0, scr.bottomM + scr.heightM / 2, scr.planeZ + r]} scale={[-1, 1, 1]}>
      <mesh>
        <cylinderGeometry args={[r, r, scr.heightM, 64, 1, true, Math.PI - half, 2 * half]} />
        {children}
      </mesh>
    </group>
  );
}

const FRAME = '#1A1E20';
const FABRIC_BLACK = '#0B0E0F';

function Pipe({ from, to, r }: { from: Vec3; to: Vec3; r: number }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return (
    <mesh position={mid} quaternion={q} castShadow>
      <cylinderGeometry args={[r, r, len, 12]} />
      <meshStandardMaterial color={FRAME} roughness={0.45} metalness={0.55} />
    </mesh>
  );
}

/**
 * Carl's Place enclosure at its actual outer dimensions: EMT frame (screen plane → front edge),
 * backset rear fittings, BlackStop side/top fabric and turf floor.
 */
function Enclosure({ enc }: { enc: NonNullable<Layout['enclosure']> }) {
  const r = enc.pipeOdM / 2;
  const x0 = enc.minX + r;
  const x1 = enc.maxX - r;
  const top = enc.topY - r;
  const zs = enc.minZ;
  const zf = enc.maxZ;
  const zb = enc.backZ;
  const w = enc.maxX - enc.minX;
  const d = zf - zs;
  const cx = 0;
  const cz = (zs + zf) / 2;
  const pipes: [Vec3, Vec3][] = [
    // uprights at the screen plane and the front edge
    [[x0, 0, zs], [x0, top, zs]], [[x1, 0, zs], [x1, top, zs]],
    [[x0, 0, zf], [x0, top, zf]], [[x1, 0, zf], [x1, top, zf]],
    // top frame
    [[x0, top, zs], [x1, top, zs]], [[x0, top, zf], [x1, top, zf]],
    [[x0, top, zs], [x0, top, zf]], [[x1, top, zs], [x1, top, zf]],
    // backset rear fittings (screen tension frame)
    [[x0, top, zs], [x0, top, zb]], [[x1, top, zs], [x1, top, zb]], [[x0, top, zb], [x1, top, zb]],
    [[x0, 0, zb], [x0, top, zb]], [[x1, 0, zb], [x1, top, zb]],
  ];
  return (
    <group>
      {pipes.map(([a, b], i) => <Pipe key={i} from={a} to={b} r={r} />)}
      {/* BlackStop side + top fabric (semi-transparent so the inside stays readable) */}
      {[enc.minX + 0.002, enc.maxX - 0.002].map((x, i) => (
        <mesh key={`n${i}`} position={[x, top / 2, cz]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[d, top]} />
          <meshStandardMaterial color={FABRIC_BLACK} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} roughness={1} />
        </mesh>
      ))}
      <mesh position={[cx, top, cz]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={FABRIC_BLACK} transparent opacity={0.38} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* turf floor inside the enclosure */}
      <mesh position={[cx, 0.002, cz]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#1F3A26" roughness={1} />
      </mesh>
    </group>
  );
}

/** Ceiling projector at its catalog body size + drop mount + translucent light pyramid to the screen corners. */
export function ProjectorRig({ layout, showBeam }: { layout: Layout; showBeam: boolean }) {
  const P = layout.projector;
  const beam = useMemo(() => {
    if (!P) return null;
    const l = P.lens;
    const c = P.corners;
    const pos = new Float32Array([
      ...l, ...c[0], ...c[1],
      ...l, ...c[1], ...c[2],
      ...l, ...c[2], ...c[3],
      ...l, ...c[3], ...c[0],
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }, [P]);
  if (!P || !beam) return null;
  const [bx, by, bz] = P.body.center;
  const [w, h, d] = P.body.size;
  const ceiling = layout.room.heightM;
  const poleLen = Math.max(0, ceiling - (by + h / 2));
  const lensR = Math.min(0.045, h * 0.38);
  return (
    <group>
      <group position={[bx, by, bz]}>
        <mesh castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#E7EAE8" roughness={0.45} metalness={0.1} />
        </mesh>
        <mesh position={[0, -h * 0.3, 0]}>
          <boxGeometry args={[w * 1.002, h * 0.4, d * 1.002]} />
          <meshStandardMaterial color="#2A2F31" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, -d / 2 - 0.012]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[lensR, lensR * 1.12, 0.03, 24]} />
          <meshStandardMaterial color="#121516" roughness={0.2} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0, -d / 2 - 0.028]}>
          <circleGeometry args={[lensR * 0.8, 24]} />
          <meshBasicMaterial color="#FFF6D8" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        {poleLen > 0.01 && (
          <mesh position={[0, h / 2 + poleLen / 2, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, poleLen, 12]} />
            <meshStandardMaterial color="#1A1E20" roughness={0.5} metalness={0.6} />
          </mesh>
        )}
        <mesh position={[0, h / 2 + poleLen - 0.005, 0]}>
          <boxGeometry args={[0.16, 0.01, 0.16]} />
          <meshStandardMaterial color="#1A1E20" />
        </mesh>
      </group>
      {showBeam && (
        <group>
          <mesh geometry={beam} renderOrder={1}>
            <meshBasicMaterial color="#FFF3C4" transparent opacity={0.065} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
          {P.corners.map((c, i) => (
            <Line key={i} points={[P.lens, c]} color="#FFF0B0" lineWidth={1} transparent opacity={0.35} />
          ))}
        </group>
      )}
    </group>
  );
}
