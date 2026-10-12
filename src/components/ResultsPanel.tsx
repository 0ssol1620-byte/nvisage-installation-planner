import { useState } from 'react';
import type { DomainCheck, DomainStatus, Verdict } from '../domain/rules';
import { SOURCES, citationLabel } from '../data/sources';
import { useT } from '../lib/hooks';
import { usePlanner } from '../store/plannerStore';
import { serializeState } from '../domain/schema';

const ICON: Record<DomainStatus, string> = { PASS: '✓', CAUTION: '!', FAIL: '✕', NOT_VERIFIED: '?', NOT_EVALUATED: '–' };

export function StatusBadge({ status }: { status: DomainStatus }) {
  const { t } = useT();
  return (
    <span className={`badge badge--${status}`}>
      <span aria-hidden="true" className="badge__icon">{ICON[status]}</span>
      {t(`status.${status}`)}
    </span>
  );
}

export function ResultsPanel({ checks, verdict }: { checks: DomainCheck[]; verdict: Verdict }) {
  const { t } = useT();
  const headTone = verdict.counts.FAIL > 0 || verdict.headlineKey === 'verdict.invalidInput' ? 'FAIL' : verdict.counts.CAUTION > 0 || verdict.counts.NOT_VERIFIED > 0 ? 'NOT_VERIFIED' : 'PASS';
  return (
    <div className="panel-scroll" aria-live="polite">
      <section className="panel-section">
        <h2 className="eyebrow">{t('panel.results')}</h2>
        <div className={`verdict verdict--${headTone}`}>
          <p className="verdict__title">{t(verdict.headlineKey)}</p>
          <ul className="verdict__counts" aria-label={t('aria.summary')}>
            {(['FAIL', 'CAUTION', 'NOT_VERIFIED', 'NOT_EVALUATED', 'PASS'] as DomainStatus[]).map((s) =>
              verdict.counts[s] ? (
                <li key={s} className={`count count--${s}`}>
                  <span className="tabular">{verdict.counts[s]}</span> {t(`status.${s}`)}
                </li>
              ) : null,
            )}
          </ul>
        </div>
        <ol className="checks">
          {checks.map((c) => <CheckRow key={c.id} check={c} />)}
        </ol>
      </section>
      <section className="panel-section">
        <ShareButton />
        <p className="disclaimer">{t('verdict.disclaimer')}</p>
      </section>
    </div>
  );
}

function CheckRow({ check }: { check: DomainCheck }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const hasSource = (check.sources?.length ?? 0) > 0 || !!check.datumNote;
  return (
    <li className={`check check--${check.status}`}>
      <div className="check__head">
        <span className="check__cat">{t(`cat.${check.category}`)}</span>
        <StatusBadge status={check.status} />
      </div>
      <p className="check__msg">{t(check.messageKey, check.params?.club ? { ...check.params, club: t(`club.${check.params.club}`) } : check.params)}</p>
      <div className="check__foot">
        <span className="check__conf">{t(`source.confidence.${check.confidence}`)}</span>
        {hasSource && (
          <button type="button" className="linkish" aria-expanded={open} onClick={() => setOpen(!open)}>
            {t('source.label')} {open ? '▴' : '▾'}
          </button>
        )}
      </div>
      {open && hasSource && (
        <div className="check__sources">
          {check.sources?.map((c, i) => (
            <p key={i} className="src">
              <span className="src__doc">{citationLabel(c)}</span>
              {SOURCES[c.doc]?.docNumber && <span className="src__num"> · {SOURCES[c.doc]!.docNumber}</span>}
              {c.quote && <q className="src__quote">{c.quote}</q>}
              {c.diagram && <span className="src__diagram"> ({t('source.diagram')}: {c.diagram})</span>}
            </p>
          ))}
          {check.datumNote && (
            <p className="src src--datum"><strong>{t('source.datum')}:</strong> {check.datumNote}</p>
          )}
        </div>
      )}
    </li>
  );
}

function ShareButton() {
  const { t } = useT();
  const state = usePlanner((s) => s.state);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="share">
      <button
        type="button"
        className="btn btn--primary"
        onClick={async () => {
          const url = new URL(window.location.href);
          url.hash = `s=${serializeState(state)}`;
          try {
            await navigator.clipboard.writeText(url.toString());
            setMsg(t('share.copied'));
          } catch {
            setMsg(t('share.failed'));
          }
          window.setTimeout(() => setMsg(null), 2500);
        }}
      >
        {t('share.copy')}
      </button>
      <span className="share__msg" role="status">{msg}</span>
    </div>
  );
}
