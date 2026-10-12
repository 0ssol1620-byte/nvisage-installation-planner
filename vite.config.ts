/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolve, basename } from 'node:path';

/**
 * DEV-ONLY bridge to the private, not-yet-approved CAD preview GLBs.
 *
 * Blueprint §2.2 / RG-02: preview GLBs derived from company STEP files must never be copied
 * into public/ or a production bundle. This plugin is `apply: 'serve'`, so it does not exist in
 * `vite build`; the production app falls back to dimension-accurate envelope boxes instead.
 * Only an explicit allow-list of file names is served.
 */
const PRIVATE_PREVIEW_DIR = resolve(import.meta.dirname, 'source-assets-private/preview-glb');
const PRIVATE_ALLOW = new Set(['sensor-n1.preview.glb', 'sensor-n2.preview.glb', 'sensor-neo-e.preview.glb']);

function privatePreviewAssets(): Plugin {
  return {
    name: 'nvisage-private-preview-assets',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__private-preview/', (req, res, next) => {
        const name = basename(decodeURIComponent((req.url ?? '').split('?')[0] ?? ''));
        const file = resolve(PRIVATE_PREVIEW_DIR, name);
        if (!PRIVATE_ALLOW.has(name) || !existsSync(file)) return next();
        res.setHeader('Content-Type', 'model/gltf-binary');
        res.setHeader('Content-Length', String(statSync(file).size));
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Robots-Tag', 'noindex');
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  // relative asset URLs: the same build works at a domain root or under a sub-path (e.g. GitHub Pages /<repo>/)
  base: './',
  plugins: [react(), privatePreviewAssets()],
  define: {
    __PRIVATE_PREVIEW__: JSON.stringify(command === 'serve'),
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
