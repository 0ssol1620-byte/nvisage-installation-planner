import { beforeEach, describe, expect, it } from 'vitest';
import { defaultState } from '../../src/domain/schema';
import { evaluate } from '../../src/domain/rules';
import { PRODUCTS, type ProductId } from '../../src/data/specs/products';
import { ROOM_PRESETS } from '../../src/domain/presets';
import { usePlanner } from '../../src/store/plannerStore';
import { computeLayout } from '../../src/domain/layout';
import { inToM } from '../../src/domain/units';

const PRODUCT_IDS: ProductId[] = ['NEO-E', 'N1', 'N2'];
const notPassing = (id: ProductId) =>
  evaluate(usePlanner.getState().state, PRODUCTS[id]).checks.filter((c) => c.status !== 'PASS').map((c) => `${c.status} ${c.id}`);

describe('room presets', () => {
  beforeEach(() => usePlanner.setState({ state: defaultState('N1') }));

  for (const p of ROOM_PRESETS) {
    for (const id of PRODUCT_IDS) {
      it(`${p.id} passes every check with ${id}`, () => {
        const [widthM, depthM, heightM] = p.dims;
        usePlanner.getState().setProduct(id);
        usePlanner.getState().setRoom({ widthM, depthM, heightM });
        expect(notPassing(id)).toEqual([]);
      });
    }
  }

  it('the first-load room is the Standard preset', () => {
    const { room } = defaultState();
    expect([room.widthM, room.depthM, room.heightM]).toEqual(ROOM_PRESETS.find((p) => p.id === 'standard')!.dims);
  });
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
    expect(check('N1').params?.minCeiling).toBeCloseTo(inToM(110.24) + mat, 3);

    usePlanner.getState().setRoom({ heightM: 3.3 });
    expect(check('N1').status).toBe('FAIL');
    expect(check('N1').params?.maxCeiling).toBeCloseTo(inToM(118) + mat, 3);
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
