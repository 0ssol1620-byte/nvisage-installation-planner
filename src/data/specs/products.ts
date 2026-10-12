/**
 * Manufacturer specification registry — v1.0.0-draft (blueprint §3, §13.4).
 *
 * RULES
 *  - Every number is the value PRINTED in the cited manual (inches), never a rounded conversion.
 *  - Do not fill gaps with guesses. Unknown datums are `null` / status 'UNRESOLVED'.
 *  - `MANUAL` = taken from the official manual drawing/figure (owner decision 2026-10-08:
 *    "매뉴얼 기준으로" — the manual drawings are the planning basis). Rules may PASS/FAIL on it.
 */
import type { Citation } from '../sources';

export const SPEC_REVISION = '1.1.0-manual+2026-10-08';

export type ProductId = 'NEO-E' | 'N1' | 'N2';
export const PRODUCT_ORDER: ProductId[] = ['NEO-E', 'N1', 'N2']; // blueprint §5.2

export type DatumStatus = 'DOCUMENTED' | 'MANUAL' | 'UNRESOLVED';

export type Cited<T> = T & { cites: Citation[] };

export type Datum = {
  from: string;
  to: string;
  status: DatumStatus;
  note?: string;
  cites: Citation[];
};

type Common = {
  id: ProductId;
  displayName: string;
  tagline: string;
  /** Printed device size. Axis order exactly as the manual labels it. */
  deviceSizeIn: Cited<{ w: number; h: number; d: number; label: string }>;
  ballType: Cited<{ value: string }>;
  cameras: number;
  software: string;
  modelAssetId: string;
  installGuide?: Citation;
};

export type ZoneRule = {
  zone: 'ready' | 'basic' | 'tee';
  /** UI name in the device software */
  softwareName: string;
  softwareColour: string;
  mustBeInside: 'max' | 'basic' | null;
  cites: Citation[];
};

export type OverheadSpec = Common & {
  installType: 'overhead';
  /** side A runs parallel to the screen, side B toward the screen; centred on the tee (see orientationNote). */
  maxArea: Cited<{ label: string; sideAIn: number; sideBIn: number; centreDatum: DatumStatus; orientationNote: string }>;
  mountHeightIn: Cited<{ min: number; max: number }>;
  mountHeightDatum: Datum;
  lensToTeeIn: Cited<{ value: number }>;
  lensToTeeDatum: Datum;
  /** calibration board long edge faces screen; board perpendicular to screen */
  calibrationOrientation: Cited<{ value: string }>;
  bracketFootprintIn?: Cited<{ w: number; d: number; lensFromUserSideEdge: number }>;
  zoneRules: ZoneRule[];
};

export type PortableSpec = Common & {
  installType: 'portable';
  installationSpaceIn: Cited<{ w: number; d: number; h: number }>;
  strikeZoneIn: Cited<{ w: number; d: number }>;
  dataCollectionPointsIn: Cited<{ value: number }>;
  dataCollectionDatum: Datum;
  /** 7.9 in appears only in the installation drawing, not in the table. */
  drawingLateralIn: Cited<{ value: number }>;
  ballAtZoneCentre: Cited<{ value: string }>;
  handedness: Cited<{ value: string }>;
};

export type ProductSpec = OverheadSpec | PortableSpec;

