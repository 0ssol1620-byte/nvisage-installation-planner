"""Gate 0 / D02: inventory of every file in the NVISAGE_Assets folder (excluding this project).
Usage: python scripts/build_asset_inventory.py > docs/asset-inventory.csv"""
import os, sys, csv, hashlib
sys.stdout.reconfigure(encoding='utf-8', newline='')
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
skip = {'nvisage-3d-planner'}

def classify(rel):
    low = rel.lower()
    if low.endswith('.stp'): return ('CAD source (STEP)', 'PRIVATE — never ship; public shell only after RG-02')
    if 'brand logos' in low: return ('Brand logo', 'Official brand asset — usable in UI per brand guide')
    if '공식 문서' in rel or low.endswith('leaflet.pdf'): return ('Official document', 'Cite/link; do not re-host without document owner OK')
    if low.endswith('.xlsx'): return ('Sales spec sheet', 'Internal cross-reference only (contains pricing sheet)')
    if low.endswith('.md'): return ('Planning document', 'Internal')
    if low.endswith(('.mp4', '.mov')): return ('Marketing video', 'Reseller asset — web use needs marketing OK')
    if 'imagetostl' in low: return ('Marketing image (PNG, not a 3D file)', 'Reference only')
    return ('Marketing image', 'Reseller asset — lookdev/colour reference; web use needs marketing OK')

rows = []
for d, dirs, files in os.walk(root):
    dirs[:] = [x for x in dirs if x not in skip and not x.startswith('.')]
    for f in files:
        p = os.path.join(d, f); rel = os.path.relpath(p, root).replace(os.sep, '/')
        h = hashlib.sha256()
        with open(p, 'rb') as fh:
            for chunk in iter(lambda: fh.read(1 << 20), b''): h.update(chunk)
        kind, policy = classify(rel)
        rows.append([rel, os.path.splitext(f)[1].lower(), os.path.getsize(p), h.hexdigest(), kind, policy])
w = csv.writer(sys.stdout, lineterminator='\n')
w.writerow(['path', 'ext', 'bytes', 'sha256', 'classification', 'publication_policy'])
for r in sorted(rows): w.writerow(r)
