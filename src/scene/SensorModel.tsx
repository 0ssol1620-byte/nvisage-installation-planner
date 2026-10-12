import { Component, Suspense, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import type { Layout } from '../domain/layout';
import type { ProductId } from '../data/specs/products';
import { sensorModelUrl } from '../data/assets/manifest';
import { N1Model, N2Model, NeoEModel, useLogo } from './ProductModels';
import { styleProductModel } from './ModelStyling';

/**
 * Product model: the approved exterior model (DL-35) finished to match the product photos
 * (ModelStyling.ts); the built-in stand-in (ProductModels.tsx) shows while it loads or if it fails.
 */
export function SensorModel({ layout, product, onModelKind }: { layout: Layout; product: ProductId; onModelKind?: (k: 'preview' | 'envelope') => void }) {
  const url = sensorModelUrl(product);
  const isOverhead = layout.kind === 'overhead';
  const position = isOverhead ? layout.sensorAnchor : layout.deviceAnchor;
  const rotationY = isOverhead ? layout.sensorRotationY : layout.deviceRotationY;
  const size = isOverhead ? layout.sensorBody.size : ([layout.deviceBody.size[2], layout.deviceBody.size[1], layout.deviceBody.size[0]] as const);
  const envelope = <ProductModel product={product} size={[size[0], size[1], size[2]]} onShow={() => onModelKind?.('envelope')} />;

  return (
    <group position={position} rotation-y={rotationY}>
      {url ? (
        <ModelBoundary key={url} fallback={envelope}>
          <Suspense fallback={envelope}>
            <GlbModel url={url} product={product} onShow={() => onModelKind?.('preview')} />
          </Suspense>
        </ModelBoundary>
      ) : (
        envelope
      )}
    </group>
  );
}

function GlbModel({ url, product, onShow }: { url: string; product: ProductId; onShow: () => void }) {
  const { scene } = useGLTF(url);
  const logo = useLogo();
  const object = useMemo(() => {
    const clone = scene.clone(true);
    styleProductModel(clone, product, logo);
    return clone;
  }, [scene, product, logo]);
  useLayoutEffect(() => onShow(), [onShow, url]);
  return <primitive object={object} />;
}

function ProductModel({ product, size, onShow }: { product: ProductId; size: [number, number, number]; onShow: () => void }) {
  useLayoutEffect(() => onShow(), [onShow]);
  if (product === 'N1') return <N1Model size={size} />;
  if (product === 'N2') return <N2Model size={size} />;
  return <NeoEModel size={size} />;
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('[planner] model failed to load, showing envelope', err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
