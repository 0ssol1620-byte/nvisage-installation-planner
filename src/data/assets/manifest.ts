/**
 * 3D asset registry (blueprint §8.2, §13.3). Geometry revisions are versioned independently of specs.
 *
 * The dev preview URL is served ONLY by the Vite dev server (vite.config.ts → privatePreviewAssets).
 * `publicUrl` stays null until RG-02 (CAD/IP) and RG-03 (visual fidelity) are approved; until then
 * production renders a dimension-accurate envelope from the official size table.
 * This file ships to the browser: it must NOT contain source CAD file names, part numbers or hashes
 * (blueprint §16.2). Those live in docs/ASSET_REGISTRY.md and the private build reports.
 */
import type { ProductId } from '../specs/products';

export type SensorAsset = {
  assetId: string;
  productId: ProductId;
  /** [USER-CONFIRMED] / [MEASURED] identification of the CAD file (blueprint §2.2) */
  identification: 'USER_CONFIRMED' | 'MEASURED';
  previewBytes: number;
  previewTriangles: number;
  /** X × Y × Z metres in planner orientation (Y-up, front +Z) */
  extentsM: [number, number, number];
  visualAnchor: 'ceiling-mount-plane-center' | 'floor-contact-plane-center';
  publicApproved: false;
  publicUrl: null;
  knownIssues: string[];
};

export const SENSOR_ASSETS: Record<ProductId, SensorAsset> = {
  'NEO-E': {
    assetId: 'sensor-neo-e', productId: 'NEO-E',
    identification: 'MEASURED',
    previewBytes: 2120888, previewTriangles: 92138,
    extentsM: [0.161352, 0.307956, 0.146487],
    visualAnchor: 'floor-contact-plane-center',
    publicApproved: false, publicUrl: null,
    knownIssues: [
      'STEP still contains PCB / IR-LED sub-assemblies; 65 non-visible parts removed automatically — needs engineering review.',
      'Knurled side texture decimated (223k → 92k triangles); silhouette check vs. photos pending.',
      'LCD, logo and LED strip are flat colours, not textures.',
    ],
  },
  N1: {
    assetId: 'sensor-n1', productId: 'N1',
    identification: 'USER_CONFIRMED',
    previewBytes: 1204424, previewTriangles: 52268,
    extentsM: [0.560855, 0.122312, 0.1746],
    visualAnchor: 'ceiling-mount-plane-center',
    publicApproved: false, publicUrl: null,
    knownIssues: [
      'Camera window is open in the CAD; inner frame / PCB are visible from below.',
      'Front-face direction (+Z) chosen from marketing photos [PROPOSED]; bracket orientation per D10 p.10 not modelled.',
      'Lens position assumed at body centre (D10 drawing places it ≈0.45 in toward the screen).',
    ],
  },
  N2: {
    assetId: 'sensor-n2', productId: 'N2',
    identification: 'MEASURED',
    previewBytes: 1932192, previewTriangles: 83585,
    extentsM: [0.956253, 0.144653, 0.20232],
    visualAnchor: 'ceiling-mount-plane-center',
    publicApproved: false, publicUrl: null,
    knownIssues: [
      'Front (LED strip) faces +Z [PROPOSED]; the bracket "GOLF TEE" arrow orientation is not modelled.',
      'Lens window material is flat black; lenses not separated.',
    ],
  },
};

/** URL the viewer may load, or null to render the envelope. Never a private URL in production. */
export function sensorModelUrl(id: ProductId): string | null {
  const a = SENSOR_ASSETS[id];
  if (a.publicApproved && a.publicUrl) return a.publicUrl;
  // Dead code in production builds (__PRIVATE_PREVIEW__ === false), so the dev path is never bundled.
  if (__PRIVATE_PREVIEW__) return `/__private-preview/${a.assetId}.preview.glb`;
  return null;
}
