# CAD Publication Checklist (RG-02) — per product

Complete for N1, N2, NEO-E before any GLB leaves `source-assets-private/`.

- [ ] Hardware revision of the STEP confirmed as the current production revision (name, date)
- [ ] Kept-part list reviewed (`reports/<ID>.report.json` → keptParts); internal optics/PCB/IR-LED parts removed
- [ ] Open camera windows closed with a cover/glass surface (N1)
- [ ] Mounting bracket modelled/approved as a separate asset (`mount-overhead-n1`, `mount-overhead-n2`)
- [ ] `asset.extras` stripped of `sourceCadSha256` and file names for the public export
- [ ] Front-face orientation confirmed (DL-05)
- [ ] glTF-Validator: 0 errors
- [ ] 6-view silhouette comparison against official photos signed off (RG-03)
- [ ] Lens/logo/LED appearance approved by marketing
- [ ] Final file ≤ 3 MB (≤ 6 MB with textures), meshopt or Draco decided and loader tested
- [ ] Approved file copied to `public/3d/sensors/<id>/<hash>.glb`; `publicApproved` / `publicUrl` set in `src/data/assets/manifest.ts`
- [ ] `npm run build` private-asset gate updated to allow exactly that file
