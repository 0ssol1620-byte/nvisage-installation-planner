import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Layout, Vec3 } from '../domain/layout';
import { GOLF_BALL_DIAMETER_M } from '../domain/layout';
import { T_IMPACT } from '../domain/swing';
import { useSwingClock } from '../store/swingClock';
import { SCENE } from './colors';

/** Estimated clubhead path, coloured backswing → follow-through, with the highest point marked. */
export function SwingArc({ layout }: { layout: Layout }) {
  const { points, colors } = useMemo(() => {
    const s = layout.golfer.samples;
    const back = new THREE.Color('#8FD3FF');
    const thru = new THREE.Color(SCENE.brand);
    return {
      points: s.map((x) => x.head),
      colors: s.map((x) => (x.t < T_IMPACT ? back : thru).toArray() as [number, number, number]),
    };
  }, [layout.golfer.samples]);
  const top = layout.golfer.topAt;
  return (
    <group>
      <Line points={points} vertexColors={colors} lineWidth={2.4} transparent opacity={0.9} />
      <mesh position={[top[0], layout.golfer.topY, top[2]]}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshBasicMaterial color={SCENE.warning} />
      </mesh>
    </group>
  );
}

/** Ball + flight to the screen after impact. Owns the ball mesh so it can leave the tee. */
export function BallFlight({ layout }: { layout: Layout }) {
  const ball = useRef<THREE.Mesh>(null);
  const flash = useRef<THREE.Mesh>(null);
  const start = layout.ball;
  const screen = layout.screen;
  const target: Vec3 | null = screen
    ? [start[0] * 0.6, screen.center[1] + screen.heightM * 0.12, screen.planeZ + 0.02]
    : null;
  const curve = useMemo(() => {
    if (!target) return null;
    const midP = new THREE.Vector3((start[0] + target[0]) / 2, Math.max(start[1], target[1]) + 0.45, (start[2] + target[2]) / 2);
    return new THREE.QuadraticBezierCurve3(new THREE.Vector3(...start), midP, new THREE.Vector3(...target));
  }, [start[0], start[1], start[2], target?.[0], target?.[1], target?.[2]]); // eslint-disable-line react-hooks/exhaustive-deps
  const trailLine = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(curve ? curve.getPoints(40) : []);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.85 }));
    l.visible = false;
    return l;
  }, [curve]);
  const trail = useRef<THREE.Line>(trailLine);
  trail.current = trailLine;
  const FLIGHT = 0.07;

  useFrame(() => {
    const { t } = useSwingClock.getState();
    const b = ball.current;
    if (!b) return;
    const u = (t - T_IMPACT) / FLIGHT;
    if (!curve || u <= 0) {
      b.position.set(...start);
      b.visible = true;
      if (trail.current) trail.current.visible = false;
      if (flash.current) flash.current.visible = false;
      return;
    }
    if (u < 1) {
      b.position.copy(curve.getPoint(u));
      b.visible = true;
      if (trail.current) {
        trail.current.visible = true;
        trail.current.geometry.setDrawRange(0, Math.max(2, Math.floor(u * 41)));
      }
      if (flash.current) flash.current.visible = false;
      return;
    }
    b.visible = false;
    if (trail.current) {
      trail.current.visible = u < 6;
      trail.current.geometry.setDrawRange(0, 41);
    }
    if (flash.current) {
      const k = Math.min(1, (u - 1) / 3);
      flash.current.visible = k < 1;
      flash.current.scale.setScalar(0.05 + k * 0.5);
      (flash.current.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
    }
  });

  return (
    <group>
      <mesh ref={ball} position={start} castShadow>
        <sphereGeometry args={[GOLF_BALL_DIAMETER_M / 2, 32, 16]} />
        <meshStandardMaterial color="#F7F7F2" roughness={0.35} />
      </mesh>
      {curve && <primitive object={trailLine} />}
      {target && (
        <mesh ref={flash} position={target} visible={false}>
          <ringGeometry args={[0.6, 1, 40]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
