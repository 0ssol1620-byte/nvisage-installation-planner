import type { ProductSpec } from '../data/specs/products';
import { isOverhead } from '../data/specs/products';
import { citationLabel } from '../data/sources';
import { useT } from '../lib/hooks';
import { formatPublishedInches } from '../domain/units';

/** Published values exactly as printed, with a one-click route to the source page (Appendix B-8). */
export function SpecCard({ spec }: { spec: ProductSpec }) {
  const { t, units } = useT();
  const p = (v: number) => formatPublishedInches(v, units);
  const rows: { k: string; v: string; sub?: string; cite: string }[] = [
    { k: t('sensor.size'), v: `${spec.deviceSizeIn.w} × ${spec.deviceSizeIn.h} × ${spec.deviceSizeIn.d}″`, sub: spec.deviceSizeIn.label, cite: citationLabel(spec.deviceSizeIn.cites[0]!) },
  ];
  if (isOverhead(spec)) {
    rows.push(
      { k: t('sensor.mountRange'), v: `${p(spec.mountHeightIn.min)} – ${p(spec.mountHeightIn.max)}`, cite: citationLabel(spec.mountHeightIn.cites[0]!) },
      { k: t('sensor.offset'), v: p(spec.lensToTeeIn.value), cite: citationLabel(spec.lensToTeeIn.cites[0]!) },
      { k: `${t('sensor.area')} (${spec.maxArea.label})`, v: `${spec.maxArea.sideAIn} × ${spec.maxArea.sideBIn}″`, cite: citationLabel(spec.maxArea.cites[0]!) },
    );
  } else {
    rows.push(
      { k: t('sensor.space'), v: `${spec.installationSpaceIn.w} × ${spec.installationSpaceIn.d} × ${spec.installationSpaceIn.h}″`, cite: citationLabel(spec.installationSpaceIn.cites[0]!) },
      { k: t('sensor.strike'), v: `${spec.strikeZoneIn.w} × ${spec.strikeZoneIn.d}″`, cite: citationLabel(spec.strikeZoneIn.cites[0]!) },
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
            <dd>
              <span className="tabular">{r.v}</span>
              {r.sub && <span className="equip-card__sub">{r.sub}</span>}
              <span className="cite">{r.cite}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="spec-card__asset">
        {t('sensor.published')} · {t('sensor.cameras', { n: spec.cameras })} · {t(`sensor.software.${spec.id}`)}
      </p>
    </div>
  );
}
