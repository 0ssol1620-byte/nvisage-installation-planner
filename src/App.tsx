import { useEffect, useState } from 'react';
import { InputsPanel } from './components/InputsPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { Viewport } from './components/Viewport';
import { Segmented } from './components/fields';
import { useEvaluation, useT } from './lib/hooks';
import { startUrlSync, usePlanner } from './store/plannerStore';
import logoUrl from './assets/nvisage-logo-white-green.png';

type MobileTab = 'space' | 'view' | 'results';

export function App() {
  const { t, locale } = useT();
  const { layout, checks, verdict } = useEvaluation();
  const units = usePlanner((s) => s.state.displayUnits);
  const { setUnits, setLocale } = usePlanner();
  const notice = usePlanner((s) => s.shareNotice);
  const [tab, setTab] = useState<MobileTab>('view');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => startUrlSync(), []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className={`app app--tab-${tab}`}>
      <header className="topbar">
        <div className="topbar__brand">
          <img src={logoUrl} alt="NVISAGE" width={122} height={36} className="topbar__logo" />
          <span className="topbar__sep" aria-hidden="true" />
          <h1 className="topbar__title">{t('app.title')}</h1>
        </div>
        <div className="topbar__tools">
          <Segmented label={t('aria.units')} value={units} onChange={setUnits} options={[{ value: 'metric', label: t('units.metric') }, { value: 'imperial', label: t('units.imperial') }]} />
          <Segmented label={t('aria.language')} value={locale} onChange={setLocale} options={[{ value: 'en', label: 'EN' }, { value: 'ko', label: 'KO' }]} />
        </div>
      </header>

      {notice && !dismissed && (
        <div className={`notice notice--${notice}`} role="status">
          {t(notice === 'loaded' ? 'share.loaded' : 'share.invalid')}
          <button type="button" className="linkish" onClick={() => setDismissed(true)} aria-label={t('aria.dismiss')}>✕</button>
        </div>
      )}

      <main className="workspace">
        <aside className="col col--inputs" aria-label={t('panel.space')}>
          <InputsPanel />
        </aside>
        <section className="col col--view" aria-label={t('panel.view')}>
          <Viewport layout={layout} />
        </section>
        <aside className="col col--results" aria-label={t('panel.results')}>
          <ResultsPanel checks={checks} verdict={verdict} />
        </aside>
      </main>

      <nav className="mobile-tabs" aria-label={t('aria.sections')}>
        {(['space', 'view', 'results'] as MobileTab[]).map((k) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>
            {t(`tab.${k}`)}
            {k === 'results' && verdict.counts.FAIL > 0 && <span className="dot" aria-label={`${verdict.counts.FAIL} ${t('status.FAIL')}`} />}
          </button>
        ))}
      </nav>
    </div>
  );
}