export const PRODUCTS: Record<ProductId, ProductSpec> = {
  'NEO-E': {
    id: 'NEO-E',
    displayName: 'NEO-E',
    tagline: 'Portable launch monitor',
    installType: 'portable',
    deviceSizeIn: {
      w: 6.3, h: 12.1, d: 5.8, label: 'W × H × D',
      cites: [{ doc: 'D05', page: 12, quote: '6.3” × 12.1” × 5.8” / 5.95 lb' }],
    },
    ballType: { value: 'Any ball (premium balls recommended)', cites: [{ doc: 'D05', page: 25, quote: 'Premium ball with logos' }] },
    cameras: 3,
    software: 'MURLIE',
    modelAssetId: 'sensor-neo-e',
    installationSpaceIn: {
      w: 15.8, d: 29.4, h: 12.1,
      cites: [{ doc: 'D05', page: 15, quote: '15.8" × 29.4" × 12.1"' }],
    },
    strikeZoneIn: { w: 12.6, d: 9.4, cites: [{ doc: 'D05', page: 15, quote: '12.6" × 9.4"' }] },
    dataCollectionPointsIn: { value: 14.2, cites: [{ doc: 'D05', page: 15, quote: '14.2”' }] },
    dataCollectionDatum: {
      from: 'device camera face (base)',
      to: 'near edge of the Ready Zone',
      status: 'MANUAL',
      note:
        'D05 p.15 drawing: 14.2 in from the device base to the Ready Zone edge, zone 9.4 in deep beyond it, 7.9 in to each side of the '
        + 'device axis. Consistent with the table: 5.8 + 14.2 + 9.4 = 29.4 in; 2 × 7.9 = 15.8 in.',
      cites: [{ doc: 'D05', page: 15, diagram: 'Installation Condition drawing' }, { doc: 'D12', page: 4, diagram: 'Device Installation drawing' }],
    },
    drawingLateralIn: { value: 7.9, cites: [{ doc: 'D05', page: 15, diagram: '7.9 in lateral dimension' }] },
    ballAtZoneCentre: {
      value: 'Accurate data can be acquired when the ball is placed in the center of the Ready Zone.',
      cites: [{ doc: 'D05', page: 24, quote: 'Accurate data can be acquired when the ball is placed in the center of the Ready Zone.' }],
    },
    handedness: {
      value: 'Left/Right-handed mode adjusts the Practice Mode Ready Zone',
      cites: [{ doc: 'D05', page: 37, quote: 'the Ready Zone in Practice Mode will be adjusted accordingly' }],
    },
  },
  N1: {
    id: 'N1',
    displayName: 'N1',
    tagline: 'Compact overhead launch monitor',
    installType: 'overhead',
    deviceSizeIn: { w: 21.8, h: 4.8, d: 6.9, label: 'W × H × D', cites: [{ doc: 'D01', page: 3, quote: '21.8" x 4.8" x 6.9"' }] },
    ballType: { value: 'Marked Ball / Logo Ball', cites: [{ doc: 'D01', page: 3, quote: 'Marked Ball / Logo Ball' }] },
    cameras: 2,
    software: 'MURLIE (calibration via N-Bridge)',
    modelAssetId: 'sensor-n1',
    installGuide: { doc: 'D10', page: 10 },
    maxArea: {
      label: 'Hitting Zone', sideAIn: 16, sideBIn: 20, centreDatum: 'MANUAL',
      orientationNote: 'Printed order W × D (as the size table). D01 p.7: Ready/Tee Zone set inside the blue box around the ball position.',
      cites: [{ doc: 'D01', page: 3, quote: '16" x 20"' }, { doc: 'D01', page: 7, diagram: 'blue box = configurable area, Tee Zone at its centre' }],
    },
    mountHeightIn: {
      min: 110.24, max: 118,
      cites: [{ doc: 'D01', page: 4, quote: '110.24" to 118"' }, { doc: 'D10', page: 10, quote: 'approximately 118 inches' }],
    },
    mountHeightDatum: {
      from: 'floor / calibration-board plane',
      to: 'sensor ceiling-mount plane (top of sensor)',
      status: 'MANUAL',
      note: 'In D01 p.4 and D10 p.10 the height arrow ends at the top of the sensor, not at the "Center of Camera Lens" line.',
      cites: [{ doc: 'D01', page: 4, diagram: 'Device Installation drawing' }, { doc: 'D10', page: 10, diagram: 'Step 1-3 drawing' }],
    },
    lensToTeeIn: {
      value: 23.62,
      cites: [{ doc: 'D01', page: 4, quote: '23.62"' }, { doc: 'D10', page: 10, diagram: '23.62 image sensor → Tee (top view)' }],
    },
    lensToTeeDatum: {
      from: 'Center of Camera Lens / image sensor (projected to floor)',
      to: 'Center of Calibration Board = tee position',
      status: 'MANUAL',
      note: 'Horizontal distance perpendicular to the screen; the sensor is on the screen side of the tee (D10 p.10 top view).',
      cites: [{ doc: 'D01', page: 4, diagram: 'Device Installation drawing' }, { doc: 'D10', page: 10, diagram: 'top view' }],
    },
    calibrationOrientation: {
      value: 'Calibration board on the floor, long edge facing the screen, perpendicular (90°) to the screen.',
      cites: [{ doc: 'D01', page: 4, quote: 'The calibration board should be' }],
    },
    bracketFootprintIn: {
      w: 15.74, d: 4.61, lensFromUserSideEdge: 2.75,
      cites: [{ doc: 'D10', page: 10, diagram: '7.87 + 7.87 wide, 4.61 deep, 23.62 − 20.87 = 2.75' }],
    },
    zoneRules: [
      {
        zone: 'ready', softwareName: 'Ready Zone', softwareColour: 'Yellow box', mustBeInside: 'max',
        cites: [{ doc: 'D01', page: 7, quote: 'Move and set a custom zone within the blue box.' }],
      },
      {
        zone: 'tee', softwareName: 'Tee Zone', softwareColour: 'Red box', mustBeInside: null,
        cites: [{ doc: 'D01', page: 7, quote: 'you can move the Red box (Tee Zone)' }],
      },
    ],
  },
  N2: {
    id: 'N2',
    displayName: 'N2',
    tagline: 'High-performance overhead launch monitor',
    installType: 'overhead',
    deviceSizeIn: { w: 37.6, h: 5.7, d: 7.9, label: 'W × H × D', cites: [{ doc: 'D02', page: 3, quote: '37.6" x 5.7" x 7.9"' }] },
    ballType: { value: 'Any Ball', cites: [{ doc: 'D02', page: 3, quote: 'Any Ball' }] },
    cameras: 3,
    software: 'MURLIE (Ready Zone via N-Hub Lite)',
    modelAssetId: 'sensor-n2',
    installGuide: { doc: 'D03', page: 9 },
    maxArea: {
      label: 'Impact Zone', sideAIn: 31.5, sideBIn: 23.6, centreDatum: 'MANUAL',
      orientationNote: 'D11 p.13 figure: the white box (configurable hitting area) is wider along the "Screen" edge; the Tee Zone sits at its centre.',
      cites: [{ doc: 'D02', page: 3, quote: '31.5" x 23.6"' }, { doc: 'D11', page: 13, diagram: 'white box wider along the Screen edge, Tee Zone centred' }],
    },
    mountHeightIn: {
      min: 110.24, max: 118.11,
      cites: [{ doc: 'D02', page: 4, quote: '110.24" to 118.11"' }],
    },
    mountHeightDatum: {
      from: 'floor / tee plane',
      to: 'sensor ceiling-mount plane (top of sensor)',
      status: 'MANUAL',
      note: 'In D02 p.4 and D03 p.9 the height arrow ends at the top of the sensor, above the "Center of Camera Lens" line.',
      cites: [{ doc: 'D02', page: 4, diagram: 'Device Installation drawing' }, { doc: 'D03', page: 9, diagram: 'Step 1-2 drawing' }],
    },
    lensToTeeIn: {
      value: 39.37,
      cites: [{ doc: 'D02', page: 4, quote: '39.37"' }, { doc: 'D03', page: 9, quote: 'position) to 39.37 inches' }],
    },
    lensToTeeDatum: {
      from: 'sensor centre marked "+" on the bracket / Center of Camera Lens',
      to: 'tee (golf ball position)',
      status: 'MANUAL',
      note: 'D03 p.9 text defines the endpoints; the drawing shows the distance as horizontal, sensor on the screen side; bracket arrow faces the tee.',
      cites: [{ doc: 'D03', page: 9, quote: 'Align the distance between the center of the sensor marked with the “+” on the bracket and the tee (golf ball' }],
    },
    calibrationOrientation: {
      value: 'Calibration board on the floor, long edge facing the screen, perpendicular (90°) to the screen.',
      cites: [{ doc: 'D02', page: 4, quote: 'The calibration board should be' }],
    },
    zoneRules: [
      {
        zone: 'basic', softwareName: 'Basic Zone', softwareColour: 'Green box', mustBeInside: 'max',
        cites: [{ doc: 'D11', page: 13, quote: 'Basic Zone: Cannot exceed the maximum area indicated by the white box.' }],
      },
      {
        zone: 'tee', softwareName: 'Tee Zone', softwareColour: 'Blue box', mustBeInside: 'basic',
        cites: [{ doc: 'D11', page: 13, quote: 'The Tee Zone can only be defined within the Basic Zone.' }],
      },
    ],
  },
};

export const isOverhead = (s: ProductSpec): s is OverheadSpec => s.installType === 'overhead';
