/**
 * Installation rules engine (blueprint §12). Pure functions; the renderer never owns truth.
 *
 *  PASS          documented requirement satisfied
 *  CAUTION       near a limit, datum-dependent, or a geometric concern that is not a documented rule
 *  FAIL          documented requirement (or physical room bound) violated
 *  NOT_VERIFIED  required manufacturer datum is unapproved/absent — never silently upgraded to PASS
 *  NOT_EVALUATED subsystem not configured / data not available
 */
import type { Citation } from '../data/sources';
import type { OverheadSpec, PortableSpec, ProductSpec } from '../data/specs/products';
import { isOverhead, SPEC_REVISION } from '../data/specs/products';
import type { Layout, OverheadLayout, PortableLayout } from './layout';
import { computeLayout } from './layout';
import type { PlannerStateV1 } from './schema';
import { validateState } from './schema';
import { contains, overflow, rectFromCentre, toRect2 } from './zone-geometry';
import { GEOMETRY_EPSILON_M, inToM } from './units';
import type { Aabb } from './swing';
import { bodyOf, clubClearanceToBox, swingPose, toWorld, T_TOP } from './swing';
import type { Vec3 } from './layout';
import type { Rect2 } from './zone-geometry';
import { BUFFER_MIN_IN, REAR_RECOMMENDED_IN } from '../data/carls';
import { PROJECTOR_MOUNT_GAP_M } from './equipment';

/** Carl's Place citations (quotes are verified against the archived spec sheets by verify_spec_sources.py). */
export const CARLS_CITES = {
  diyRear: { doc: 'C01', page: 1, quote: 'Footprint Depth includes the backset rear fitting, adding 8.25”.' },
  proRear: { doc: 'C02', page: 1, quote: 'Backset rear fitting adds 9.5”D.' },
  curvedRear: { doc: 'C03', page: 1, quote: 'Backset rear fitting adds 9.5”D.' },
  diyOuter: { doc: 'C01', page: 1, quote: 'Verify the actual outer dimensions to ensure a correct fit.' },
  proOuter: { doc: 'C02', page: 1, quote: 'Verify the actual outer dimensions to ensure a correct fit.' },
  curvedOuter: { doc: 'C03', page: 1, quote: 'Verify the actual outer dimensions to ensure a correct fit.' },
  buffer: { doc: 'C05', page: 0, quote: 'add a 2"-3" buffer space on each side of and above the enclosure' },
  rearRec: { doc: 'C04', page: 0, quote: 'A minimum of 8.25" is required to fit the rear fittings ... 12" at the rear is recommended' },
  throwAk: { doc: 'C08', page: 0, quote: 'Throw Ratio: 0.69~0.83' },
  throwAh: { doc: 'C09', page: 0, quote: 'Throw Ratio: 0.69~0.83' },
  throwLg: { doc: 'C10', page: 0, quote: 'Throw Ratio: 0.94 - 1.14 · Lens Shift - Vertical: ±50%' },
} satisfies Record<string, Citation>;

const FAMILY_CITES = {
  DIY: { rear: CARLS_CITES.diyRear, outer: CARLS_CITES.diyOuter },
  PRO: { rear: CARLS_CITES.proRear, outer: CARLS_CITES.proOuter },
  CURVED: { rear: CARLS_CITES.curvedRear, outer: CARLS_CITES.curvedOuter },
} as const;
const PROJECTOR_CITES: Record<string, Citation> = {
  'benq-ak700st': CARLS_CITES.throwAk, 'benq-ah700st': CARLS_CITES.throwAh, 'lg-bu53rg': CARLS_CITES.throwLg,
};

/** Clearance bands for the swing model (blueprint §9.4): < 0 contact, < 15 cm tight. */
export const SWING_CAUTION_M = 0.15;

export type DomainStatus = 'PASS' | 'CAUTION' | 'FAIL' | 'NOT_VERIFIED' | 'NOT_EVALUATED';
export type CheckCategory = 'room' | 'sensor' | 'hitting_area' | 'ready_zone' | 'swing' | 'screen' | 'projector' | 'obstacle';

