import { expect, test } from './test';

type Api = { getDocument(): { pages: Array<{ nodes: Array<{ kind: string; content: Record<string, unknown> }> }> } | null };
const icons = (page: import('@playwright/test').Page) => page.evaluate(() =>
  (window as unknown as { __V2__?: Api }).__V2__?.getDocument()?.pages[0]?.nodes.map((node) => `${node.kind}:${node.content.icon}`) ?? []);

test('icon library inserts an icon node; the style bar swaps its icon as one undo step', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.locator('[data-testid="v2-canvas"]').focus();
  await page.keyboard.press('i');
  const search = page.getByRole('searchbox', { name: 'Search icons' });
  await expect(search).toBeFocused();
  // Cloud vendors live behind the Cloud tab (see V2IconPicker).
  await page.getByRole('tab', { name: 'Cloud', exact: true }).click();
  await page.getByRole('tab', { name: 'AWS', exact: true }).click();
  await search.fill('lambda');
  await page.getByRole('option').first().click();
  await expect.poll(() => icons(page)).toEqual(['architecture:aws/compute-lambda']);

  // The label editor opened on the new node; keep the default label.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Icon', exact: true }).click();
  await page.getByRole('tab', { name: 'Standard' }).click();
  await page.getByRole('searchbox', { name: 'Search icons' }).fill('database');
  await page.getByRole('option').first().click();
  await expect.poll(() => icons(page)).toEqual(['architecture:tabler/database']);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
  await expect.poll(() => icons(page)).toEqual(['architecture:aws/compute-lambda']);
});
