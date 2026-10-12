/**
 * Units (blueprint §11.4).
 * Canonical storage is metres. Inches/feet exist only at the display/input boundary and for
 * preserving published manual values verbatim. Display conversion never mutates geometry.
 */

export const METERS_PER_INCH = 0.0254;
export const INCHES_PER_FOOT = 12;

export type DisplayUnits = 'metric' | 'imperial';

export const inToM = (inches: number): number => inches * METERS_PER_INCH;
export const mToIn = (meters: number): number => meters / METERS_PER_INCH;

/** Geometry comparison epsilon. This is numerical noise, NOT a manufacturer installation tolerance. */
export const GEOMETRY_EPSILON_M = 1e-9;

/** Round to millimetres for storage of user-entered values (prevents drift on unit round trips). */
export const roundToMm = (meters: number): number => Math.round(meters * 1000) / 1000;

export function formatLength(meters: number, units: DisplayUnits, opts: { precision?: 'fine' | 'coarse' } = {}): string {
  if (!Number.isFinite(meters)) return '—';
  const sign = meters < 0 ? '−' : '';
  const m = Math.abs(meters);
  if (units === 'metric') {
    if (m < 1 && opts.precision !== 'coarse') return `${sign}${Math.round(m * 1000)} mm`;
    return `${sign}${m.toFixed(opts.precision === 'coarse' ? 2 : 3)} m`;
  }
  const totalIn = mToIn(m);
  const fine = opts.precision !== 'coarse';
  if (totalIn < 24) return `${sign}${totalIn.toFixed(fine ? 2 : 1)}″`;
  let ft = Math.floor(totalIn / INCHES_PER_FOOT);
  let inch = totalIn - ft * INCHES_PER_FOOT;
  const digits = fine ? 1 : 0;
  if (Number(inch.toFixed(digits)) >= INCHES_PER_FOOT) {
    ft += 1;
    inch = 0;
  }
  return `${sign}${ft}′ ${inch.toFixed(digits)}″`;
}

/** Published values are shown exactly as printed in the manual, plus a converted reference. */
export function formatPublishedInches(inches: number, units: DisplayUnits): string {
  const printed = `${trimNumber(inches)}″`;
  return units === 'imperial' ? printed : `${printed} (${(inToM(inches) * 1000).toFixed(0)} mm)`;
}

export function trimNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(4)));
}

/** Value shown in an input field for a canonical metre value. */
export function toInputValue(meters: number, units: DisplayUnits): number {
  return units === 'metric' ? Number(meters.toFixed(3)) : Number(mToIn(meters).toFixed(2));
}

/** Parse an input-field number (m or in) into canonical metres, rounded to the millimetre. */
export function fromInputValue(value: number, units: DisplayUnits): number {
  return roundToMm(units === 'metric' ? value : inToM(value));
}

export const inputUnitLabel = (units: DisplayUnits): string => (units === 'metric' ? 'm' : 'in');
