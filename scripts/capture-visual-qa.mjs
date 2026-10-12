// Visual QA captures (blueprint Appendix B-10, Workstream C output).
// Usage: node scripts/capture-visual-qa.mjs [baseUrl] [outDir]
// Uses the locally installed Chrome (channel 'chrome'); no browser download needed.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:5179/';
const out = process.argv[3] ?? join(import.meta.dirname, '..', 'qa-captures');
mkdirSync(out, { recursive: true });

const shots = [
  { name: 'desktop-1440-N1-3d', vp: [1440, 900], product: 'N1', view: '3D' },
  { name: 'desktop-1440-N2-3d', vp: [1440, 900], product: 'N2', view: '3D' },
  { name: 'desktop-1440-NEO-E-3d', vp: [1440, 900], product: 'NEO-E', view: '3D' },
  { name: 'desktop-1440-N2-top', vp: [1440, 900], product: 'N2', view: 'Top' },
  { name: 'desktop-1440-N1-side', vp: [1440, 900], product: 'N1', view: 'Side' },
  { name: 'desktop-1440-NEO-E-top', vp: [1440, 900], product: 'NEO-E', view: 'Top' },
  { name: 'desktop-1920-N2-3d', vp: [1920, 1080], product: 'N2', view: '3D' },
  { name: 'desktop-1366-N1-plan2d', vp: [1366, 768], product: 'N1', view: '2D plan' },
  { name: 'mobile-390-N1-view', vp: [390, 844], product: 'N1', view: '3D', mobile: true },
  { name: 'mobile-390-N1-space', vp: [390, 844], product: 'N1', view: '3D', mobile: true, tab: 'Your space' },
  { name: 'tablet-1024-N2-3d', vp: [1024, 768], product: 'N2', view: '3D' },
  { name: 'tablet-768-NEO-E-view', vp: [768, 1024], product: 'NEO-E', view: '3D', mobile: true },
  { name: 'mobile-390-N1-results', vp: [390, 844], product: 'N1', view: '3D', mobile: true, tab: 'Review' },
  // FAIL scenario + KO + imperial: ceiling below the published N1 minimum
  { name: 'desktop-1440-N1-ko-imperial-low-ceiling', vp: [1440, 900], product: 'N1', view: '3D', act: async (page) => {
    await page.getByRole('textbox', { name: 'Ceiling height' }).fill('2.6');
    await page.getByRole('radio', { name: 'KO' }).click();
    await page.getByRole('radio', { name: 'ft/in' }).click();
  } },
  // N2 zone designer with a Tee Zone outside the Basic Zone → FAIL
  { name: 'desktop-1440-N2-zones-fail', vp: [1440, 900], product: 'N2', view: 'Top', act: async (page) => {
    await page.getByText('Advanced', { exact: true }).click();
    await page.getByText('Ready Zone designer', { exact: true }).click();
    await page.getByRole('group', { name: 'Tee Zone' }).getByRole('textbox', { name: 'X', exact: true }).fill('0.35');
    await page.getByRole('group', { name: 'Tee Zone' }).getByRole('textbox', { name: 'X', exact: true }).blur();
  } },
  { name: 'desktop-1440-N1-no-webgl', vp: [1440, 900], product: 'N1', view: '3D', query: '&no3d=1' },
  // Estimated swing: follow-through peak, tall golfer under a low ceiling → FAIL
  { name: 'desktop-1440-N2-swing-follow', vp: [1440, 900], product: 'N2', view: '3D', act: async (page) => {
    await page.getByRole('slider', { name: 'Swing position' }).fill('760');
  } },
  { name: 'desktop-1440-NEO-E-tall-golfer-low-ceiling', vp: [1440, 900], product: 'NEO-E', view: 'Side', act: async (page) => {
    await page.getByRole('textbox', { name: 'Ceiling height' }).fill('2.4');
    await page.getByRole('textbox', { name: 'Tallest golfer' }).fill('1.9');
    await page.getByRole('slider', { name: 'Swing position' }).fill('760');
  } },
  // Projector throw beyond the back wall → FAIL (BenQ AK700ST at 0.83 needs 3.72 m)
  { name: 'desktop-1440-N1-projector-fail', vp: [1440, 900], product: 'N1', view: 'Top', act: async (page) => {
    await page.getByRole('textbox', { name: 'Depth', exact: true }).fill('3.9');
    await page.getByRole('textbox', { name: 'Depth', exact: true }).blur();
  } },
  // Drag the mat in the Top view (moves the tee)
  { name: 'desktop-1440-N2-drag-mat', vp: [1440, 900], product: 'N2', view: 'Top', act: async (page) => {
    const box = await page.locator('.viewport__stage canvas').boundingBox();
    const zoom = Math.min(box.width / (4.5 * 1.18), box.height / (6.0 * 1.18));
    const x = box.x + box.width / 2 - 0.6 * zoom;
    const y = box.y + box.height / 2 + (3.353 - 3.0 + 0.3) * zoom;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 0.6 * zoom, y - 0.4 * zoom, { steps: 12 });
    await page.mouse.up();
  } },
  // Pro 10 x 15.5 x 10 ft enclosure with the LG BU53RG in a large room
  { name: 'desktop-1440-N1-pro-10x15', vp: [1440, 900], product: 'N1', view: '3D', act: async (page) => {
    await room(page, 5.2, 7, 3.35);
    await page.getByRole('radio', { name: 'Pro', exact: true }).click();
    await page.getByRole('combobox', { name: 'Size' }).selectOption('PRO-10 x 15.5');
    await page.getByRole('combobox', { name: 'Depth' }).selectOption('129.5');
    await page.getByRole('combobox', { name: 'Model', exact: true }).selectOption('lg-bu53rg');
  } },
  { name: 'desktop-1440-NEO-E-ko', vp: [1440, 900], product: 'NEO-E', view: '3D', act: async (page) => {
    await page.getByRole('radio', { name: 'KO' }).click();
  } },
  // Mat toggle off/on must not scroll the page (outer page never scrolls)
  { name: 'desktop-1366-N1-mat-toggle', vp: [1366, 768], product: 'N1', view: '3D', act: async (page) => {
    await page.getByText('Hitting mat', { exact: true }).click();
    await page.getByText('Hitting mat', { exact: true }).click();
  } },
  { name: 'desktop-1366-N1-advanced-open', vp: [1366, 768], product: 'N1', view: '3D', act: async (page) => {
    await page.locator('details.advanced summary').click();
    await page.waitForTimeout(600);
  } },
  { name: 'desktop-1440-N2-curved-10x17', vp: [1440, 900], product: 'N2', view: '3D', act: async (page) => {
    await room(page, 5.6, 7, 3.0);
    await page.getByRole('radio', { name: 'Curved' }).click();
  } },
  { name: 'desktop-1440-N2-curved-top', vp: [1440, 900], product: 'N2', view: 'Top', act: async (page) => {
    await room(page, 5.6, 7, 3.0);
    await page.getByRole('radio', { name: 'Curved' }).click();
  } },
  { name: 'desktop-1440-N1-front-gray-screen', vp: [1440, 900], product: 'N1', view: 'Front', act: async (page) => {
    await page.waitForTimeout(10);
  } },
  { name: 'desktop-1440-N1-panel-equipment', vp: [1440, 900], product: 'N1', view: '3D', act: async (page) => {
    await page.locator('#sec-screen').scrollIntoViewIfNeeded();
  } },
];

