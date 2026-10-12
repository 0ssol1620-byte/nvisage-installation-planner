# D01 — Gate 0 Audit Report (2026-10-08)

Blueprint §18 Gate 0 / PLAN-001~003. Scope: everything in `D:\NVISAGE_Assets` (76 files, ~610 MB) plus the master blueprint.

## 1. What was reviewed

| Group | Files | How it was checked |
|---|---|---|
| Master blueprint | `NVISAGE_3D_INSTALLATION_PLANNER_MASTER_BLUEPRINT_2026-10-08_KO.md` (1,466 lines) | Read in full; copied to `docs/MASTER_BLUEPRINT.md` |
| STEP CAD | 3 files in `3D도면/` | SHA-256 recomputed — **all 3 match blueprint §2.2**; converted locally (see §3) |
| Official PDFs | 11 in `Nvisage 공식 문서/` + `NVisage Leaflet.pdf` | Full text extracted (PyMuPDF); diagram pages rendered and read visually |
| Spec Sheet | `Spec Sheet.xlsx` (4 sheets: N1, N2, NEO-E, Pricing) | Parsed cell-by-cell; cross-checked against manuals |
| Marketing images | 49 images (N1/N2/NEO-E/MURLIE/iPad/logos) | Thumbnailed, viewed as contact sheets; used for orientation + material reference |
| Videos | 4 MP4 | Inventoried only (not needed for this run) |

Full per-file list with SHA-256 and publication policy: [`asset-inventory.csv`](asset-inventory.csv).

## 2. Findings that change or sharpen the blueprint

1. **Two installation guides are new evidence** not cited by the blueprint:
   - `N1 Installation Guide_V1.0_EN.pdf` (D-26-1243, 2026-06-30) p.10 top-view drawing: image sensor → tee **23.62 in**, bracket **7.87 + 7.87 in** wide × **4.61 in** deep, bracket user-side edge → tee **20.87 in**; "upper mounting screws face away from the screen".
   - `N2 Installation Guide_V1.0_EN.pdf` (D-26-829) p.9 text: "Align the distance between the center of the sensor marked with the '+' on the bracket and the **tee (golf ball position)** to 39.37 inches"; bracket arrow faces the tee.
   → The blueprint's open question "센서–보정판 거리가 tee와 같은가" is **answered in text for N2** and in a drawing for N1. Registered as `DIAGRAM_INTERPRETED`, pending engineering sign-off (see `source-evidence/DATUM_FINDINGS.md`).
2. **Mount-height datum**: in all four drawings (D01 p.4, D02 p.4, D03 p.9, D10 p.10) the 110.24–118(.11) in arrow ends at the **top of the sensor (ceiling plane)**, not at the "Center of Camera Lens" line. Planner measures floor/hitting surface → mount plane and flags CAUTION when floor vs. mat reference changes the result.
3. **NEO-E 14.2 in**: the p.15 drawing + Quick Start p.4 show 14.2 in from the device to the Ready Zone edge plus an unlabelled **7.9 in** lateral dimension. The table arithmetic is self-consistent (5.8 + 14.2 + 9.4 = 29.4 in; 2 × 7.9 = 15.8 in). Still `UNRESOLVED` — rendered as a provisional reference only.
4. **D04 (N2 Calibration & Separate Ready Zone Manual KO) is not in the folder.** Its rule (Tee ⊆ Basic ⊆ white box) is confirmed verbatim in `User Manual_N-Hub Lite_EN.pdf` (D-26-1892) p.13, now registered as D11.
5. **Spec Sheet conflicts with manuals** in 4 places (N2 weight, N2/NEO-E hitting zone, install height rounding) — see `source-evidence/SPEC_DISCREPANCIES.md`. Rules use manuals only.
6. **NEO-E drawing** (D05 p.12) prints width **6.4** while the table says **6.3 in**; and the drawing table label says W×D×H while the CAD confirms the 12.1 in axis is the vertical height.
7. `NEO-E` STEP named "no-inner_parts" still contains PCB / IR-LED / gasket sub-assemblies (148 nodes). 65 non-visible parts were removed automatically for the preview; **human review still required** (RG-02).
8. The **N-Hub Lite manual mentions "NEO-i"** — a product not in planner scope. Noted, not modelled.
9. `Spec Sheet.xlsx` contains a **Pricing** sheet (MAP/MSRP). It must never be bundled or linked from the planner.

## 3. Local CAD → GLB technical prototype (this run)

| | N1 | N2 | NEO-E |
|---|---:|---:|---:|
| STEP SHA-256 match blueprint | ✅ | ✅ | ✅ |
| Preview extents X×Y×Z (m) | 0.5609 × 0.1223 × 0.1746 | 0.9563 × 0.1447 × 0.2023 | 0.1614 × 0.3080 × 0.1465 |
| Blueprint extents | .560855 × .122315 × .174600 | .956253 × .144655 × .202320 | .161376 × .307882 × .146466 |
| Triangles (preview) | 52,268 | 83,585 | 92,138 (from 223,382) |
| Parts kept / dropped (visibility test) | 10 / 1 | 11 / 0 | 68 / 65 |
| Size | 1.20 MB | 1.93 MB | 2.12 MB |

All three are ≤ 3 MB (blueprint §8.3 first target). Pipeline: `scripts/cad/raw_convert.py` → `scripts/cad/build_preview_glb.py`. Outputs live in `source-assets-private/` (git-ignored, never deployed).

## 4. Not possible in this run

- **Website repo / CMS / hosting** (PLAN-001 site part): no repository or credentials were provided. The planner is built as a standalone Vite app so it can be embedded or sub-domained once the site stack is known.
- **Engineering / legal / marketing approvals** (RG-01~04, RG-10): require people; checklists prepared.
- **Golfer / club / swing motion assets**: none licensed; swing clearance is `NOT_EVALUATED` in the UI (no placeholder geometry posing as an estimate).
