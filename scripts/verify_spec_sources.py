"""RG-01 support: verify that every `quote` citation in src/data/specs/products.ts (NVISAGE manuals, D..)
and src/domain/rules.ts (Carl's Place spec sheets, C..) appears verbatim (whitespace-normalised) on the
cited page of the cited PDF.

Usage:  python scripts/verify_spec_sources.py [--assets-root ..]
Exit 1 if any quote is missing, a document file is missing, or a page is out of range.
Web-page citations (Carl's Place product pages, page 0) are listed with their URL for review.
Diagram-only citations are listed for manual engineering review (they cannot be text-verified).
Requires PyMuPDF (`pip install pymupdf`).
"""
import re, sys, os, argparse
import pymupdf

sys.stdout.reconfigure(encoding='utf-8')
here = os.path.dirname(os.path.abspath(__file__))
proj = os.path.dirname(here)
ap = argparse.ArgumentParser()
ap.add_argument('--assets-root', default=os.path.dirname(proj))
args = ap.parse_args()

src_ts = open(os.path.join(proj, 'src/data/sources.ts'), encoding='utf-8').read()
files, urls = {}, {}
for m in re.finditer(r"\n  ([DC]\d\d): \{(.*?)\n  \},", src_ts, re.S):
    body = m.group(2)
    f = re.search(r"file: '([^']+)'", body)
    u = re.search(r"web: true, // url: (\S+)", body)
    if f: files[m.group(1)] = f.group(1)
    if u: urls[m.group(1)] = u.group(1)

cite_re = r"\{ doc: '([DC]\d\d)', page: (\d+), (quote|diagram): '((?:[^'\\]|\\.)*)' \}"
cites = []
for rel in ('src/data/specs/products.ts', 'src/domain/rules.ts'):
    cites += re.findall(cite_re, open(os.path.join(proj, rel), encoding='utf-8').read())

norm = lambda s: re.sub(r'\s+', ' ', s).strip()
docs, failures, diagrams, web, ok = {}, 0, [], [], 0
for doc, page, kind, text in cites:
    page = int(page)
    if kind == 'diagram':
        diagrams.append((doc, page, text)); continue
    if page == 0 and doc in urls and doc not in files:
        web.append((doc, text)); continue
    path = files.get(doc)
    if not path:
        print(f'FAIL {doc} p{page}: no file registered'); failures += 1; continue
    full = os.path.join(args.assets_root, path)
    if not os.path.exists(full):
        print(f'FAIL {doc}: file not found {full}'); failures += 1; continue
    if doc not in docs:
        docs[doc] = pymupdf.open(full)
    d = docs[doc]
    if page < 1 or page > len(d):
        print(f'FAIL {doc} p{page}: out of range (1..{len(d)})'); failures += 1; continue
    if norm(text) in norm(d[page - 1].get_text()):
        ok += 1; print(f'ok   {doc} p{page}: {text}')
    else:
        failures += 1; print(f'FAIL {doc} p{page}: quote not found: {text}')

# Carl's Place enclosure tables: every catalog row must appear, in printed column order, in its spec sheet.
carls_ts = open(os.path.join(proj, 'src/data/carls.ts'), encoding='utf-8').read()
sheet = {'diy': 'C01', 'pro': 'C02', 'curved': 'C03'}
rows = re.findall(r"^  (diy|pro|curved)\('([^']+)', (?:'([^']+)', )?([\d., ]+)\),$", carls_ts, re.M)
fmt_n = lambda v: v.strip()
for fam, listing, aspect, nums in rows:
    doc = sheet[fam]
    toks = norm(docs.setdefault(doc, pymupdf.open(os.path.join(args.assets_root, files[doc])))[0].get_text()).split(' ')
    want = [*listing.split(' '), *([aspect] if aspect else []), *[fmt_n(x) for x in nums.split(',')]]
    # tokens appear consecutively in the sheet (curved/pro rows include the diagonal between columns)
    found = any(toks[i:i + len(listing.split(' '))] == listing.split(' ') and all(w in toks[i:i + 14] for w in want) for i in range(len(toks)))
    if found:
        ok += 1; print(f'ok   {doc} table row {fam} {listing}: {" ".join(want[len(listing.split(" ")):])}')
    else:
        failures += 1; print(f'FAIL {doc} table row {fam} {listing}: {want}')

print(f'\n{ok} quotes / table rows verified, {failures} failures.')
print(f"{len(web)} web-page citations (Carl's Place product pages):")
for doc, text in web:
    print(f'  - {doc} {urls[doc]}: {text}')
print(f'{len(diagrams)} diagram-only citations need manual engineering review:')
for doc, page, text in diagrams:
    print(f'  - {doc} p{page}: {text}')
sys.exit(1 if failures else 0)
