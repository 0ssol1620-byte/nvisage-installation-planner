/**
 * Runtime domain state (blueprint §13.5) + versioned share-link serialisation (§16.2).
 * Only room/equipment geometry is stored — no personal data, no 3D assets.
 */
import type { ProductId } from '../data/specs/products';
import { PRODUCT_ORDER } from '../data/specs/products';
import type { DisplayUnits } from './units';
import { roundToMm } from './units';
import type { ZoneRect } from './zone-geometry';
import type { ClubId } from './swing';
import { CLUB_ORDER } from './swing';
import type { ScreenMaterialId } from '../data/carls';
import { ENCLOSURES, MATS, PROJECTORS, SCREEN_MATERIALS } from '../data/carls';

export type Handedness = 'right' | 'left';
export type CameraPreset = '3d' | 'top' | 'side' | 'front';
export type LayerId = 'dimensions' | 'maxArea' | 'configZones' | 'footprint' | 'screen' | 'mat' | 'ceiling' | 'labels' | 'golfer' | 'swingArc' | 'beam';

export type PlannerStateV1 = {
  schemaVersion: 1;
  locale: 'en' | 'ko';
  displayUnits: DisplayUnits;
  room: { widthM: number; depthM: number; heightM: number };
  product: ProductId;
  handedness: Handedness;
  /** Ball / tee centre on the hitting surface. x: + to the right facing the screen; z: distance from front wall. */
  tee: { xM: number; zM: number };
  /** Hitting mat: a Carl's HotShot model id, or 'custom' with the dimensions below. */
  mat: { enabled: boolean; model: string; widthM: number; depthM: number; heightM: number };
  /** Overhead only: gap between the ceiling and the sensor's mount plane (0 = flush bracket). */
  sensor: { mountDropM: number };
  /**
   * Screen plane distance from the front wall (`setbackM`) applies to every setup. Width/height/bottom are
   * used only for a wall-mounted screen without an enclosure (`enclosure.model === 'none'`).
   */
  screen: { enabled: boolean; setbackM: number; widthM: number; heightM: number; bottomM: number };
  /** Enclosure (catalog id or 'none'), screen-to-front frame depth (in) and screen material. */
  enclosure: { model: string; depthIn: number; material: ScreenMaterialId };
  /** Golfer swing model: tallest golfer and club. Handedness is `handedness`. */
  golfer: { heightM: number; club: ClubId };
  /** Ceiling projector (catalog id or 'none'); throw ratio within the model's zoom range. */
  projector: { model: string; throwRatio: number };
  /** Design-intent zones in max-area local coordinates (metres). Not read from or written to a device. */
  zones: {
    N1: { ready: ZoneRect; tee: ZoneRect };
    N2: { basic: ZoneRect; tee: ZoneRect };
  };
  view: { camera: CameraPreset; layers: Record<LayerId, boolean> };
};

export const LIMITS = {
  roomWidthM: [1.5, 15],
  roomDepthM: [2, 20],
  roomHeightM: [2, 6],
  matSideM: [0.3, 6],
  // up to raised hitting platforms: 2D swing plates are 150 mm, 3D plates and built-up stages are taller
  matHeightM: [0, 0.4],
  mountDropM: [0, 1],
  screenSetbackM: [0, 2],
  screenWidthM: [0.5, 10],
  screenHeightM: [0.5, 5],
  screenBottomM: [0, 1.5],
  golferHeightM: [1.3, 2.1],
} as const;

/** Starting setup: Carl's DIY 9 x 12 enclosure, HotShot 4 x 9 mat, BenQ AK700ST, tee 10 ft from the screen. */
export function defaultState(product: ProductId = 'N1'): PlannerStateV1 {
  return {
    schemaVersion: 1,
    locale: 'en',
    displayUnits: 'metric',
    room: { widthM: 4.5, depthM: 6.0, heightM: 2.95 },
    product,
    handedness: 'right',
    tee: { xM: 0, zM: 3.353 },
    mat: { enabled: true, model: 'hotshot-4x9', widthM: 2.743, depthM: 1.219, heightM: 0.044 },
    sensor: { mountDropM: 0 },
    screen: { enabled: true, setbackM: 0.305, widthM: 3.2, heightM: 2.0, bottomM: 0.2 },
    enclosure: { model: 'DIY-9 x 12', depthIn: 59.125, material: 'premium' },
    golfer: { heightM: 1.75, club: 'driver' },
    projector: { model: 'benq-ak700st', throwRatio: 0.83 },
    zones: {
      N1: { ready: { cx: 0, cz: 0, w: 0.3, d: 0.36 }, tee: { cx: 0, cz: 0, w: 0.12, d: 0.12 } },
      N2: { basic: { cx: 0, cz: 0, w: 0.6, d: 0.45 }, tee: { cx: 0, cz: 0, w: 0.15, d: 0.15 } },
    },
    view: {
      camera: '3d',
      layers: { dimensions: true, maxArea: true, configZones: false, footprint: true, screen: true, mat: true, ceiling: false, labels: true, golfer: true, swingArc: true, beam: true },
    },
  };
}

