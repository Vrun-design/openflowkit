import { expect, test } from './test';

type V2Api = { getState(): { nodes: string[]; save: string } };
const state = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const api = (window as unknown as { __V2__?: V2Api }).__V2__;
    return api ? api.getState() : { nodes: [], save: 'booting' };
  });

test('boots to the canvas, draws a rectangle, and keeps it across reload @gate', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/#\/d\//);
  await expect(page.getByTestId('v2-welcome')).toBeVisible();

  await page.mouse.click(500, 350); // focus the editor so shortcuts land
  await page.keyboard.press('r');
  await page.mouse.click(500, 350);
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);
  await expect.poll(async () => (await state(page)).save).toBe('saved');

  await page.reload();
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);
});
