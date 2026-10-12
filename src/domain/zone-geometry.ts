/**
 * Pure 2D zone geometry (blueprint §11.3). Rectangles are axis-aligned in the zone's local frame:
 * origin = centre of the published maximum area, `w` along local A, `d` along local B (metres).
 * Containment is evaluated here — in the domain engine — never only in the UI.
 */
import { GEOMETRY_EPSILON_M } from './units';

export type ZoneRect = { cx: number; cz: number; w: number; d: number };
export type Rect2 = { minX: number; maxX: number; minZ: number; maxZ: number };

export const toRect2 = (z: ZoneRect): Rect2 => ({
  minX: z.cx - z.w / 2, maxX: z.cx + z.w / 2, minZ: z.cz - z.d / 2, maxZ: z.cz + z.d / 2,
});

export const rectFromCentre = (cx: number, cz: number, w: number, d: number): Rect2 => toRect2({ cx, cz, w, d });

export const isValidZone = (z: ZoneRect): boolean =>
  [z.cx, z.cz, z.w, z.d].every(Number.isFinite) && z.w > 0 && z.d > 0;

/** inner ⊆ outer (touching edges allowed). */
export function contains(outer: Rect2, inner: Rect2, eps = GEOMETRY_EPSILON_M): boolean {
  return inner.minX >= outer.minX - eps && inner.maxX <= outer.maxX + eps
    && inner.minZ >= outer.minZ - eps && inner.maxZ <= outer.maxZ + eps;
}

export function intersects(a: Rect2, b: Rect2, eps = GEOMETRY_EPSILON_M): boolean {
  return a.minX < b.maxX - eps && a.maxX > b.minX + eps && a.minZ < b.maxZ - eps && a.maxZ > b.minZ + eps;
}

/** How far each edge of `inner` sticks out of `outer` (0 when inside). Used for fix suggestions. */
export function overflow(outer: Rect2, inner: Rect2): { left: number; right: number; front: number; back: number } {
  return {
    left: Math.max(0, outer.minX - inner.minX),
    right: Math.max(0, inner.maxX - outer.maxX),
    front: Math.max(0, outer.minZ - inner.minZ),
    back: Math.max(0, inner.maxZ - outer.maxZ),
  };
}

/** Clamp `inner` (keeping its size where possible) so it lies inside `outer`. */
export function clampInside(outer: ZoneRect, inner: ZoneRect): ZoneRect {
  const w = Math.min(inner.w, outer.w);
  const d = Math.min(inner.d, outer.d);
  const o = toRect2(outer);
  const cx = Math.min(Math.max(inner.cx, o.minX + w / 2), o.maxX - w / 2);
  const cz = Math.min(Math.max(inner.cz, o.minZ + d / 2), o.maxZ - d / 2);
  return { cx, cz, w, d };
}
