import { useEffect, useId, useState, type ReactNode } from 'react';
import type { DisplayUnits } from '../domain/units';
import { formatInputText, inputUnitLabel, parseInputText } from '../domain/units';
import { useT } from '../lib/hooks';

/** Unit-aware numeric input: canonical metres in/out, metres or inches on screen, mm-rounded. */
export function LengthField({ label, valueM, onChange, rangeM, units, stepM = 0.05, hint }: {
  label: string;
  valueM: number;
  onChange: (m: number) => void;
  rangeM: readonly [number, number];
  units: DisplayUnits;
  stepM?: number;
  hint?: string;
}) {
  const { t } = useT();
  const id = useId();
  const [text, setText] = useState(() => formatInputText(valueM, units));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(formatInputText(valueM, units));
  }, [valueM, units, focused]);

  const meters = parseInputText(text, units);
  const valid = Number.isFinite(meters);
  const inRange = valid && meters >= rangeM[0] - 1e-9 && meters <= rangeM[1] + 1e-9;
  const error = !valid ? t('field.invalid_number') : !inRange ? t('field.out_of_range', { min: rangeM[0], max: rangeM[1] }) : null;

  const commit = (m: number) => {
    const clamped = Math.min(rangeM[1], Math.max(rangeM[0], m));
    onChange(Math.round(clamped * 1000) / 1000);
  };
  const step = (dir: 1 | -1) => {
    const base = Number.isFinite(meters) ? meters : valueM;
    // imperial steps by whole inches so the text stays readable
    const inc = units === 'imperial' ? 0.0254 * Math.max(1, Math.round(stepM / 0.0254)) : stepM;
    const next = Math.round(Math.min(rangeM[1], Math.max(rangeM[0], base + dir * inc)) * 1000) / 1000;
    // keep the visible text in sync while the field has focus (arrow keys repeat from the new value)
    setText(formatInputText(next, units));
    commit(next);
  };

  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id} className="field__label">{label}</label>
      <div className="field__control">
        <button type="button" className="stepper" aria-label={`${label} −`} onClick={() => step(-1)}>−</button>
        <input
          id={id}
          className="field__input tabular"
          inputMode={units === 'metric' ? 'decimal' : 'text'}
          value={text}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (valid && inRange) onChange(meters);
          }}
          onChange={(e) => {
            setText(e.target.value);
            const m = parseInputText(e.target.value, units);
            if (Number.isFinite(m) && m >= rangeM[0] && m <= rangeM[1]) onChange(m);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); step(1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); step(-1); }
          }}
        />
        <span className="field__unit" aria-hidden="true">{inputUnitLabel(units)}</span>
        <button type="button" className="stepper" aria-label={`${label} +`} onClick={() => step(1)}>+</button>
      </div>
      {error ? (
        <p id={`${id}-err`} className="field__error" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field__hint">{hint}</p>
      ) : null}
    </div>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange, size = 'md' }: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; sub?: ReactNode }[];
  onChange: (v: T) => void;
  size?: 'md' | 'lg';
}) {
  // radio-group keyboard model: one tab stop, arrow keys move the selection
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + d + options.length) % options.length]!;
    onChange(next.value);
    const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    btns[(i + d + options.length) % options.length]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={`segmented segmented--${size}`} onKeyDown={onKeyDown}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className={`segmented__opt ${o.value === value ? 'is-on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          <span className="segmented__label">{o.label}</span>
          {o.sub && <span className="segmented__sub">{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="toggle">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true"><span className="toggle__thumb" /></span>
      <span className="toggle__label">{label}</span>
    </label>
  );
}

/** Unitless numeric input (e.g. projector throw ratio). */
export function NumberField({ label, value, onChange, range, step = 0.05, hint }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  range: readonly [number, number];
  step?: number;
  hint?: string;
}) {
  const { t } = useT();
  const id = useId();
  const [text, setText] = useState(() => String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);
  const parsed = Number(text.replace(',', '.'));
  const valid = text.trim() !== '' && Number.isFinite(parsed);
  const inRange = valid && parsed >= range[0] && parsed <= range[1];
  const error = !valid ? t('field.invalid_number') : !inRange ? `${range[0]} – ${range[1]}` : null;
  const commit = (v: number) => onChange(Math.round(Math.min(range[1], Math.max(range[0], v)) * 100) / 100);
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id} className="field__label">{label}</label>
      <div className="field__control">
        <button type="button" className="stepper" aria-label={`${label} −`} onClick={() => commit((valid ? parsed : value) - step)}>−</button>
        <input
          id={id}
          className="field__input tabular"
          inputMode="decimal"
          value={text}
          aria-invalid={!!error}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (valid && inRange) commit(parsed);
          }}
          onChange={(e) => {
            setText(e.target.value);
            const v = Number(e.target.value.replace(',', '.'));
            if (e.target.value.trim() !== '' && Number.isFinite(v) && v >= range[0] && v <= range[1]) onChange(v);
          }}
        />
        <span className="field__unit" aria-hidden="true">:1</span>
        <button type="button" className="stepper" aria-label={`${label} +`} onClick={() => commit((valid ? parsed : value) + step)}>+</button>
      </div>
      {error ? <p className="field__error" role="alert">{error}</p> : hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

/** Native select styled like the other fields; options may be grouped. */
export function SelectField({ label, value, onChange, groups }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  groups: { label?: string; options: { value: string; label: string }[] }[];
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">{label}</label>
      <div className="field__control field__control--select">
        <select id={id} className="field__select" value={value} onChange={(e) => onChange(e.target.value)}>
          {groups.map((g, i) =>
            g.label ? (
              <optgroup key={i} label={g.label}>
                {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </optgroup>
            ) : (
              g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)
            ),
          )}
        </select>
      </div>
    </div>
  );
}
