import type { ReactNode } from 'react';
import { PRODUCTS, PRODUCT_ORDER, isOverhead } from '../data/specs/products';
import type { EnclosureFamily } from '../data/carls';
import { ENCLOSURES, MATS, PROJECTORS, enclosureById, matById, projectorById } from '../data/carls';
import { LIMITS } from '../domain/schema';
import { resolveEquipment } from '../domain/equipment';
import { enclosureForFamily } from '../domain/packages';
import { CLUB_ORDER } from '../domain/swing';
import { inToM } from '../domain/units';
import { clampInside } from '../domain/zone-geometry';
import { useT } from '../lib/hooks';
import { usePlanner } from '../store/plannerStore';
import { LengthField, NumberField, Segmented, SelectField, Toggle } from './fields';
import { SpecCard } from './SpecCard';
import { ROOM_PRESETS as PRESETS } from '../domain/presets';


/** Catalog listing names with typographic marks: "4' x 9'" → "4′ × 9′". */
export const listingLabel = (s: string) => s.replace(/ x /g, ' × ').replace(/'/g, '′');

const FAMILIES: EnclosureFamily[] = ['DIY', 'PRO', 'CURVED'];

function fmtDims(d: readonly [number, number, number], u: 'metric' | 'imperial'): string {
  if (u === 'metric') return d.map((v) => String(Number(v.toFixed(2)))).join(' × ') + ' m';
  return d.map((v) => {
    const inch = Math.round(v / 0.0254);
    const ft = Math.floor(inch / 12);
    return inch % 12 ? `${ft}′${inch % 12}″` : `${ft}′`;
  }).join(' × ');
}

/** Catalog values exactly as published (inches) with the converted value. */
function EquipCard({ rows }: { rows: { k: string; v: ReactNode }[] }) {
  return (
    <dl className="equip-card spec-list">
      {rows.map((r) => (
        <div key={r.k} className="spec-row">
          <dt>{r.k}</dt>
          <dd><span className="tabular">{r.v}</span></dd>
        </div>
      ))}
    </dl>
  );
}

export function InputsPanel() {
  const { t, fmt } = useT();
  const s = usePlanner((st) => st.state);
  const a = usePlanner();
  const spec = PRODUCTS[s.product];
  const u = s.displayUnits;
  const eq = resolveEquipment(s);
  const enc = enclosureById(s.enclosure.model);
  const proj = projectorById(s.projector.model);
  const mat = s.mat.model === 'custom' ? null : matById(s.mat.model);
  const inch = (v: number) => fmt.inch(v);
  // published inches first, converted value on its own line
  // the chosen units first; in metric the catalog inches follow underneath
  const metric = u === 'metric';
  const dual = (main: string, sub: string) => (
    <>
      {metric ? main : sub}
      {metric && <span className="equip-card__sub">{sub}</span>}
    </>
  );
  const both = (wIn: number, hIn: number) => dual(`${fmt.len(inToM(wIn))} × ${fmt.len(inToM(hIn))}`, `${inch(wIn)} × ${inch(hIn)}`);
  const one = (vIn: number) => dual(fmt.len(inToM(vIn)), inch(vIn));

  return (
    <div className="panel-scroll">
      <div className="intro">
        <p className="intro__title">{t('hero.title')}</p>
        <p className="intro__sub">{t('hero.sub')}</p>
      </div>
      <section className="panel-section" aria-labelledby="sec-space">
        <h2 id="sec-space" className="eyebrow">{t('panel.space')}</h2>
        <div className="presets" role="group" aria-label={t('preset.title')}>
          {PRESETS.map((p) => {
            const [W, D, H] = p.dims;
            const on = Math.abs(s.room.widthM - W) < 1e-6 && Math.abs(s.room.depthM - D) < 1e-6 && Math.abs(s.room.heightM - H) < 1e-6;
            return (
              <button
                key={p.id}
                type="button"
                className={`preset ${on ? 'is-on' : ''}`}
                aria-pressed={on}
                onClick={() => a.setRoom({ widthM: W, depthM: D, heightM: H })}
              >
                <span className="preset__name">{t(`preset.${p.id}`)}</span>
                <span className="preset__dims tabular">{fmtDims(p.dims, u)}</span>
              </button>
            );
          })}
        </div>
        <p className="note">{t('field.measureHint')}</p>
        <LengthField label={t('field.width')} valueM={s.room.widthM} rangeM={LIMITS.roomWidthM} units={u} onChange={(widthM) => a.setRoom({ widthM })} />
        <LengthField label={t('field.depth')} valueM={s.room.depthM} rangeM={LIMITS.roomDepthM} units={u} onChange={(depthM) => a.setRoom({ depthM })} />
        <LengthField label={t('field.height')} valueM={s.room.heightM} rangeM={LIMITS.roomHeightM} units={u} stepM={0.01} onChange={(heightM) => a.setRoom({ heightM })} />
      </section>

      <section className="panel-section" aria-labelledby="sec-sensor">
        <h2 id="sec-sensor" className="eyebrow">{t('panel.sensor')}</h2>
        <Segmented
          label={t('panel.sensor')}
          size="lg"
          value={s.product}
          onChange={a.setProduct}
          options={PRODUCT_ORDER.map((id) => ({ value: id, label: PRODUCTS[id].displayName, sub: t(`sensor.${id}`) }))}
        />
        <SpecCard spec={spec} />
      </section>

      <section className="panel-section" aria-labelledby="sec-golfer">
        <h2 id="sec-golfer" className="eyebrow">{t('panel.golfer')}</h2>
        <Segmented
          label={t('field.handedness')}
          value={s.handedness}
          onChange={a.setHandedness}
          options={[{ value: 'right', label: t('field.right') }, { value: 'left', label: t('field.left') }]}
        />
        <LengthField label={t('field.golferHeight')} valueM={s.golfer.heightM} rangeM={LIMITS.golferHeightM} units={u} stepM={0.01} onChange={(heightM) => a.setGolfer({ heightM })} />
        <Segmented
          label={t('field.club')}
          value={s.golfer.club}
          onChange={(club) => a.setGolfer({ club })}
          options={CLUB_ORDER.map((c) => ({ value: c, label: t(`club.${c}`) }))}
        />
        <p className="note note--muted">{t('field.swingNote')}</p>
      </section>

      <section className="panel-section" aria-labelledby="sec-setup">
        <h2 id="sec-setup" className="eyebrow">{t('panel.setup')}</h2>
        <LengthField label={t('field.teeZ')} valueM={s.tee.zM} rangeM={[0.1, s.room.depthM - 0.1]} units={u} onChange={(zM) => a.setTee({ zM })} />
        <LengthField label={t('field.teeX')} valueM={s.tee.xM} rangeM={[-s.room.widthM / 2 + 0.1, s.room.widthM / 2 - 0.1]} units={u} onChange={(xM) => a.setTee({ xM })} />
        <Toggle label={t('field.mat')} checked={s.mat.enabled} onChange={(enabled) => a.setMat({ enabled })} />
        {s.mat.enabled && (
          <>
            <SelectField
              label={t('field.matModel')}
              value={s.mat.model}
              onChange={a.selectMat}
              groups={[
                { label: 'HotShot', options: MATS.map((m) => ({ value: m.id, label: listingLabel(m.listing) })) },
                { options: [{ value: 'custom', label: t('field.matCustom') }] },
              ]}
            />
            {mat ? (
              <EquipCard
                rows={[
                  { k: t('mat.size'), v: both(mat.wIn, mat.dIn) },
                  { k: t('mat.height'), v: one(mat.hIn) },
                ]}
              />
            ) : (
              <div className="grid-2">
                <LengthField label={t('field.matW')} valueM={s.mat.widthM} rangeM={LIMITS.matSideM} units={u} onChange={(widthM) => a.setMat({ widthM })} />
                <LengthField label={t('field.matD')} valueM={s.mat.depthM} rangeM={LIMITS.matSideM} units={u} onChange={(depthM) => a.setMat({ depthM })} />
                <LengthField label={t('field.matH')} valueM={s.mat.heightM} rangeM={LIMITS.matHeightM} units={u} stepM={0.005} onChange={(heightM) => a.setMat({ heightM })} />
              </div>
            )}
          </>
        )}
      </section>

      <section className="panel-section" aria-labelledby="sec-screen">
        <h2 id="sec-screen" className="eyebrow">{t('panel.screen')}</h2>
        <Segmented
          label={t('field.encFamily')}
          value={enc ? enc.family : 'none'}
          onChange={(f) => a.selectEnclosure(enclosureForFamily(s, f))}
          options={[...FAMILIES.map((f) => ({ value: f as string, label: t(`enc.${f}`) })), { value: 'none', label: t('field.encNone') }]}
        />
        {enc ? (
          <>
            <div className="grid-size">
              <SelectField
                label={t('field.encSize')}
                value={enc.id}
                onChange={a.selectEnclosure}
                groups={[{ options: ENCLOSURES.filter((e) => e.family === enc.family).map((e) => ({ value: e.id, label: e.aspect ? `${listingLabel(e.listing)} · ${e.aspect}` : listingLabel(e.listing) })) }]}
              />
              <SelectField
                label={t('field.encDepth')}
                value={String(s.enclosure.depthIn)}
                onChange={(v) => a.setEnclosure({ depthIn: Number(v) })}
                groups={[{ options: enc.depthsIn.map((d, i) => ({ value: String(d), label: `${enc.depthListingFt[i]}′ · ${inch(d)}` })) }]}
              />
            </div>
            <EquipCard
              rows={[
                { k: t('enc.outer'), v: both(enc.outerWIn, enc.outerHIn) },
                { k: t('enc.screen'), v: both(enc.screenWIn, enc.screenHIn) },
                ...(enc.arcWIn ? [{ k: t('enc.arc'), v: one(enc.arcWIn) }] : []),
                { k: t('enc.footprint'), v: one(Math.round((s.enclosure.depthIn + enc.rearFittingIn) * 1000) / 1000) },
              ]}
            />
            <LengthField label={t('field.screenSetback')} valueM={s.screen.setbackM} rangeM={LIMITS.screenSetbackM} units={u} stepM={0.01} onChange={(setbackM) => a.setScreen({ setbackM })} />
          </>
        ) : (
          <>
            <Toggle label={t('field.screen')} checked={s.screen.enabled} onChange={(enabled) => a.setScreen({ enabled })} />
            {s.screen.enabled && (
              <div className="grid-2">
                <LengthField label={t('field.screenW')} valueM={s.screen.widthM} rangeM={LIMITS.screenWidthM} units={u} onChange={(widthM) => a.setScreen({ widthM })} />
                <LengthField label={t('field.screenH')} valueM={s.screen.heightM} rangeM={LIMITS.screenHeightM} units={u} onChange={(heightM) => a.setScreen({ heightM })} />
                <LengthField label={t('field.screenSetback')} valueM={s.screen.setbackM} rangeM={LIMITS.screenSetbackM} units={u} onChange={(setbackM) => a.setScreen({ setbackM })} />
                <LengthField label={t('field.screenBottom')} valueM={s.screen.bottomM} rangeM={LIMITS.screenBottomM} units={u} onChange={(bottomM) => a.setScreen({ bottomM })} />
              </div>
            )}
          </>
        )}
      </section>

      <section className="panel-section" aria-labelledby="sec-projector">
        <h2 id="sec-projector" className="eyebrow">{t('panel.projector')}</h2>
        <SelectField
          label={t('field.projectorModel')}
          value={s.projector.model}
          onChange={a.selectProjector}
          groups={[
            { options: PROJECTORS.map((p) => ({ value: p.id, label: `${p.name} · ${p.resolution === '3840 × 2160' ? '4K' : 'Full HD'}` })) },
            { options: [{ value: 'none', label: t('field.projectorNone') }] },
          ]}
        />
        {proj && (
          <>
            <NumberField
              label={t('field.throwRatio')}
              value={s.projector.throwRatio}
              range={[proj.throwMin, proj.throwMax]}
              step={0.01}
              onChange={(throwRatio) => a.setProjector({ throwRatio })}
            />
            <EquipCard
              rows={[
                { k: t('proj.range'), v: <>{`${proj.throwMin} – ${proj.throwMax}`}{proj.lensShiftV ? <span className="equip-card__sub">{t('proj.lensShift', { pct: proj.lensShiftV * 100 })}</span> : null}</> },
                ...(eq.projector
                  ? [
                      { k: t('proj.distance'), v: <>{fmt.len(eq.projector.distanceM)}<span className="equip-card__sub">{`${fmt.len(eq.projector.distanceRangeM[0])} – ${fmt.len(eq.projector.distanceRangeM[1])}`}</span></> },
                      { k: t('proj.drop'), v: fmt.len(Math.max(0, eq.projector.dropM)) },
                    ]
                  : []),
              ]}
            />
          </>
        )}
      </section>

      {isOverhead(spec) && (
        <details
          className="panel-section advanced"
          onToggle={(e) => {
            const el = e.currentTarget;
            if (el.open) requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
          }}
        >
          <summary className="eyebrow">{t('panel.advanced')}</summary>
          <LengthField label={t('field.mountDrop')} valueM={s.sensor.mountDropM} rangeM={LIMITS.mountDropM} units={u} stepM={0.01} onChange={a.setMountDrop} />
          <Toggle label={t('field.zones')} checked={s.view.layers.configZones} onChange={() => a.toggleLayer('configZones')} />
          {s.view.layers.configZones && <ZoneDesigner />}
        </details>
      )}
    </div>
  );
}

function ZoneDesigner() {
  const { t } = useT();
  const s = usePlanner((st) => st.state);
  const setZone = usePlanner((st) => st.setZone);
  const spec = PRODUCTS[s.product];
  if (!isOverhead(spec) || (s.product !== 'N1' && s.product !== 'N2')) return null;
  const product = s.product;
  const max = { cx: 0, cz: 0, w: inToM(spec.maxArea.sideAIn), d: inToM(spec.maxArea.sideBIn) };
  const zones = product === 'N1'
    ? [{ id: 'ready' as const, rect: s.zones.N1.ready, label: t('zones.ready') }, { id: 'tee' as const, rect: s.zones.N1.tee, label: t('zones.tee') }]
    : [{ id: 'basic' as const, rect: s.zones.N2.basic, label: t('zones.basic') }, { id: 'tee' as const, rect: s.zones.N2.tee, label: t('zones.tee') }];
  const range = [-max.w, max.w] as const;
  return (
    <div className="zone-designer">
      <p className="note">{t('zones.note')}</p>
      {zones.map((z) => (
        <fieldset key={z.id} className="zone-fieldset">
          <legend>{z.label}</legend>
          <div className="grid-2">
            <LengthField label={t('zones.w')} valueM={z.rect.w} rangeM={[0.02, 1.2]} units={s.displayUnits} stepM={0.01} onChange={(w) => setZone(product, z.id, { w })} />
            <LengthField label={t('zones.d')} valueM={z.rect.d} rangeM={[0.02, 1.2]} units={s.displayUnits} stepM={0.01} onChange={(d) => setZone(product, z.id, { d })} />
            <LengthField label={t('zones.x')} valueM={z.rect.cx} rangeM={range} units={s.displayUnits} stepM={0.01} onChange={(cx) => setZone(product, z.id, { cx })} />
            <LengthField label={t('zones.z')} valueM={z.rect.cz} rangeM={range} units={s.displayUnits} stepM={0.01} onChange={(cz) => setZone(product, z.id, { cz })} />
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => {
          const outer = zones[0]!.rect;
          const fixedOuter = clampInside(max, outer);
          setZone(product, zones[0]!.id, fixedOuter);
          // Only N2 documents a Tee ⊆ Basic rule (D11 p.13); N1 Tee Zone has no documented limit.
          if (product === 'N2') setZone(product, 'tee', clampInside(fixedOuter, zones[1]!.rect));
        }}
      >
        {t('zones.snap')}
      </button>
    </div>
  );
}
