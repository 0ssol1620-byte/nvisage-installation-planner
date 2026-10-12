import type { SVGProps } from 'react';
import type { Layout } from '../domain/layout';
import type { Rect2 } from '../domain/zone-geometry';
import { SCENE } from '../scene/colors';
import { useT } from '../lib/hooks';

/**
 * Exact orthographic 2D plan + side elevation from the same domain layout as the 3D view.
 * Serves as the no-WebGL fallback (blueprint §6.2) and as a crisp technical view.
 * Units inside the SVG are metres; the screen wall is at the top of the plan.
 */
export function PlanView2D({ layout }: { layout: Layout }) {
  const { t, fmt } = useT();
  const { widthM: W, depthM: D, heightM: H } = layout.room;
  const pad = Math.max(W, D) * 0.12;
  const fs = Math.max(W, D) * 0.034;
  const fsSide = Math.max(D, H) * 0.045;
  const sw = Math.max(W, D) * 0.0025;

  const rect = (r: Rect2, props: SVGProps<SVGRectElement>) => (
    <rect x={r.minX} y={r.minZ} width={r.maxX - r.minX} height={r.maxZ - r.minZ} {...props} />
  );

  const sideH = H + pad * 2;
  const path = layout.golfer.samples;
  const topPts = path.map((q) => `${q.head[0]},${q.head[2]}`).join(' ');
  const sidePts = path.map((q) => `${q.head[2]},${q.head[1]}`).join(' ');
  const P = layout.projector;
  const E = layout.enclosure;
  const S = layout.screen;
  return (
    <div className="plan2d">
      <svg viewBox={`${-W / 2 - pad} ${-pad} ${W + pad * 2} ${D + pad * 2}`} role="img" aria-label={`Top plan ${fmt.len(W)} × ${fmt.len(D)}`} className="plan2d__svg">
        <title>Top plan</title>
        <rect x={-W / 2} y={0} width={W} height={D} fill={SCENE.floor} stroke={SCENE.info} strokeWidth={sw * 1.5} />
        {E && (
          <>
            <rect x={E.minX} y={E.backZ} width={E.maxX - E.minX} height={E.maxZ - E.backZ} fill="#0C0F10" fillOpacity={0.35} stroke="#5B6563" strokeWidth={sw} />
            <line x1={E.minX} x2={E.maxX} y1={E.minZ} y2={E.minZ} stroke="#5B6563" strokeWidth={sw * 0.6} strokeDasharray={`${sw * 3} ${sw * 2}`} />
          </>
        )}
        {S && !S.curve && (
          <line x1={-S.widthM / 2} x2={S.widthM / 2} y1={S.planeZ} y2={S.planeZ} stroke={SCENE.screen} strokeWidth={sw * 4} />
        )}
        {S?.curve && (
          <path
            d={`M ${-S.widthM / 2} ${S.projectionZ} A ${S.curve.radiusM} ${S.curve.radiusM} 0 0 1 ${S.widthM / 2} ${S.projectionZ}`}
            fill="none" stroke={SCENE.screen} strokeWidth={sw * 4}
          />
        )}
        {layout.mat && rect({ minX: layout.mat.center[0] - layout.mat.size[0] / 2, maxX: layout.mat.center[0] + layout.mat.size[0] / 2, minZ: layout.mat.center[2] - layout.mat.size[2] / 2, maxZ: layout.mat.center[2] + layout.mat.size[2] / 2 }, { fill: SCENE.mat, opacity: 0.55 })}
        {layout.kind === 'overhead' ? (
          <>
            {rect(layout.maxArea.primary, { fill: SCENE.maxArea, fillOpacity: 0.18, stroke: SCENE.maxArea, strokeWidth: sw })}
            {layout.configZones.map((z) => <g key={z.id}>{rect(z.rect, { fill: 'none', stroke: z.id === 'tee' ? SCENE.teeZone : z.id === 'basic' ? SCENE.basicZone : SCENE.readyZoneN1, strokeWidth: sw })}</g>)}
            {rect(
              { minX: layout.sensorBody.center[0] - layout.sensorBody.size[0] / 2, maxX: layout.sensorBody.center[0] + layout.sensorBody.size[0] / 2, minZ: layout.sensorBody.center[2] - layout.sensorBody.size[2] / 2, maxZ: layout.sensorBody.center[2] + layout.sensorBody.size[2] / 2 },
              { fill: '#2A3032', stroke: SCENE.brand, strokeWidth: sw },
            )}
            <line x1={layout.lensFloorPoint[0]} x2={layout.ball[0]} y1={layout.lensFloorPoint[2]} y2={layout.ball[2]} stroke={SCENE.brand} strokeWidth={sw} />
            <text x={layout.ball[0] + fs * 0.6} y={(layout.lensFloorPoint[2] + layout.ball[2]) / 2} fontSize={fs} fill={SCENE.brand} dominantBaseline="middle">
              {t('dim.lensToTee')} {fmt.len(layout.lensToTeeM)}
            </text>
          </>
        ) : (
          <>
            {rect(layout.installationFootprint, { fill: SCENE.footprint, fillOpacity: 0.07, stroke: SCENE.footprint, strokeWidth: sw, strokeDasharray: `${sw * 4} ${sw * 3}` })}
            {rect(layout.strikeZone, { fill: SCENE.maxArea, fillOpacity: 0.18, stroke: SCENE.maxArea, strokeWidth: sw, strokeDasharray: `${sw * 4} ${sw * 3}` })}
            {rect(
              { minX: layout.deviceBody.center[0] - layout.deviceBody.size[0] / 2, maxX: layout.deviceBody.center[0] + layout.deviceBody.size[0] / 2, minZ: layout.deviceBody.center[2] - layout.deviceBody.size[2] / 2, maxZ: layout.deviceBody.center[2] + layout.deviceBody.size[2] / 2 },
              { fill: '#2A3032', stroke: SCENE.brand, strokeWidth: sw },
            )}
          </>
        )}
        <circle cx={layout.ball[0]} cy={layout.ball[2]} r={Math.max(0.03, fs * 0.25)} fill="#fff" />
        <polyline points={topPts} fill="none" stroke={SCENE.brand} strokeOpacity={0.75} strokeWidth={sw} />
        {P && (
          <>
            <polygon points={`${P.lens[0]},${P.lens[2]} ${P.corners[0][0]},${P.corners[0][2]} ${P.corners[1][0]},${P.corners[1][2]}`} fill="#FFF3C4" fillOpacity={0.08} stroke="#FFF0B0" strokeOpacity={0.4} strokeWidth={sw * 0.6} />
            <rect x={P.body.center[0] - P.body.size[0] / 2} y={P.body.center[2] - P.body.size[2] / 2} width={P.body.size[0]} height={P.body.size[2]} fill="#E7EAE8" />
          </>
        )}
        <text x={0} y={D + pad * 0.55} fontSize={fs} fill={SCENE.info} textAnchor="middle">{t('dim.roomWidth')} {fmt.len(W)}</text>
        <text x={W / 2 + pad * 0.35} y={D / 2} fontSize={fs} fill={SCENE.info} textAnchor="middle" transform={`rotate(90 ${W / 2 + pad * 0.35} ${D / 2})`}>{t('dim.roomDepth')} {fmt.len(D)}</text>
        <text x={0} y={-pad * 0.35} fontSize={fs * 0.9} fill={SCENE.screen} textAnchor="middle">{t('plan.frontWall')}</text>
      </svg>

      {(
        <svg viewBox={`${-pad} ${-pad} ${D + pad * 2} ${sideH}`} role="img" aria-label={`${t('plan.side')} · ${fmt.len(H)}`} className="plan2d__svg plan2d__svg--side">
          <title>{t('plan.side')}</title>
          <g transform={`translate(0 ${H}) scale(1 -1)`}>
            <rect x={0} y={0} width={D} height={H} fill="none" stroke={SCENE.info} strokeWidth={sw * 1.5} />
            {E && <rect x={E.backZ} y={0} width={E.maxZ - E.backZ} height={E.topY} fill="#0C0F10" fillOpacity={0.3} stroke="#5B6563" strokeWidth={sw} />}
            {layout.screen && <line x1={layout.screen.planeZ} x2={layout.screen.planeZ} y1={layout.screen.center[1] - layout.screen.heightM / 2} y2={layout.screen.center[1] + layout.screen.heightM / 2} stroke={SCENE.screen} strokeWidth={sw * 4} />}
            {layout.kind === 'overhead' && (
              <>
                <rect x={layout.sensorBody.center[2] - layout.sensorBody.size[2] / 2} y={layout.sensorBody.center[1] - layout.sensorBody.size[1] / 2} width={layout.sensorBody.size[2]} height={layout.sensorBody.size[1]} fill="#2A3032" stroke={SCENE.brand} strokeWidth={sw} />
                <line x1={layout.lensFloorPoint[2]} x2={layout.lensFloorPoint[2]} y1={0} y2={layout.mountHeightFromFloorM} stroke={SCENE.brand} strokeWidth={sw} strokeDasharray={`${sw * 4} ${sw * 3}`} />
              </>
            )}
            {layout.kind === 'portable' && (
              <rect x={layout.deviceBody.center[2] - layout.deviceBody.size[2] / 2} y={layout.deviceBody.center[1] - layout.deviceBody.size[1] / 2} width={layout.deviceBody.size[2]} height={layout.deviceBody.size[1]} fill="#2A3032" stroke={SCENE.brand} strokeWidth={sw} />
            )}
            <polyline points={sidePts} fill="none" stroke={SCENE.brand} strokeOpacity={0.75} strokeWidth={sw} />
            <line x1={layout.golfer.topAt[2] - 0.15} x2={layout.golfer.topAt[2] + 0.15} y1={layout.golfer.topY} y2={layout.golfer.topY} stroke={SCENE.warning} strokeWidth={sw * 1.5} />
            {P && (
              <>
                <polygon points={`${P.lens[2]},${P.lens[1]} ${P.corners[0][2]},${P.corners[0][1]} ${P.corners[3][2]},${P.corners[3][1]}`} fill="#FFF3C4" fillOpacity={0.08} stroke="#FFF0B0" strokeOpacity={0.4} strokeWidth={sw * 0.6} />
                <rect x={P.body.center[2] - P.body.size[2] / 2} y={P.body.center[1] - P.body.size[1] / 2} width={P.body.size[2]} height={P.body.size[1]} fill="#E7EAE8" />
              </>
            )}
            {layout.mat && <rect x={layout.mat.center[2] - layout.mat.size[2] / 2} y={0} width={layout.mat.size[2]} height={layout.mat.size[1]} fill={SCENE.mat} />}
            <circle cx={layout.ball[2]} cy={layout.ball[1]} r={Math.max(0.03, fs * 0.25)} fill="#fff" />
          </g>
          {layout.kind === 'overhead' && (
            <text x={layout.lensFloorPoint[2] + fsSide * 0.5} y={H / 2} fontSize={fsSide} fill={SCENE.brand} textAnchor="start" dominantBaseline="middle">
              {t('dim.mountHeight')} {fmt.len(layout.mountHeightFromFloorM)}
            </text>
          )}
          <text x={layout.golfer.topAt[2]} y={H - layout.golfer.topY - fsSide * 0.6} fontSize={fsSide * 0.85} fill={SCENE.warning} textAnchor="middle">
            {t('dim.swingCeiling')} {fmt.len(H - layout.golfer.topY)}
          </text>
        </svg>
      )}
    </div>
  );
}
