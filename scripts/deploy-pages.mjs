// Publish dist/ to the gh-pages branch of `origin` (GitHub Pages, "Deploy from a branch").
// Usage: npm run deploy   — runs the full build (type check + private-asset gate) first.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
const out = (cmd, args) => execFileSync(cmd, args, { cwd: root }).toString().trim();

run('npm', ['run', 'build']);
const remote = out('git', ['remote', 'get-url', 'origin']);
const rev = out('git', ['rev-parse', '--short', 'HEAD']);
const dir = mkdtempSync(join(tmpdir(), 'nvisage-pages-'));
try {
  cpSync(join(root, 'dist'), dir, { recursive: true });
  writeFileSync(join(dir, '.nojekyll'), '');
  run('git', ['init', '-q', '-b', 'gh-pages'], dir);
  run('git', ['add', '-A'], dir);
  run('git', ['-c', `user.name=${out('git', ['config', 'user.name'])}`, '-c', `user.email=${out('git', ['config', 'user.email'])}`, 'commit', '-q', '-m', `Deploy ${rev}`], dir);
  run('git', ['push', '-f', remote, 'gh-pages'], dir);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log('✓ deployed to gh-pages');
