import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { DimensionLine, Layout } from '../domain/layout';
import type { CameraPreset, LayerId } from '../domain/schema';
import type { LabelAnchor } from '../scene/LabelProjector';
import { useT } from '../lib/hooks';
import { hasWebGL2 } from '../lib/webgl';
import { usePlanner } from '../store/plannerStore';
import { PlanView2D } from './PlanView2D';
import { SCENE } from '../scene/colors';
import { cameraApi } from '../scene/cameraApi';
import { useSwingClock } from '../store/swingClock';
import { T_IMPACT, T_TOP } from '../domain/swing';

const PlannerCanvas = lazy(() => import('../scene/PlannerCanvas').then((m) => ({ default: m.PlannerCanvas })));
const WEBGL = hasWebGL2();

const PRIORITY: Record<DimensionLine['kind'], number> = { official: 0, swing: 1, info: 2, room: 3 };

/** Hide dimensions that run along the orthographic viewing axis (they would collapse to a point). */
export function visibleDims(dims: DimensionLine[], preset: CameraPreset): DimensionLine[] {
  if (preset === '3d') return dims;
  const axis = preset === 'top' ? 1 : preset === 'side' ? 0 : 2;
  return dims.filter((d) => {
    const v = [d.to[0] - d.from[0], d.to[1] - d.from[1], d.to[2] - d.from[2]];
    const len = Math.hypot(v[0]!, v[1]!, v[2]!) || 1;
    return Math.abs(v[axis]!) / len < 0.5;
  });
}

