/**
 * 3D asset registry (blueprint §8.2, §13.3). Geometry revisions are versioned independently of specs.
 *
 * Public models (DL-35): exterior-shell CAD previews approved for publication by the product owner
 * on 2026-10-12, with all source metadata removed by scripts/cad/publish_glb.py and meshopt-compressed.
 * The raw previews stay in source-assets-private/ (dev server: `?cad=1` loads them instead).
 * This file ships to the browser: it must NOT contain source CAD file names, part numbers or hashes
 * (blueprint §16.2). Those live in docs/ASSET_REGISTRY.md and the private build reports.
 */
import type { ProductId } from '../specs/products';
import n1Url from '../../assets/models/sensor-n1.glb?url';
import n2Url from '../../assets/models/sensor-n2.glb?url';
import neoEUrl from '../../assets/models/sensor-neo-e.glb?url';

export type SensorAsset = {
  assetId: string;
  productId: ProductId;
  /** X × Y × Z metres in planner orientation (Y-up, front +Z) */
  extentsM: [number, number, number];
  visualAnchor: 'ceiling-mount-plane-center' | 'floor-contact-plane-center';
  publicApproved: boolean;
  publicUrl: string | null;
};

export const SENSOR_ASSETS: Record<ProductId, SensorAsset> = {
  'NEO-E': {
    assetId: 'sensor-neo-e', productId: 'NEO-E',
    extentsM: [0.161352, 0.307956, 0.146487],
    visualAnchor: 'floor-contact-plane-center',
    publicApproved: true, publicUrl: neoEUrl,
  },
  N1: {
    assetId: 'sensor-n1', productId: 'N1',
    extentsM: [0.560855, 0.122312, 0.1746],
    visualAnchor: 'ceiling-mount-plane-center',
    publicApproved: true, publicUrl: n1Url,
  },
  N2: {
    assetId: 'sensor-n2', productId: 'N2',
    extentsM: [0.956253, 0.144653, 0.20232],
    visualAnchor: 'ceiling-mount-plane-center',
    publicApproved: true, publicUrl: n2Url,
  },
};

/** URL the viewer loads; null → the built-in stand-in model (ProductModels.tsx). */
export function sensorModelUrl(id: ProductId): string | null {
  const a = SENSOR_ASSETS[id];
  // Dead code in production builds (__PRIVATE_PREVIEW__ === false), so the dev path is never bundled.
  if (__PRIVATE_PREVIEW__ && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('cad')) {
    return `/__private-preview/${a.assetId}.preview.glb`;
  }
  return a.publicApproved ? a.publicUrl : null;
}
