import type { ProductSpec } from '../data/specs/products';
import { isOverhead } from '../data/specs/products';
import { useT } from '../lib/hooks';
import { inToM, trimNumber } from '../domain/units';

/** Key installation values of the selected launch monitor, in the chosen units. */
export function SpecCard({ spec }: { spec: ProductSpec }) {
  const { t, units, fmt } = useT();
  const metric = units === 'metric';
  const one = (v: number) => (metric ? fmt.len(inToM(v)) : `${trimNumber(v)}″`);
  const size = (...v: number[]) =>
    metric ? `${v.map((x) => Math.round(inToM(x) * 1000)).join(' × ')} mm` : `${v.map(trimNumber).join(' × ')}″`;
  const rows: { k: string; v: string }[] = [{ k: t('sensor.size'), v: size(spec.deviceSizeIn.w, spec.deviceSizeIn.h, spec.deviceSizeIn.d) }];
  if (isOverhead(spec)) {
    rows.push(
      { k: t('sensor.mountRange'), v: `${one(spec.mountHeightIn.min)} – ${one(spec.mountHeightIn.max)}` },
      { k: t('sensor.offset'), v: one(spec.lensToTeeIn.value) },
      { k: t('sensor.area'), v: size(spec.maxArea.sideAIn, spec.maxArea.sideBIn) },
    );
  } else {
    rows.push(
      { k: t('sensor.space'), v: size(spec.installationSpaceIn.w, spec.installationSpaceIn.d) },
      { k: t('sensor.strike'), v: size(spec.strikeZoneIn.w, spec.strikeZoneIn.d) },
    );
  }
  return (
    <div className="spec-card">
      <div className="spec-card__head">
        <span className="spec-card__name">NVISAGE {spec.displayName}</span>
        <span className="spec-card__tag">{t(`sensor.tagline.${spec.id}`)}</span>
      </div>
      <dl className="spec-list">
        {rows.map((r) => (
          <div key={r.k} className="spec-row">
            <dt>{r.k}</dt>
            <dd><span className="tabular">{r.v}</span></dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
