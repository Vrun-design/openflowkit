import { expect, test } from './test';

type V2Api = { getState(): { nodes: string[] } };
const count = (page: import('@playwright/test').Page) => page.evaluate(() =>
  (window as unknown as { __V2__?: V2Api }).__V2__?.getState().nodes.length ?? 0);

test('diagram source generates and regenerates as one undo step', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await expect(source).toBeVisible();
  await source.fill('%% ofk 1\nflowchart\nStart -> Build -> Ship');
  await source.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect.poll(() => count(page)).toBe(4);
  await source.fill('%% ofk 1\nflowchart\nStart -> Test -> Build -> Ship');
  await source.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect.poll(() => count(page)).toBe(5);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => count(page)).toBe(4);
  await expect(page.locator('#v2-code-diagnostics')).toBeHidden();
});

test('code panel reports bad lines and offers attribute completion', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('flowchart\nCache [');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(source).not.toHaveValue('flowchart\nCache [');
  await source.fill('flowchart\nBroken [oops');
  await expect(page.getByText('W101', { exact: true })).toBeVisible();
});
