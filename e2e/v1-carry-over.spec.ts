import { readFileSync } from 'node:fs';
import { expect, test } from './test';
import { current, fallback, seedV1, tabs } from './v1Seed';

// Phase 12.7: the v1 key comes along, the v1 backup downloads from the canvas menu,
// and that file opens in another browser as every diagram.
// npm run e2e:headed -- e2e/v1-carry-over.spec.ts

const v1Count = current.indexedDb.documents.length + JSON.parse(fallback.localStorage['openflowkit-documents-fallback']).length + tabs.length;

test('v1 BYOK key carries over once into an empty v2 slot @gate', async ({ page }) => {
  await seedV1(page);
  // v1's own masking, in this browser (the seed is origin + user agent).
  // Where v1's local-first runtime kept it: the whole settings object, key included, in IndexedDB.
  await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((resolve) => { const request = indexedDB.open('openflowkit-persistence'); request.onsuccess = () => resolve(request.result); });
    const tx = db.transaction('aiSettingsPersistent', 'readwrite');
    tx.objectStore('aiSettingsPersistent').put({ id: 'default', value: JSON.stringify({ provider: 'openai', storageMode: 'local', apiKey: 'sk-e2e-1234567', model: 'gpt-4.1', customHeaders: [] }) });
    await new Promise((resolve) => { tx.oncomplete = resolve; });
    db.close();
  });
  await page.goto('/');
  await expect(page.locator('[data-testid="v2-canvas"]')).toBeVisible();
  const v2Ai = () => page.evaluate(() => JSON.parse(localStorage.getItem('openflowkit-v2-ai') ?? 'null'));
  await expect.poll(v2Ai).toMatchObject({ provider: 'openai', connections: { openai: { apiKey: 'sk-e2e-1234567', model: 'gpt-4.1' } } });
  // Removed in v2, it stays removed.
  await page.evaluate(() => localStorage.setItem('openflowkit-v2-ai', JSON.stringify({ provider: 'openai', connections: {} })));
  expect(await page.evaluate(() => localStorage.getItem('ofk.v1AiCarried'))).not.toBeNull();
  await page.reload();
  await expect(page.locator('[data-testid="v2-canvas"]')).toBeVisible();
  await page.waitForTimeout(1000);
  expect(await v2Ai()).toEqual({ provider: 'openai', connections: {} });
});

test('download the v1 backup, open it in another browser @gate', async ({ page, browser }) => {
  await seedV1(page);
  await page.goto('/');
  await expect(page.locator('[data-testid="v2-canvas"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ofk.v1Import')), { timeout: 20_000 }).not.toBeNull();
  await page.reload(); // the menu offers the backup once the import has found v1 diagrams
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Download v1 backup' }).click();
  const file = await (await download).path();
  const backup = JSON.parse(readFileSync(file, 'utf8'));
  expect([backup.format, backup.version, backup.documents.length]).toEqual(['openflowkit-v1-backup', 1, v1Count]);

  // Another browser: no v1 data at all, only the file.
  const other = await (await browser.newContext()).newPage();
  await other.goto('/');
  await expect(other.locator('[data-testid="v2-canvas"]')).toBeVisible();
  await other.getByRole('button', { name: 'Canvas menu' }).click();
  const chooser = other.waitForEvent('filechooser');
  await other.getByRole('menuitem', { name: 'Open file…' }).click();
  await (await chooser).setFiles(file);
  await expect(other.getByText(`Opened ${v1Count} diagrams from the backup.`)).toBeVisible({ timeout: 30_000 });
  await expect(other.getByRole('list', { name: 'Diagrams' }).getByRole('listitem')).toHaveCount(v1Count);
  await other.context().close();
});
