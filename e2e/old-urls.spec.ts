import { deflateSync } from 'node:zlib';
import { expect, test } from './test';
import { current, manifest, seedV1, type Json } from './v1Seed';

// Phase 12.5: bookmarks and shared links from v1 still land somewhere real.
// npm run e2e:headed -- e2e/old-urls.spec.ts

test('#/flow/:id opens the imported diagram, even on the first visit @gate', async ({ page }) => {
  await seedV1(page);
  const v1Id = Object.keys(manifest).find((id) => manifest[id] === 'multi-page')!;
  await page.goto(`/#/flow/${v1Id}`);
  await expect(page).toHaveURL(new RegExp(`#/d/v1-${v1Id}$`), { timeout: 20_000 });
  await expect(page.locator('[data-testid="v2-canvas"]')).toBeVisible();
});

test('#/flow/:pageId (v1 put page ids in the URL too) opens the document @gate', async ({ page }) => {
  await seedV1(page);
  const v1Id = Object.keys(manifest).find((id) => manifest[id] === 'multi-page')!;
  const secondPage = current.indexedDb.documents.find((row: Json) => row.id === v1Id).pages[1].id as string;
  await page.goto(`/#/flow/${secondPage}`);
  await expect(page).toHaveURL(new RegExp(`#/d/v1-${v1Id}$`), { timeout: 20_000 });
});

test('#/flow/:id that is not in this browser goes home with a notice @gate', async ({ page }) => {
  await page.goto('/#/flow/doc-from-another-laptop');
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.getByText("That diagram isn't in this browser.")).toBeVisible();
});

test('#/view?flow= shows the old diagram text, copyable @gate', async ({ page, context }) => {
  const dsl = 'flow: "Checkout"\n[start] Cart\n[end] Paid\nCart -> Paid';
  // What v1's encodeDslForViewer wrote: `~` + base64url(pako zlib).
  const flow = `~${deflateSync(Buffer.from(dsl), { level: 9 }).toString('base64url')}`;
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/#/view?flow=${flow}`);
  await expect(page.getByRole('heading', { name: 'Made with the previous editor' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Diagram text' })).toHaveValue(dsl);
  await page.getByRole('button', { name: 'Copy text' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(dsl);
});

test('a /view?flow= link without a hash still reaches the explainer @gate', async ({ page }) => {
  const flow = `~${deflateSync(Buffer.from('flow: "X"\n[start] A')).toString('base64url')}`;
  await page.goto(`/view?flow=${flow}`);
  await expect(page).toHaveURL(/\/#\/view\?flow=~/);
  await expect(page.getByRole('textbox', { name: 'Diagram text' })).toHaveValue('flow: "X"\n[start] A');
});

test('#/docs links still reach the docs site @gate', async ({ page }) => {
  await page.route('https://docs.openflowkit.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>docs</title>' }));
  await page.goto('/#/docs/getting-started');
  await expect(page).toHaveURL('https://docs.openflowkit.com/');
});

test('other v1 screens land on home @gate', async ({ page }) => {
  for (const route of ['/templates', '/settings', '/canvas', '/mcp']) {
    await page.goto(`/#${route}`);
    await expect(page).toHaveURL(/#\/home$/);
    await expect(page.getByTestId('v2-home')).toBeVisible();
  }
});
