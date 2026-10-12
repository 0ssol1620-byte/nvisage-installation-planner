# Datum findings (RG-01)

> **2026-10-08 owner decision (DL-17): "매뉴얼 기준으로".** Every row below is now applied as `MANUAL` (manual drawing / figure basis). N1-d and N2-c use side A parallel to the screen, centred on the tee (D11 p.13 figure); NE-a/b use the D05 p.15 drawing. The table stays as the evidence trail for an optional engineering confirmation.

Status vocabulary (same as `src/data/specs/products.ts`):
`DOCUMENTED` — stated in text · `DIAGRAM_INTERPRETED` — read from an official drawing by the planner team · `UNRESOLVED` — not determinable from the documents.

Text quotes are machine-verified against the PDFs: `python scripts/verify_spec_sources.py` → **26 quotes verified, 0 failures** (2026-10-08). The 11 diagram-only citations it lists are the items below.

## N1

| # | Question (blueprint §3.5) | Evidence | Planner interpretation | Status |
|---|---|---|---|---|
| N1-a | What does 110.24–118 in measure? | D01 p.4 drawing: vertical arrow from the floor line to the **orange line at the top of the sensor**; the "Center of Camera Lens" line is lower. D10 p.10: "Height: approximately 118 inches", arrow to top of sensor. | Floor (calibration-board plane) → sensor ceiling-mount plane. When a mat raises the hitting surface and only one of floor/mat reference is in range → **CAUTION**. | DIAGRAM_INTERPRETED |
| N1-b | Is 23.62 in measured to the tee? | D01 p.4: lens centre → "Center of Calibration Board". D10 p.10 top view: image sensor → **Tee**, 23.62. | Horizontal distance perpendicular to the screen; sensor on the screen side of the tee. | DIAGRAM_INTERPRETED |
| N1-c | Where is the lens in the sensor body? | D10 p.10: bracket 4.61 in deep; bracket user-side edge → tee 20.87 in ⇒ lens 2.75 in from user-side edge, i.e. ≈0.45 in toward the screen from the bracket centre. | Model centre used as lens (0.45 in / 11 mm approximation). | DIAGRAM_INTERPRETED |
| N1-d | Hitting Zone 16 × 20 in — which side is parallel to the screen, and where is its centre? | No drawing. D01 p.7 shows the software zone over camera images only. | Both orientations drawn, centred on the tee, labelled "orientation pending". | **UNRESOLVED** |
| N1-e | Ready Zone / Tee Zone limits | D01 p.7: "Move and set a custom zone within the blue box." No rule for Tee vs Ready. | Ready ⊆ max checked; Tee has no documented constraint. | DOCUMENTED (partial) |

## N2

| # | Question | Evidence | Planner interpretation | Status |
|---|---|---|---|---|
| N2-a | 110.24–118.11 in datum | D02 p.4 / D03 p.9 drawings: arrow ends at the top of the sensor. | Same as N1-a. | DIAGRAM_INTERPRETED |
| N2-b | 39.37 in endpoints | **D03 p.9 text**: "Align the distance between the center of the sensor marked with the '+' on the bracket and the tee (golf ball position) to 39.37 inches." Drawing shows it horizontal, sensor on the screen side; bracket arrow faces the tee. | Horizontal, '+' on bracket ↔ tee. | DIAGRAM_INTERPRETED (endpoints DOCUMENTED) |
| N2-c | Impact Zone 31.5 × 23.6 in orientation / centre | none | Both orientations drawn. | **UNRESOLVED** |
| N2-d | Zone hierarchy | **D11 p.13 text**: "Basic Zone: Cannot exceed the maximum area indicated by the white box." / "The Tee Zone can only be defined within the Basic Zone." | Enforced in `rules.ts` (`zoneContainmentChecks`). | DOCUMENTED |

## NEO-E

| # | Question | Evidence | Planner interpretation | Status |
|---|---|---|---|---|
| NE-a | 14.2 in "Data Collection Points" | D05 p.15 & D12 p.4 drawing: arrow from the device base to the Ready Zone edge. | Device front → near edge of Strike Zone; shown dashed/amber "reference unresolved"; no PASS depends on it. | **UNRESOLVED** |
| NE-b | 7.9 in (drawing only) | Same drawings, lateral dimension. 2 × 7.9 = 15.8 in = table width. | Zone centred on the device axis (lateral offset sign unknown). | **UNRESOLVED** |
| NE-c | 29.4 in installation depth | Table; 5.8 + 14.2 + 9.4 = 29.4 exactly. | Footprint = device back → far zone edge, 15.8 in wide centred on device axis. | DIAGRAM_INTERPRETED |
| NE-d | Which side of the ball is the device? | D12 p.4 alignment drawing: device beside the ball, cameras perpendicular to the target line. | Right-handed: device on +X (opposite the golfer), mirrored for left-handed. | DIAGRAM_INTERPRETED |
| NE-e | Ball position | **D05 p.24**: "Accurate data can be acquired when the ball is placed in the center of the Ready Zone." | Ball at Strike Zone centre. | DOCUMENTED |

## Sign-off request
For each `DIAGRAM_INTERPRETED` row: confirm or correct, name + date. For each `UNRESOLVED` row: provide the dimension/datum from the hardware or SW team. Until then the planner keeps the matching checks at `NOT_VERIFIED` or labels them "reference read from drawing", and RG-01 stays **FAIL**.
