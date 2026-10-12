"""Painter's-algorithm orthographic renders of a GLB for visual QA (no GPU needed).
Usage: render_views.py <glb> <out_prefix> [px]
Writes <out_prefix>_views.png : a 3x2 sheet of +X,-X,+Y,-Y,+Z,-Z views (view direction = looking FROM that axis).
"""
import sys, trimesh, numpy as np
from PIL import Image, ImageDraw
glb, prefix = sys.argv[1], sys.argv[2]
px = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 420
sc = trimesh.load(glb, force='scene')
meshes = [g for g in sc.dump() if hasattr(g, 'faces') and len(g.faces)]
use_color = '--color' in sys.argv
cols = []
for g in meshes:
    try:
        c = np.array(g.visual.material.baseColorFactor[:3], dtype=float)
        if c.max() <= 1.0: c = c * 255
    except Exception:
        c = np.array([200, 200, 200.])
    cols.append(np.repeat(c[None], len(g.faces), 0))
FC = np.concatenate(cols)
m = trimesh.util.concatenate(meshes)
V, F = m.vertices, m.faces
N = m.face_normals
c = (V.min(0) + V.max(0)) / 2
# (name, right vector, up vector, toward-viewer vector)
views = [
    ('from +X', [0, 0, -1], [0, 1, 0], [1, 0, 0]), ('from -X', [0, 0, 1], [0, 1, 0], [-1, 0, 0]),
    ('from +Y (top)', [1, 0, 0], [0, 0, -1], [0, 1, 0]), ('from -Y (bottom)', [1, 0, 0], [0, 0, 1], [0, -1, 0]),
    ('from +Z', [1, 0, 0], [0, 1, 0], [0, 0, 1]), ('from -Z', [-1, 0, 0], [0, 1, 0], [0, 0, -1]),
]
span = (V.max(0) - V.min(0)).max() * 1.08
sheet = Image.new('RGB', (px * 3, (px + 24) * 2), (245, 246, 242))
light = np.array([0.4, 0.7, 0.6]); light /= np.linalg.norm(light)
for i, (name, r, u, t) in enumerate(views):
    r, u, t = map(np.array, (r, u, t))
    img = Image.new('RGB', (px, px), (235, 237, 232)); d = ImageDraw.Draw(img)
    P = V - c
    x = (P @ r / span + 0.5) * px; y = (0.5 - P @ u / span) * px; z = P @ t
    facing = N @ t > 0
    order = np.argsort(z[F].mean(1))
    lit = np.clip(np.abs(N @ (light[0] * r + light[1] * u + light[2] * t)), 0, 1)
    for f in order:
        if not facing[f]:
            continue
        a, b, cc = F[f]
        k = 0.35 + 0.65 * lit[f]
        if use_color:
            fill = tuple(int(v * k) for v in FC[f])
        else:
            g = int(60 + 170 * lit[f]); fill = (g, g, int(g * 0.97))
        d.polygon([(x[a], y[a]), (x[b], y[b]), (x[cc], y[cc])], fill=fill)
    col, row = i % 3, i // 3
    sheet.paste(img, (col * px, row * (px + 24) + 24))
    ImageDraw.Draw(sheet).text((col * px + 8, row * (px + 24) + 6), name, fill=(30, 30, 30))
sheet.save(prefix + '_views.png')
print('saved', prefix + '_views.png', 'tris', len(F))
