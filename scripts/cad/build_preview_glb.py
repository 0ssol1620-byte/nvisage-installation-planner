"""Stage 2: raw CAD GLB -> oriented, anchored, shell-only, decimated PBR preview GLB (PRIVATE).

Usage:
    build_preview_glb.py <product-id> <raw.glb> <source.stp> <out.glb> <report.json>

Conventions (blueprint §11): meters, Y-up. Each product is rotated so that
  * the long axis is along X,
  * the face shown as "Front" in official marketing photos points to +Z,
  * overhead sensors (N1/N2): origin = centre of the ceiling-mount plane (top of geometry),
  * portable NEO-E: origin = centre of the floor-contact plane, cameras face +Z.
The front-face choice for N1/N2 is [PROPOSED] (derived from photos), not an engineering datum.

Visibility filter: every part is rendered with an ID colour from 26 directions using a
painter's algorithm; parts that never own a pixel are treated as internal and dropped.
This is an automated aid, NOT the CAD publication approval required by RG-02.
"""
import sys, json, hashlib, functools, datetime
import numpy as np, trimesh, fast_simplification
from PIL import Image, ImageDraw

print = functools.partial(print, flush=True)
pid, raw_path, step_path, out_path, report_path = sys.argv[1:6]

# --------------------------------------------------------------------------- product config
# R maps source axes -> world axes (columns = images of source ex, ey, ez).
CONFIG = {
    'N1': dict(R=[[-1, 0, 0], [0, 0, -1], [0, -1, 0]], anchor='top', tri_budget=60000),
    'N2': dict(R=[[-1, 0, 0], [0, 0, 1], [0, 1, 0]], anchor='top', tri_budget=90000),
    'NEO-E': dict(R=[[1, 0, 0], [0, 1, 0], [0, 0, 1]], anchor='bottom', tri_budget=260000),  # no decimation: it tore the thin covers (2026-10-08)
}[pid]
R = np.array(CONFIG['R'], dtype=float)
assert abs(np.linalg.det(R) - 1) < 1e-9, 'rotation must be proper'

# CAD colours are engineering ID colours; map them to PBR looks matched to marketing photos.
# key: (r,g,b) of CAD colour -> (name, baseRGB, metallic, roughness, emissiveRGB)
PALETTE = {
    'N1': {
        (188, 188, 188): ('mount-plate-aluminium', (196, 199, 201), 0.85, 0.42, None),
        (255, 255, 255): ('top-cover-dark', (34, 35, 36), 0.1, 0.5, None),
        (0, 255, 255): ('mount-rail-steel', (120, 124, 128), 0.8, 0.45, None),
        (112, 112, 112): ('housing-anodised-aluminium', (150, 153, 156), 0.85, 0.36, None),
        (85, 100, 104): ('inner-frame-dark', (40, 43, 45), 0.2, 0.6, None),
        (173, 255, 146): ('port-panel', (30, 32, 33), 0.0, 0.6, None),
        (13, 10, 8): ('shell-black', (18, 18, 19), 0.0, 0.5, None),
        (255, 255, 0): ('port-insert', (205, 214, 56), 0.0, 0.55, None),
    },
    'N2': {
        (8, 8, 8): ('body-black', (26, 27, 28), 0.0, 0.48, None),
        (34, 34, 34): ('shell-charcoal', (44, 46, 48), 0.1, 0.42, None),
        (188, 188, 188): ('led-light-guide', (120, 200, 90), 0.0, 0.3, (60, 150, 40)),
        (255, 255, 255): ('inner-frame', (60, 62, 64), 0.1, 0.5, None),
        (128, 216, 9): ('port-panel-lime', (196, 214, 52), 0.0, 0.5, None),
        (0, 81, 255): ('mount-plate', (60, 63, 66), 0.6, 0.45, None),
        (81, 81, 81): ('detail-gray', (81, 81, 81), 0.2, 0.5, None),
        (0, 81, 0): ('logo-green', (150, 200, 60), 0.0, 0.4, None),
    },
    'NEO-E': {
        (8, 8, 8): ('body-black', (24, 25, 26), 0.0, 0.55, None),
        (78, 100, 107): ('urethane-charcoal', (48, 51, 53), 0.0, 0.7, None),
        (255, 255, 255): ('inner-dark-gray', (58, 61, 63), 0.1, 0.5, None),
        (5, 5, 5): ('lens-window', (8, 9, 10), 0.0, 0.08, None),
        (0, 100, 0): ('pcb-dark', (20, 24, 22), 0.0, 0.6, None),
        (255, 0, 0): ('button-dark', (30, 31, 32), 0.0, 0.5, None),
        (255, 100, 0): ('ir-filter', (28, 12, 14), 0.0, 0.12, None),
        (201, 201, 201): ('lcd-frame', (22, 23, 24), 0.2, 0.35, None),
        (0, 255, 255): ('camera-lens-glass', (10, 14, 18), 0.0, 0.05, None),
    },
}[pid]