export type DomainCheck = {
  id: string;
  category: CheckCategory;
  status: DomainStatus;
  messageKey: string;
  params?: Record<string, number | string>;
  /** metres unless stated */
  value?: number;
  requiredRange?: [number, number];
  sources?: Citation[];
  confidence: 'documented' | 'manual_drawing' | 'catalog' | 'geometric' | 'swing_model' | 'unknown';
  datumNote?: string;
};

export type Verdict = {
  headlineKey: 'verdict.invalidInput' | 'verdict.conditionsNotMet' | 'verdict.preliminary' | 'verdict.withinChecked';
  counts: Record<DomainStatus, number>;
  specRevision: string;
};

export type Evaluation = { layout: Layout | null; checks: DomainCheck[]; verdict: Verdict };

/** Display order: problems first, then by installation importance; unconfigured subsystems last. */
const CATEGORY_ORDER: CheckCategory[] = ['sensor', 'room', 'hitting_area', 'ready_zone', 'screen', 'swing', 'projector', 'obstacle'];
function rank(c: DomainCheck): number {
  const tier = c.status === 'FAIL' ? 0 : c.status === 'CAUTION' ? 1 : c.status === 'NOT_EVALUATED' ? 3 : 2;
  return tier * 100 + CATEGORY_ORDER.indexOf(c.category) * 10 + (c.status === 'PASS' ? 0 : 1);
}

export function evaluate(state: PlannerStateV1, spec: ProductSpec): Evaluation {
  const errors = validateState(state);
  if (errors.length) {
    const checks: DomainCheck[] = errors.map((e) => ({
      id: `input-${e.field}`, category: 'room', status: 'FAIL', messageKey: `check.input.${e.messageKey}`,
      params: { field: e.field, min: e.range?.[0] ?? '', max: e.range?.[1] ?? '' }, confidence: 'geometric',
    }));
    return { layout: null, checks, verdict: verdictOf(checks, true) };
  }
  const layout = computeLayout(state, spec);
  const checks = [
    ...commonChecks(state, layout),
    ...(isOverhead(spec)
      ? overheadChecks(state, spec, layout as OverheadLayout)
      : portableChecks(state, spec, layout as PortableLayout)),
    ...swingChecks(state, spec, layout),
    ...projectorChecks(state, layout),
  ];
  checks.sort((a, b) => rank(a) - rank(b));
  return { layout, checks, verdict: verdictOf(checks, false) };
}

export function verdictOf(checks: DomainCheck[], invalidInput: boolean): Verdict {
  const counts: Record<DomainStatus, number> = { PASS: 0, CAUTION: 0, FAIL: 0, NOT_VERIFIED: 0, NOT_EVALUATED: 0 };
  checks.forEach((c) => (counts[c.status] += 1));
  const headlineKey = invalidInput
    ? 'verdict.invalidInput'
    : counts.FAIL > 0
      ? 'verdict.conditionsNotMet'
      : counts.NOT_VERIFIED > 0 || counts.CAUTION > 0
        ? 'verdict.preliminary'
        : 'verdict.withinChecked';
  return { headlineKey, counts, specRevision: SPEC_REVISION };
}

// --------------------------------------------------------------------------- common

