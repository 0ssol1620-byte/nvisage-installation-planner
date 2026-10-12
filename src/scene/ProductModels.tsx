/**
 * Publishable product models built from the published outer dimensions and the marketing photos —
 * no CAD geometry (RG-02). Local frame: X = width, Y = up, Z = depth, front face (logo / LED / cameras) +Z.
 * Overhead sensors hang below their mount plane (y ≤ 0); the portable device stands on y = 0.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import logoUrl from '../assets/nvisage-logo-white-green.png';

const LOGO_ASPECT = 122 / 36;

function useLogo() {
  return useMemo(() => {
    const t = new THREE.TextureLoader().load(logoUrl);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
}

const MAT = {
  shell: { color: '#2c3133', roughness: 0.42, metalness: 0.25 },
  shellLight: { color: '#42474a', roughness: 0.5, metalness: 0.2 },
  silver: { color: '#cfd3d4', roughness: 0.42, metalness: 0.35 },
  plate: { color: '#d4d7d7', roughness: 0.38, metalness: 0.5 },
  window: { color: '#07090b', roughness: 0.08, metalness: 0.3 },
  lensRing: { color: '#55595b', roughness: 0.3, metalness: 0.8 },
};

function Lens({ r, position, rotation, accent }: { r: number; position: [number, number, number]; rotation: [number, number, number]; accent?: string }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <circleGeometry args={[r, 40]} />
        <meshStandardMaterial {...MAT.lensRing} />
      </mesh>
      <mesh position={[0, 0, 0.0008]}>
        <circleGeometry args={[r * 0.72, 40]} />
        <meshPhysicalMaterial color="#05070a" roughness={0.04} metalness={0.2} clearcoat={1} clearcoatRoughness={0.03} />
      </mesh>
      <mesh position={[0, 0, 0.0012]}>
        <ringGeometry args={[r * 0.3, r * 0.38, 32]} />
        <meshBasicMaterial color={accent ?? '#2b3a4a'} />
      </mesh>
    </group>
  );
}

/** Box whose bottom face is inset (tapered tray). Insets in metres: [left/right, back, front]. */
function taperedBox(w: number, h: number, d: number, inset: { x: number; back: number; front: number }) {
  const g = new THREE.BoxGeometry(w, h, d);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > 0) continue;
    const x = p.getX(i);
    const z = p.getZ(i);
    p.setX(i, x - Math.sign(x) * inset.x);
    p.setZ(i, z > 0 ? z - inset.front : z + inset.back);
  }
  g.computeVertexNormals();
  return g;
}

/** N1 — silver mounting plate, tapered tray body, brushed front face with logo, two camera windows underneath. */
export function N1Model({ size }: { size: [number, number, number] }) {
  const [W, H, D] = size;
  const logo = useLogo();
  const plateH = 0.006;
  const bodyH = H - plateH;
  const inset = { x: 0.03, back: 0.02, front: D * 0.38 };
  const geo = useMemo(() => taperedBox(W, bodyH, D, inset), [W, bodyH, D]); // eslint-disable-line react-hooks/exhaustive-deps
  // BoxGeometry face groups: +x, −x, +y, −y, +z (brushed front), −z
  const trayMaterials = useMemo(() => {
    const shell = new THREE.MeshStandardMaterial(MAT.shell);
    return [shell, shell, shell, shell, new THREE.MeshStandardMaterial(MAT.silver), shell];
  }, []);
  // slanted front face: from (y top, z D/2) to (y bottom, z D/2 − front inset)
  const tilt = Math.atan2(inset.front, bodyH);
  const faceMidY = -plateH - bodyH / 2;
  const faceMidZ = D / 2 - inset.front / 2;
  const logoW = W * 0.3;
  return (
    <group>
      {/* mounting plate with corner tabs */}
      <mesh position={[0, -plateH / 2, 0]} castShadow>
        <boxGeometry args={[W + 0.03, plateH, D * 0.92]} />
        <meshStandardMaterial {...MAT.plate} />
      </mesh>
      <mesh geometry={geo} material={trayMaterials} position={[0, -plateH - bodyH / 2, 0]} castShadow receiveShadow />
      {/* logo on the slanted face, lifted 2 mm along the face normal */}
      <mesh position={[0, faceMidY - Math.sin(tilt) * 0.002, faceMidZ + Math.cos(tilt) * 0.002]} rotation-x={tilt}>
        <planeGeometry args={[logoW, logoW / LOGO_ASPECT]} />
        <meshBasicMaterial map={logo} transparent color="#101213" toneMapped={false} />
      </mesh>
      {/* camera windows on the underside */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * W * 0.3, -H - 0.0005, -D * 0.06]} rotation-x={Math.PI / 2}>
            <planeGeometry args={[W * 0.16, D * 0.36]} />
            <meshStandardMaterial {...MAT.window} side={THREE.DoubleSide} />
          </mesh>
          <Lens r={0.014} position={[s * W * 0.3, -H - 0.0012, -D * 0.06]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      ))}
    </group>
  );
}

