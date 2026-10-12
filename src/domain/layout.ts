/**
 * Derives world-space geometry from state + spec (blueprint §11, Appendix A "Visual Layout").
 *
 * World convention (single source of truth, §11.1):
 *   right-handed, metres, Y-up. Origin = centre of the finished FRONT (screen) wall at floor level.
 *   +X = customer's right when facing the screen, +Z = from the front wall toward the back of the room.
 *   Room interior: x ∈ [−W/2, W/2], y ∈ [0, H], z ∈ [0, D].
 *
 * This module only places things. It never decides PASS/FAIL — see rules.ts.
 * Sensor placement follows the official manual drawings (status MANUAL). Golfer/club and projector
 * geometry are estimates and are labelled as such wherever they are shown.
 */
import type { DatumStatus, OverheadSpec, PortableSpec, ProductSpec } from '../data/specs/products';
import { isOverhead } from '../data/specs/products';
import type { PlannerStateV1 } from './schema';
import type { Rect2, ZoneRect } from './zone-geometry';
import { rectFromCentre, toRect2 } from './zone-geometry';
import { inToM } from './units';
import type { GolferFrame, SwingSample } from './swing';
import { swingExtents, swingSamples, swingTopY } from './swing';
import type { Equipment, ResolvedEnclosure, ResolvedProjector, ResolvedScreen } from './equipment';
import { resolveEquipment } from './equipment';

export type Vec3 = [number, number, number];

export const GOLF_BALL_DIAMETER_M = 0.04267; // [REFERENCE] Rules of Golf minimum 1.68 in

export type Box = { center: Vec3; size: Vec3; rotationY: number };

export type DimensionLine = {
  id: string;
  from: Vec3;
  to: Vec3;
  valueM: number;
  kind: 'room' | 'official' | 'info' | 'swing';
  labelKey: string;
};

type LayoutBase = {
  room: { widthM: number; depthM: number; heightM: number; bounds: Rect2 };
  hittingSurfaceY: number;
  ball: Vec3;
  equipment: Equipment;
  mat: Box | null;
  matRect: Rect2 | null;
  /** hitting insert on catalog mats (centred on the tee) */
  matInsert: Rect2 | null;
  screen: { center: Vec3; widthM: number; heightM: number; bottomM: number; planeZ: number; projectionZ: number; curve: ResolvedScreen['curve'] } | null;
  /** Carl's Place enclosure: frame from the screen plane (minZ) to the front edge (maxZ). */
  enclosure: (ResolvedEnclosure & { minX: number; maxX: number; minZ: number; maxZ: number; topY: number }) | null;
  projector: (ResolvedProjector & {
    /** Projected 16:9 image corners: bottom-left, bottom-right, top-right, top-left. */
    corners: [Vec3, Vec3, Vec3, Vec3];
    throwDistanceM: number;
  }) | null;
  golfer: {
    frame: GolferFrame;
    heightM: number;
    samples: SwingSample[];
    topY: number;
    topAt: Vec3;
    extents: { minX: number; maxX: number; minZ: number; maxZ: number };
  };
  dimensions: DimensionLine[];
};

export type OverheadLayout = LayoutBase & {
  kind: 'overhead';
  /** Model origin: centre of the ceiling-mount plane (top of sensor). */
  sensorAnchor: Vec3;
  sensorRotationY: number;
  sensorBody: Box;
  /** Height of the mount plane above the floor and above the hitting surface. */
  mountHeightFromFloorM: number;
  mountHeightFromSurfaceM: number;
  lensFloorPoint: Vec3;
  lensToTeeM: number;
  calibrationBoardCenter: Vec3;
  /** Published max area: side A parallel to the screen, centred on the tee (manual basis). */
  maxArea: { center: Vec3; primary: Rect2; sideAM: number; sideBM: number; datumStatus: DatumStatus };
  configZones: { id: 'ready' | 'basic' | 'tee'; rect: Rect2 }[];
};

export type PortableLayout = LayoutBase & {
  kind: 'portable';
  /** Model origin: centre of the floor-contact plane. Cameras face local +Z. */
  deviceAnchor: Vec3;
  deviceRotationY: number;
  deviceBody: Box;
  /** +1 when the device stands on the +X side of the ball. */
  deviceSide: 1 | -1;
  strikeZone: Rect2;
  installationFootprint: Rect2;
  datumStatus: DatumStatus;
};

export type Layout = OverheadLayout | PortableLayout;

