"""List parts of a raw GLB with bounds and triangle counts. Usage: inspect_parts.py <glb>"""
import sys, trimesh, numpy as np
sys.stdout.reconfigure(encoding='utf-8')
sc = trimesh.load(sys.argv[1], force='scene')
rows = []
for node in sc.graph.nodes_geometry:
    T, gname = sc.graph[node]
    g = sc.geometry[gname]
    if not hasattr(g, 'faces'):
        continue
    b = trimesh.transform_points(g.bounds, T) if len(g.vertices) else np.zeros((2, 3))
    v = trimesh.transform_points(g.vertices, T)
    lo, hi = v.min(0), v.max(0)
    rows.append((node, len(g.faces), np.round(lo, 4).tolist(), np.round(hi - lo, 4).tolist()))
for r in sorted(rows, key=lambda r: -r[1]):
    print(f"{r[1]:7d}  {r[0][:60]:60s} min={r[2]} size={r[3]}")
print('parts', len(rows))
