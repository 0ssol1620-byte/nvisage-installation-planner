/**
 * Finishes for the public product models (DL-35). The CAD previews carry part-level material names
 * but flat, too-light colours; this maps each part to the finish seen in the product photos and adds
 * the NVISAGE logo where the photos show it (placed by ray-casting onto the actual surface).
 */
import * as THREE from 'three';
import type { ProductId } from '../data/specs/products';

type Finish = { color: string; roughness: number; metalness: number; emissive?: string; emissiveIntensity?: number; glass?: boolean };

const FINISH: Record<string, Finish> = {
  // NEO-E
  'body-black': { color: '#1e2124', roughness: 0.6, metalness: 0.1 },
  'urethane-charcoal': { color: '#2b2f32', roughness: 0.75, metalness: 0.05 },
  'default-dark': { color: '#1c1f21', roughness: 0.6, metalness: 0.1 },
  'badge-graphite': { color: '#202325', roughness: 0.35, metalness: 0.3 },
  'lens-window': { color: '#08090b', roughness: 0.15, metalness: 0.2 },
  'camera-lens-glass': { color: '#040507', roughness: 0.04, metalness: 0.3, glass: true },
  'led-strip-green': { color: '#59d13b', roughness: 0.4, metalness: 0, emissive: '#59d13b', emissiveIntensity: 1.4 },
  'led-window': { color: '#59d13b', roughness: 0.4, metalness: 0, emissive: '#59d13b', emissiveIntensity: 1.2 },
  'rubber-foot': { color: '#101112', roughness: 0.9, metalness: 0 },
  'pcb-dark': { color: '#101213', roughness: 0.7, metalness: 0.1 },
  'inner-dark-gray': { color: '#24272a', roughness: 0.6, metalness: 0.1 },
  'lcd-frame': { color: '#111314', roughness: 0.3, metalness: 0.2 },
  // N1
  'housing-anodised-aluminium': { color: '#bfc3c5', roughness: 0.32, metalness: 0.75 },
  'mount-plate-aluminium': { color: '#d3d6d7', roughness: 0.3, metalness: 0.8 },
  'mount-rail-steel': { color: '#8c9195', roughness: 0.35, metalness: 0.8 },
  'shell-black': { color: '#111213', roughness: 0.5, metalness: 0.1 },
  'top-cover-dark': { color: '#1a1c1e', roughness: 0.5, metalness: 0.1 },
  'inner-frame-dark': { color: '#1c1e20', roughness: 0.6, metalness: 0.1 },
  'port-insert': { color: '#c9d63a', roughness: 0.5, metalness: 0 },
  'port-panel': { color: '#1c1e20', roughness: 0.6, metalness: 0.1 },
  // N2
  'shell-charcoal': { color: '#454a4e', roughness: 0.5, metalness: 0.15 },
  'mount-plate': { color: '#3c4044', roughness: 0.5, metalness: 0.3 },
  'detail-gray': { color: '#4b4f52', roughness: 0.5, metalness: 0.2 },
  'inner-frame': { color: '#2c2f32', roughness: 0.6, metalness: 0.1 },
  'port-panel-lime': { color: '#c4d634', roughness: 0.5, metalness: 0 },
  'led-light-guide': { color: '#6be04a', roughness: 0.4, metalness: 0, emissive: '#6be04a', emissiveIntensity: 1.5 },
  'logo-green': { color: '#e9efe9', roughness: 0.4, metalness: 0, emissive: '#e9efe9', emissiveIntensity: 0.5 },
};

function material(f: Finish): THREE.Material {
  if (f.glass) {
    return new THREE.MeshPhysicalMaterial({ color: f.color, roughness: f.roughness, metalness: f.metalness, clearcoat: 1, clearcoatRoughness: 0.03 });
  }
  return new THREE.MeshStandardMaterial({
    color: f.color, roughness: f.roughness, metalness: f.metalness,
    emissive: f.emissive ?? '#000000', emissiveIntensity: f.emissiveIntensity ?? 0,
  });
}

/** Logo / display placements per product: ray start (local), direction, decal size [w, h] in metres. */
type Decal = { kind: 'logo' | 'screen' | 'light'; from: [number, number, number]; dir: [number, number, number]; size: [number, number]; tint?: string };

