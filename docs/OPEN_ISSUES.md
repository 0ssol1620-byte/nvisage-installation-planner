# Open Issues & Next Runs (2026-10-08)

## Needs a person (blocking release)
| # | Issue | Owner | Ref |
|---|---|---|---|
| O-01 | (Downgraded — owner chose the manual basis, DL-17) Engineering confirmation of the manual-drawing datums before public launch | Mechanical + SW/QA | DATUM_FINDINGS |
| O-02 | Decide which value is correct for N2 weight and NEO-E hitting zone; fix the losing document | Document owner / marketing | SPEC_DISCREPANCIES |
| O-03 | Provide D04 (N2 Calibration & Separate Ready Zone Manual KO) or confirm D11 supersedes it | Document owner | audit §2.4 |
| O-04 | Website repo / CMS / hosting access for PLAN-001 (embed vs sub-domain) | Web ops | blueprint §5.1 |
| O-05 | Approve public CAD shells (RG-02 checklist) and confirm hardware revisions | Mechanical / security | CAD_PUBLICATION_CHECKLIST |
| O-06 | Optional: licensed realistic rigged golfer to replace the procedural mannequin (same IK data). No purchase made. | Marketing / legal | REFERENCE_COMPARISON §2 |
| O-08 | Logo use in the public planner (MURLIE screenshot selected by the owner 2026-10-12, DL-27) | Marketing | DL-27 |
| O-09 | Public models are the CAD exterior shells approved 2026-10-12 (DL-35). Re-run `scripts/cad/publish_glb.py` when the hardware revision changes. | Mechanical | DL-35 |
| O-10 | Robots `noindex` meta is still set in `index.html`; remove it when the planner goes live on the official site. | Web ops | DL-28 |
| O-07 | Brand-guide confirmation for logo use and the dark UI theme | Marketing | DL-15 |

## Engineering backlog (next Claude Code runs)
| # | Task | Blueprint |
|---|---|---|
| E-01 | glTF-Validator in CI; meshopt compression; LOD for mobile | §8.3 |
| E-02 | Split the 1.1 MB 3D chunk (drei imports), measure LCP/INP on real devices | §15 |
| E-03 | Obstacles (beam/duct/column) with top/line-of-sight checks | §10.4 |
| E-04 | Projector / enclosure product database (lens shift, real throw tables) — generic model done (DL-20) | §10.2–10.3 |
| E-05 | PDF plan export (orthographic top/side + status table + sources) | §17.1 |
| E-06 | Mat/tee drag done (DL-21); add undo and drag for projector/enclosure | §6.5 |
| E-07 | Swing estimator done (DL-18); add the Both-handed option and per-golfer profiles | §9.4 |
| E-08 | Zoom 125/200 %, tablet, screen-reader and 30-min memory QA | §20.3 |
| E-09 | Product taglines / spec card labels in KO | i18n |
| E-10 | Close N1 camera window, separate lenses, add logos/LED textures | §8.4 |
