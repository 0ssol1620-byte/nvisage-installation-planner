import { useState } from 'react';
import type { DomainCheck, DomainStatus, Verdict } from '../domain/rules';
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
  // items that need attention first; requirements met are collapsed into one row
  const issues = checks.filter((c) => c.status !== 'PASS');
  const passed = checks.filter((c) => c.status === 'PASS');
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
        {issues.length > 0 && (
          <ol className="checks">
            {issues.map((c) => <CheckRow key={c.id} check={c} />)}
          </ol>
        )}
        {passed.length > 0 && (
          // open when there is nothing else to show; re-keyed so it re-opens/closes as the verdict changes
          <details className="passed" key={issues.length === 0 ? 'all' : 'some'} open={issues.length === 0}>
            <summary className="passed__summary">
              <span className="passed__open">{t('results.passed', { n: passed.length })}</span>
              <span className="passed__close">{t('results.passedHide')}</span>
            </summary>
            <ol className="checks checks--compact">
              {passed.map((c) => <CheckRow key={c.id} check={c} compact />)}
            </ol>
          </details>
        )}
      </section>
      <section className="panel-section">
        <ShareButton />
        <p className="disclaimer">{t('verdict.disclaimer')}</p>
      </section>
    </div>
  );
}

function CheckRow({ check, compact = false }: { check: DomainCheck; compact?: boolean }) {
  const { t } = useT();
  const msg = t(check.messageKey, check.params?.club ? { ...check.params, club: t(`club.${check.params.club}`) } : check.params);
  if (compact) {
    return (
      <li className="check check--compact">
        <span aria-hidden="true" className="check__tick">✓</span>
        <span>
          <span className="check__cat">{t(`cat.${check.category}`)}</span>
          <span className="check__msg">{msg}</span>
        </span>
      </li>
    );
  }
  return (
    <li className={`check check--${check.status}`}>
      <div className="check__head">
        <span className="check__cat">{t(`cat.${check.category}`)}</span>
        <StatusBadge status={check.status} />
      </div>
      <p className="check__msg">{msg}</p>
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
