/**
 * Resolves the selected Carl's Place equipment into physical geometry (metres, world frame of layout.ts).
 * All inputs are catalog values from src/data/carls.ts; this module only does the arithmetic.
 */
import type { EnclosureModel, MatModel, ProjectorModel } from '../data/carls';
import { enclosureById, matById, projectorById } from '../data/carls';
import type { PlannerStateV1 } from './schema';
import { inToM } from './units';

/** Ceiling-mount hardware between the ceiling and the projector body. */
export const PROJECTOR_MOUNT_GAP_M = 0.05;
/** Native panel aspect of every catalog projector (16:9). */
const PANEL_ASPECT = 16 / 9;

export type ResolvedScreen = {
  widthM: number; // viewable width (flat) or width at projection plane (curved)
  heightM: number;
  bottomM: number;
  /** screen plane (flat) or the deepest point of the curve (curved) */
  planeZ: number;
  /** plane the projector image is sized for: the screen plane, or the chord plane of a curved screen */
  projectionZ: number;
  /** curved screens: circular arc through the published chord and arc length */
  curve: { radiusM: number; sagittaM: number; arcM: number } | null;
};

export type ResolvedEnclosure = {
  model: EnclosureModel;
  outerWM: number;
  outerHM: number;
  depthM: number;
  rearFittingM: number;
  pipeOdM: number;
  /** z of the rear fitting, the screen plane and the front frame */
  backZ: number;
  screenZ: number;
  frontZ: number;
};

export type ResolvedMat = {
  model: MatModel | null;
  widthM: number;
  depthM: number;
  heightM: number;
  centerX: number;
  centerZ: number;
  /** hitting insert (30″ × 12″) centred on the tee for catalog mats */
  insert: { widthM: number; depthM: number } | null;
};

export type ResolvedProjector = {
  model: ProjectorModel;
  throwRatio: number;
  /** native 16:9 panel image at the screen plane */
  imageWM: number;
  imageHM: number;
  imageTopM: number;
  distanceM: number;
  distanceRangeM: [number, number];
  lens: [number, number, number];
  body: { center: [number, number, number]; size: [number, number, number] };
  /** ceiling → top of the projector body */
  dropM: number;
};

export type Equipment = {
  screen: ResolvedScreen | null;
  enclosure: ResolvedEnclosure | null;
  mat: ResolvedMat | null;
  projector: ResolvedProjector | null;
};

/** Radius of the circular arc with chord c and arc length s (s > c). */
export function arcRadius(c: number, s: number): number {
  let lo = c / 2 + 1e-9;
  let hi = 1e4;
  for (let i = 0; i < 200; i++) {
    const r = (lo + hi) / 2;
    const arc = 2 * r * Math.asin(Math.min(1, c / (2 * r)));
    if (arc > s) lo = r;
    else hi = r;
  }
  return (lo + hi) / 2;
}

export function resolveEquipment(state: PlannerStateV1): Equipment {
  const setback = state.screen.setbackM;
  const encModel = state.enclosure.model === 'none' ? null : enclosureById(state.enclosure.model);
  let enclosure: ResolvedEnclosure | null = null;
  let screen: ResolvedScreen | null = null;
  if (encModel) {
    const depthM = inToM(state.enclosure.depthIn);
    enclosure = {
      model: encModel,
      outerWM: inToM(encModel.outerWIn),
      outerHM: inToM(encModel.outerHIn),
      depthM,
      rearFittingM: inToM(encModel.rearFittingIn),
      pipeOdM: inToM(encModel.pipeOdIn),
      backZ: setback - inToM(encModel.rearFittingIn),
      screenZ: setback,
      frontZ: setback + depthM,
    };
    let curve: ResolvedScreen['curve'] = null;
    if (encModel.arcWIn) {
      const c = inToM(encModel.screenWIn);
      const s = inToM(encModel.arcWIn);
      const r = arcRadius(c, s);
      curve = { radiusM: r, sagittaM: r - Math.sqrt(r * r - (c / 2) ** 2), arcM: s };
    }
    // "Floor-to-turf borderless screen" (DIY / Pro / Curved spec sheets): viewable area starts at the floor.
    screen = { widthM: inToM(encModel.screenWIn), heightM: inToM(encModel.screenHIn), bottomM: 0, planeZ: setback, projectionZ: setback + (curve?.sagittaM ?? 0), curve };
  } else if (state.screen.enabled) {
    screen = { widthM: state.screen.widthM, heightM: state.screen.heightM, bottomM: state.screen.bottomM, planeZ: setback, projectionZ: setback, curve: null };
  }

  let mat: ResolvedMat | null = null;
  if (state.mat.enabled) {
    const m = state.mat.model === 'custom' ? null : matById(state.mat.model);
    const w = m ? inToM(m.wIn) : state.mat.widthM;
    const d = m ? inToM(m.dIn) : state.mat.depthM;
    const h = m ? inToM(m.hIn) : state.mat.heightM;
    // Offset mats: the hitting area sits toward the ball side; the golfer stands on the larger part.
    const side = state.handedness === 'right' ? 1 : -1;
    const shift = m?.hitting === 'offset' ? -side * 0.2 * w : 0;
    mat = {
      model: m, widthM: w, depthM: d, heightM: h, centerX: state.tee.xM + shift, centerZ: state.tee.zM,
      insert: m ? { widthM: inToM(12), depthM: inToM(30) } : null,
    };
  }

  let projector: ResolvedProjector | null = null;
  const pm = state.projector.model === 'none' ? null : projectorById(state.projector.model);
  if (pm && screen) {
    const ratio = Math.min(pm.throwMax, Math.max(pm.throwMin, state.projector.throwRatio));
    const imageWM = Math.max(screen.widthM, screen.heightM * PANEL_ASPECT);
    const imageHM = imageWM / PANEL_ASPECT;
    const imageTopM = screen.bottomM + screen.heightM;
    const size: [number, number, number] = [inToM(pm.sizeIn.w), inToM(pm.sizeIn.h), inToM(pm.sizeIn.d)];
    const ceiling = state.room.heightM;
    // Inverted ceiling mount: the image top edge sits (offset − 100 %) × image height below the lens axis.
    const baseLensY = imageTopM + (pm.offsetPct / 100 - 1) * imageHM;
    const highest = ceiling - PROJECTOR_MOUNT_GAP_M - size[1] / 2;
    const distanceM = ratio * imageWM;
    const lensZ = screen.projectionZ + distanceM;
    // Lens shift: mount as high as the ceiling allows, but keep the ray to the image top under the enclosure's front top bar.
    let target = highest;
    if (enclosure && lensZ > enclosure.frontZ) {
      const barY = enclosure.outerHM - enclosure.pipeOdM - 0.02;
      const k = (lensZ - screen.projectionZ) / (enclosure.frontZ - screen.projectionZ);
      target = Math.min(target, imageTopM + (barY - imageTopM) * k);
    }
    const lensY = pm.lensShiftV > 0
      ? Math.min(baseLensY + pm.lensShiftV * imageHM, Math.max(baseLensY - pm.lensShiftV * imageHM, target))
      : baseLensY;
    projector = {
      model: pm,
      throwRatio: ratio,
      imageWM,
      imageHM,
      imageTopM,
      distanceM,
      distanceRangeM: [pm.throwMin * imageWM, pm.throwMax * imageWM],
      lens: [0, lensY, lensZ],
      body: { center: [0, lensY, lensZ + size[2] / 2], size },
      dropM: ceiling - (lensY + size[1] / 2),
    };
  }
  return { screen, enclosure, mat, projector };
}
