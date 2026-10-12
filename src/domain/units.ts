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

/** Unit shown after the input; imperial entries carry their own ′ ″ marks. */
export const inputUnitLabel = (units: DisplayUnits): string => (units === 'metric' ? 'm' : '');

/** Text for a length input: metres, or feet-and-inches (`14' 9.2"`; under 2 ft: `9.5"`). */
export function formatInputText(meters: number, units: DisplayUnits): string {
  if (units === 'metric') return String(toInputValue(meters, units));
  const sign = meters < 0 ? '-' : '';
  const totalIn = Math.round(mToIn(Math.abs(meters)) * 10) / 10;
  if (totalIn < 24) return `${sign}${trimNumber(totalIn)}"`;
  const ft = Math.floor(totalIn / INCHES_PER_FOOT);
  const inch = Math.round((totalIn - ft * INCHES_PER_FOOT) * 10) / 10;
  return inch ? `${sign}${ft}' ${trimNumber(inch)}"` : `${sign}${ft}'`;
}

/**
 * Parse a length input into metres (mm-rounded), NaN if unreadable.
 * Imperial accepts `14' 9.2"`, `14'9`, `14 ft 9 in`, `14′ 9″`, `9.5"` and a bare number as inches.
 */
export function parseInputText(text: string, units: DisplayUnits): number {
  const t = text.trim().replace(',', '.');
  if (t === '') return NaN;
  if (units === 'metric') {
    const v = Number(t);
    return Number.isFinite(v) ? fromInputValue(v, units) : NaN;
  }
  const m = /^(-?)\s*(?:(\d+(?:\.\d+)?)\s*(?:'|′|ft)\s*)?(?:(\d+(?:\.\d+)?)\s*(?:"|″|in)?)?\s*$/i.exec(t);
  if (!m || (m[2] === undefined && m[3] === undefined)) return NaN;
  const inches = Number(m[2] ?? 0) * INCHES_PER_FOOT + Number(m[3] ?? 0);
  return roundToMm(inToM(m[1] ? -inches : inches));
}
