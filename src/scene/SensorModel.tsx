import { Component, Suspense, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { Edges, RoundedBox, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { Layout } from '../domain/layout';
import type { ProductId } from '../data/specs/products';
import { sensorModelUrl } from '../data/assets/manifest';
import { SCENE } from './colors';

/**
 * Product model. Uses the private CAD preview only under the dev server; otherwise a
 * dimension-accurate envelope from the official size table (no unapproved geometry is shipped).
 */
export function SensorModel({ layout, product, onModelKind }: { layout: Layout; product: ProductId; onModelKind?: (k: 'preview' | 'envelope') => void }) {
  const url = sensorModelUrl(product);
  const isOverhead = layout.kind === 'overhead';
  const position = isOverhead ? layout.sensorAnchor : layout.deviceAnchor;
  const rotationY = isOverhead ? layout.sensorRotationY : layout.deviceRotationY;
  const size = isOverhead ? layout.sensorBody.size : ([layout.deviceBody.size[2], layout.deviceBody.size[1], layout.deviceBody.size[0]] as const);
  const envelope = <Envelope size={[size[0], size[1], size[2]]} hangs={isOverhead} onShow={() => onModelKind?.('envelope')} />;

  return (
    <group position={position} rotation-y={rotationY}>
      {url ? (
        <ModelBoundary key={url} fallback={envelope}>
          <Suspense fallback={envelope}>
            <GlbModel url={url} onShow={() => onModelKind?.('preview')} />
          </Suspense>
        </ModelBoundary>
      ) : (
        envelope
      )}
    </group>
  );
}

function GlbModel({ url, onShow }: { url: string; onShow: () => void }) {
  const { scene } = useGLTF(url);
  const object = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
  useLayoutEffect(() => onShow(), [onShow, url]);
  return <primitive object={object} />;
}

function Envelope({ size, hangs, onShow }: { size: [number, number, number]; hangs: boolean; onShow: () => void }) {
  useLayoutEffect(() => onShow(), [onShow]);
  return (
    <RoundedBox args={size} radius={Math.min(...size) * 0.12} smoothness={3} position={[0, hangs ? -size[1] / 2 : size[1] / 2, 0]} castShadow>
      <meshStandardMaterial color="#2A3032" roughness={0.45} metalness={0.3} />
      <Edges color={SCENE.brand} threshold={30} />
    </RoundedBox>
  );
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
