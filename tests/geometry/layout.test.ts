import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../../src/data/specs/products';
import { computeLayout } from '../../src/domain/layout';
import { defaultState } from '../../src/domain/schema';
import { inToM } from '../../src/domain/units';

describe('world layout', () => {
  it('N1: sensor lens is 23.62 in toward the screen from the tee, mount plane at the ceiling', () => {
    const s = defaultState('N1');
    const L = computeLayout(s, PRODUCTS.N1);
    if (L.kind !== 'overhead') throw new Error();
    expect(L.lensFloorPoint[0]).toBe(s.tee.xM);
    expect(s.tee.zM - L.lensFloorPoint[2]).toBeCloseTo(inToM(23.62), 12);
    expect(L.sensorAnchor[1]).toBe(s.room.heightM);
    // HotShot mats are 1.75 in thick (Carl's Place)
    expect(L.hittingSurfaceY).toBeCloseTo(inToM(1.75), 12);
    expect(L.mountHeightFromSurfaceM).toBeCloseTo(s.room.heightM - inToM(1.75), 12);
  });

  it('N2 uses 39.37 in, and a mount drop lowers the mount plane', () => {
    const s = defaultState('N2');
    s.sensor.mountDropM = 0.1;
    const L = computeLayout(s, PRODUCTS.N2);
    if (L.kind !== 'overhead') throw new Error();
    expect(s.tee.zM - L.lensFloorPoint[2]).toBeCloseTo(inToM(39.37), 12);
    expect(L.mountHeightFromFloorM).toBeCloseTo(s.room.heightM - 0.1, 12);
  });

  it('places the published max area per the manual: side A parallel to the screen, centred on the tee', () => {
    const s = defaultState('N2');
    const L = computeLayout(s, PRODUCTS.N2);
    if (L.kind !== 'overhead') throw new Error();
    expect(L.maxArea.primary.maxX - L.maxArea.primary.minX).toBeCloseTo(inToM(31.5), 12);
    expect(L.maxArea.primary.maxZ - L.maxArea.primary.minZ).toBeCloseTo(inToM(23.6), 12);
    expect((L.maxArea.primary.minZ + L.maxArea.primary.maxZ) / 2).toBeCloseTo(s.tee.zM, 12);
    expect(L.maxArea.datumStatus).toBe('MANUAL');
  });

  it('places the projector from its throw ratio and keeps the golfer frame on the tee', () => {
    const s = defaultState('N1');
    s.projector.throwRatio = 0.75; // BenQ AK700ST zoom range 0.69–0.83
    const L = computeLayout(s, PRODUCTS.N1);
    // DIY 9 x 12: viewable 132.3 x 99.2 in (4:3) — the 16:9 panel is sized to the screen height
    const panelW = inToM(99.2) * (16 / 9);
    expect(L.projector!.lens[2] - s.screen.setbackM).toBeCloseTo(0.75 * panelW, 9);
    expect(L.projector!.body.size[0]).toBeCloseTo(inToM(11.9), 12);
    expect(L.golfer.frame.origin).toEqual([s.tee.xM, L.hittingSurfaceY, s.tee.zM]);
    s.projector.model = 'none';
    expect(computeLayout(s, PRODUCTS.N1).projector).toBeNull();
  });

  it("Carl's Place enclosure uses the published outer size, frame depth and rear fitting", () => {
    const s = defaultState('N1');
    s.enclosure = { model: 'PRO-10 x 15.5', depthIn: 129.5, material: 'premium' };
    const L = computeLayout(s, PRODUCTS.N1);
    expect(L.enclosure!.outerWM).toBeCloseTo(inToM(190.3), 12);
    expect(L.enclosure!.outerHM).toBeCloseTo(inToM(123), 12);
    expect(L.enclosure!.maxZ - L.enclosure!.minZ).toBeCloseTo(inToM(129.5), 12);
    expect(L.enclosure!.minZ - L.enclosure!.backZ).toBeCloseTo(inToM(9.5), 12);
    expect(L.screen!.widthM).toBeCloseTo(inToM(176.3), 12);
    expect(L.screen!.heightM).toBeCloseTo(inToM(110.2), 12);
  });

  it('curved screen: arc through the published chord and arc length', () => {
    const s = defaultState('N1');
    s.enclosure = { model: 'CURVED-10 x 17', depthIn: 105.5, material: 'premium' };
    const L = computeLayout(s, PRODUCTS.N1);
    const c = L.screen!.curve!;
    const half = c.arcM / c.radiusM / 2;
    expect(2 * c.radiusM * Math.sin(half)).toBeCloseTo(inToM(199), 6);
    expect(c.arcM).toBeCloseTo(inToM(230.2), 12);
    expect(L.screen!.projectionZ - L.screen!.planeZ).toBeCloseTo(c.sagittaM, 12);
  });

  it('HotShot mats: published size and 1.75 in height; offset mats shift toward the stance side', () => {
    const s = defaultState('N1');
    s.mat.model = 'hotshot-5x8';
    const L = computeLayout(s, PRODUCTS.N1);
    expect(L.mat!.size[0]).toBeCloseTo(inToM(96), 12);
    expect(L.mat!.size[2]).toBeCloseTo(inToM(60), 12);
    expect(L.mat!.center[0]).toBeLessThan(s.tee.xM); // right-handed golfer stands on -X
    expect(L.matInsert!.maxZ - L.matInsert!.minZ).toBeCloseTo(inToM(30), 12);
  });

  it('NEO-E footprint equals the published 15.8 × 29.4 in and mirrors with handedness', () => {
    const s = defaultState('NEO-E');
    const R = computeLayout(s, PRODUCTS['NEO-E']);
    s.handedness = 'left';
    const Lh = computeLayout(s, PRODUCTS['NEO-E']);
    if (R.kind !== 'portable' || Lh.kind !== 'portable') throw new Error();
    const fp = R.installationFootprint;
    expect(fp.maxX - fp.minX).toBeCloseTo(inToM(29.4), 9);
    expect(fp.maxZ - fp.minZ).toBeCloseTo(inToM(15.8), 9);
    expect(R.deviceSide).toBe(1);
    expect(Lh.deviceSide).toBe(-1);
    expect(Lh.deviceAnchor[0] - s.tee.xM).toBeCloseTo(-(R.deviceAnchor[0] - s.tee.xM), 12);
    // ball sits at the strike-zone centre (D05 p.24)
    expect((R.strikeZone.minX + R.strikeZone.maxX) / 2).toBeCloseTo(s.tee.xM, 12);
    expect(R.datumStatus).toBe('MANUAL');
  });

  it('unit display toggles never change geometry', () => {
    const s = defaultState('N2');
    const a = computeLayout(s, PRODUCTS.N2);
    s.displayUnits = 'imperial';
    expect(computeLayout(s, PRODUCTS.N2)).toEqual(a);
  });
});
