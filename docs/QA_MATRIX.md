# QA Matrix — results 2026-10-08 (blueprint §20)

Legend: ✅ verified by automated test/capture · 🟡 partially · ❌ not met / not done · ⏳ needs a person

## 20.1 Geometry / manual
| Item | Result | Evidence |
|---|---|---|
| N1 Hitting Zone 16 × 20 in, page available | ✅ | D01 p.3 quote verified; spec test |
| N2 Impact Zone 31.5 × 23.6 in | ✅ | D02 p.3 |
| NEO-E Strike Zone 12.6 × 9.4 in | ✅ | D05 p.15 |
| N1 height 110.24–118 in | ✅ | D01 p.4; boundary tests |
| N2 height 110.24–118.11 in | ✅ | D02 p.4; N1 vs N2 2.999 m test |
| N1 offset 23.62 in labelled with datum | ✅ | Source panel shows datum note |
| N2 offset 39.37 in labelled with datum | ✅ | + D03 p.9 text |
| NEO-E footprint 15.8 × 29.4 × 12.1 in, not mislabelled as room size | ✅ | copy: "Installation space" |
| NEO-E 14.2 in flagged unresolved | ✅ | NOT_VERIFIED row + dashed amber label without value |
| N2 Tee ⊆ Basic ⊆ Max | ✅ | `zoneContainmentChecks` tests |
| Invalid N2 Tee blocked/flagged in domain engine | ✅ | FAIL in engine, not only UI |
| N1/N2 max-zone orientation | ✅ | manual basis (D11 p.13 figure), owner decision DL-17 |
| Mount-height reference | ✅ manual drawing basis (DL-17); engineering confirmation optional | DATUM_FINDINGS |
| L/R zone logic where approved | 🟡 | NEO-E mirrored device; NOT_VERIFIED until approved |
| HW revision flagged | 🟡 | `hardwareRevision: UNVERIFIED` in GLB extras |

## 20.2 Assets
| Item | Result |
|---|---|
| N1 = G4F mapping in registry | ✅ |
| N2 GLB imported, size/direction | ✅ extents match blueprint ±0.01 mm |
| NEO-E GLB imported, floor contact | ✅ origin = floor centre |
| Silhouettes vs official images | 🟡 6-view sheets made; formal comparison ⏳ |
| No internal CAD nodes leaked | 🟡 automated visibility filter; human review ⏳ |
| glTF-Validator errors 0 | ❌ not run yet |
| License ledger complete | 🟡 `ASSET_LICENSE_LEDGER.md` |
| Rig/motion licensed | 🟡 procedural (own work); realistic rig optional (O-06) |
| Golfer/club/mat alignment | ✅ procedural golfer on the mat, club head at the ball at impact |
| Desktop/mobile LOD | ❌ single LOD |

## 20.3 Experience
| Item | Result | Evidence |
|---|---|---|
| W/D/H edits update room + dimensions | ✅ | live store; captures |
| Product switch leaves no stale zone/camera | ✅ | camera keyed by product; layout recomputed; test |
| Unit toggle does not alter geometry | ✅ | layout equality test; mm round-trip test |
| Hit zone visible in Top/Side/3D | ✅ | captures |
| Labels readable at 125/150/200 % | ❌ not captured yet |
| Club switch changes motion | ✅ | driver / 7-iron / wedge change arc + checks (tests) |
| Missing spec → NOT_VERIFIED, never PASS | ✅ | rules test |
| Source footnote/revision in UI | ✅ | "Source ▾" per row; spec card cites |
| Share URL restores state | ✅ | round-trip test |
| Keyboard + screen-reader result text | 🟡 | all controls are native buttons/inputs, aria-live results; no SR test yet |
| Mobile no horizontal scroll | ✅ | 390 px captures, `overflowX=false` |
| Failed GLB / WebGL loss → recover or 2D | ✅ | error boundary → envelope; `?no3d=1` capture; context-loss handler |
| 30 min / 100 product swaps memory | ❌ not run |
| No CAD/private links in bundle | ✅ | `verify-no-private-assets.mjs` |
| Consent before contact | n/a (no contact flow) |

## Automated commands
```bash
npm test                     # 40 unit/geometry/i18n tests
npm run typecheck
npm run build                # includes private-asset gate
npm run verify:specs         # PDF quote verification (needs PyMuPDF)
node scripts/capture-visual-qa.mjs http://localhost:5179/   # 18 captures → qa-captures/
```