const DECALS: Record<ProductId, (box: THREE.Box3, parts: Record<string, THREE.Box3[]>) => Decal[]> = {
  // brushed front face, dark logo centred (photos: NVISAGE_Front, nvisage-n1-straight)
  N1: (b) => [{ kind: 'logo', from: [0, (b.min.y + b.max.y) / 2 - 0.01, b.max.z + 0.2], dir: [0, 0, -1], size: [0.15, 0.15 / LOGO_ASPECT], tint: '#151719' }],
  // front: white logo and the green light line along the lower edge (photo 02.N2-F)
  N2: (b) => {
    const h = b.max.y - b.min.y;
    const w = b.max.x - b.min.x;
    return [
      { kind: 'logo', from: [0, b.min.y + h * 0.66, b.max.z + 0.2], dir: [0, 0, -1], size: [w * 0.13, (w * 0.13) / LOGO_ASPECT] },
      { kind: 'light', from: [0, b.min.y + h * 0.38, b.max.z + 0.2], dir: [0, 0, -1], size: [w * 0.88, 0.0045], tint: '#6be04a' },
    ];
  },
  // logo badge between the upper and middle cameras; result display on the top face
  'NEO-E': (b, parts) => {
    const w = b.max.x - b.min.x;
    // logo badge modelled in the CAD on the front (and on the back, when present)
    const badges = (parts['badge-graphite'] ?? []).map((x) => ({ c: x.getCenter(new THREE.Vector3()), s: x.getSize(new THREE.Vector3()) }));
    const front = badges.filter((x) => x.c.z > 0).sort((a, c) => c.c.z - a.c.z)[0];
    const back = badges.filter((x) => x.c.z < 0).sort((a, c) => c.s.x * c.s.y - a.s.x * a.s.y)[0];
    const logoOn = (x: { c: THREE.Vector3; s: THREE.Vector3 }, sign: 1 | -1): Decal => {
      const lw = Math.min(x.s.x * 0.86, x.s.y * 0.86 * LOGO_ASPECT);
      return { kind: 'logo', from: [x.c.x, x.c.y, sign * (Math.abs(sign > 0 ? b.max.z : b.min.z) + 0.2)], dir: [0, 0, -sign], size: [lw, lw / LOGO_ASPECT] };
    };
    return [
      ...(front ? [logoOn(front, 1)] : []),
      // back: logo in the dark window at mid-height (photo Neo-E-B)
      ...(back ? [logoOn(back, -1)] : [{ kind: 'logo' as const, from: [0, b.min.y + (b.max.y - b.min.y) * 0.58, b.min.z - 0.2] as [number, number, number], dir: [0, 0, 1] as [number, number, number], size: [w * 0.3, (w * 0.3) / LOGO_ASPECT] as [number, number] }]),
      { kind: 'screen', from: [0, b.max.y + 0.2, (b.min.z + b.max.z) / 2 + (b.max.z - b.min.z) * 0.04], dir: [0, -1, 0], size: [w * 0.62, (b.max.z - b.min.z) * 0.5] },
    ];
  },
};

const LOGO_ASPECT = 122 / 36;

function screenTexture(): THREE.Texture {
  // plain lit display with a subtle bezel — no product readouts
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 192;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 192);
  grad.addColorStop(0, '#e9eff1');
  grad.addColorStop(1, '#cfd8db');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 192);
  g.strokeStyle = 'rgba(40,46,50,0.35)';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(128, 20); g.lineTo(128, 172);
  g.moveTo(16, 96); g.lineTo(240, 96);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function styleProductModel(root: THREE.Object3D, product: ProductId, logo: THREE.Texture) {
  root.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  const parts: Record<string, THREE.Box3[]> = {};
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    meshes.push(m);
    const mname = (Array.isArray(m.material) ? m.material[0] : m.material)?.name ?? '';
    (parts[mname] ??= []).push(new THREE.Box3().setFromObject(m));
    m.castShadow = true;
    m.receiveShadow = true;
    const name = (Array.isArray(m.material) ? m.material[0] : m.material)?.name ?? '';
    const f = FINISH[name];
    if (f) m.material = material(f);
  });

  const box = new THREE.Box3().setFromObject(root);
  const ray = new THREE.Raycaster();
  for (const d of DECALS[product](box, parts)) {
    ray.set(new THREE.Vector3(...d.from), new THREE.Vector3(...d.dir).normalize());
    const hit = ray.intersectObjects(meshes, false)[0];
    if (!hit?.face) continue;
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(d.size[0], d.size[1]),
      d.kind === 'logo'
        ? new THREE.MeshBasicMaterial({ map: logo, transparent: true, color: d.tint ?? '#ffffff', toneMapped: false, depthWrite: false })
        : d.kind === 'light'
          ? new THREE.MeshBasicMaterial({ color: d.tint ?? '#6be04a', toneMapped: false })
          : new THREE.MeshStandardMaterial({ map: screenTexture(), emissive: '#ffffff', emissiveIntensity: 0.15, roughness: 0.25 }),
    );
    plane.position.copy(hit.point).addScaledVector(normal, 0.0008);
    if (Math.abs(normal.y) < 0.9) {
      plane.lookAt(plane.position.clone().add(normal)); // keeps the logo upright (+Y up)
    } else {
      plane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      plane.rotateZ(Math.PI); // display reads from the front of the device
    }
    plane.renderOrder = 2;
    root.add(plane);
  }
}
