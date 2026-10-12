import { describe, expect, it } from 'vitest';
import { PRODUCTS, PRODUCT_ORDER, isOverhead } from '../../src/data/specs/products';
import { SOURCES } from '../../src/data/sources';

/** Golden values copied by hand from the manuals (QA matrix §20.1). A change here needs a source diff. */
describe('manufacturer spec registry', () => {
  it('keeps NEO-E → N1 → N2 order', () => expect(PRODUCT_ORDER).toEqual(['NEO-E', 'N1', 'N2']));

  it('N1 matches D01 pp.3–4', () => {
    const s = PRODUCTS.N1;
    if (!isOverhead(s)) throw new Error('N1 must be overhead');
    expect([s.maxArea.sideAIn, s.maxArea.sideBIn]).toEqual([16, 20]);
    expect([s.mountHeightIn.min, s.mountHeightIn.max]).toEqual([110.24, 118]);
    expect(s.lensToTeeIn.value).toBe(23.62);
    expect(s.maxArea.centreDatum).toBe('MANUAL');
  });

  it('N2 matches D02 pp.3–4 and D11 p.13', () => {
    const s = PRODUCTS.N2;
    if (!isOverhead(s)) throw new Error('N2 must be overhead');
    expect([s.maxArea.sideAIn, s.maxArea.sideBIn]).toEqual([31.5, 23.6]);
    expect([s.mountHeightIn.min, s.mountHeightIn.max]).toEqual([110.24, 118.11]);
    expect(s.lensToTeeIn.value).toBe(39.37);
    expect(s.zoneRules.find((r) => r.zone === 'tee')?.mustBeInside).toBe('basic');
    expect(s.zoneRules.find((r) => r.zone === 'basic')?.mustBeInside).toBe('max');
  });

  it('NEO-E matches D05 p.15 and uses the manual drawing for the 14.2 in datum', () => {
    const s = PRODUCTS['NEO-E'];
    if (isOverhead(s)) throw new Error('NEO-E must be portable');
    expect(s.installationSpaceIn).toMatchObject({ w: 15.8, d: 29.4, h: 12.1 });
    expect(s.strikeZoneIn).toMatchObject({ w: 12.6, d: 9.4 });
    expect(s.dataCollectionPointsIn.value).toBe(14.2);
    expect(s.dataCollectionDatum.status).toBe('MANUAL');
  });

  it('NEO-E drawing arithmetic supports (but does not prove) the provisional interpretation', () => {
    const s = PRODUCTS['NEO-E'];
    if (isOverhead(s)) throw new Error();
    expect(s.deviceSizeIn.d + s.dataCollectionPointsIn.value + s.strikeZoneIn.d).toBeCloseTo(s.installationSpaceIn.d, 9);
    expect(2 * s.drawingLateralIn.value).toBeCloseTo(s.installationSpaceIn.w, 9);
  });

  it('every citation points to a registered, customer-citable document', () => {
    for (const p of Object.values(PRODUCTS)) {
      const cites = JSON.stringify(p).match(/"doc":"(D\d\d)"/g) ?? [];
      expect(cites.length).toBeGreaterThan(0);
      for (const c of cites) {
        const id = c.slice(7, 10);
        expect(SOURCES[id], id).toBeDefined();
        expect(SOURCES[id]!.customerCitable, id).toBe(true);
      }
    }
  });
});