export function computeLayout(state: PlannerStateV1, spec: ProductSpec): Layout {
  const { widthM: W, depthM: D, heightM: H } = state.room;
  const eq = resolveEquipment(state);
  const m = eq.mat;
  const hittingSurfaceY = m ? m.heightM : 0;
  const ball: Vec3 = [state.tee.xM, hittingSurfaceY + GOLF_BALL_DIAMETER_M / 2, state.tee.zM];
  const sc = eq.screen;
  const enc = eq.enclosure;
  const pj = eq.projector;

  let projector: LayoutBase['projector'] = null;
  if (pj && sc) {
    // Content fills the viewable screen (the 16:9 panel is zoomed to the screen height; narrower screens are pillarboxed).
    const z = sc.projectionZ + 0.004;
    const hw = sc.widthM / 2;
    const bottom = sc.bottomM;
    const top = sc.bottomM + sc.heightM;
    projector = {
      ...pj,
      corners: [[-hw, bottom, z], [hw, bottom, z], [hw, top, z], [-hw, top, z]],
      throwDistanceM: pj.distanceM,
    };
  }
  const frame: GolferFrame = { origin: [state.tee.xM, hittingSurfaceY, state.tee.zM], handed: state.handedness };
  const samples = swingSamples(state.golfer.heightM, state.golfer.club, frame);
  const top = swingTopY(samples);
  const golfer: LayoutBase['golfer'] = {
    frame, heightM: state.golfer.heightM, samples, topY: top.y, topAt: top.at, extents: swingExtents(samples),
  };

  const base: LayoutBase = {
    room: { widthM: W, depthM: D, heightM: H, bounds: { minX: -W / 2, maxX: W / 2, minZ: 0, maxZ: D } },
    hittingSurfaceY,
    ball,
    equipment: eq,
    mat: m ? { center: [m.centerX, m.heightM / 2, m.centerZ], size: [m.widthM, Math.max(m.heightM, 0.001), m.depthM], rotationY: 0 } : null,
    matRect: m ? rectFromCentre(m.centerX, m.centerZ, m.widthM, m.depthM) : null,
    matInsert: m?.insert ? rectFromCentre(state.tee.xM, state.tee.zM, m.insert.widthM, m.insert.depthM) : null,
    screen: sc ? { center: [0, sc.bottomM + sc.heightM / 2, sc.planeZ], widthM: sc.widthM, heightM: sc.heightM, bottomM: sc.bottomM, planeZ: sc.planeZ, projectionZ: sc.projectionZ, curve: sc.curve } : null,
    enclosure: enc ? { ...enc, minX: -enc.outerWM / 2, maxX: enc.outerWM / 2, minZ: enc.screenZ, maxZ: enc.frontZ, topY: enc.outerHM } : null,
    projector,
    golfer,
    dimensions: [
      { id: 'room-width', from: [-W / 2, 0, D], to: [W / 2, 0, D], valueM: W, kind: 'room', labelKey: 'dim.roomWidth' },
      { id: 'room-depth', from: [W / 2, 0, 0], to: [W / 2, 0, D], valueM: D, kind: 'room', labelKey: 'dim.roomDepth' },
      { id: 'room-height', from: [-W / 2, 0, D], to: [-W / 2, H, D], valueM: H, kind: 'room', labelKey: 'dim.roomHeight' },
    ],
  };
  if (sc) {
    base.dimensions.push({
      id: 'screen-to-tee', from: [state.tee.xM, hittingSurfaceY, sc.planeZ], to: [state.tee.xM, hittingSurfaceY, state.tee.zM],
      valueM: state.tee.zM - sc.planeZ, kind: 'info', labelKey: 'dim.screenToTee',
    });
  }
  if (state.view.layers.swingArc) {
    base.dimensions.push({
      id: 'swing-top', from: [top.at[0], top.y, top.at[2]], to: [top.at[0], H, top.at[2]],
      valueM: H - top.y, kind: 'swing', labelKey: 'dim.swingCeiling',
    });
  }
  if (projector && sc) {
    base.dimensions.push({
      id: 'throw', from: [projector.lens[0] + 0.3, projector.lens[1], sc.projectionZ], to: [projector.lens[0] + 0.3, projector.lens[1], projector.lens[2]],
      valueM: projector.throwDistanceM, kind: 'info', labelKey: 'dim.throw',
    });
  }
  return isOverhead(spec) ? overheadLayout(state, spec, base) : portableLayout(state, spec, base);
}

