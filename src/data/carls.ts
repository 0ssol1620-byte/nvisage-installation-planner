/**
 * Carl's Place product catalog (NVISAGE reseller partner).
 *
 * Every number is copied from Carl's Place specification sheets / product pages (checked 2026-10-12;
 * PDFs archived in docs/source-evidence/carls/). Units are inches as printed. Listing names
 * ("9 x 12") are simplified names — geometry always uses the actual outer / viewable dimensions.
 */

export type CarlsSourceId =
  | 'DIY_PDF' | 'PRO_PDF' | 'CURVED_PDF' | 'DIY_PAGE' | 'MAT_PAGE' | 'SCREEN_PAGE'
  | 'BENQ_AK' | 'BENQ_AH' | 'LG_BU53RG';

/**
 * Source of each catalog entry (`source` field). Kept out of the bundle: customers see product names only.
 *   DIY_PDF: DIY Golf Simulator Enclosure Kit — Product Specifications Sheet — https://www.carlofet.com/hubfs/Product%20Documents/DIY/DIY%20Golf%20Simulator%20Enclosure%20Kit%20Specifications.pdf
 *   PRO_PDF: Pro Golf Simulator Enclosure Kit — Product Specifications Sheet — https://hubspot.carlofet.com/hubfs/Product%20Documents/Pro/Pro%20Golf%20Enclosure%20Kit%20Specifications.pdf
 *   CURVED_PDF: Curved Golf Simulator Enclosure Kit — Product Specifications Sheet — https://hubspot.carlofet.com/hubfs/Product%20Documents/Curved/Curved%20Golf%20Simulator%20Enclosure%20Kit%20Specifications.pdf
 *   DIY_PAGE: DIY Golf Simulator Enclosure Kit — https://shop.carlofet.com/diy-golf-simulator-enclosure-kit-with-impact-screen
 *   MAT_PAGE: HotShot Golf Mat System — https://shop.carlofet.com/carls-hotshot-golf-mat-system
 *   SCREEN_PAGE: Golf Impact Screens — https://shop.carlofet.com/golf-impact-screens
 *   BENQ_AK: BenQ AK700ST — https://shop.carlofet.com/benq-ak700st-golf-simulator-projector
 *   BENQ_AH: BenQ AH700ST — https://shop.carlofet.com/benq-ah700st-golf-simulator-projector
 *   LG_BU53RG: LG ProBeam BU53RG — https://shop.carlofet.com/lg-probeam-bu53rg-golf-simulator-projector
 */

// ---------------------------------------------------------------- enclosures

export type EnclosureFamily = 'DIY' | 'PRO' | 'CURVED';

export type EnclosureModel = {
  id: string;
  family: EnclosureFamily;
  /** listing name exactly as Carl's prints it (simplified, not a dimension) */
  listing: string;
  aspect?: string;
  outerWIn: number;
  outerHIn: number;
  /** viewable screen width (flat) or width at projection plane (curved) */
  screenWIn: number;
  screenHIn: number;
  /** curved only: width measured along the curve */
  arcWIn?: number;
  /** screen-to-front frame depth options, inches */
  depthsIn: number[];
  /** listing depth name for each option, feet ("10x15.5x10" → 10) */
  depthListingFt: number[];
  /** backset rear fitting behind the screen */
  rearFittingIn: number;
  /** frame pipe outside diameter */
  pipeOdIn: number;
  source: CarlsSourceId;
};

const DIY_DEPTH = [59.125];
const PRO_DEPTHS = [69.5, 105.5, 129.5, 189.5];
const CURVED_DEPTHS = [105.5, 129.5, 189.5];
// 1-inch EMT true OD 1.163″ (DIY page); 2-inch EMT OD 2.197″ (EMT trade size)
const DIY_OD = 1.163;
const PRO_OD = 2.197;

const diy = (listing: string, aspect: string, sh: number, sw: number, oh: number, ow: number): EnclosureModel => ({
  id: `DIY-${listing}`, family: 'DIY', listing, aspect, outerWIn: ow, outerHIn: oh, screenWIn: sw, screenHIn: sh,
  depthsIn: DIY_DEPTH, depthListingFt: [5], rearFittingIn: 8.25, pipeOdIn: DIY_OD, source: 'DIY_PDF',
});
const pro = (listing: string, aspect: string, sh: number, sw: number, oh: number, ow: number): EnclosureModel => ({
  id: `PRO-${listing}`, family: 'PRO', listing, aspect, outerWIn: ow, outerHIn: oh, screenWIn: sw, screenHIn: sh,
  depthsIn: PRO_DEPTHS, depthListingFt: [5, 8, 10, 15], rearFittingIn: 9.5, pipeOdIn: PRO_OD, source: 'PRO_PDF',
});
const curved = (listing: string, sh: number, arc: number, chord: number, oh: number, ow: number): EnclosureModel => ({
  id: `CURVED-${listing}`, family: 'CURVED', listing, outerWIn: ow, outerHIn: oh, screenWIn: chord, screenHIn: sh, arcWIn: arc,
  depthsIn: CURVED_DEPTHS, depthListingFt: [8, 10, 15], rearFittingIn: 9.5, pipeOdIn: PRO_OD, source: 'CURVED_PDF',
});