function commonChecks(state: PlannerStateV1, layout: Layout): DomainCheck[] {
  const out: DomainCheck[] = [];
  const room = layout.room.bounds;
  const [bx, , bz] = layout.ball;
  const ballInside = bx > room.minX && bx < room.maxX && bz > room.minZ && bz < room.maxZ;
  out.push({
    id: 'tee-in-room', category: 'room', status: ballInside ? 'PASS' : 'FAIL',
    messageKey: ballInside ? 'check.teeInRoom.pass' : 'check.teeInRoom.fail', confidence: 'geometric',
  });
  if (layout.matRect) {
    const mat = layout.matRect;
    const ok = contains(room, mat);
    const o = overflow(room, mat);
    out.push({
      id: 'mat-in-room', category: 'room', status: ok ? 'PASS' : 'FAIL',
      messageKey: ok ? 'check.matInRoom.pass' : 'check.matInRoom.fail',
      params: { by: Math.max(o.left, o.right, o.front, o.back) }, confidence: 'geometric',
    });
  }
  const sc = layout.screen;
  if (!sc) {
    out.push({ id: 'screen-off', category: 'screen', status: 'NOT_EVALUATED', messageKey: 'check.screen.off', confidence: 'unknown' });
    return out;
  }
  const teeAhead = state.tee.zM > sc.planeZ;
  out.push({
    id: 'tee-vs-screen', category: 'screen', status: teeAhead ? 'PASS' : 'FAIL',
    messageKey: teeAhead ? 'check.teeVsScreen.pass' : 'check.teeVsScreen.fail',
    params: { dist: state.tee.zM - sc.planeZ }, value: state.tee.zM - sc.planeZ, confidence: 'geometric',
  });
  const enc = layout.enclosure;
  if (!enc) {
    const fitsW = sc.widthM <= state.room.widthM + GEOMETRY_EPSILON_M;
    const fitsH = sc.bottomM + sc.heightM <= state.room.heightM + GEOMETRY_EPSILON_M;
    out.push({
      id: 'screen-fit', category: 'screen', status: fitsW && fitsH ? 'PASS' : 'FAIL',
      messageKey: fitsW && fitsH ? 'check.screenFit.pass' : 'check.screenFit.fail', confidence: 'geometric',
    });
    return out;
  }
  out.push(...enclosureChecks(state, enc));
  return out;
}

type EncL = NonNullable<Layout['enclosure']>;

/** Carl's Place fit rules: actual outer dimensions + 2″ buffer each side and above; rear fitting behind the screen. */
export function enclosureChecks(state: PlannerStateV1, enc: EncL): DomainCheck[] {
  const out: DomainCheck[] = [];
  const fam = FAMILY_CITES[enc.model.family];
  const buf = inToM(BUFFER_MIN_IN);
  const name = `${enc.model.family === 'DIY' ? 'DIY' : enc.model.family === 'PRO' ? 'Pro' : 'Curved'} ${enc.model.listing.replace(' x ', ' × ')}`;
  const fit = (room: number, outer: number, need: number): DomainStatus =>
    room + GEOMETRY_EPSILON_M < outer ? 'FAIL' : room + GEOMETRY_EPSILON_M < need ? 'CAUTION' : 'PASS';

  const wNeed = enc.outerWM + 2 * buf;
  const ws = fit(state.room.widthM, enc.outerWM, wNeed);
  out.push({
    id: 'enclosure-width', category: 'screen', status: ws, messageKey: `check.encWidth.${ws.toLowerCase()}`,
    params: { name, outer: enc.outerWM, need: wNeed, room: state.room.widthM, by: Math.abs(wNeed - state.room.widthM) },
    value: state.room.widthM - enc.outerWM, sources: [fam.outer, CARLS_CITES.buffer], confidence: 'catalog',
  });
  const hNeed = enc.outerHM + buf;
  const hs = fit(state.room.heightM, enc.outerHM, hNeed);
  out.push({
    id: 'enclosure-height', category: 'screen', status: hs, messageKey: `check.encHeight.${hs.toLowerCase()}`,
    params: { name, outer: enc.outerHM, need: hNeed, room: state.room.heightM, by: Math.abs(hNeed - state.room.heightM) },
    value: state.room.heightM - enc.outerHM, sources: [fam.outer, CARLS_CITES.buffer], confidence: 'catalog',
  });
  const rearRec = enc.model.family === 'DIY' ? inToM(REAR_RECOMMENDED_IN) : enc.rearFittingM;
  const rs: DomainStatus = enc.screenZ + GEOMETRY_EPSILON_M < enc.rearFittingM ? 'FAIL' : enc.screenZ + GEOMETRY_EPSILON_M < rearRec ? 'CAUTION' : 'PASS';
  out.push({
    id: 'enclosure-rear', category: 'screen', status: rs, messageKey: `check.encRear.${rs.toLowerCase()}`,
    params: { rear: enc.rearFittingM, rec: rearRec, gap: enc.screenZ },
    value: enc.screenZ, sources: enc.model.family === 'DIY' ? [fam.rear, CARLS_CITES.rearRec] : [fam.rear], confidence: 'catalog',
  });
  const ds = enc.frontZ <= state.room.depthM + GEOMETRY_EPSILON_M ? 'PASS' : 'FAIL';
  out.push({
    id: 'enclosure-depth', category: 'screen', status: ds, messageKey: `check.encDepth.${ds.toLowerCase()}`,
    params: { depth: enc.depthM, total: enc.frontZ, by: enc.frontZ - state.room.depthM },
    sources: [fam.outer], confidence: 'catalog',
  });
  return out;
}