# Part-name rules take precedence over CAD colours (NEO-E STEP carries meaningful part names).
# Looks matched to NEO-E Marketing Assets/02.NEO-E.jpg (green LED strips), Neo-E-F/B.jpg.
NAME_RULES = {
    'NEO-E': [
        ('INDICATOR-', ('led-strip-green', (90, 230, 110), 0.0, 0.3, (40, 190, 70))),
        ('WINDOW-LED', ('led-window', (90, 230, 110), 0.0, 0.3, (30, 150, 60))),
        ('LENS', ('camera-lens-glass', (10, 14, 18), 0.0, 0.05, None)),
        ('BADGE-FRONT', ('badge-graphite', (66, 73, 68), 0.6, 0.35, None)),
        ('COVER-BOTTOM_rub', ('rubber-foot', (20, 20, 21), 0.0, 0.9, None)),
        ('COVER-', ('urethane-charcoal', (36, 38, 40), 0.0, 0.72, None)),
        ('2322-1402', ('urethane-charcoal', (36, 38, 40), 0.0, 0.72, None)),
        ('CTP-frame', ('lcd-frame', (22, 23, 24), 0.2, 0.35, None)),
    ],
}.get(pid, [])


def material_for(node, cad_rgb):
    for prefix, mat in NAME_RULES:
        if prefix in node:
            return mat
    return PALETTE.get(cad_rgb, DEFAULT_MAT)
DEFAULT_MAT = ('default-dark', (40, 42, 44), 0.0, 0.55, None)


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


# --------------------------------------------------------------------------- load parts
sc = trimesh.load(raw_path, force='scene')
parts = []
for node in sc.graph.nodes_geometry:
    T, gname = sc.graph[node]
    g = sc.geometry[gname]
    if not hasattr(g, 'faces') or len(g.faces) == 0:
        continue
    m = g.copy()
    m.apply_transform(T)
    try:
        c = np.array(g.visual.material.baseColorFactor[:3], dtype=float)
        c = c * 255 if c.max() <= 1.0 else c
        cad_rgb = tuple(int(round(v)) for v in c)
    except Exception:
        cad_rgb = (200, 200, 200)
    parts.append(dict(node=node, mesh=m, cad_rgb=cad_rgb))
src_tris = sum(len(p['mesh'].faces) for p in parts)
print(pid, 'parts', len(parts), 'tris', src_tris)

# --------------------------------------------------------------------------- orient + anchor
M = np.eye(4); M[:3, :3] = R
for p in parts:
    p['mesh'].apply_transform(M)
allv = np.vstack([p['mesh'].vertices for p in parts])
lo, hi = allv.min(0), allv.max(0)
anchor = np.array([(lo[0] + hi[0]) / 2, hi[1] if CONFIG['anchor'] == 'top' else lo[1], (lo[2] + hi[2]) / 2])
for p in parts:
    p['mesh'].apply_translation(-anchor)

# --------------------------------------------------------------------------- decimate
budget = CONFIG['tri_budget']
if src_tris > budget:
    ratio = budget / src_tris
    for p in parts:
        m = p['mesh']
        if len(m.faces) < 1500:
            continue
        v, f = fast_simplification.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32),
                                            target_reduction=1 - ratio)
        if len(f):
            p['mesh'] = trimesh.Trimesh(v, f, process=True)
dec_tris = sum(len(p['mesh'].faces) for p in parts)
print('after decimation', dec_tris)

# --------------------------------------------------------------------------- visibility
def directions():
    ds = []
    for x in (-1, 0, 1):
        for y in (-1, 0, 1):
            for z in (-1, 0, 1):
                if (x, y, z) != (0, 0, 0):
                    ds.append(np.array([x, y, z], float) / np.linalg.norm([x, y, z]))
    return ds


V = np.vstack([p['mesh'].vertices for p in parts])
F, PID = [], []
off = 0
for i, p in enumerate(parts):
    F.append(p['mesh'].faces + off); PID.append(np.full(len(p['mesh'].faces), i)); off += len(p['mesh'].vertices)
