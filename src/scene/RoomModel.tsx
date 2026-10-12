import { useMemo } from 'react';
import * as THREE from 'three';
import type { Layout } from '../domain/layout';
import { SCENE } from './colors';

/**
 * Parametric room (blueprint §10.1). Walls are single-sided and face inward, so walls between the
 * camera and the room are back-face culled — a clean "dollhouse" cutaway from any angle.
 */
export function RoomModel({ layout }: { layout: Layout }) {
  const { widthM: W, depthM: D, heightM: H } = layout.room;
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), [W, H, D]);
  const grid = useMemo(() => {
    const pts: number[] = [];
    for (let x = Math.ceil(-W / 2); x <= W / 2; x += 1) pts.push(x, 0.001, 0, x, 0.001, D);
    for (let z = 0; z <= D; z += 1) pts.push(-W / 2, 0.001, z, W / 2, 0.001, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [W, D]);

  return (
    <group>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, D / 2]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={SCENE.floor} roughness={0.92} metalness={0} />
      </mesh>
      <lineSegments geometry={grid}>
        <lineBasicMaterial color={SCENE.grid} transparent opacity={0.55} />
      </lineSegments>
      {/* front wall (screen wall), normal +Z */}
      <mesh position={[0, H / 2, 0]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color={SCENE.wall} roughness={0.95} />
      </mesh>
      {/* back wall, normal −Z */}
      <mesh position={[0, H / 2, D]} rotation-y={Math.PI} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color={SCENE.wall} roughness={0.95} />
      </mesh>
      {/* left wall, normal +X */}
      <mesh position={[-W / 2, H / 2, D / 2]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color={SCENE.wall} roughness={0.95} />
      </mesh>
      {/* right wall, normal −X */}
      <mesh position={[W / 2, H / 2, D / 2]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color={SCENE.wall} roughness={0.95} />
      </mesh>
      {/* ceiling, normal −Y (visible only from below) */}
      <mesh position={[0, H, D / 2]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={SCENE.wall} roughness={0.95} />
      </mesh>
      <lineSegments geometry={edges} position={[0, H / 2, D / 2]}>
        <lineBasicMaterial color={SCENE.wallEdge} />
      </lineSegments>

    </group>
  );
}
