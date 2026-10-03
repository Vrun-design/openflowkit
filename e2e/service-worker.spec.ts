import { readFileSync } from 'node:fs';
import { expect, test, type Page } from './test';

// Phase 12.6: a browser still running v1's app-shell worker meets v2, and the worker goes.
// npm run e2e:headed -- e2e/service-worker.spec.ts

const V1_WORKER = readFileSync('e2e/fixtures/v1-sw.js', 'utf8'); // main's public/sw.js, verbatim

const registrations = (page: Page) => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
const cacheNames = (page: Page) => page.evaluate(() => caches.keys());

test('v1 service worker unregisters itself and its caches once v2 is served @gate', async ({ page, context }) => {
  // Before the deploy: `/sw.js` is v1's, registered the way v1 did on load.
  await context.route('**/sw.js', (route) => route.fulfill({ contentType: 'text/javascript', body: V1_WORKER }));
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => cacheNames(page)).toContain('openflowkit-app-shell-v1');
  expect(await registrations(page)).toBe(1);

  // The deploy: the server's `/sw.js` is now the kill switch. A navigation makes the
  // browser check for a new worker, as every real visit does.
  await context.unroute('**/sw.js');
  await page.reload();
  await expect.poll(() => registrations(page), { timeout: 15_000 }).toBe(0);
  await expect.poll(() => cacheNames(page)).toEqual([]);
  await expect(page.locator('[data-testid="v2-canvas"]')).toBeVisible();
  // The next visit runs on the network, not under a worker.
  await page.reload();
  expect(await page.evaluate(() => navigator.serviceWorker.controller)).toBeNull();
});