// --------------------------------------------------------------------------- overhead (N1/N2)

/** Installation height = hitting surface (mat / swing plate top) → ceiling (owner decision DL-37). */
export function mountHeightStatus(fromSurfaceM: number, rangeM: [number, number]): DomainStatus {
  return fromSurfaceM >= rangeM[0] - GEOMETRY_EPSILON_M && fromSurfaceM <= rangeM[1] + GEOMETRY_EPSILON_M ? 'PASS' : 'FAIL';
}

function overheadChecks(state: PlannerStateV1, spec: OverheadSpec, L: OverheadLayout): DomainCheck[] {
  const out: DomainCheck[] = [];
  const range: [number, number] = [inToM(spec.mountHeightIn.min), inToM(spec.mountHeightIn.max)];
  const h = L.mountHeightFromSurfaceM;
  const hStatus = mountHeightStatus(h, range);
  const surfaceY = L.mountHeightFromFloorM - h;
  out.push({
    id: 'sensor-mount-height', category: 'sensor', status: hStatus,
    messageKey: `check.mountHeight.${hStatus.toLowerCase()}`,
    params: {
      below: Math.max(0, range[0] - h),
      above: Math.max(0, h - range[1]),
      surface: h,
      // ceiling heights (from the floor) that put hitting surface → ceiling inside the range
      // whole millimetres inward, so the stated limit itself passes (2.9501 m must not read "2.950 m")
      minCeiling: Math.ceil((range[0] + surfaceY) * 1000) / 1000,
      maxCeiling: Math.floor((range[1] + surfaceY) * 1000) / 1000,
    },
    value: h, requiredRange: range, sources: [...spec.mountHeightIn.cites, ...spec.mountHeightDatum.cites],
    confidence: 'manual_drawing', datumNote: spec.mountHeightDatum.note,
  });

  const room = L.room.bounds;
  const [w, , d] = L.sensorBody.size;
  const [sx, , sz] = L.sensorBody.center;
  const body = rectFromCentre(sx, sz, w, d);
  const bodyInside = contains(room, body);
  const o = overflow(room, body);
  out.push({
    id: 'sensor-in-room', category: 'sensor', status: bodyInside ? 'PASS' : 'FAIL',
    messageKey: bodyInside ? 'check.sensorInRoom.pass' : o.front > 0 ? 'check.sensorInRoom.failFront' : 'check.sensorInRoom.failSide',
    params: { by: Math.max(o.left, o.right, o.front, o.back), offset: L.lensToTeeM },
    sources: spec.lensToTeeIn.cites, confidence: 'manual_drawing', datumNote: spec.lensToTeeDatum.note,
  });

  if (L.screen) {
    const lensAhead = L.lensFloorPoint[2] >= L.screen.planeZ;
    out.push({
      id: 'sensor-vs-screen', category: 'sensor', status: lensAhead ? 'PASS' : 'CAUTION',
      messageKey: lensAhead ? 'check.sensorVsScreen.pass' : 'check.sensorVsScreen.caution',
      params: { by: L.screen.planeZ - L.lensFloorPoint[2] }, confidence: 'geometric',
    });
  }

  out.push(areaOnSurfaceCheck(L, L.maxArea.primary, 'max-area', {
    label: spec.maxArea.label, a: spec.maxArea.sideAIn, b: spec.maxArea.sideBIn,
  }, spec.maxArea.cites));

  // Sensor body vs. the enclosure top frame
  const enc = L.enclosure;
  if (enc) {
    const top = L.sensorAnchor[1];
    const bottom = top - L.sensorBody.size[1];
    const frameBottom = enc.topY - enc.pipeOdM;
    const z0 = sz - d / 2;
    const z1 = sz + d / 2;
    const inside = z1 > enc.minZ && z0 < enc.maxZ;
    // above the top fabric: the camera would look through it; crossing the top frame: physical clash
    const above = inside && bottom >= frameBottom;
    const crossesTop = inside && !above && top > frameBottom;
    const crossesFront = z0 < enc.maxZ && z1 > enc.maxZ && top > frameBottom && bottom < enc.topY;
    const key = above ? 'failAbove' : crossesTop || crossesFront ? 'failFrame' : inside ? 'passInside' : 'pass';
    out.push({
      id: 'sensor-vs-enclosure', category: 'sensor', status: key.startsWith('fail') ? 'FAIL' : 'PASS',
      messageKey: `check.sensorVsEnclosure.${key}`, params: { by: top - frameBottom }, confidence: 'geometric',
    });
  }

  out.push(...zoneContainmentChecks(state, spec));
  return out;
}

