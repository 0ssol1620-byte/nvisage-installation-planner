import { describe, expect, it } from 'vitest';
import { formatLength, fromInputValue, inToM, mToIn, roundToMm, toInputValue } from '../../src/domain/units';

describe('units', () => {
  it('uses the exact international inch', () => {
    expect(inToM(1)).toBe(0.0254);
    expect(inToM(39.37)).toBeCloseTo(0.999998, 6);
    expect(inToM(110.24)).toBeCloseTo(2.800096, 6);
  });

  it('round-trips mm → in → mm without drift (blueprint §11.4)', () => {
    for (let mm = 0; mm <= 20000; mm += 7) {
      const m = mm / 1000;
      let v = m;
      for (let i = 0; i < 10; i++) v = fromInputValue(toInputValue(fromInputValue(toInputValue(v, 'imperial'), 'imperial'), 'metric'), 'metric');
      expect(v).toBe(roundToMm(m));
    }
  });

  it('formats metric and imperial without mutating the value', () => {
    expect(formatLength(2.8, 'metric')).toBe('2.800 m');
    expect(formatLength(0.6, 'metric')).toBe('600 mm');
    expect(formatLength(inToM(118), 'imperial')).toBe('9′ 10.0″');
    expect(formatLength(inToM(23.62), 'imperial')).toBe('23.62″');
    expect(formatLength(inToM(119.98), 'imperial')).toBe('10′ 0.0″');
    expect(formatLength(Number.NaN, 'metric')).toBe('—');
  });

  it('mToIn is the inverse of inToM', () => {
    expect(mToIn(inToM(16))).toBeCloseTo(16, 12);
  });
});