function overheadLayout(state: PlannerStateV1, spec: OverheadSpec, base: LayoutBase): OverheadLayout {
  const H = state.room.heightM;
  const top = H - state.sensor.mountDropM;
  const offset = inToM(spec.lensToTeeIn.value);
  // Sensor sits on the screen side of the tee (D01 p.4, D03 p.9, D10 p.10 drawings).
  const lensX = state.tee.xM;
  const lensZ = state.tee.zM - offset;
  const body: Box = {
    center: [lensX, top - inToM(spec.deviceSizeIn.h) / 2, lensZ],
    size: [inToM(spec.deviceSizeIn.w), inToM(spec.deviceSizeIn.h), inToM(spec.deviceSizeIn.d)],
    rotationY: 0,
  };
  const a = inToM(spec.maxArea.sideAIn);
  const b = inToM(spec.maxArea.sideBIn);
  const cx = state.tee.xM;
  const cz = state.tee.zM;
  // Manual basis: side A ∥ screen, centred on the tee (D11 p.13 figure; D01 p.7).
  const primary = rectFromCentre(cx, cz, a, b);
  const toWorld = (z: ZoneRect): Rect2 => {
    const r = toRect2(z);
    return { minX: r.minX + cx, maxX: r.maxX + cx, minZ: r.minZ + cz, maxZ: r.maxZ + cz };
  };
  const configZones: OverheadLayout['configZones'] =
    spec.id === 'N1'
      ? [{ id: 'ready', rect: toWorld(state.zones.N1.ready) }, { id: 'tee', rect: toWorld(state.zones.N1.tee) }]
      : [{ id: 'basic', rect: toWorld(state.zones.N2.basic) }, { id: 'tee', rect: toWorld(state.zones.N2.tee) }];

  const dims = [...base.dimensions];
  dims.push({
    id: 'mount-height', from: [lensX + body.size[0] / 2 + 0.08, 0, lensZ], to: [lensX + body.size[0] / 2 + 0.08, top, lensZ],
    valueM: top, kind: 'official', labelKey: 'dim.mountHeight',
  });
  dims.push({
    id: 'lens-to-tee', from: [lensX, base.hittingSurfaceY + 0.004, lensZ], to: [lensX, base.hittingSurfaceY + 0.004, state.tee.zM],
    valueM: offset, kind: 'official', labelKey: 'dim.lensToTee',
  });
  return {
    ...base,
    dimensions: dims,
    kind: 'overhead',
    sensorAnchor: [lensX, top, lensZ],
    sensorRotationY: 0,
    sensorBody: body,
    mountHeightFromFloorM: top,
    mountHeightFromSurfaceM: top - base.hittingSurfaceY,
    lensFloorPoint: [lensX, base.hittingSurfaceY, lensZ],
    lensToTeeM: offset,
    calibrationBoardCenter: [state.tee.xM, base.hittingSurfaceY, state.tee.zM],
    maxArea: { center: [cx, base.hittingSurfaceY, cz], primary, sideAM: a, sideBM: b, datumStatus: spec.maxArea.centreDatum },
    configZones,
  };
}

function portableLayout(state: PlannerStateV1, spec: PortableSpec, base: LayoutBase): PortableLayout {
  // Right-handed golfer addresses the ball from the −X side, so the device faces them from +X.
  // Manual basis: D05 p.15 drawing (see spec.dataCollectionDatum).
  const side: 1 | -1 = state.handedness === 'right' ? 1 : -1;
  const zoneD = inToM(spec.strikeZoneIn.d);
  const zoneW = inToM(spec.strikeZoneIn.w);
  const gap = inToM(spec.dataCollectionPointsIn.value);
  const devD = inToM(spec.deviceSizeIn.d);
  const devW = inToM(spec.deviceSizeIn.w);
  const devH = inToM(spec.deviceSizeIn.h);
  const tx = state.tee.xM;
  const tz = state.tee.zM;
  // Ball at Ready Zone centre (D05 p.24). Zone depth runs along X toward the device.
  const frontX = tx + side * (zoneD / 2 + gap);
  const centreX = frontX + side * (devD / 2);
  const backX = frontX + side * devD;
  const strikeZone = rectFromCentre(tx, tz, zoneD, zoneW);
  const farX = tx - side * (zoneD / 2);
  const fpW = inToM(spec.installationSpaceIn.w);
  const installationFootprint: Rect2 = {
    minX: Math.min(backX, farX), maxX: Math.max(backX, farX), minZ: tz - fpW / 2, maxZ: tz + fpW / 2,
  };
  const deviceOnMat = !!base.matRect && centreX >= base.matRect.minX && centreX <= base.matRect.maxX;
  const floorY = deviceOnMat ? base.hittingSurfaceY : 0;
  const dims = [...base.dimensions];
  dims.push({
    id: 'footprint-depth', from: [installationFootprint.minX, floorY + 0.004, installationFootprint.maxZ + 0.08],
    to: [installationFootprint.maxX, floorY + 0.004, installationFootprint.maxZ + 0.08],
    valueM: installationFootprint.maxX - installationFootprint.minX, kind: 'official', labelKey: 'dim.footprintDepth',
  });
  dims.push({
    id: 'device-to-zone', from: [frontX, floorY + 0.004, tz], to: [tx + side * (zoneD / 2), floorY + 0.004, tz],
    valueM: gap, kind: 'official', labelKey: 'dim.dataCollection',
  });
  return {
    ...base,
    dimensions: dims,
    kind: 'portable',
    deviceAnchor: [centreX, floorY, tz],
    deviceRotationY: -side * (Math.PI / 2),
    deviceBody: { center: [centreX, floorY + devH / 2, tz], size: [devD, devH, devW], rotationY: 0 },
    deviceSide: side,
    strikeZone,
    installationFootprint,
    datumStatus: spec.dataCollectionDatum.status,
  };
}
