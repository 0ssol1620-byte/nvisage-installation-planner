# Release Gates — status 2026-10-08 (blueprint §19)

**Overall: NOT RELEASABLE.** Any FAIL blocks customer deployment. This build is an internal technical slice.

| Gate | Requirement | Status | Evidence / what is missing |
|---|---|---|---|
| RG-01 Spec accuracy | Numbers = manuals; datum/zone orientation proven | **CONDITIONAL** | Numbers: 26/26 quotes verified. Datums and orientation now come from the manual drawings by owner decision (DL-17). Engineering confirmation still recommended before public launch. |
| RG-02 CAD/IP | Public shell approved; no raw STEP served | **FAIL** (partly met) | Met: STEP/GLB never in `dist/` (build gate). Missing: human review of kept parts, approval of a public shell. |
| RG-03 Visual fidelity | 6-view photo comparison, label/typography approval | **FAIL** | 6-view QA sheets exist for all three products (render_views.py); no textures/logos; no design approval. |
| RG-04 Asset license | Rights for golfer/club/motion/HDRI | **OPEN** | Golfer/club/motion are procedural (no third-party asset). MURLIE screenshots and logo are NVISAGE assets — marketing OK needed for the public web. Fonts OFL. |
| RG-05 Rule engine | Gold fixtures pass; known-unknown false-PASS = 0 | **PASS (dev)** | 40 Vitest tests: manual-basis datums, swing estimator (low ceiling FAIL, driver stricter than wedge), projector (behind back wall FAIL, sensor shadow CAUTION), zone hierarchy. |
| RG-06 Swing caveat | No personal safety claims | **PASS (dev)** | Swing checks always labelled Estimate; copy says to test with slow swings; banned-word test (it caught a "guarantee" during this run). |
| RG-07 UI/UX | No overlap, usable controls on desktop/tablet/mobile | **PARTIAL** | 18 Playwright captures (incl. swing, drag and FAIL scenarios) (1920/1440/1366/390, KO, imperial, no-WebGL): no horizontal overflow. Missing: tablet, 125/200 % zoom, real devices, design review. |
| RG-08 Performance | Perf budget on target devices; 2D mode | **PARTIAL** | Demand frame loop, lazy 3D chunk, 2D fallback works. 3D chunk 1.1 MB (300 kB gz) — needs splitting; no device profiling yet. |
| RG-09 Export/Share | PDF/URL accurate, no leaks | **PARTIAL** | Share URL round-trip + malformed-token tests; no personal data. PDF not built. |
| RG-10 Site launch | Staging pilot, rollback, owner approval | **FAIL** | Site repo/CMS not available (PLAN-001). |