/** Design-intent zone containment, evaluated in max-area local coordinates (orientation-independent). */
export function zoneContainmentChecks(state: PlannerStateV1, spec: OverheadSpec): DomainCheck[] {
  const max = toRect2({ cx: 0, cz: 0, w: inToM(spec.maxArea.sideAIn), d: inToM(spec.maxArea.sideBIn) });
  const zones = spec.id === 'N1'
    ? { ready: state.zones.N1.ready, tee: state.zones.N1.tee } as Record<string, typeof state.zones.N1.ready>
    : { basic: state.zones.N2.basic, tee: state.zones.N2.tee } as Record<string, typeof state.zones.N2.basic>;
  return spec.zoneRules
    .filter((r) => r.mustBeInside !== null)
    .map((rule) => {
      const inner = zones[rule.zone];
      const outerZone = rule.mustBeInside === 'max' ? null : zones[rule.mustBeInside as string];
      const outer = outerZone ? toRect2(outerZone) : max;
      const ok = !!inner && inner.w > 0 && inner.d > 0 && contains(outer, toRect2(inner));
      return {
        id: `zone-${rule.zone}-in-${rule.mustBeInside}`, category: 'ready_zone' as const,
        status: ok ? ('PASS' as const) : ('FAIL' as const),
        messageKey: ok ? 'check.zoneContainment.pass' : 'check.zoneContainment.fail',
        params: { zone: rule.softwareName, outer: rule.mustBeInside === 'max' ? spec.maxArea.label : 'Basic Zone' },
        sources: rule.cites, confidence: 'documented' as const,
      };
    });
}

/** Published hitting area vs. the hitting surface (mat) — the ball is struck from the mat. */
function areaOnSurfaceCheck(L: Layout, area: Rect2, id: string, params: Record<string, number | string>, sources: Citation[]): DomainCheck {
  const surface = L.matRect ?? L.room.bounds;
  const ok = contains(surface, area);
  const o = overflow(surface, area);
  return {
    id, category: 'hitting_area', status: ok ? 'PASS' : 'CAUTION',
    messageKey: ok ? 'check.area.pass' : 'check.area.caution',
    params: { ...params, by: Math.max(o.left, o.right, o.front, o.back) }, sources, confidence: 'manual_drawing',
  };
}

// --------------------------------------------------------------------------- portable (NEO-E)