async function room(page, w, d, h) {
  for (const [name, v] of [['Width', w], ['Depth', d], ['Ceiling height', h]]) {
    const f = page.getByRole('textbox', { name, exact: true });
    await f.fill(String(v));
    await f.blur();
  }
}

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const log = [];
const only = process.argv[4] ? new RegExp(process.argv[4]) : null;
for (const s of shots.filter((x) => !only || only.test(x.name))) {
  const ctx = await browser.newContext({ viewport: { width: s.vp[0], height: s.vp[1] }, deviceScaleFactor: 1, isMobile: !!s.mobile, hasTouch: !!s.mobile, locale: 'en-US' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(`${base}?product=${encodeURIComponent(s.product)}${s.query ?? ''}`, { waitUntil: 'networkidle' });
  if (s.act) await s.act(page);
  if (s.view !== '3D') await page.getByRole('button', { name: s.view, exact: true }).click();
  if (s.tab) await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: s.tab }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(out, `${s.name}.png`) });
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  const pageScrolled = await page.evaluate(() => window.scrollY !== 0 || document.documentElement.scrollTop !== 0);
  log.push({ shot: s.name, overflowX, pageScrolled, errors });
  writeFileSync(join(out, 'capture-log.json'), JSON.stringify(log, null, 2));
  await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 5000))]);
}
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
for (const l of log) console.log(`${l.shot.padEnd(36)} overflowX=${l.overflowX} pageScrolled=${l.pageScrolled} errors=${l.errors.length}${l.errors.length ? '\n   ' + l.errors.slice(0, 4).join('\n   ') : ''}`);

process.exit(0);
