/**
 * Equipment selection helpers (pure). Selecting a catalog item keeps the rest of the state consistent:
 * enclosure depth stays one of the model's published depths and the projector zoom stays in its throw range.
 */
import { BUFFER_MIN_IN, ENCLOSURES, PROJECTORS, enclosureById, matById, projectorById } from '../data/carls';
import type { PlannerStateV1 } from './schema';
import { inToM } from './units';

export function selectEnclosure(s: PlannerStateV1, id: string): PlannerStateV1 {
  const m = id === 'none' ? null : enclosureById(id);
  if (!m) return { ...s, enclosure: { ...s.enclosure, model: 'none' }, screen: { ...s.screen, enabled: true } };
  const depthIn = m.depthsIn.includes(s.enclosure.depthIn) ? s.enclosure.depthIn : m.depthsIn[0]!;
  // the screen plane must leave room for the backset rear fitting
  const setbackM = Math.max(s.screen.setbackM, inToM(m.rearFittingIn));
  return { ...s, enclosure: { ...s.enclosure, model: id, depthIn }, screen: { ...s.screen, setbackM } };
}

/**
 * Size to show when the customer switches family: the current size name if the family offers it and it
 * fits, otherwise the largest size whose outer frame fits the room with the published buffer, otherwise
 * the smallest size of the family.
 */
export function enclosureForFamily(s: PlannerStateV1, family: string): string {
  if (family === 'none') return 'none';
  const sizes = ENCLOSURES.filter((e) => e.family === family);
  const fits = (e: (typeof ENCLOSURES)[number]) =>
    inToM(e.outerWIn + 2 * BUFFER_MIN_IN) <= s.room.widthM + 1e-6 && inToM(e.outerHIn + BUFFER_MIN_IN) <= s.room.heightM + 1e-6;
  const cur = enclosureById(s.enclosure.model);
  const same = sizes.find((e) => cur && e.listing === cur.listing);
  if (same && fits(same)) return same.id;
  const fitting = sizes.filter(fits).sort((a, b) => b.outerWIn * b.outerHIn - a.outerWIn * a.outerHIn);
  if (fitting.length) return fitting[0]!.id;
  return [...sizes].sort((a, b) => a.outerWIn * a.outerHIn - b.outerWIn * b.outerHIn)[0]!.id;
}

export function selectProjector(s: PlannerStateV1, id: string): PlannerStateV1 {
  const p = id === 'none' ? null : projectorById(id);
  if (!p) return { ...s, projector: { ...s.projector, model: 'none' } };
  const throwRatio = Math.min(p.throwMax, Math.max(p.throwMin, s.projector.throwRatio));
  return { ...s, projector: { model: id, throwRatio } };
}

export function selectMat(s: PlannerStateV1, id: string): PlannerStateV1 {
  const m = matById(id);
  const mat = m
    ? { ...s.mat, enabled: true, model: id, widthM: round3(inToM(m.wIn)), depthM: round3(inToM(m.dIn)), heightM: round3(inToM(m.hIn)) }
    : { ...s.mat, enabled: true, model: 'custom' };
  return { ...s, mat };
}

/** All projector ids, for selectors. */
export const PROJECTOR_IDS = PROJECTORS.map((p) => p.id);

const round3 = (v: number) => Math.round(v * 1000) / 1000;
