import { beforeEach, describe, expect, it } from 'vitest';
import { defaultState, validateState } from '../../src/domain/schema';
import { evaluate } from '../../src/domain/rules';
import { PRODUCTS, type ProductId } from '../../src/data/specs/products';
import { usePlanner } from '../../src/store/plannerStore';
import { computeLayout } from '../../src/domain/layout';
import { inToM } from '../../src/domain/units';

const PRODUCT_IDS: ProductId[] = ['NEO-E', 'N1', 'N2'];
const notPassing = (id: ProductId) =>
  evaluate(usePlanner.getState().state, PRODUCTS[id]).checks.filter((c) => c.status !== 'PASS').map((c) => `${c.status} ${c.id}`);

describe('first-load room (4.5 × 6.0 × 2.95 m)', () => {
  beforeEach(() => usePlanner.setState({ state: defaultState('N1') }));

  for (const id of PRODUCT_IDS) {
    it(`passes every check with ${id}`, () => {
      usePlanner.getState().setProduct(id);
      expect(notPassing(id)).toEqual([]);
    });
  }
});

describe('ceiling-mounted sensor height (hitting surface → ceiling)', () => {
  const check = (id: ProductId) => evaluate(usePlanner.getState().state, PRODUCTS[id]).checks.find((x) => x.id === 'sensor-mount-height')!;

  it('passes between the minimum and maximum ceiling and states both limits when it fails', () => {
    usePlanner.setState({ state: defaultState('N1') });
    const mat = usePlanner.getState().state.mat.heightM;
    usePlanner.getState().setRoom({ heightM: 2.95 });
    expect(check('N1').status).toBe('PASS');
    expect(check('N1').params?.surface).toBeCloseTo(2.95 - mat, 3);

    usePlanner.getState().setRoom({ heightM: 2.75 });
    expect(check('N1').status).toBe('FAIL');
    expect(check('N1').params?.minCeiling).toBe(Math.ceil((inToM(110.24) + mat) * 1000) / 1000);

    usePlanner.getState().setRoom({ heightM: 3.3 });
    expect(check('N1').status).toBe('FAIL');
    expect(check('N1').params?.maxCeiling).toBe(Math.floor((inToM(118) + mat) * 1000) / 1000);
  });

  it('a 150 mm swing plate raises the hitting surface and the required ceiling with it', () => {
    usePlanner.setState({ state: defaultState('N2') });
    usePlanner.getState().selectMat('custom');
    usePlanner.getState().setMat({ heightM: 0.15 });
    usePlanner.getState().setRoom({ heightM: 2.95 });
    expect(check('N2').status).toBe('FAIL');
    expect(check('N2').params?.minCeiling).toBe(2.951);
    usePlanner.getState().setRoom({ heightM: 3.1 });
    expect(check('N2').status).toBe('PASS');
    expect(check('N2').params?.maxCeiling).toBe(3.149);
  });

  it('accepts raised hitting platforms up to 0.4 m', () => {
    const s = defaultState('N2');
    s.mat.heightM = 0.35;
    expect(validateState(s)).toEqual([]);
  });

  it('the sensor stays on the ceiling for every room height', () => {
    for (const heightM of [2.75, 2.95, 3.3]) {
      const s = { ...defaultState('N2'), room: { ...defaultState('N2').room, heightM } };
      const L = computeLayout(s, PRODUCTS.N2);
      if (L.kind !== 'overhead') throw new Error();
      expect(L.sensorAnchor[1]).toBe(heightM);
    }
  });

  it('swaps an enclosure that no longer fits the room for a fitting size', () => {
    usePlanner.setState({ state: defaultState('NEO-E') });
    usePlanner.getState().setRoom({ widthM: 3.9, heightM: 2.75 });
    expect(usePlanner.getState().state.enclosure.model).toBe('DIY-8 x 10.5');
  });
});
