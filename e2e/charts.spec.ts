// Slice 6.8 headed check: insert a bar chart, edit a cell, add a series,
// switch to donut, and undo back to the original — three undos.
import { expect, test } from '@playwright/test';

type V2Api = {
  getState(): { nodes: string[]; tool: string };
  getDocument(): {
    pages: [{ nodes: {
      id: string; kind: string;
      content: {
        chart?: string;
        categories?: string[];
        series?: { name: string; values: number[] }[];
      };
    }[] }];
  };
};
const state = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getState());
const chart = async (page: import('@playwright/test').Page) => {
  const document = await page.evaluate(() =>
    (window as unknown as { __V2__: V2Api }).__V2__.getDocument());
  return document.pages[0].nodes[0]!;
};

test('chart flyout, data panel edits, type switch and three undos', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('v2-canvas').focus();

  await page.getByRole('button', { name: 'Charts' }).click();
  await page.getByRole('option', { name: 'Bar chart' }).click();
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);
  const original = await chart(page);
  expect(original.kind).toBe('chart');
  expect(original.content.chart).toBe('bar');
  const originalValues = original.content.series![0]!.values;

  // The data panel follows the selection: edit April's value.
  const panel = page.getByRole('complementary', { name: 'Chart data' });
  await expect(panel).toBeVisible();
  const april = panel.getByRole('textbox', { name: 'Revenue Apr' });
  await april.fill('42');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await chart(page)).content.series![0]!.values[3]).toBe(42);

  // Add a series: one more column, same row count.
  await panel.getByRole('button', { name: 'Series', exact: true }).click();
  await expect.poll(async () => (await chart(page)).content.series!.length).toBe(2);

  // Switch to donut from the style bar: data survives.
  await page.locator('[data-context-bar]').getByRole('button', { name: 'Chart' }).click();
  await page.getByRole('radio', { name: 'Donut' }).click();
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await chart(page)).content.chart).toBe('donut');
  expect((await chart(page)).content.series!.length).toBe(2);

  // Three undos: back to bar, one series, original April value.
  await page.keyboard.press('Meta+z');
  await expect.poll(async () => (await chart(page)).content.chart).toBe('bar');
  await page.keyboard.press('Meta+z');
  await expect.poll(async () => (await chart(page)).content.series!.length).toBe(1);
  await page.keyboard.press('Meta+z');
  await expect.poll(async () => (await chart(page)).content.series![0]!.values).toEqual(originalValues);
});
