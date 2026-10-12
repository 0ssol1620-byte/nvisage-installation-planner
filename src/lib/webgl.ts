/** Feature detection for the 3D viewer; the 2D plan is the complete fallback (blueprint §6.2, §15). */
export function hasWebGL2(): boolean {
  if (typeof document === 'undefined') return false;
  if (new URLSearchParams(window.location.search).has('no3d')) return false; // QA switch
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
