import { beforeEach, describe, expect, it } from 'vitest';
import { defaultState } from '../../src/domain/schema';
import { evaluate } from '../../src/domain/rules';
import { PRODUCTS, type ProductId } from '../../src/data/specs/products';
import { ROOM_PRESETS } from '../../src/domain/presets';
import { autoMountDrop } from '../../src/domain/packages';
import { usePlanner } from '../../src/store/plannerStore';

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

describe('automatic sensor drop', () => {
  it('hangs N1 at its maximum height under a high ceiling and not at all under a low one', () => {
    const s = defaultState('N1');
    expect(autoMountDrop({ ...s, room: { ...s.room, heightM: 3.3 } })).toBe(0.31);
    expect(autoMountDrop({ ...s, room: { ...s.room, heightM: 2.95 } })).toBe(0);
    expect(autoMountDrop({ ...s, room: { ...s.room, heightM: 2.7 } })).toBe(0);
    expect(autoMountDrop({ ...defaultState('NEO-E'), room: { ...s.room, heightM: 3.5 } })).toBe(0);
  });

  it('follows the ceiling and the product, and a too-low ceiling explains the minimum', () => {
    usePlanner.setState({ state: defaultState('N2') });
    usePlanner.getState().setRoom({ heightM: 3.2 });
    expect(usePlanner.getState().state.sensor.mountDropM).toBe(0.21); // 118.11 in = 2.99999 m
    usePlanner.getState().setProduct('NEO-E');
    expect(usePlanner.getState().state.sensor.mountDropM).toBe(0);
    usePlanner.getState().setProduct('N1');
    usePlanner.getState().setRoom({ heightM: 2.75 });
    const c = evaluate(usePlanner.getState().state, PRODUCTS.N1).checks.find((x) => x.id === 'sensor-mount-height')!;
    expect(c.status).toBe('FAIL');
    expect(c.params?.minCeiling).toBeCloseTo(2.8 + 0.044, 2);
  });

  it('swaps an enclosure that no longer fits the room for a fitting size', () => {
    usePlanner.setState({ state: defaultState('NEO-E') });
    usePlanner.getState().setRoom({ widthM: 3.9, heightM: 2.75 });
    expect(usePlanner.getState().state.enclosure.model).toBe('DIY-8 x 10.5');
  });
});
