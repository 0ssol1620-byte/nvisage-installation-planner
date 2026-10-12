import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../domain/layout';

export type LabelAnchor = { id: string; position: Vec3; priority: number };

/** Stage edges covered by HTML overlays: swing bar (top), camera buttons (right), layer chips (bottom). */
const INSET = { top: 6, right: 60, bottom: 58, left: 6 };

/**
 * Projects world-space anchors onto DOM labels that live OUTSIDE the canvas (accessible text,
 * crisp at any zoom — blueprint §15.2). Runs only when a frame is rendered (frameloop="demand").
 * Overlapping labels are nudged vertically in priority order so text never collides.
 */
export function LabelProjector({ anchors, elements }: { anchors: LabelAnchor[]; elements: Map<string, HTMLElement> }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const sorted = [...anchors].sort((a, b) => a.priority - b.priority);
    for (const a of sorted) {
      const el = elements.get(a.id);
      if (!el) continue;
      v.set(a.position[0], a.position[1], a.position[2]).project(camera);
      const behind = v.z > 1 || v.z < -1;
      const ax = (v.x * 0.5 + 0.5) * size.width;
      const ay = (-v.y * 0.5 + 0.5) * size.height;
      const w = el.offsetWidth || 80;
      const h = el.offsetHeight || 20;
      // keep the whole label inside the stage (anchors near an edge would otherwise be cut off)
      const x = Math.min(Math.max(ax, w / 2 + INSET.left), size.width - w / 2 - INSET.right);
      let y = Math.min(Math.max(ay, h / 2 + INSET.top), size.height - h / 2 - INSET.bottom);
      for (let guard = 0; guard < 8; guard++) {
        const hit = placed.find((p) => Math.abs(p.x - x) < (p.w + w) / 2 + 4 && Math.abs(p.y - y) < (p.h + h) / 2 + 2);
        if (!hit) break;
        y = hit.y + (hit.h + h) / 2 + 3;
      }
      const offscreen = behind || ax < 0 || ax > size.width || ay < 0 || ay > size.height || y > size.height - h / 2 - INSET.bottom;
      el.style.visibility = offscreen ? 'hidden' : 'visible';
      el.style.transform = `translate(${Math.round(x - w / 2)}px, ${Math.round(y - h / 2)}px)`;
      if (!offscreen) placed.push({ x, y, w, h });
    }
  });
  return null;
}
