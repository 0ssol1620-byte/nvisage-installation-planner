import type { ThreeEvent } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Layout } from '../domain/layout';
import { usePlanner } from '../store/plannerStore';
import logoUrl from '../assets/nvisage-logo-white-green.png';

/** Procedural turf (no external texture): fine noise + mowing stripes. */
function makeTurf(base: string, light: string, seed: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = rnd() > 0.5 ? light : 'rgba(0,0,0,0.25)';
    g.globalAlpha = 0.18 + rnd() * 0.25;
    g.fillRect(rnd() * 256, rnd() * 256, 1, 2 + rnd() * 3);
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const SNAP = 0.01;

/**
 * Hitting mat / swing platform. Draggable in 3D and Top views: moves the tee (and everything
 * that follows it — sensor, zones, golfer) on the hitting-surface plane, clamped to the room.
 */
export function MatRig({ layout, show }: { layout: Layout; show: boolean }) {
  const setTee = usePlanner((s) => s.setTee);
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null;
  const gl = useThree((s) => s.gl);
  const turf = useMemo(() => makeTurf('#2E6B37', '#5FA765', 7), []);
  const strip = useMemo(() => makeTurf('#3C8A47', '#86C48A', 11), []);
  const logo = useMemo(() => {
    const t = new THREE.TextureLoader().load(logoUrl);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const drag = useRef<{ dx: number; dz: number } | null>(null);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  const mat = layout.mat;
  const surfaceY = layout.hittingSurfaceY;
  plane.constant = -surfaceY;
  const [tx, , tz] = layout.ball;
  const b = layout.room.bounds;

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (!e.ray.intersectPlane(plane, hit)) return;
    drag.current = { dx: tx - hit.x, dz: tz - hit.z };
    (e.target as unknown as Element).setPointerCapture?.(e.pointerId);
    if (controls) controls.enabled = false;
    gl.domElement.style.cursor = 'grabbing';
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    e.stopPropagation();
    if (!e.ray.intersectPlane(plane, hit)) return;
    const snap = (v: number) => Math.round(v / SNAP) * SNAP;
    const xM = Math.min(b.maxX - 0.1, Math.max(b.minX + 0.1, snap(hit.x + drag.current.dx)));
    const zM = Math.min(b.maxZ - 0.1, Math.max(b.minZ + 0.1, snap(hit.z + drag.current.dz)));
    setTee({ xM: Math.round(xM * 1000) / 1000, zM: Math.round(zM * 1000) / 1000 });
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    drag.current = null;
    (e.target as unknown as Element).releasePointerCapture?.(e.pointerId);
    if (controls) controls.enabled = true;
    gl.domElement.style.cursor = 'grab';
  };
  const handlers = {
    onPointerDown: onDown,
    onPointerMove: onMove,
    onPointerUp: onUp,
    onPointerCancel: onUp,
    onPointerOver: () => { if (!drag.current) gl.domElement.style.cursor = 'grab'; },
    onPointerOut: () => { if (!drag.current) gl.domElement.style.cursor = ''; },
  };

  if (!mat || !show) {
    // still allow dragging the tee by grabbing a disc around the ball
    return (
      <mesh position={[tx, surfaceY + 0.002, tz]} rotation-x={-Math.PI / 2} {...handlers}>
        <circleGeometry args={[0.25, 32]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.08} depthWrite={false} />
      </mesh>
    );
  }
  const [w, hgt, d] = mat.size;
  // hitting insert (HotShot: 12″ × 30″ strip centred on the tee) or a full-depth strip on custom mats
  const ins = layout.matInsert;
  const sw = ins ? ins.maxX - ins.minX : 0.3;
  const sd = ins ? ins.maxZ - ins.minZ : d - 0.03;
  const ox = tx - mat.center[0];
  const oz = tz - mat.center[2];
  turf.repeat.set(w / 0.5, d / 0.5);
  strip.repeat.set(sw / 0.5, sd / 0.5);
  const platform = hgt >= 0.05;
  const stanceSide = layout.golfer.frame.handed === 'right' ? -1 : 1;
  return (
    <group position={mat.center} {...handlers}>
      {/* base / swing platform */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, hgt, d]} />
        <meshStandardMaterial color={platform ? '#3B3631' : '#151818'} roughness={0.85} />
      </mesh>
      <mesh position={[0, hgt / 2 + 0.0006, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[w - 0.03, d - 0.03]} />
        <meshStandardMaterial map={turf} roughness={1} />
      </mesh>
      {/* hitting strip along the target line, centred on the tee */}
      <mesh position={[ox, hgt / 2 + 0.0012, ins ? oz : 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[sw, sd]} />
        <meshStandardMaterial map={strip} roughness={1} />
      </mesh>
      {/* NVISAGE logo on the stance side */}
      {w > 0.9 && (
        <mesh position={[stanceSide * (w / 2 - 0.2), hgt / 2 + 0.0016, d / 2 - 0.12]} rotation-x={-Math.PI / 2} rotation-z={stanceSide > 0 ? Math.PI / 2 : -Math.PI / 2}>
          <planeGeometry args={[0.42, 0.124]} />
          <meshBasicMaterial map={logo} transparent opacity={0.9} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {/* rubber tee */}
      <mesh position={[ox, hgt / 2 + 0.002, oz]}>
        <cylinderGeometry args={[0.009, 0.011, 0.004, 12]} />
        <meshStandardMaterial color="#202426" roughness={0.6} />
      </mesh>
    </group>
  );
}
