/**
 * Customer copy (blueprint §14.3). EN is the source language; KO is an extension.
 * Banned in customer copy (Appendix B-7): guaranteed, 100% safe, certified, fully compatible.
 * tests/unit/i18n.test.ts enforces this and key parity between locales.
 */
import { en } from './en';
import { ko } from './ko';

export type Fmt = { len: (m: number) => string; inch: (v: number | string) => string };
export type Msg = string | ((p: Record<string, number | string>, f: Fmt) => string);
export type Messages = Record<string, Msg>;

export const MESSAGES: Record<'en' | 'ko', Messages> = { en, ko };

export function translate(locale: 'en' | 'ko', key: string, params: Record<string, number | string> = {}, fmt: Fmt): string {
  const m = MESSAGES[locale][key] ?? MESSAGES.en[key];
  if (m === undefined) return key;
  return typeof m === 'function' ? m(params, fmt) : m;
}