function portableChecks(state: PlannerStateV1, spec: PortableSpec, L: PortableLayout): DomainCheck[] {
  const out: DomainCheck[] = [];
  const room = L.room.bounds;
  const fpW = inToM(spec.installationSpaceIn.w);
  const fpD = inToM(spec.installationSpaceIn.d);
  const roomFitsAtAll = (fpW <= state.room.widthM && fpD <= state.room.depthM) || (fpD <= state.room.widthM && fpW <= state.room.depthM);
  const placedInside = contains(room, L.installationFootprint);
  const o = overflow(room, L.installationFootprint);
  const status: DomainStatus = !roomFitsAtAll ? 'FAIL' : placedInside ? 'PASS' : 'CAUTION';
  out.push({
    id: 'installation-space', category: 'sensor', status,
    messageKey: `check.installSpace.${status.toLowerCase()}`,
    params: { w: spec.installationSpaceIn.w, d: spec.installationSpaceIn.d, by: Math.max(o.left, o.right, o.front, o.back) },
    sources: [...spec.installationSpaceIn.cites, ...spec.dataCollectionDatum.cites], confidence: 'manual_drawing',
    datumNote: spec.dataCollectionDatum.note,
  });
  if (L.screen && L.installationFootprint.minZ < L.screen.planeZ) {
    out.push({
      id: 'install-space-vs-screen', category: 'screen', status: 'CAUTION', messageKey: 'check.installSpaceVsScreen.caution',
      params: { by: L.screen.planeZ - L.installationFootprint.minZ }, confidence: 'geometric',
    });
  }
  out.push(areaOnSurfaceCheck(L, L.strikeZone, 'strike-zone', {
    label: 'Strike Zone', a: spec.strikeZoneIn.w, b: spec.strikeZoneIn.d,
  }, [...spec.strikeZoneIn.cites, ...spec.ballAtZoneCentre.cites]));
  out.push({
    id: 'handedness', category: 'ready_zone', status: 'PASS', messageKey: `check.handedness.${state.handedness}`,
    sources: spec.handedness.cites, confidence: 'documented',
  });
  return out;
}

// --------------------------------------------------------------------------- swing model

function band(distance: number): DomainStatus {
  return distance <= 0 ? 'FAIL' : distance < SWING_CAUTION_M ? 'CAUTION' : 'PASS';
}

function boxOf(center: Vec3, size: Vec3): Aabb {
  return {
    min: [center[0] - size[0] / 2, center[1] - size[1] / 2, center[2] - size[2] / 2],
    max: [center[0] + size[0] / 2, center[1] + size[1] / 2, center[2] + size[2] / 2],
  };
}

export function sensorBox(L: Layout): Aabb {
  if (L.kind === 'overhead') return boxOf(L.sensorBody.center, L.sensorBody.size);
  return boxOf(L.deviceBody.center, L.deviceBody.size);
}

function swingChecks(state: PlannerStateV1, spec: ProductSpec, L: Layout): DomainCheck[] {
  const g = L.golfer;
  const common = { h: state.golfer.heightM, club: state.golfer.club };
  const out: DomainCheck[] = [];
  const ceiling = state.room.heightM - g.topY;
  const cs = band(ceiling);
  out.push({
    id: 'swing-ceiling', category: 'swing', status: cs, messageKey: `check.swingCeiling.${cs.toLowerCase()}`,
    params: { ...common, margin: ceiling, top: g.topY }, value: ceiling, confidence: 'swing_model',
  });

  const sensor = clubClearanceToBox(g.samples, sensorBox(L));
  const ss = band(sensor.distance);
  out.push({
    id: 'swing-sensor', category: 'swing', status: ss, messageKey: `check.swingSensor.${ss.toLowerCase()}`,
    params: { ...common, margin: sensor.distance, product: spec.displayName }, value: sensor.distance, confidence: 'swing_model',
  });

  const r = L.room.bounds;
  const e = g.extents;
  const front = L.screen ? Math.max(r.minZ, L.screen.planeZ) : r.minZ;
  // Club points inside the enclosure are bounded by its side fabric; the rest by the room walls.
  const enc = L.enclosure;
  let side = r.maxZ - e.maxZ;
  let netLimited = false;
  for (const smp of g.samples) {
    for (const p of [smp.head, smp.gripEnd]) {
      const inEnc = !!enc && p[2] - smp.headR < enc.maxZ;
      const left = inEnc ? Math.max(r.minX, enc!.minX + enc!.pipeOdM) : r.minX;
      const right = inEnc ? Math.min(r.maxX, enc!.maxX - enc!.pipeOdM) : r.maxX;
      const m = Math.min(p[0] - smp.headR - left, right - p[0] - smp.headR);
      if (m < side) {
        side = m;
        netLimited = inEnc;
      }
    }
  }
  const inEnc = netLimited;
  const ws = band(side);
  out.push({
    id: 'swing-walls', category: 'swing', status: ws, messageKey: `check.swingWalls.${ws.toLowerCase()}`,
    params: { ...common, margin: side, wall: inEnc ? 'net' : 'wall' }, value: side, confidence: 'swing_model',
  });
  const scr = e.minZ - front;
  const sc = band(scr);
  out.push({
    id: 'swing-screen', category: 'swing', status: sc, messageKey: `check.swingScreen.${sc.toLowerCase()}`,
    params: { ...common, margin: scr }, value: scr, confidence: 'swing_model',
  });
  return out;
}

