# NVISAGE 3D Installation Planner — technical slice

Planner described in [`docs/MASTER_BLUEPRINT.md`](docs/MASTER_BLUEPRINT.md). Release status: [`docs/RELEASE_GATES.md`](docs/RELEASE_GATES.md).

**Live preview:** GitHub Pages, served from the `gh-pages` branch. Publish with `npm run deploy` (build + gates, then pushes `dist/`) — DL-31. Not indexed by search engines until the official launch.

## Run
```bash
npm install
npm run dev          # http://localhost:5173 — dev server also serves the PRIVATE CAD previews
npm test             # unit / geometry / i18n tests
npm run build        # typecheck + build + private-asset gate (fails if CAD/GLB/hashes reach dist/)
npm run verify:specs # checks every spec quote against the official PDFs (needs: pip install pymupdf)
```
`?product=N1|N2|NEO-E` preselects a product; `?no3d=1` forces the 2D fallback; `#s=v2.…` restores a shared setup.

## What is in the box
| Path | Purpose |
|---|---|
| `src/data/specs/products.ts` | Manufacturer spec registry — printed values + citations + datum status |
| `src/data/sources.ts` | Source documents (doc no., revision, file) |
| `src/domain/` | Pure TypeScript: units, schema/share links, layout (world coordinates), zone geometry, rules engine |
| `src/scene/` | React Three Fiber renderer — reads the domain layout, never decides PASS/FAIL |
| `src/components/` | Inputs, spec card, results with sources, 2D plan fallback |
| `scripts/cad/` | STEP → oriented, shell-only, decimated preview GLB + 6-view QA renders |
| `scripts/verify_spec_sources.py` | RG-01 helper: quote ↔ PDF page verification |
| `scripts/verify-no-private-assets.mjs` | RG-02 build gate |
| `scripts/capture-visual-qa.mjs` | 18 Playwright captures incl. KO, imperial, swing, drag, FAIL scenarios, no-WebGL |
| `docs/` | Audit report, decision log, asset inventory/registry/license ledger, datum findings, QA matrix, release gates, open issues |
| `source-assets-private/` | git-ignored: STEP copies, raw + preview GLBs, build reports |
| `docs/source-evidence/carls/*.pdf` | git-ignored: archived equipment spec sheets read by `verify:specs` (keep a local copy) |
| `scripts/probe-ui.mjs` | interaction regression probe (page scroll, arrow keys, share links, family switch) |

## Features (2026-10-08)
- Manual-basis rules for NEO-E / N1 / N2 with page-level sources (DL-17)
- Estimated golfer + club + swing path (driver / 7-iron / wedge, height, L/R) with ceiling, sensor, wall, screen and projector clearance (DL-18)
- Simulator equipment by product name: DIY / Pro / Curved enclosures at their published outer and screen sizes, HotShot mats, Standard–HC Gray screens, BenQ AK700ST / AH700ST and LG BU53RG projectors (DL-23…25, DL-29)
- Impact screen showing the MURLIE screen (Murlie1), ceiling projector with light pyramid and shadow checks (DL-25, DL-27)
- Product models of N1 / N2 / NEO-E from the approved CAD exterior shells, finished to match the product photos (DL-35)
- Drag the mat to move the tee; room presets; zoom / full-screen; swing playback + scrubber
- Comparison with the GSV builder: `docs/REFERENCE_COMPARISON.md`

## World convention
Metres, Y-up, origin at the centre of the front (screen) wall on the floor; +X to the golfer's right facing the screen; +Z toward the back wall. See `src/domain/layout.ts`.