// --------------------------------------------------------------------------- input validation

export type FieldError = { field: string; messageKey: 'invalid_number' | 'out_of_range'; range?: readonly [number, number] };

export function validateNumber(field: string, value: number, range: readonly [number, number]): FieldError | null {
  if (!Number.isFinite(value)) return { field, messageKey: 'invalid_number' };
  if (value < range[0] || value > range[1]) return { field, messageKey: 'out_of_range', range };
  return null;
}

export function validateState(s: PlannerStateV1): FieldError[] {
  const e = [
    validateNumber('room.widthM', s.room.widthM, LIMITS.roomWidthM),
    validateNumber('room.depthM', s.room.depthM, LIMITS.roomDepthM),
    validateNumber('room.heightM', s.room.heightM, LIMITS.roomHeightM),
    validateNumber('mat.widthM', s.mat.widthM, LIMITS.matSideM),
    validateNumber('mat.depthM', s.mat.depthM, LIMITS.matSideM),
    validateNumber('mat.heightM', s.mat.heightM, LIMITS.matHeightM),
    validateNumber('sensor.mountDropM', s.sensor.mountDropM, LIMITS.mountDropM),
    validateNumber('screen.setbackM', s.screen.setbackM, LIMITS.screenSetbackM),
    validateNumber('screen.widthM', s.screen.widthM, LIMITS.screenWidthM),
    validateNumber('screen.heightM', s.screen.heightM, LIMITS.screenHeightM),
    validateNumber('screen.bottomM', s.screen.bottomM, LIMITS.screenBottomM),
    validateNumber('golfer.heightM', s.golfer.heightM, LIMITS.golferHeightM),
  ];
  const enc = ENCLOSURES.find((x) => x.id === s.enclosure.model);
  if (s.enclosure.model !== 'none' && (!enc || !enc.depthsIn.includes(s.enclosure.depthIn))) e.push({ field: 'enclosure.model', messageKey: 'invalid_number' });
  if (!(s.enclosure.material in SCREEN_MATERIALS)) e.push({ field: 'enclosure.material', messageKey: 'invalid_number' });
  if (s.mat.model !== 'custom' && !MATS.some((m) => m.id === s.mat.model)) e.push({ field: 'mat.model', messageKey: 'invalid_number' });
  const pj = PROJECTORS.find((x) => x.id === s.projector.model);
  if (s.projector.model !== 'none' && !pj) e.push({ field: 'projector.model', messageKey: 'invalid_number' });
  if (pj && (s.projector.throwRatio < pj.throwMin - 1e-9 || s.projector.throwRatio > pj.throwMax + 1e-9)) {
    e.push({ field: 'projector.throwRatio', messageKey: 'out_of_range', range: [pj.throwMin, pj.throwMax] });
  }
  if (!Number.isFinite(s.tee.xM)) e.push({ field: 'tee.xM', messageKey: 'invalid_number' });
  if (!Number.isFinite(s.tee.zM)) e.push({ field: 'tee.zM', messageKey: 'invalid_number' });
  return e.filter((x): x is FieldError => x !== null);
}

// --------------------------------------------------------------------------- share links