/** N2 — long graphite bar, green light line and logo on the front, three cameras underneath. */
export function N2Model({ size }: { size: [number, number, number] }) {
  const [W, H, D] = size;
  const logo = useLogo();
  return (
    <group>
      <RoundedBox args={[W, H, D]} radius={Math.min(H, D) * 0.28} smoothness={4} position={[0, -H / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...MAT.shellLight} />
      </RoundedBox>
      {/* darker underside panel */}
      <mesh position={[0, -H - 0.0005, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[W * 0.9, D * 0.62]} />
        <meshStandardMaterial {...MAT.shell} side={THREE.DoubleSide} />
      </mesh>
      {/* green light line along the lower front edge */}
      <mesh position={[0, -H * 0.72, D / 2 + 0.001]}>
        <boxGeometry args={[W * 0.86, 0.005, 0.002]} />
        <meshStandardMaterial color="#59d13b" emissive="#59d13b" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, -H * 0.45, D / 2 + 0.0015]}>
        <planeGeometry args={[W * 0.14, (W * 0.14) / LOGO_ASPECT]} />
        <meshBasicMaterial map={logo} transparent toneMapped={false} />
      </mesh>
      {[-0.4, 0, 0.4].map((f) => (
        <Lens key={f} r={0.022} position={[f * W, -H - 0.0012, D * 0.04]} rotation={[Math.PI / 2, 0, 0]} accent="#3c4f2c" />
      ))}
    </group>
  );
}

/** NEO-E — standing tower with a top display, three camera pockets and green side lights on the front. */
export function NeoEModel({ size }: { size: [number, number, number] }) {
  const [W, H, D] = size;
  const logo = useLogo();
  const baseH = H * 0.11;
  const bodyW = W * 0.9;
  const bodyD = D * 0.9;
  const bodyH = H - baseH;
  const front = bodyD / 2 + 0.0012;
  return (
    <group>
      <RoundedBox args={[W, baseH, D]} radius={0.01} smoothness={3} position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...MAT.shell} />
      </RoundedBox>
      <RoundedBox args={[bodyW, bodyH, bodyD]} radius={0.014} smoothness={4} position={[0, baseH + bodyH / 2 - 0.004, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...MAT.shell} />
      </RoundedBox>
      {/* display on the top, tilted toward the golfer */}
      <mesh position={[0, H - 0.0015, bodyD * 0.08]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[bodyW * 0.8, bodyD * 0.62]} />
        <meshStandardMaterial color="#dfe7ea" emissive="#c9d6da" emissiveIntensity={0.35} roughness={0.2} />
      </mesh>
      {/* three camera pockets */}
      {[0.83, 0.52, 0.2].map((f, i) => (
        <group key={f} position={[0, f * H, front]}>
          <mesh>
            <planeGeometry args={[bodyW * 0.58, H * 0.11]} />
            <meshStandardMaterial {...MAT.window} />
          </mesh>
          <Lens r={W * 0.065} position={[0, 0, 0.0008]} rotation={[0, 0, 0]} accent={i === 1 ? '#2b3a4a' : '#7a6a2a'} />
        </group>
      ))}
      {/* logo badge */}
      <mesh position={[0, 0.675 * H, front + 0.0004]}>
        <planeGeometry args={[bodyW * 0.36, (bodyW * 0.36) / LOGO_ASPECT]} />
        <meshBasicMaterial map={logo} transparent toneMapped={false} />
      </mesh>
      {/* green side lights */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (bodyW / 2 - 0.004), H * 0.47, front - 0.002]}>
          <boxGeometry args={[0.003, H * 0.36, 0.004]} />
          <meshStandardMaterial color="#59d13b" emissive="#59d13b" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
