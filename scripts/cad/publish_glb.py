"""Make the public product models from the approved CAD previews (DL-35).

Input : source-assets-private/preview-glb/sensor-*.preview.glb  (exterior shell only, decimated)
Output: src/assets/models/sensor-*.glb

The JSON chunk is rewritten so nothing internal leaves the company: no source CAD file name or hash,
no build paths; node/mesh names become neutral "<product>-part-NN"; asset extras keep only the
planner conventions. Geometry and materials are unchanged. Compress afterwards with

    npx -y @gltf-transform/cli@4 meshopt src/assets/models/<f>.glb src/assets/models/<f>.glb

Usage: python scripts/cad/publish_glb.py
"""
import json, os, struct

here = os.path.dirname(os.path.abspath(__file__))
proj = os.path.dirname(os.path.dirname(here))
src_dir = os.path.join(proj, 'source-assets-private', 'preview-glb')
out_dir = os.path.join(proj, 'src', 'assets', 'models')
os.makedirs(out_dir, exist_ok=True)

for name in ('sensor-n1', 'sensor-n2', 'sensor-neo-e'):
    data = open(os.path.join(src_dir, f'{name}.preview.glb'), 'rb').read()
    magic, version, _ = struct.unpack('<III', data[:12])
    assert magic == 0x46546C67 and version == 2
    jlen, jtype = struct.unpack('<II', data[12:20])
    assert jtype == 0x4E4F534A
    gltf = json.loads(data[20:20 + jlen])
    rest = data[20 + jlen:]  # BIN chunk (header + payload) unchanged

    old = gltf['asset'].get('extras', {})
    gltf['asset'] = {
        'version': '2.0',
        'generator': 'NVISAGE planner model',
        'extras': {k: old[k] for k in ('productId', 'units', 'upAxis', 'visualAnchor') if k in old} | {'frontFaceDirection': '+Z'},
    }
    prefix = old.get('productId', name)
    for i, n in enumerate(gltf.get('nodes', [])):
        n['name'] = f'{prefix}-part-{i:02d}'
        n.pop('extras', None)
    for i, m in enumerate(gltf.get('meshes', [])):
        m['name'] = f'{prefix}-mesh-{i:02d}'
        m.pop('extras', None)
    for s in gltf.get('scenes', []):
        s.pop('extras', None)
        s['name'] = prefix

    j = json.dumps(gltf, separators=(',', ':')).encode()
    j += b' ' * ((4 - len(j) % 4) % 4)
    body = struct.pack('<II', len(j), 0x4E4F534A) + j + rest
    out = struct.pack('<III', 0x46546C67, 2, 12 + len(body)) + body
    open(os.path.join(out_dir, f'{name}.glb'), 'wb').write(out)
    print(f'{name}.glb  {len(out):,} bytes')
