// RG-02 / RG-09 build gate: fail if the production bundle contains private CAD material,
// preview GLBs, or references to the private asset folder / dev-only URL.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const dist = join(import.meta.dirname, '..', 'dist');
const FORBIDDEN_EXT = new Set(['.stp', '.step', '.iges', '.igs', '.fcstd', '.glb', '.gltf', '.map']);
const FORBIDDEN_TEXT = [
  'source-assets-private',
  '__private-preview',
  // equipment is shown by product name only (owner instruction 2026-10-12)
  'Carl',
  'carlofet',
  // source CAD hashes must not leak into customer bundles (blueprint §16.2)
  '67abf0024901f2d764ecb0361fac793e725c250d487e81efd0c91dfb1cd9bc49',
  '7f5dafaebb9156d94f6a755574d2c77b52a5e6be74911bd8f7fa31c569ac0e36',
  '03569e7296c131f70d4f592fe9846ece03e0b87976970ae34966568282fcebc4',
];
const TEXT_EXT = new Set(['.js', '.css', '.html', '.json', '.txt', '.svg', '.webmanifest']);

const problems = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    const ext = extname(name).toLowerCase();
    if (FORBIDDEN_EXT.has(ext)) problems.push(`forbidden file type: ${relative(dist, p)}`);
    if (TEXT_EXT.has(ext)) {
      const txt = readFileSync(p, 'utf8');
      for (const needle of FORBIDDEN_TEXT) if (txt.includes(needle)) problems.push(`"${needle.slice(0, 24)}…" found in ${relative(dist, p)}`);
    }
  }
};
walk(dist);
if (problems.length) {
  console.error('✗ private-asset gate FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('✓ private-asset gate passed: no CAD, preview GLB, private paths or source CAD hashes in dist/');