F = np.vstack(F); PID = np.concatenate(PID)
span = (V.max(0) - V.min(0)).max() * 1.05
ctr = (V.max(0) + V.min(0)) / 2
visible_px = np.zeros(len(parts), int)
PX = 320
for t in directions():
    up = np.array([0, 1, 0.]) if abs(t[1]) < 0.9 else np.array([0, 0, 1.])
    r = np.cross(up, t); r /= np.linalg.norm(r); u = np.cross(t, r)
    P = V - ctr
    x = (P @ r / span + 0.5) * PX; y = (0.5 - P @ u / span) * PX; z = P @ t
    img = Image.new('I', (PX, PX), -1); d = ImageDraw.Draw(img)
    for f in np.argsort(z[F].mean(1)):
        a, b, c = F[f]
        d.polygon([(x[a], y[a]), (x[b], y[b]), (x[c], y[c])], fill=int(PID[f]))
    ids = np.array(img).ravel()
    ids = ids[ids >= 0]
    visible_px += np.bincount(ids, minlength=len(parts))
MIN_PX = 4
kept = [p for i, p in enumerate(parts) if visible_px[i] >= MIN_PX]
dropped = [dict(node=p['node'], tris=len(p['mesh'].faces), visiblePx=int(visible_px[i]))
           for i, p in enumerate(parts) if visible_px[i] < MIN_PX]
print('kept', len(kept), 'dropped', len(dropped))

# --------------------------------------------------------------------------- materials + export
out = trimesh.Scene()
mat_cache = {}
mat_usage = {}
for i, p in enumerate(kept):
    name, base, metal, rough, emis = material_for(p['node'], p['cad_rgb'])
    if name not in mat_cache:
        mat_cache[name] = trimesh.visual.material.PBRMaterial(
            name=name, baseColorFactor=[*base, 255], metallicFactor=metal, roughnessFactor=rough,
            emissiveFactor=[e / 255 for e in emis] if emis else None, doubleSided=True)
    m = p['mesh']
    m.visual = trimesh.visual.TextureVisuals(material=mat_cache[name])
    out.add_geometry(m, node_name=f'{pid}-part-{i:03d}-{name}', geom_name=f'{pid}-geom-{i:03d}')
    mat_usage[name] = mat_usage.get(name, 0) + len(m.faces)

glb = out.export(file_type='glb')

# inject asset.extras metadata into the GLB JSON chunk
import struct
magic, ver, length = struct.unpack_from('<III', glb, 0)
jlen, jtype = struct.unpack_from('<II', glb, 12)
js = json.loads(glb[20:20 + jlen].decode('utf-8'))
src_sha = sha256(step_path)
meta = {
    'productId': pid,
    'sourceCadFile': step_path.replace('\\', '/').split('/')[-1],
    'sourceCadSha256': src_sha,
    'hardwareRevision': 'UNVERIFIED',
    'publicApproved': False,
    'previewOnly': True,
    'units': 'm', 'upAxis': 'Y',
    'visualAnchor': 'ceiling-mount-plane-center' if CONFIG['anchor'] == 'top' else 'floor-contact-plane-center',
    'frontFaceDirection': '+Z (PROPOSED from marketing photos)',
    'measurementDatum': None,
    'generator': 'scripts/cad/build_preview_glb.py',
    'built': datetime.date.today().isoformat(),
}
js.setdefault('asset', {})['extras'] = meta
jb = json.dumps(js, separators=(',', ':')).encode('utf-8')
jb += b' ' * ((4 - len(jb) % 4) % 4)
rest = glb[20 + jlen:]
body = struct.pack('<II', len(jb), 0x4E4F534A) + jb + rest
glb2 = struct.pack('<III', magic, ver, 12 + len(body)) + body
with open(out_path, 'wb') as f:
    f.write(glb2)

check = trimesh.load(out_path, force='scene')
ext = check.extents.tolist(); b = check.bounds.tolist()
report = dict(meta, outputFile=out_path.replace('\\', '/').split('/')[-1], outputSha256=sha256(out_path),
              outputBytes=len(glb2), sourceParts=len(parts), keptParts=len(kept), droppedParts=dropped,
              sourceTriangles=src_tris, outputTriangles=int(sum(len(g.faces) for g in check.geometry.values())),
              extentsM=[round(v, 6) for v in ext], boundsM=[[round(v, 6) for v in row] for row in b],
              materials=mat_usage, visibilityDirections=26, visibilityMinPixels=MIN_PX)
with open(report_path, 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2)
print(json.dumps({k: report[k] for k in ('outputBytes', 'outputTriangles', 'extentsM', 'keptParts')}))
