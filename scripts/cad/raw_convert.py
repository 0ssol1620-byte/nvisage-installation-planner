"""Stage 1: STEP -> raw GLB (private). Usage: raw_convert.py <src.stp> <out.glb> [tol_linear_mm]"""
import sys, time, functools
import cascadio, trimesh, numpy as np
print = functools.partial(print, flush=True)
src, out = sys.argv[1], sys.argv[2]
tol = float(sys.argv[3]) if len(sys.argv) > 3 else 0.3
t = time.time()
r = cascadio.step_to_glb(src, out, tol_linear=tol, tol_angular=0.5, tol_relative=False,
                         merge_primitives=True, include_materials=True)
print('ret', r, 'secs', round(time.time() - t, 1))
sc = trimesh.load(out, force='scene')
print('geoms', len(sc.geometry), 'extents', np.round(sc.extents, 4).tolist())
print('bounds', np.round(sc.bounds, 4).tolist())
print('tris', sum(len(g.faces) for g in sc.geometry.values() if hasattr(g, 'faces')))