// --------------------------------------------------------------------------- projector (generic geometry)

function rayHitsBox(o: Vec3, p: Vec3, b: Aabb): boolean {
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 3; i++) {
    const d = p[i]! - o[i]!;
    if (Math.abs(d) < 1e-9) {
      if (o[i]! < b.min[i]! || o[i]! > b.max[i]!) return false;
      continue;
    }
    let a = (b.min[i]! - o[i]!) / d;
    let c = (b.max[i]! - o[i]!) / d;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
    if (t0 > t1) return false;
  }
  return true;
}

function rayHitsSphere(o: Vec3, p: Vec3, c: Vec3, r: number): boolean {
  const d: Vec3 = [p[0] - o[0], p[1] - o[1], p[2] - o[2]];
  const f: Vec3 = [o[0] - c[0], o[1] - c[1], o[2] - c[2]];
  const a = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  const b = 2 * (f[0] * d[0] + f[1] * d[1] + f[2] * d[2]);
  const cc = f[0] * f[0] + f[1] * f[1] + f[2] * f[2] - r * r;
  const disc = b * b - 4 * a * cc;
  if (disc < 0) return false;
  const s = Math.sqrt(disc);
  const t1 = (-b - s) / (2 * a);
  const t2 = (-b + s) / (2 * a);
  return (t1 > 0 && t1 < 1) || (t2 > 0 && t2 < 1);
}

/** Fraction of a 9 × 7 grid of screen points whose light ray is blocked. */
function shadowFraction(L: Layout, blocked: (o: Vec3, p: Vec3) => boolean): number {
  const P = L.projector!;
  const [bl, br, , tl] = P.corners;
  let hit = 0;
  let n = 0;
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 7; j++) {
      const u = i / 8;
      const v = j / 6;
      const p: Vec3 = [bl[0] + (br[0] - bl[0]) * u, bl[1] + (tl[1] - bl[1]) * v, bl[2]];
      n++;
      if (blocked(P.lens, p)) hit++;
    }
  }
  return hit / n;
}

/** Gap between two boxes (0 when they touch or overlap). */
function boxGap(a: Aabb, b: Aabb): number {
  let s = 0;
  for (let i = 0; i < 3; i++) {
    const d = Math.max(0, a.min[i]! - b.max[i]!, b.min[i]! - a.max[i]!);
    s += d * d;
  }
  return Math.sqrt(s);
}

/** Projector body plus its drop pole up to the ceiling (ProjectorRig draws a 36 mm pole). */
export function projectorBoxes(L: Layout): Aabb[] {
  const P = L.projector!;
  const body = boxOf(P.body.center, P.body.size);
  const out = [body];
  if (L.room.heightM - body.max[1] > 0.01) {
    const [x, , z] = P.body.center;
    out.push({ min: [x - 0.018, body.max[1], z - 0.018], max: [x + 0.018, L.room.heightM, z + 0.018] });
  }
  return out;
}

