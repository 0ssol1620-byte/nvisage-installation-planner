import { describe, expect, it } from 'vitest';
import { defaultState } from '../../src/domain/schema';
import { enclosureForFamily, selectEnclosure, selectProjector } from '../../src/domain/packages';
import { enclosureById } from '../../src/data/carls';
import { inToM } from '../../src/domain/units';

describe('equipment selection', () => {
  it('switching family picks the largest size that fits the room with the 2 in buffer', () => {
    const s = defaultState('N1'); // room 4.5 × 6.0 × 2.95 m
    const id = enclosureForFamily(s, 'CURVED');
    const m = enclosureById(id)!;
    expect(inToM(m.outerWIn + 4)).toBeLessThanOrEqual(s.room.widthM);
    expect(inToM(m.outerHIn + 2)).toBeLessThanOrEqual(s.room.heightM);
    // keeps the current size name when the new family offers it and it fits
    expect(enclosureForFamily(s, 'PRO')).toBe('PRO-9 x 12');
  });

  it('falls back to the smallest size when nothing fits', () => {
    const s = { ...defaultState('N1'), room: { widthM: 2.5, depthM: 5, heightM: 2.3 } };
    expect(enclosureForFamily(s, 'DIY')).toBe('DIY-8 x 8');
  });

  it('keeps depth and throw ratio inside the published options', () => {
    const s = selectEnclosure(defaultState('N1'), 'PRO-10 x 15.5');
    expect(enclosureById('PRO-10 x 15.5')!.depthsIn).toContain(s.enclosure.depthIn);
    expect(s.screen.setbackM).toBeGreaterThanOrEqual(inToM(9.5) - 1e-9);
    const p = selectProjector(s, 'lg-bu53rg');
    expect(p.projector.throwRatio).toBeGreaterThanOrEqual(0.94);
    expect(p.projector.throwRatio).toBeLessThanOrEqual(1.14);
  });
});
