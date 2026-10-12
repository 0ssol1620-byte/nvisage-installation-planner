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
      {isOverhead && layout.mountDropM > 0.005 && <DropMount drop={layout.mountDropM} width={size[0]} />}
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

/** Ceiling plates and threaded rods that carry the sensor when it is hung below the ceiling. */
function DropMount({ drop, width }: { drop: number; width: number }) {
  const xs = [-width * 0.3, width * 0.3];
  return (
    <group>
      {xs.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, drop / 2, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, drop, 12]} />
            <meshStandardMaterial color="#8c9195" roughness={0.35} metalness={0.8} />
          </mesh>
          <mesh position={[0, drop - 0.004, 0]}>
            <boxGeometry args={[0.09, 0.008, 0.09]} />
            <meshStandardMaterial color="#cfd3d4" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.006, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.012, 16]} />
            <meshStandardMaterial color="#5a5f62" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      ))}
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