function projectorChecks(state: PlannerStateV1, L: Layout): DomainCheck[] {
  if (!L.projector) {
    return [{ id: 'projector', category: 'projector', status: 'NOT_EVALUATED', messageKey: L.screen ? 'check.projector.off' : 'check.screen.off', confidence: 'unknown' }];
  }
  const P = L.projector;
  const out: DomainCheck[] = [];
  const cite = PROJECTOR_CITES[P.model.id];
  const body = boxOf(P.body.center, P.body.size);
  const depthOk = body.max[2] <= state.room.depthM + GEOMETRY_EPSILON_M;
  const heightOk = P.dropM >= PROJECTOR_MOUNT_GAP_M - GEOMETRY_EPSILON_M;
  const ps: DomainStatus = depthOk && heightOk ? 'PASS' : 'FAIL';
  out.push({
    id: 'projector-in-room', category: 'projector', status: ps,
    messageKey: ps === 'PASS' ? 'check.projectorInRoom.pass' : !depthOk ? 'check.projectorInRoom.failDepth' : 'check.projectorInRoom.failHeight',
    params: {
      name: P.model.name, dist: P.throwDistanceM, ratio: P.throwRatio, min: P.distanceRangeM[0], max: P.distanceRangeM[1],
      by: depthOk ? PROJECTOR_MOUNT_GAP_M - P.dropM : body.max[2] - state.room.depthM, lensY: P.lens[1], drop: Math.max(0, P.dropM),
    },
    sources: cite ? [cite] : undefined, confidence: 'catalog',
  });

  const parts = projectorBoxes(L);
  const club = parts.map((b) => clubClearanceToBox(L.golfer.samples, b)).reduce((a, b) => (b.distance < a.distance ? b : a));
  const cs = band(club.distance);
  out.push({
    id: 'projector-club', category: 'projector', status: cs, messageKey: `check.projectorClub.${cs.toLowerCase()}`,
    params: { margin: club.distance }, value: club.distance, confidence: 'swing_model',
  });

  if (L.kind === 'overhead') {
    const sb = sensorBox(L);
    // a ceiling sensor and a ceiling projector cannot share the same spot
    const gap = Math.min(...parts.map((b) => boxGap(sb, b)));
    const touch = gap <= GEOMETRY_EPSILON_M;
    out.push({
      id: 'projector-sensor', category: 'projector', status: touch ? 'FAIL' : 'PASS',
      messageKey: touch ? 'check.projectorSensor.fail' : 'check.projectorSensor.pass', params: { margin: gap }, value: gap, confidence: 'geometric',
    });
    const f = shadowFraction(L, (o, p) => rayHitsBox(o, p, sb));
    out.push({
      id: 'beam-sensor', category: 'projector', status: f > 0 ? 'CAUTION' : 'PASS',
      messageKey: f > 0 ? 'check.beamSensor.caution' : 'check.beamSensor.pass', params: { pct: Math.round(f * 100) }, confidence: 'geometric',
    });
  }

  const B = bodyOf(state.golfer.heightM);
  const heads = [0, T_TOP].map((t) => toWorld(swingPose(state.golfer.heightM, state.golfer.club, t).head, L.golfer.frame));
  const gf = shadowFraction(L, (o, p) => heads.some((h) => rayHitsSphere(o, p, h, B.headR * 1.15)));
  out.push({
    id: 'beam-golfer', category: 'projector', status: gf > 0 ? 'CAUTION' : 'PASS',
    messageKey: gf > 0 ? 'check.beamGolfer.caution' : 'check.beamGolfer.pass', params: { pct: Math.round(gf * 100) }, confidence: 'swing_model',
  });

  const enc = L.enclosure;
  if (enc && P.lens[2] > enc.maxZ) {
    // the ray to the top screen edge must pass under the enclosure's front top bar
    const top = P.corners[2];
    const barBottom = enc.topY - enc.pipeOdM;
    const t = (enc.maxZ - P.lens[2]) / (top[2] - P.lens[2]);
    const yAtBar = P.lens[1] + (top[1] - P.lens[1]) * t;
    const clear = yAtBar < barBottom;
    out.push({
      id: 'beam-enclosure', category: 'projector', status: clear ? 'PASS' : 'CAUTION',
      messageKey: clear ? 'check.beamEnclosure.pass' : 'check.beamEnclosure.caution', params: { by: yAtBar - barBottom }, confidence: 'geometric',
    });
  }
  return out;
}

