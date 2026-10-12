import { create } from 'zustand';
import type { ProductId } from '../data/specs/products';
import type { CameraPreset, Handedness, LayerId, PlannerStateV1 } from '../domain/schema';
import { defaultState, parseSharedState, serializeState } from '../domain/schema';
import type { DisplayUnits } from '../domain/units';
import type { ZoneRect } from '../domain/zone-geometry';
import { selectEnclosure, selectMat, selectProjector } from '../domain/packages';

export type ShareNotice = 'loaded' | 'invalid' | null;

type Actions = {
  setRoom: (patch: Partial<PlannerStateV1['room']>) => void;
  setProduct: (p: ProductId) => void;
  setHandedness: (h: Handedness) => void;
  setTee: (patch: Partial<PlannerStateV1['tee']>) => void;
  setMat: (patch: Partial<PlannerStateV1['mat']>) => void;
  setScreen: (patch: Partial<PlannerStateV1['screen']>) => void;
  setMountDrop: (m: number) => void;
  setGolfer: (patch: Partial<PlannerStateV1['golfer']>) => void;
  setProjector: (patch: Partial<PlannerStateV1['projector']>) => void;
  setEnclosure: (patch: Partial<PlannerStateV1['enclosure']>) => void;
  selectEnclosure: (id: string) => void;
  selectProjector: (id: string) => void;
  selectMat: (id: string) => void;
  setZone: (product: 'N1' | 'N2', zone: 'ready' | 'basic' | 'tee', patch: Partial<ZoneRect>) => void;
  setUnits: (u: DisplayUnits) => void;
  setLocale: (l: 'en' | 'ko') => void;
  setCamera: (c: CameraPreset) => void;
  toggleLayer: (l: LayerId) => void;
  setPlan2d: (on: boolean) => void;
  resetCameraTick: () => void;
};

type Store = {
  state: PlannerStateV1;
  /** UI-only, not shared */
  plan2d: boolean;
  cameraResetCounter: number;
  shareNotice: ShareNotice;
} & Actions;

const HASH_KEY = 's';
/** Last token this tab wrote to the URL: a reload of your own page is not a "shared setup". */
const OWN_KEY = 'nvisage-planner-own-hash';
const round2 = (v: number) => Math.round(v * 100) / 100;
const viewerLocale = (): 'en' | 'ko' => (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ko') ? 'ko' : 'en');
const readOwn = () => { try { return sessionStorage.getItem(OWN_KEY); } catch { return null; } };
const writeOwn = (v: string) => { try { sessionStorage.setItem(OWN_KEY, v); } catch { /* storage unavailable */ } };

function initial(): { state: PlannerStateV1; notice: ShareNotice } {
  if (typeof window === 'undefined') return { state: defaultState(), notice: null };
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get(HASH_KEY);
  const fromQuery = new URLSearchParams(window.location.search).get('product');
  if (token) {
    const r = parseSharedState(token);
    const own = readOwn() === token;
    if (r.ok) return { state: own ? r.state : { ...r.state, locale: viewerLocale() }, notice: own ? null : 'loaded' };
    return { state: { ...defaultState(), locale: viewerLocale() }, notice: 'invalid' };
  }
  const product = fromQuery === 'N1' || fromQuery === 'N2' || fromQuery === 'NEO-E' ? fromQuery : 'N1';
  const s = defaultState(product);
  s.locale = viewerLocale();
  return { state: s, notice: null };
}

const init = initial();

export const usePlanner = create<Store>((set) => {
  const update = (fn: (s: PlannerStateV1) => PlannerStateV1) => set((st) => ({ state: fn(st.state) }));
  return {
    state: init.state,
    plan2d: false,
    cameraResetCounter: 0,
    shareNotice: init.notice,
    setRoom: (patch) =>
      update((s) => {
        const room = { ...s.room, ...patch };
        // keep the tee inside the room (and at least 1.2 m in front of the back wall when the room allows it)
        const zMax = Math.max(0.1, room.depthM - Math.min(1.2, room.depthM / 3));
        const xMax = Math.max(0, room.widthM / 2 - 0.1);
        const tee = { xM: Math.min(xMax, Math.max(-xMax, s.tee.xM)), zM: Math.min(zMax, s.tee.zM) };
        return { ...s, room, tee: tee.xM === s.tee.xM && tee.zM === s.tee.zM ? s.tee : { xM: round2(tee.xM), zM: round2(tee.zM) } };
      }),
    // Keep the tee and room when switching product; only product-specific geometry changes.
    setProduct: (product) => update((s) => ({ ...s, product })),
    setHandedness: (handedness) => update((s) => ({ ...s, handedness })),
    setTee: (patch) => update((s) => ({ ...s, tee: { ...s.tee, ...patch } })),
    setMat: (patch) => update((s) => ({ ...s, mat: { ...s.mat, ...patch } })),
    setScreen: (patch) => update((s) => ({ ...s, screen: { ...s.screen, ...patch } })),
    setMountDrop: (mountDropM) => update((s) => ({ ...s, sensor: { mountDropM } })),
    setGolfer: (patch) => update((s) => ({ ...s, golfer: { ...s.golfer, ...patch } })),
    setProjector: (patch) => update((s) => ({ ...s, projector: { ...s.projector, ...patch } })),
    setEnclosure: (patch) => update((s) => ({ ...s, enclosure: { ...s.enclosure, ...patch } })),
    selectEnclosure: (id) => update((s) => selectEnclosure(s, id)),
    selectProjector: (id) => update((s) => selectProjector(s, id)),
    selectMat: (id) => update((s) => selectMat(s, id)),
    setZone: (product, zone, patch) =>
      update((s) => {
        const z = structuredClone(s.zones);
        const target = (z[product] as Record<string, ZoneRect>)[zone];
        if (target) Object.assign(target, patch);
        return { ...s, zones: z };
      }),
    setUnits: (displayUnits) => update((s) => ({ ...s, displayUnits })),
    setLocale: (locale) => update((s) => ({ ...s, locale })),
    setCamera: (camera) => set((st) => ({ plan2d: false, state: { ...st.state, view: { ...st.state.view, camera } } })),
    toggleLayer: (l) =>
      update((s) => ({ ...s, view: { ...s.view, layers: { ...s.view.layers, [l]: !s.view.layers[l] } } })),
    setPlan2d: (plan2d) => set({ plan2d }),
    resetCameraTick: () => set((st) => ({ cameraResetCounter: st.cameraResetCounter + 1 })),
  };
});

/** Keeps the URL hash in sync (replaceState: no history spam). */
export function startUrlSync(): () => void {
  let last = '';
  const write = (s: PlannerStateV1) => {
    const token = serializeState(s);
    if (token === last) return;
    last = token;
    const url = new URL(window.location.href);
    url.hash = `${HASH_KEY}=${token}`;
    window.history.replaceState(null, '', url);
    writeOwn(token);
  };
  write(usePlanner.getState().state);
  return usePlanner.subscribe((st, prev) => {
    if (st.state !== prev.state) write(st.state);
  });
}
