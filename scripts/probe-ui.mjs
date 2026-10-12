// UI regression probe for interaction details (run against a dev or preview server).
// Usage: node scripts/probe-ui.mjs [baseUrl]
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:5179/';
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  // page never scrolls
  const scroll = await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight);
  check('document does not scroll', scroll <= 0, `overflow ${scroll}px`);
  // arrow keys step the focused field repeatedly and survive blur
  const w = page.getByRole('textbox', { name: 'Width', exact: true });
  await w.focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Tab');
  check('ArrowUp ×2 on Width → 4.6', (await w.inputValue()) === '4.6', await w.inputValue());
  // reload of your own page shows no "shared setup" banner
  await page.reload({ waitUntil: 'networkidle' });
  check('reload shows no shared banner', (await page.locator('.notice').count()) === 0);
  // family switch picks a size that fits the 4.5 m room
  await page.getByRole('radio', { name: 'Curved', exact: true }).click();
  const size = await page.getByRole('combobox', { name: 'Size' }).inputValue();
  const fitFails = await page.locator('.check--FAIL', { hasText: /wider than the room|taller than the ceiling/ }).count();
  check('Curved in a 4.5 m room picks a size that fits', fitFails === 0, size);
  // shrinking the room keeps the tee inside
  const d = page.getByRole('textbox', { name: 'Depth', exact: true });
  await d.fill('3.5');
  await d.blur();
  const teeErr = await page.locator('.field--error').count();
  check('room depth 3.5 m: no field errors', teeErr === 0, `${teeErr} errors`);
  // segmented keyboard: arrow moves selection
  await page.getByRole('radio', { name: /N1/ }).focus();
  await page.keyboard.press('ArrowRight');
  const n2 = await page.getByRole('radio', { name: /N2/ }).getAttribute('aria-checked');
  check('ArrowRight in launch monitor group selects N2', n2 === 'true');
  // no mention of the reseller anywhere in the UI
  const txt = await page.evaluate(() => document.body.innerText + [...document.querySelectorAll('option')].map((o) => o.textContent).join(' '));
  check('no "Carl" in UI text', !/carl/i.test(txt));
  // customer view shows results, not document references (DL-32)
  await page.locator('details.passed summary').click();
  const all = await page.evaluate(() => document.body.innerText);
  const refs = all.match(/manual|매뉴얼|Rev\.\s?\d|p\.\d|specification|사양서|drawing|도면 기준|Source|출처/gi);
  check('no document references in the UI', !refs, refs ? refs.slice(0, 5).join(', ') : '');
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(base + '#s=garbage', { waitUntil: 'networkidle' });
  const allKo = await page.evaluate(() => document.body.innerText);
  const refsKo = allKo.match(/매뉴얼|사양서|출처|도면 기준/g);
  check('KO: no document references in the UI', !refsKo, refsKo ? refsKo.join(', ') : '');
  const notice = await page.locator('.notice').innerText().catch(() => '');
  check('invalid share link in KO browser → Korean UI', /[가-힣]/.test(notice), notice.slice(0, 40));
  await ctx.close();
}
await browser.close();
console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
