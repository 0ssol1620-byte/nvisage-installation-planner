import { useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment, Lightformer, OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import type { DimensionLine, Layout, Vec3 } from '../domain/layout';
import type { CameraPreset, PlannerStateV1 } from '../domain/schema';
import { RoomModel } from './RoomModel';
import { SensorModel } from './SensorModel';
import { Dimension, LensReference, ZoneOverlays } from './Overlays';
import { LabelProjector, type LabelAnchor } from './LabelProjector';
import { SCENE } from './colors';
import { Golfer } from './Golfer';
import { BallFlight, SwingArc } from './SwingAndBall';
import { ProjectorRig, ScreenRig } from './ScreenRig';
import { MatRig } from './MatRig';
import { cameraApi } from './cameraApi';
import { tickSwing, useSwingClock } from '../store/swingClock';

type Props = {
  layout: Layout;
  state: PlannerStateV1;
  dims: DimensionLine[];
  anchors: LabelAnchor[];
  labelElements: Map<string, HTMLElement>;
  resetCounter: number;
  onModelKind: (k: 'preview' | 'envelope') => void;
  onContextLost: () => void;
};

export function PlannerCanvas({ layout, state, dims, anchors, labelElements, resetCounter, onModelKind, onContextLost }: Props) {
  const L = state.view.layers;
  return (
    <Canvas
      shadows="percentage"
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          // R3F calls forceContextLoss() after the canvas is unmounted (e.g. switching to the 2D plan);
          // only a loss while the canvas is still on the page is a real GPU failure.
          if (!gl.domElement.isConnected) return;
          e.preventDefault();
          onContextLost();
        });
      }}
      aria-hidden="true"
    >
      <color attach="background" args={[SCENE.canvas]} />
      <CameraRig preset={state.view.camera} layout={layout} resetCounter={resetCounter} product={state.product} />
      <Lights layout={layout} />
      <SwingTicker />
      <RoomModel layout={layout} />
      <ScreenRig layout={layout} material={state.enclosure.material} showEnclosure={L.screen} />
      <ProjectorRig layout={layout} showBeam={L.beam} />
      <MatRig layout={layout} show={L.mat} />
      <BallFlight layout={layout} />
      <Golfer layout={layout} club={state.golfer.club} visible={L.golfer} />
      {L.swingArc && <SwingArc layout={layout} />}
      <SensorModel layout={layout} product={state.product} onModelKind={onModelKind} />
      <LensReference layout={layout} />
      <ZoneOverlays layout={layout} showMax={L.maxArea} showFootprint={L.footprint} showConfig={L.configZones && layout.kind === 'overhead'} />
      {dims.map((d) => <Dimension key={d.id} dim={d} />)}
      <LabelProjector anchors={anchors} elements={labelElements} />
    </Canvas>
  );
}

/** Drives swing playback; requests frames only while playing (frameloop stays "demand"). */
function SwingTicker() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => useSwingClock.subscribe((s, p) => { if (s.t !== p.t || s.playing !== p.playing) invalidate(); }), [invalidate]);
  useFrame((_, dt) => {
    if (tickSwing(Math.min(dt, 0.05))) invalidate();
  });
  return null;
}

function Lights({ layout }: { layout: Layout }) {
  const { widthM: W, depthM: D, heightM: H } = layout.room;
  const r = Math.max(W, D);
  return (
    <>
      <hemisphereLight args={['#e6eee9', '#20262a', 0.9]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[W * 0.35, H * 2.4, D * 0.85]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-r}
        shadow-camera-right={r}
        shadow-camera-top={r}
        shadow-camera-bottom={-r}
      />
      {/* Local studio environment for PBR reflections — no remote HDRI download. */}
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2.4} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer intensity={1.1} position={[-6, 2, 2]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} color="#eef3ee" />
        <Lightformer intensity={0.6} position={[6, 2, -2]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} color="#d6e033" />
      </Environment>
    </>
  );
}

/**
 * The whole installation in one view: full room width and height, from the screen wall back to
 * behind the golfer (or the projector / enclosure front, whichever is further) — not the empty rest
 * of a deep room.
 */
function setupBox(layout: Layout): THREE.Box3 {
  const { widthM: W, depthM: D, heightM: H } = layout.room;
  let back = layout.ball[2] + 1.4;
  if (layout.projector) back = Math.max(back, layout.projector.lens[2] + 0.3);
  if (layout.enclosure) back = Math.max(back, layout.enclosure.maxZ + 0.2);
  return new THREE.Box3(new THREE.Vector3(-W / 2, 0, 0), new THREE.Vector3(W / 2, H, Math.min(D, back)));
}

