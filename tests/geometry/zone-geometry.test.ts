import { describe, expect, it } from 'vitest';
import { clampInside, contains, overflow, toRect2 } from '../../src/domain/zone-geometry';

describe('zone geometry', () => {
  const outer = { cx: 0, cz: 0, w: 0.8, d: 0.6 };

  it('containment allows touching edges', () => {
    expect(contains(toRect2(outer), toRect2({ cx: 0.3, cz: 0, w: 0.2, d: 0.2 }))).toBe(true);
    expect(contains(toRect2(outer), toRect2({ cx: 0.31, cz: 0, w: 0.2, d: 0.2 }))).toBe(false);
  });

  it('overflow reports per-edge excess', () => {
    const o = overflow(toRect2(outer), toRect2({ cx: 0.5, cz: 0, w: 0.2, d: 0.2 }));
    expect(o.right).toBeCloseTo(0.2, 12);
    expect(o.left).toBe(0);
  });

  it('clampInside always produces a contained rectangle (property test)', () => {
    let seed = 42;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 1000; i++) {
      const inner = { cx: (rnd() - 0.5) * 3, cz: (rnd() - 0.5) * 3, w: rnd() * 1.2 + 0.01, d: rnd() * 1.2 + 0.01 };
      expect(contains(toRect2(outer), toRect2(clampInside(outer, inner)), 1e-9)).toBe(true);
    }
  });
});
