# Asset License Ledger (blueprint §16.1)

`assetId | version | creator | URL | license | purchased account | public web OK? | extractable? | proof | approval date`

| assetId | Version | Creator | Source | License | Public web deployment | Extractable by user | Proof | Approved |
|---|---|---|---|---|---|---|---|---|
| sensor-n1 / n2 / neo-e (preview GLB) | 2026-10-08 | NVISAGE (CAD) → planner pipeline | `3D도면/*.stp` | Company IP | **NO** (dev only) | yes (any web GLB is) | — | ✗ pending RG-02 |
| logo-white-green | as delivered | NVISAGE | `Brand Logos/NVISAGE Logo white,green.png` | Company brand | Yes, per brand guide | yes | Reseller asset folder | ✗ marketing to confirm |
| favicon | as delivered | NVISAGE | `Brand Logos/nvisage-favicon-transparent-300w.png` | Company brand | Yes, per brand guide | yes | Reseller asset folder | ✗ marketing to confirm |
| font-inter | 5.3.0 | Rasmus Andersson | npm `@fontsource-variable/inter` | OFL-1.1 | Yes | yes (allowed) | package.json license field | ✓ OFL |
| font-pretendard | 1.3.9 | Kil Hyung-jin | npm `pretendard` | OFL-1.1 | Yes | yes (allowed) | package.json license field | ✓ OFL |
| environment lighting | — | procedural (drei Lightformer) | code | n/a | Yes | n/a | no HDRI file used | ✓ |
| golfer + clubs + swing motion | 2026-10-08 | planner code (procedural: `src/scene/Golfer.tsx`, `src/domain/swing.ts`) | code | own work | Yes | n/a | source in repo | ✓ own work |
| screen-murlie (`src/assets/screens/murlie-screen.jpg`) | 2026-10-12 | NVISAGE (MURLIE screenshot) | `MURLIE, MURLIE-X Marketing Assets/Images/Murlie1.png` (resized 1800 × 944) | Company asset | Owner selected for the planner (2026-10-12) | yes | Reseller asset folder | ✓ owner instruction |
| Carl's Place product data (dimensions, throw ratios, package contents) | 2026-10-12 | Carl's Place (NVISAGE reseller) | spec sheets + product pages (`src/data/sources.ts` C01–C10; PDFs in `docs/source-evidence/carls/`) | Published product specifications, cited with links | Yes — data only | n/a | archived PDFs | ✓ owner instruction (reseller) |
| Carl's Place images / 3D models | — | Carl's Place | — | reuse rights not confirmed | **NOT USED** | — | — | — |
| turf texture | — | procedural canvas | code | own work | Yes | n/a | — | ✓ |

Rule: anything without ✓ in "Approved" must not ship in a customer build. The build gate already blocks GLB/CAD files.