const SHARE_PREFIX = 'v2.'; // v2: Carl's Place equipment (2026-10-12)

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(token: string): string {
  const b64 = token.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((token.length + 3) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Compact, versioned payload. View state is included so a shared link reproduces the same camera. */
export function serializeState(s: PlannerStateV1): string {
  const payload = {
    u: s.displayUnits === 'imperial' ? 1 : 0,
    l: s.locale,
    r: [s.room.widthM, s.room.depthM, s.room.heightM],
    p: s.product,
    h: s.handedness === 'left' ? 1 : 0,
    t: [s.tee.xM, s.tee.zM],
    m: [s.mat.enabled ? 1 : 0, s.mat.widthM, s.mat.depthM, s.mat.heightM, s.mat.model],
    d: s.sensor.mountDropM,
    s: [s.screen.enabled ? 1 : 0, s.screen.setbackM, s.screen.widthM, s.screen.heightM, s.screen.bottomM],
    z: [zoneArr(s.zones.N1.ready), zoneArr(s.zones.N1.tee), zoneArr(s.zones.N2.basic), zoneArr(s.zones.N2.tee)],
    c: s.view.camera,
    e: [s.enclosure.model, s.enclosure.depthIn, s.enclosure.material],
    g: [s.golfer.heightM, CLUB_ORDER.indexOf(s.golfer.club)],
    j: [s.projector.model, s.projector.throwRatio],
  };
  return SHARE_PREFIX + toBase64Url(JSON.stringify(payload));
}

const zoneArr = (z: ZoneRect) => [z.cx, z.cz, z.w, z.d];

export type ParseResult = { ok: true; state: PlannerStateV1 } | { ok: false; reason: 'empty' | 'version' | 'malformed' | 'invalid' };

/** Never throws. Malformed or out-of-range tokens return a safe failure; callers keep defaults. */
export function parseSharedState(token: string | null | undefined): ParseResult {
  if (!token) return { ok: false, reason: 'empty' };
  if (!token.startsWith(SHARE_PREFIX)) return { ok: false, reason: 'version' };
  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(token.slice(SHARE_PREFIX.length)));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  try {
    const p = raw as Record<string, unknown>;
    const num = (v: unknown): number => {
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('nan');
      return roundToMm(v);
    };
    const arr = (v: unknown, n: number): unknown[] => {
      if (!Array.isArray(v) || v.length !== n) throw new Error('arr');
      return v;
    };
    const zone = (v: unknown): ZoneRect => {
      const a = arr(v, 4);
      return { cx: num(a[0]), cz: num(a[1]), w: num(a[2]), d: num(a[3]) };
    };
    const product = p.p;
    if (typeof product !== 'string' || !PRODUCT_ORDER.includes(product as ProductId)) throw new Error('product');
    const s = defaultState(product as ProductId);
    s.displayUnits = p.u === 1 ? 'imperial' : 'metric';
    s.locale = p.l === 'ko' ? 'ko' : 'en';
    const r = arr(p.r, 3);
    s.room = { widthM: num(r[0]), depthM: num(r[1]), heightM: num(r[2]) };
    s.handedness = p.h === 1 ? 'left' : 'right';
    const t = arr(p.t, 2);
    s.tee = { xM: num(t[0]), zM: num(t[1]) };
    const m = arr(p.m, 5);
    s.mat = { enabled: m[0] === 1, widthM: num(m[1]), depthM: num(m[2]), heightM: num(m[3]), model: String(m[4]) };
    s.sensor = { mountDropM: num(p.d) };
    const sc = arr(p.s, 5);
    s.screen = { enabled: sc[0] === 1, setbackM: num(sc[1]), widthM: num(sc[2]), heightM: num(sc[3]), bottomM: num(sc[4]) };
    const z = arr(p.z, 4);
    s.zones = { N1: { ready: zone(z[0]), tee: zone(z[1]) }, N2: { basic: zone(z[2]), tee: zone(z[3]) } };
    if (p.c === '3d' || p.c === 'top' || p.c === 'side' || p.c === 'front') s.view.camera = p.c;
    const e = arr(p.e, 3);
    s.enclosure = { model: String(e[0]), depthIn: Number(e[1]), material: String(e[2]) as ScreenMaterialId };
    if (p.g !== undefined) {
      const g = arr(p.g, 2);
      const club = CLUB_ORDER[Number(g[1])];
      if (!club) throw new Error('club');
      s.golfer = { heightM: num(g[0]), club };
    }
    const j = arr(p.j, 2);
    if (typeof j[1] !== 'number') throw new Error('ratio');
    s.projector = { model: String(j[0]), throwRatio: Math.round(j[1] * 1000) / 1000 };
    if (validateState(s).length) return { ok: false, reason: 'invalid' };
    return { ok: true, state: s };
  } catch {
    return { ok: false, reason: 'malformed' };
  }
}
