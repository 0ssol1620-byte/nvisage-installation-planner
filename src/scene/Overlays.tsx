import { Line } from '@react-three/drei';
import type { DimensionLine, Layout, Vec3 } from '../domain/layout';
import type { Rect2 } from '../domain/zone-geometry';
import { SCENE } from './colors';

const LIFT = 0.006; // keep overlays above the hitting surface (no z-fighting)

export function RectOverlay({ rect, y, color, fillOpacity = 0.18, dashed = false, lineWidth = 2 }: {
  rect: Rect2; y: number; color: string; fillOpacity?: number; dashed?: boolean; lineWidth?: number;
}) {
  const w = rect.maxX - rect.minX;
  const d = rect.maxZ - rect.minZ;
  const cx = (rect.minX + rect.maxX) / 2;
  const cz = (rect.minZ + rect.maxZ) / 2;
  const yy = y + LIFT;
  const pts: Vec3[] = [
    [rect.minX, yy, rect.minZ], [rect.maxX, yy, rect.minZ], [rect.maxX, yy, rect.maxZ], [rect.minX, yy, rect.maxZ], [rect.minX, yy, rect.minZ],
  ];
  return (
    <group>
      {fillOpacity > 0 && (
        <mesh position={[cx, yy - 0.001, cz]} rotation-x={-Math.PI / 2} renderOrder={2}>
          <planeGeometry args={[w, d]} />
          <meshBasicMaterial color={color} transparent opacity={fillOpacity} depthWrite={false} />
        </mesh>
      )}
      <Line points={pts} color={color} lineWidth={lineWidth} dashed={dashed} dashSize={0.04} gapSize={0.03} renderOrder={3} />
    </group>
  );
}

export function Dimension({ dim }: { dim: DimensionLine }) {
  const color = dim.kind === 'official' ? SCENE.brand : dim.kind === 'swing' ? SCENE.warning : dim.kind === 'room' ? SCENE.info : '#8FA19C';
  const dashed = dim.kind === 'swing' || dim.kind === 'info';
  const dir = [dim.to[0] - dim.from[0], dim.to[1] - dim.from[1], dim.to[2] - dim.from[2]];
  const vertical = Math.abs(dir[1]!) > Math.abs(dir[0]!) && Math.abs(dir[1]!) > Math.abs(dir[2]!);
  const tick = 0.05;
  const tickVec: Vec3 = vertical ? [tick, 0, 0] : Math.abs(dir[0]!) > Math.abs(dir[2]!) ? [0, 0, tick] : [tick, 0, 0];
  const tickAt = (p: Vec3): Vec3[] => [[p[0] - tickVec[0], p[1] - tickVec[1], p[2] - tickVec[2]], [p[0] + tickVec[0], p[1] + tickVec[1], p[2] + tickVec[2]]];
  return (
    <group>
      <Line points={[dim.from, dim.to]} color={color} lineWidth={1.6} dashed={dashed} dashSize={0.05} gapSize={0.035} depthTest={false} renderOrder={5} />
      <Line points={tickAt(dim.from)} color={color} lineWidth={1.6} depthTest={false} renderOrder={5} />
      <Line points={tickAt(dim.to)} color={color} lineWidth={1.6} depthTest={false} renderOrder={5} />
    </group>
  );
}

/** Vertical reference from the camera lens to the floor + a ring at the tee. */
export function LensReference({ layout }: { layout: Layout }) {
  if (layout.kind !== 'overhead') return null;
  const [x, , z] = layout.lensFloorPoint;
  const bottom = layout.sensorAnchor[1] - layout.sensorBody.size[1];
  return (
    <group>
      <Line points={[[x, bottom, z], [x, layout.hittingSurfaceY + LIFT, z]]} color={SCENE.brand} lineWidth={1} dashed dashSize={0.06} gapSize={0.05} transparent opacity={0.7} />
      <mesh position={[x, layout.hittingSurfaceY + LIFT, z]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.025, 0.035, 32]} />
        <meshBasicMaterial color={SCENE.brand} />
      </mesh>
      <mesh position={[layout.ball[0], layout.hittingSurfaceY + LIFT, layout.ball[2]]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.04, 0.05, 40]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

export function ZoneOverlays({ layout, showMax, showFootprint, showConfig }: { layout: Layout; showMax: boolean; showFootprint: boolean; showConfig: boolean }) {
  const y = layout.hittingSurfaceY;
  if (layout.kind === 'overhead') {
    return (
      <group>
        {showMax && <RectOverlay rect={layout.maxArea.primary} y={y + 0.001} color={SCENE.maxArea} fillOpacity={0.16} />}
        {showConfig && layout.configZones.map((z) => (
          <RectOverlay key={z.id} rect={z.rect} y={y + 0.002} fillOpacity={0.12} lineWidth={1.6}
            color={z.id === 'tee' ? SCENE.teeZone : z.id === 'basic' ? SCENE.basicZone : SCENE.readyZoneN1} />
        ))}
      </group>
    );
  }
  return (
    <group>
      {showFootprint && <RectOverlay rect={layout.installationFootprint} y={y} color={SCENE.footprint} fillOpacity={0.06} dashed lineWidth={1.4} />}
      {showMax && <RectOverlay rect={layout.strikeZone} y={y} color={SCENE.maxArea} fillOpacity={0.16} dashed />}
    </group>
  );
}
