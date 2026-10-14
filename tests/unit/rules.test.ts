import { describe, expect, it } from 'vitest';
import { PRODUCTS, PRODUCT_ORDER } from '../../src/data/specs/products';
import type { DomainCheck } from '../../src/domain/rules';
import { evaluate, mountHeightStatus } from '../../src/domain/rules';
import { defaultState } from '../../src/domain/schema';
import { computeLayout } from '../../src/domain/layout';
import { inToM } from '../../src/domain/units';

const find = (checks: DomainCheck[], id: string): DomainCheck => {
  const c = checks.find((x) => x.id === id);
  if (!c) throw new Error(`missing check ${id}`);
  return c;
};

describe('rules engine — blueprint §14.2 boundary cases', () => {
  it('mount height just inside / outside the published N1 range', () => {
    const lo = inToM(110.24);
    const hi = inToM(118);
    // hitting surface → ceiling (DL-37)
    expect(mountHeightStatus(lo, [lo, hi])).toBe('PASS');
    expect(mountHeightStatus(hi, [lo, hi])).toBe('PASS');
    expect(mountHeightStatus(lo - 0.001, [lo, hi])).toBe('FAIL');
    expect(mountHeightStatus(hi + 0.001, [lo, hi])).toBe('FAIL');
  });

  it('room height drives the N1/N2 mount-height check', () => {
    const s = defaultState('N1');
    s.mat.enabled = false;
    s.room.heightM = 2.9;
    expect(find(evaluate(s, PRODUCTS.N1).checks, 'sensor-mount-height').status).toBe('PASS');
    s.room.heightM = 2.6;
    const c = find(evaluate(s, PRODUCTS.N1).checks, 'sensor-mount-height');
    expect(c.status).toBe('FAIL');
    expect(c.params?.below).toBeCloseTo(inToM(110.24) - 2.6, 9);
    s.room.heightM = 3.2;
    expect(find(evaluate(s, PRODUCTS.N1).checks, 'sensor-mount-height').status).toBe('FAIL');
    // N2 allows up to 118.11 in (3.000 m); N1 only 118 in (2.997 m)
    s.room.heightM = 2.999;
    expect(find(evaluate(s, PRODUCTS.N1).checks, 'sensor-mount-height').status).toBe('FAIL');
    expect(find(evaluate({ ...s, product: 'N2' }, PRODUCTS.N2).checks, 'sensor-mount-height').status).toBe('PASS');
  });

  it('tee too close to the front wall pushes the sensor out of the room → FAIL', () => {
    const s = defaultState('N2');
    s.screen.enabled = false;
    s.tee.zM = 0.8; // 39.37 in ≈ 1.0 m offset
    expect(find(evaluate(s, PRODUCTS.N2).checks, 'sensor-in-room').status).toBe('FAIL');
  });

  it('manual basis: sample rooms evaluate fully; unknown-confidence rows never PASS', () => {
    for (const id of PRODUCT_ORDER) {
      const { checks, verdict } = evaluate(defaultState(id), PRODUCTS[id]);
      expect(checks.filter((c) => c.status === 'NOT_VERIFIED').length, id).toBe(0);
      expect(checks.filter((c) => c.status === 'FAIL').length, id).toBe(0);
      expect(verdict.headlineKey, id).toBe('verdict.withinChecked');
      for (const c of checks.filter((x) => x.confidence === 'unknown')) expect(c.status, c.id).not.toBe('PASS');
      // swing results are always labelled with their basis
      for (const c of checks.filter((x) => x.category === 'swing')) expect(c.confidence, c.id).toBe('swing_model');
    }
  });

  it('estimated swing: low ceiling fails, tall golfer with driver is stricter than wedge', () => {
    const s = defaultState('N1');
    s.room.heightM = 2.3;
    expect(find(evaluate(s, PRODUCTS.N1).checks, 'swing-ceiling').status).toBe('FAIL');
    const tall = defaultState('NEO-E');
    tall.golfer = { heightM: 1.95, club: 'driver' };
    const drv = find(evaluate(tall, PRODUCTS['NEO-E']).checks, 'swing-ceiling').value!;
    tall.golfer.club = 'wedge';
    const wdg = find(evaluate(tall, PRODUCTS['NEO-E']).checks, 'swing-ceiling').value!;
    expect(drv).toBeLessThan(wdg);
  });

  it('projector: throw beyond the back wall fails; a ceiling-mounted sensor clears the light path', () => {
    const s = defaultState('N2');
    s.room.depthM = 3.9; // AK700ST at 0.83 needs the lens 3.72 m from the screen
    expect(find(evaluate(s, PRODUCTS.N2).checks, 'projector-in-room').status).toBe('FAIL');
    s.projector.throwRatio = 0.69;
    expect(find(evaluate(s, PRODUCTS.N2).checks, 'projector-in-room').status).toBe('PASS');
    const b = defaultState('N2');
    expect(find(evaluate(b, PRODUCTS.N2).checks, 'beam-sensor').status).toBe('PASS');
  });

  it('projector: a ceiling sensor on the same spot as the projector or its mount pole fails', () => {
    const s = defaultState('N1');
    expect(find(evaluate(s, PRODUCTS.N1).checks, 'projector-sensor').status).toBe('PASS');
    const L = computeLayout(s, PRODUCTS.N1);
    if (L.kind !== 'overhead' || !L.projector) throw new Error();
    // move the tee so the sensor sits right at the projector's depth
    s.tee.zM += L.projector.body.center[2] - L.sensorBody.center[2];
    const c = find(evaluate(s, PRODUCTS.N1).checks, 'projector-sensor');
    expect(c.status).toBe('FAIL');
    expect(evaluate(s, PRODUCTS.N1).verdict.headlineKey).toBe('verdict.conditionsNotMet');
  });

  it('projector: throw ratio outside the model zoom range is an input error', () => {
    const s = defaultState('N1');
    s.projector.throwRatio = 1.0; // AK700ST: 0.69–0.83
    expect(evaluate(s, PRODUCTS.N1).verdict.headlineKey).toBe('verdict.invalidInput');
  });

  it("Carl's Place fit rules: outer size + 2 in buffer, rear fitting behind the screen", () => {
    const s = defaultState('N1');
    // DIY 9 x 12: outer 146.3 x 112 in
    s.room.widthM = inToM(146.3) + inToM(4);
    expect(find(evaluate(s, PRODUCTS.N1).checks, 'enclosure-width').status).toBe('PASS');
    s.room.widthM = inToM(146.3) + inToM(2);
    expect(find(evaluate(s, PRODUCTS.N1).checks, 'enclosure-width').status).toBe('CAUTION');
    s.room.widthM = inToM(146.3) - 0.01;
    expect(find(evaluate(s, PRODUCTS.N1).checks, 'enclosure-width').status).toBe('FAIL');
    const h = defaultState('NEO-E');
    h.room.heightM = inToM(112) + inToM(1);
    expect(find(evaluate(h, PRODUCTS['NEO-E']).checks, 'enclosure-height').status).toBe('CAUTION');
    // DIY rear fitting 8.25 in minimum, 12 in recommended
    const r = defaultState('NEO-E');
    r.screen.setbackM = inToM(8);
    expect(find(evaluate(r, PRODUCTS['NEO-E']).checks, 'enclosure-rear').status).toBe('FAIL');
    r.screen.setbackM = inToM(10);
    expect(find(evaluate(r, PRODUCTS['NEO-E']).checks, 'enclosure-rear').status).toBe('CAUTION');
    r.screen.setbackM = inToM(12);
    expect(find(evaluate(r, PRODUCTS['NEO-E']).checks, 'enclosure-rear').status).toBe('PASS');
  });



  it('N2 Tee Zone outside the Basic Zone → FAIL; Basic Zone beyond the white box → FAIL', () => {
    const s = defaultState('N2');
    s.view.layers.configZones = true;
    const zoneChecks = evaluate(s, PRODUCTS.N2).checks.filter((c) => c.id.startsWith('zone-'));
    expect(zoneChecks.length).toBe(2);
    expect(zoneChecks.every((c) => c.status === 'PASS')).toBe(true);
    s.zones.N2.tee = { cx: 0.35, cz: 0, w: 0.15, d: 0.15 };
    expect(find(evaluate(s, PRODUCTS.N2).checks, 'zone-tee-in-basic').status).toBe('FAIL');
    s.zones.N2.tee = { cx: 0, cz: 0, w: 0.15, d: 0.15 };
    s.zones.N2.basic = { cx: 0, cz: 0, w: 0.9, d: 0.45 }; // white box is 31.5 in = 0.8 m
    expect(find(evaluate(s, PRODUCTS.N2).checks, 'zone-basic-in-max').status).toBe('FAIL');
  });

  it('NEO-E: provisional overflow → CAUTION, handedness mirror fixes it, smallest allowed room still fits', () => {
    const s = defaultState('NEO-E');
    expect(find(evaluate(s, PRODUCTS['NEO-E']).checks, 'installation-space').status).toBe('PASS');
    s.tee.xM = s.room.widthM / 2 - 0.3; // footprint now overflows the right wall
    expect(find(evaluate(s, PRODUCTS['NEO-E']).checks, 'installation-space').status).toBe('CAUTION');
    s.handedness = 'left'; // device moves to the other side → fits again
    expect(find(evaluate(s, PRODUCTS['NEO-E']).checks, 'installation-space').status).toBe('PASS');
    const tiny = defaultState('NEO-E');
    tiny.room = { widthM: 1.5, depthM: 2, heightM: 2.4 };
    tiny.tee = { xM: 0, zM: 1 };
    tiny.mat.enabled = false;
    tiny.screen.enabled = false;
    expect(find(evaluate(tiny, PRODUCTS['NEO-E']).checks, 'installation-space').status).toBe('PASS');
  });

  it('invalid input yields FAIL rows and no layout, without throwing', () => {
    const s = defaultState('N1');
    s.room.widthM = Number.NaN;
    s.room.heightM = -1;
    const r = evaluate(s, PRODUCTS.N1);
    expect(r.layout).toBeNull();
    expect(r.verdict.headlineKey).toBe('verdict.invalidInput');
    expect(r.checks.length).toBe(2);
  });

  it('switching product never reuses the previous product geometry', () => {
    const s = defaultState('N1');
    const a = evaluate(s, PRODUCTS.N1).layout;
    const b = evaluate({ ...s, product: 'N2' }, PRODUCTS.N2).layout;
    if (a?.kind !== 'overhead' || b?.kind !== 'overhead') throw new Error('expected overhead layouts');
    expect(a.lensToTeeM).not.toBe(b.lensToTeeM);
    expect(a.sensorBody.size).not.toEqual(b.sensorBody.size);
  });
});
