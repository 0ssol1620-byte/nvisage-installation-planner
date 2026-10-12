import { describe, expect, it } from 'vitest';
import { MESSAGES, translate, type Fmt } from '../../src/i18n';
import { PRODUCTS, PRODUCT_ORDER } from '../../src/data/specs/products';
import { evaluate } from '../../src/domain/rules';
import { defaultState } from '../../src/domain/schema';

const fmt: Fmt = { len: (m) => `${m.toFixed(3)} m`, inch: (v) => `${v}″` };
const render = (locale: 'en' | 'ko', key: string, p: Record<string, number | string> = {}) => translate(locale, key, p, fmt);

describe('customer copy', () => {
  it('EN and KO define exactly the same keys', () => {
    expect(Object.keys(MESSAGES.ko).sort()).toEqual(Object.keys(MESSAGES.en).sort());
  });

  it('never uses banned absolute claims (Appendix B-7)', () => {
    const banned = /guarantee|100%\s*safe|certified|fully compatible|safe to swing|installation approved/i;
    for (const locale of ['en', 'ko'] as const) {
      for (const key of Object.keys(MESSAGES[locale])) {
        const text = render(locale, key, { field: 'x', min: 1, max: 2, by: 0.1, below: 0.1, above: 0, surface: 2.8, offset: 0.6, label: 'Zone', a: 1, b: 2, zone: 'Z', outer: 'O', w: 1, d: 2, v: 14.2 });
        // the disclaimer intentionally says "not ... a safety certification"
        if (key === 'verdict.disclaimer') continue;
        expect(text, `${locale}:${key}`).not.toMatch(banned);
      }
    }
  });

  it('every check message produced by the engine has copy in both locales', () => {
    for (const id of PRODUCT_ORDER) {
      const s = defaultState(id);
      s.view.layers.configZones = true;
      for (const c of evaluate(s, PRODUCTS[id]).checks) {
        expect(MESSAGES.en[c.messageKey], c.messageKey).toBeDefined();
        expect(MESSAGES.ko[c.messageKey], c.messageKey).toBeDefined();
        expect(MESSAGES.en[`cat.${c.category}`]).toBeDefined();
      }
    }
  });
});