export function Viewport({ layout }: { layout: Layout | null }) {
  const { t, fmt } = useT();
  const state = usePlanner((s) => s.state);
  const plan2d = usePlanner((s) => s.plan2d);
  const resetCounter = usePlanner((s) => s.cameraResetCounter);
  const { setCamera, setPlan2d, toggleLayer, resetCameraTick } = usePlanner();
  const [contextLost, setContextLost] = useState(false);
  const [, setModelKind] = useState<'preview' | 'envelope' | null>(null);
  const labelElements = useRef(new Map<string, HTMLElement>()).current;
  const show3d = WEBGL && !contextLost && !plan2d;

  const dims = useMemo(
    () => (layout && state.view.layers.dimensions ? visibleDims(layout.dimensions, state.view.camera) : []),
    [layout, state.view.layers.dimensions, state.view.camera],
  );
  const anchors: LabelAnchor[] = useMemo(
    () => (state.view.layers.labels ? dims.map((d) => ({
      id: d.id,
      position: [(d.from[0] + d.to[0]) / 2, (d.from[1] + d.to[1]) / 2, (d.from[2] + d.to[2]) / 2],
      priority: PRIORITY[d.kind],
    })) : []),
    [dims, state.view.layers.labels],
  );

  const views: CameraPreset[] = ['3d', 'top', 'side', 'front'];
  const layers: LayerId[] = layout?.kind === 'portable'
    ? ['golfer', 'swingArc', 'beam', 'maxArea', 'footprint', 'dimensions', 'labels']
    : ['golfer', 'swingArc', 'beam', 'maxArea', 'dimensions', 'labels'];
  const stageRef = useRef<HTMLDivElement>(null);
  const [isFull, setIsFull] = useState(false);
  useEffect(() => {
    const on = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  return (
    <div className="viewport">
      <div className="viewport__bar" role="toolbar" aria-label={t('panel.view')}>
        <div className="seg-mini" role="group" aria-label={t('aria.camera')}>
          {views.map((v) => (
            <button key={v} type="button" disabled={!WEBGL || contextLost} aria-pressed={show3d && state.view.camera === v} onClick={() => setCamera(v)}>
              {t(`view.${v}`)}
            </button>
          ))}
          <button type="button" aria-pressed={!show3d} onClick={() => setPlan2d(true)}>{t('view.plan2d')}</button>
        </div>
        {show3d && <button type="button" className="btn btn--ghost btn--sm" onClick={resetCameraTick}>{t('view.reset')}</button>}
      </div>

      <div className="viewport__stage" ref={stageRef}>
        {!layout ? (
          <div className="stage-empty">{t('verdict.invalidInput')}</div>
        ) : show3d ? (
          <>
            <Suspense fallback={<div className="stage-empty">{t('loading.model')}</div>}>
              <PlannerCanvas
                layout={layout}
                state={state}
                dims={dims}
                anchors={anchors}
                labelElements={labelElements}
                resetCounter={resetCounter}
                onModelKind={setModelKind}
                onContextLost={() => setContextLost(true)}
              />
            </Suspense>
            <div className="label-layer" aria-label={t('layer.dimensions')}>
              {anchors.map((a) => {
                const d = dims.find((x) => x.id === a.id)!;
                return (
                  <span
                    key={a.id}
                    ref={(el) => {
                      if (el) labelElements.set(a.id, el);
                      else labelElements.delete(a.id);
                    }}
                    className={`dim-label dim-${d.kind}`}
                  >
                    {t(d.labelKey)} <span className="tabular">{fmt.len(d.valueM)}</span>
                  </span>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {(!WEBGL || contextLost) && (
              <div className="fallback-note" role="note">
                <strong>{t('fallback.title')}</strong> {t('fallback.body')}
              </div>
            )}
            <PlanView2D layout={layout} />
          </>
        )}

        {layout && show3d && (
          <div className="viewport__overlay">
            <div className="layer-toggles" role="group" aria-label={t('layer.legend')}>
              {layers.map((l) => {
                const sw = swatch(l, layout.kind);
                return (
                  <button key={l} type="button" className="chip" aria-pressed={state.view.layers[l]} onClick={() => toggleLayer(l)}>
                    {sw && <i className={`chip__swatch ${sw.cls ?? ''}`} style={sw.style} aria-hidden="true" />}
                    {t(`layer.${l}`)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {show3d && layout && (
          <div className="view-tools" role="group" aria-label={t('aria.camera')}>
            <button type="button" className="icon-btn" aria-label={t('view.zoomIn')} title={t('view.zoomIn')} onClick={() => cameraApi.zoom(1.2)}>+</button>
            <button type="button" className="icon-btn" aria-label={t('view.zoomOut')} title={t('view.zoomOut')} onClick={() => cameraApi.zoom(1 / 1.2)}>−</button>
            <button
              type="button"
              className="icon-btn"
              aria-label={t(isFull ? 'view.exitFullscreen' : 'view.fullscreen')}
              title={t(isFull ? 'view.exitFullscreen' : 'view.fullscreen')}
              aria-pressed={isFull}
              onClick={() => {
                const el = stageRef.current;
                if (!el) return;
                if (document.fullscreenElement) void document.exitFullscreen();
                else void el.requestFullscreen?.();
              }}
            >{isFull ? '⤡' : '⤢'}</button>
          </div>
        )}
        {show3d && layout && <SwingBar ortho={state.view.camera !== '3d'} />}
      </div>
    </div>
  );
}

/** Each layer chip doubles as its legend entry. */
function swatch(l: LayerId, kind: Layout['kind']): { cls?: string; style: React.CSSProperties } | null {
  switch (l) {
    case 'swingArc': return { cls: 'line', style: { background: `linear-gradient(90deg, #8FD3FF, ${SCENE.brand})` } };
    case 'beam': return { style: { background: 'rgba(255,243,196,.7)' } };
    case 'maxArea': return kind === 'overhead'
      ? { style: { background: SCENE.maxArea } }
      : { cls: 'dash', style: { borderColor: SCENE.maxArea, background: 'rgba(214,224,51,.18)' } };
    case 'footprint': return { cls: 'dash', style: { borderColor: SCENE.footprint } };
    default: return null;
  }
}

const PHASES = ['address', 'backswing', 'downswing', 'finish'] as const;

/** Swing playback + scrubber with the current swing phase. */
function SwingBar({ ortho }: { ortho: boolean }) {
  const { t } = useT();
  const tt = useSwingClock((s) => s.t);
  const playing = useSwingClock((s) => s.playing);
  const { play, pause, setT } = useSwingClock();
  const phase = tt < 0.1 ? 0 : tt < T_TOP ? 1 : tt < T_IMPACT ? 2 : 3;
  return (
    <div className="swing-bar">
      <button type="button" className="btn btn--primary btn--sm" onClick={playing ? pause : play}>
        {playing ? `❚❚ ${t('swing.pause')}` : `▶ ${t('swing.play')}`}
      </button>
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(tt * 1000)}
        aria-label={t('swing.scrub')}
        onChange={(e) => setT(Number(e.target.value) / 1000)}
        className="swing-bar__range"
        style={{ ['--p' as string]: `${tt * 100}%` }}
      />
      <span className="swing-bar__tag" data-phase={phase}>{t(`swing.phase.${PHASES[phase]}`)}</span>
      <span className="swing-bar__hint">{t(ortho ? 'view.dragHintOrtho' : 'view.dragHint')}</span>
    </div>
  );
}