// Columns as printed: Viewable Height, Viewable Width, Outer Height, Outer Width.
export const ENCLOSURES: EnclosureModel[] = [
  diy('7.7 x 10', '4:3', 83.1, 110.8, 95.8, 124.8),
  diy('7.7 x 13', '16:9', 84.0, 149.3, 95.8, 163.3),
  diy('8 x 8', '1:1', 86.0, 86.0, 100, 100),
  diy('8 x 10.5', '4:3', 87.2, 116.3, 100, 130.3),
  diy('8.5 x 11.5', '4:3', 94.7, 126.3, 107.5, 140.3),
  diy('9 x 12', '4:3', 99.2, 132.3, 112, 146.3),
  pro('8 x 10.5', '4:3', 88.8, 118.4, 102, 132.4),
  pro('8.5 x 11', '4:3', 93.8, 125.1, 107, 139.1),
  pro('8.5 x 14.5', '16:9', 94.4, 167.8, 107, 181.8),
  pro('9 x 12', '4:3', 100.8, 134.4, 114, 148.4),
  pro('10 x 13', '4:3', 109.8, 146.4, 123, 160.4),
  pro('10 x 15.5', '16:10', 110.2, 176.3, 123, 190.3),
  // Curved: Height, Width at Curve, Width at Projection Plane, Outer Height, Outer Width
  curved('10 x 17', 110.8, 230.2, 199, 120, 205),
  curved('9.5 x 16', 104.8, 221.1, 188, 114, 194),
  curved('9 x 15', 98.8, 213.8, 179, 108, 185),
  curved('10 x 15', 110.8, 213.8, 179, 120, 185),
  curved('9.5 x 14.5', 104.8, 205.9, 169, 114, 175),
  curved('9 x 14', 98.8, 198.9, 160, 108, 166),
];

export const enclosureById = (id: string) => ENCLOSURES.find((e) => e.id === id) ?? null;

/** DIY product page: "A minimum of 8.25″ is required to fit the rear fittings" / "12″ at the rear is recommended". */
export const REAR_RECOMMENDED_IN = 12;
/** NEO-E bundle page: "add a 2″-3″ buffer space on each side of and above the enclosure". */
export const BUFFER_MIN_IN = 2;
export const BUFFER_REC_IN = 3;

// ---------------------------------------------------------------- impact screens

export type ScreenMaterialId = 'standard' | 'preferred' | 'premium' | 'gray';
export const SCREEN_MATERIALS: Record<ScreenMaterialId, { name: string; colour: string }> = {
  standard: { name: 'Standard', colour: '#F3F4F1' },
  preferred: { name: 'Preferred', colour: '#F5F6F3' },
  premium: { name: 'Premium', colour: '#F7F8F5' },
  gray: { name: 'High-Contrast Gray Premium', colour: '#A9ADAD' },
};

// ---------------------------------------------------------------- HotShot mats

export type MatModel = { id: string; listing: string; wIn: number; dIn: number; hIn: number; hitting: 'offset' | 'center' };
/** 1¾″ thick; inserts 30″ long × 12″ wide × 1.75″ (MAT_PAGE). Long side runs left–right. */
export const MATS: MatModel[] = [
  { id: 'hotshot-4x5', listing: "HotShot 4' x 5'", wIn: 60, dIn: 48, hIn: 1.75, hitting: 'offset' },
  { id: 'hotshot-4x9', listing: "HotShot 4' x 9'", wIn: 108, dIn: 48, hIn: 1.75, hitting: 'center' },
  { id: 'hotshot-5x8', listing: "HotShot 5' x 8'", wIn: 96, dIn: 60, hIn: 1.75, hitting: 'offset' },
  { id: 'hotshot-6x10', listing: "HotShot 6' x 10'", wIn: 120, dIn: 72, hIn: 1.75, hitting: 'center' },
];
export const MAT_INSERT_IN = { long: 30, wide: 12, h: 1.75 };
export const matById = (id: string) => MATS.find((m) => m.id === id) ?? null;

// ---------------------------------------------------------------- projectors

export type ProjectorModel = {
  id: string;
  name: string;
  resolution: string;
  lumens: number;
  throwMin: number;
  throwMax: number;
  /** vertical lens shift range as a fraction of image height (0 = none) */
  lensShiftV: number;
  /** projection offset (full height), % — 100 = image edge on the lens axis */
  offsetPct: number;
  sizeIn: { w: number; d: number; h: number };
  weightLb: number;
  source: CarlsSourceId;
};

export const PROJECTORS: ProjectorModel[] = [
  { id: 'benq-ak700st', name: 'BenQ AK700ST', resolution: '3840 × 2160', lumens: 4000, throwMin: 0.69, throwMax: 0.83, lensShiftV: 0, offsetPct: 102.5, sizeIn: { w: 11.9, d: 9.2, h: 4.4 }, weightLb: 7.5, source: 'BENQ_AK' },
  { id: 'benq-ah700st', name: 'BenQ AH700ST', resolution: '1920 × 1080', lumens: 4000, throwMin: 0.69, throwMax: 0.83, lensShiftV: 0, offsetPct: 102.5, sizeIn: { w: 11.9, d: 9.2, h: 4.4 }, weightLb: 7.3, source: 'BENQ_AH' },
  // Carl's lists 14.6 × 6.1 × 11.4″; the 6.1″ side is the height of the chassis.
  { id: 'lg-bu53rg', name: 'LG ProBeam BU53RG', resolution: '3840 × 2160', lumens: 5000, throwMin: 0.94, throwMax: 1.14, lensShiftV: 0.5, offsetPct: 100, sizeIn: { w: 14.6, d: 11.4, h: 6.1 }, weightLb: 21.4, source: 'LG_BU53RG' },
];
export const projectorById = (id: string) => PROJECTORS.find((p) => p.id === id) ?? null;
