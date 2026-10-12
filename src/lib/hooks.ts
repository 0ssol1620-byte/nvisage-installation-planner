import { useMemo } from 'react';
import { PRODUCTS } from '../data/specs/products';
import { evaluate } from '../domain/rules';
import { formatLength, trimNumber } from '../domain/units';
import type { Fmt } from '../i18n';
import { translate } from '../i18n';
import { usePlanner } from '../store/plannerStore';

export function useT() {
  const locale = usePlanner((s) => s.state.locale);
  const units = usePlanner((s) => s.state.displayUnits);
  return useMemo(() => {
    const fmt: Fmt = {
      len: (m: number) => formatLength(m, units),
      inch: (v: number | string) => `${typeof v === 'number' ? trimNumber(v) : v}″`,
    };
    return {
      locale,
      units,
      fmt,
      t: (key: string, params?: Record<string, number | string>) => translate(locale, key, params, fmt),
    };
  }, [locale, units]);
}

export function useEvaluation() {
  const state = usePlanner((s) => s.state);
  return useMemo(() => ({ state, spec: PRODUCTS[state.product], ...evaluate(state, PRODUCTS[state.product]) }), [state]);
}
