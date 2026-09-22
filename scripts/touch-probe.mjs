import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const base = process.env.V2_BASE_URL ?? 'http://127.0.0.1:4191';
const browser = await chromium.launch({ headless: false, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
// Headed: needs WebGL. Run against a fresh dev server: npx vite --port 4191 && node scripts/touch-probe.mjs
// Dispatch real touch pointer events through CDP so pointerType === 'touch'.
const cdp = await ctx.newCDPSession(page);
const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
try {
  await page.goto(`${base}/#/d/touch-${Date.now()}`);
  await page.waitForFunction(() => window.__V2__?.getState());
  await page.locator('canvas').waitFor();
  // Top lane: document bar and workspace rail must not overlap.
  const bar = await page.locator('.ofk-v2-document-bar').boundingBox();
  const rail = await page.locator('.ofk-v2-workspace-rail').boundingBox();
  assert.ok(bar.y + bar.height <= rail.y, `top lane overlap: bar bottom ${bar.y + bar.height} rail top ${rail.y}`);
  // Double-tap on empty canvas → new text node with the editor open.
  await touch('touchStart', [[200, 400]]); await touch('touchEnd', []);
  await page.waitForTimeout(80);
  await touch('touchStart', [[204, 402]]); await touch('touchEnd', []);
  await page.waitForFunction(() => window.__V2__.getState().nodes.length === 1);
  await page.keyboard.type('hi'); await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  // Pinch: two fingers spreading doubles the zoom.
  const zoomLabel = () => page.locator('.ofk-floating-region[data-slot="bottom-start"]').innerText().then((t) => Number(/(\d+)%/.exec(t)?.[1]));
  const zoom0 = await zoomLabel();
  await touch('touchStart', [[150, 500]]);
  await touch('touchStart', [[150, 500], [250, 500]]);
  for (let i = 1; i <= 5; i += 1) await touch('touchMove', [[150 - 10 * i, 500], [250 + 10 * i, 500]]);
  await touch('touchEnd', []);
  await page.waitForTimeout(100);
  const zoom1 = await zoomLabel();
  console.log('zoom', zoom0, '→', zoom1);
  assert.ok(zoom1 > zoom0 * 1.8, 'pinch must zoom');
  // Long-press on empty canvas opens the context menu.
  await touch('touchStart', [[200, 600]]);
  await page.waitForTimeout(650);
  await touch('touchEnd', []);
  await page.getByRole('menu').waitFor({ timeout: 2000 });
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'docs/evidence/touch-probe.png' });
  assert.deepEqual(errors, []);
  console.log('touch probe OK');
} catch (error) {
  await page.screenshot({ path: 'docs/evidence/touch-probe-fail.png' });
  console.log('errors', errors, 'url', page.url());
  throw error;
} finally {
  await browser.close();
}