/** Behind and to the side of the golfer, looking toward the screen. */
const VIEW_DIR = new THREE.Vector3(0.5, 0.52, 1).normalize();
const FOV = 40;
/** Frame edges in NDC that stay clear of the swing bar (top) and the layer chips (bottom). */
const FRAME = { x: 0.86, top: 0.76, bottom: -0.78 };
/** Pixels covered by the swing bar (top) and the layer chips (bottom) in the orthographic views. */
const ORTHO_INSET = { top: 96, bottom: 64 };

/** Closest camera distance along VIEW_DIR at which every corner of the box is inside FRAME. */
function fitCamera(box: THREE.Box3, aspect: number): { position: Vec3; target: Vec3 } {
  const c = box.getCenter(new THREE.Vector3());
  const target = new THREE.Vector3(c.x, box.max.y * 0.4, c.z);
  const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.Vector3(
    i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z,
  ));
  const cam = new THREE.PerspectiveCamera(FOV, aspect, 0.02, 500);
  const fits = (d: number) => {
    cam.position.copy(target).addScaledVector(VIEW_DIR, d);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    return corners.every((k) => {
      const v = k.clone().project(cam);
      return v.z < 1 && Math.abs(v.x) <= FRAME.x && v.y <= FRAME.top && v.y >= FRAME.bottom;
    });
  };
  let lo = 0.5;
  let hi = 120;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  const p = target.clone().addScaledVector(VIEW_DIR, hi);
  return { position: [p.x, p.y, p.z], target: [target.x, target.y, target.z] };
}

function CameraRig({ preset, layout, resetCounter, product }: { preset: CameraPreset; layout: Layout; resetCounter: number; product: string }) {
  const { widthM: W, depthM: D, heightM: H } = layout.room;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const key = `${preset}-${resetCounter}-${product}`;

  const ortho = useMemo(() => {
    const pad = 1.12;
    const availH = Math.max(120, size.height - ORTHO_INSET.top - ORTHO_INSET.bottom);
    const availW = Math.max(120, size.width - 120);
    // centre the room in the free band between the overlays: shift the camera "up" on screen
    const shift = (z: number) => (ORTHO_INSET.top - ORTHO_INSET.bottom) / 2 / z;
    if (preset === 'top') {
      const zoom = Math.min(availW / (W * pad), availH / (D * pad));
      const tz = D / 2 - shift(zoom);
      return { pos: [0, H + 30, tz] as Vec3, up: [0, 0, -1] as Vec3, target: [0, 0, tz] as Vec3, zoom };
    }
    if (preset === 'side') {
      const zoom = Math.min(availW / (D * pad), availH / (H * pad));
      const ty = H / 2 + shift(zoom);
      return { pos: [W / 2 + 30, ty, D / 2] as Vec3, up: [0, 1, 0] as Vec3, target: [0, ty, D / 2] as Vec3, zoom };
    }
    const zoom = Math.min(availW / (W * pad), availH / (H * pad));
    const ty = H / 2 + shift(zoom);
    return { pos: [0, ty, D + 30] as Vec3, up: [0, 1, 0] as Vec3, target: [0, ty, 0] as Vec3, zoom };
  }, [preset, W, D, H, size.width, size.height]);

  // Intentionally keyed on preset/reset/product only: editing a dimension must not yank the
  // camera away from where the user orbited to. "Reset camera" re-frames on the current layout.
  const aspect = size.width / Math.max(1, size.height);
  const frozenFit = useMemo(() => fitCamera(setupBox(layout), aspect), [key, aspect > 1]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => invalidate(), [key, invalidate]);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  useEffect(() => {
    cameraApi.zoom = (f: number) => {
      if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
        const c = camera as THREE.OrthographicCamera;
        c.zoom = c.zoom * f;
        c.updateProjectionMatrix();
      } else if (controls) {
        const off = camera.position.clone().sub(controls.target);
        camera.position.copy(controls.target).add(off.multiplyScalar(1 / f));
      }
      controls?.update();
      invalidate();
    };
  }, [camera, controls, invalidate]);

  if (preset === '3d') {
    return (
      <>
        <PerspectiveCamera key={key} makeDefault fov={FOV} near={0.02} far={200} position={frozenFit.position} />
        <OrbitControls key={`c-${key}`} makeDefault target={frozenFit.target} enableDamping={false} maxPolarAngle={Math.PI * 0.495} minDistance={0.4} maxDistance={Math.max(W, D) * 4} />
      </>
    );
  }
  return (
    <>
      <OrthographicCamera key={key} makeDefault position={ortho.pos} up={ortho.up} zoom={ortho.zoom} near={0.01} far={200} onUpdate={(c) => c.lookAt(ortho.target[0], ortho.target[1], ortho.target[2])} />
      <OrbitControls key={`c-${key}`} makeDefault target={ortho.target} enableRotate={false} enableDamping={false} minZoom={ortho.zoom * 0.5} maxZoom={ortho.zoom * 12} />
    </>
  );
}
