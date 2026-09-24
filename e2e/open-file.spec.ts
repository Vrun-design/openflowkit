import { expect, test } from './test';

// Canvas menu → Open file…: a V1 JSON file lands as a new document.
// npm run e2e:headed -- e2e/open-file.spec.ts

const V1_FILE = {
  name: 'Imported from V1',
  nodes: [
    { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } },
    { id: 'b', type: 'process', position: { x: 240, y: 0 }, data: { label: 'B' } },
  ],
  edges: [{ id: 'e1', source: 'a', target: 'b' }],
};

test('opening a V1 JSON file creates and shows a new document', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="v2-canvas"]')).toBeVisible();
  const before = page.url();

  await page.getByRole('button', { name: 'Canvas menu' }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('menuitem', { name: 'Open file…' }).click();
  await (await chooser).setFiles({ name: 'old.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(V1_FILE)) });

  await expect.poll(() => page.url()).not.toBe(before);
  await expect(page.getByText('Imported from V1')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const api = (window as unknown as { __V2__?: { getDocument(): { pages: { nodes: unknown[]; connectors: unknown[] }[] } | null } }).__V2__;
    const document = api?.getDocument?.();
    return document ? [document.pages[0]?.nodes.length, document.pages[0]?.connectors.length] : null;
  })).toEqual([2, 1]);
});
