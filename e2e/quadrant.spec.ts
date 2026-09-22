// Slice 6.9 headed check: a quadrant chart from the flyout, a point dragged on
// canvas writes x/y, the panel shows it, and one undo restores the old value.
import { expect, test } from '@playwright/test';

type V2Api = {
  getState(): { nodes: string[] };
  getNodeRect(id: string): { x: number; y: number; width: number; height: number } | null;
  getDocument(): {
    pages: [{ nodes: { id: string; kind: string; content: {
      chart?: string; points?: { label: string; x: number; y: number }[];
    } }[] }];
  };
};
const state = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getState());
const node = async (page: import('@playwright/test').Page) => {
  const document = await page.evaluate(() =>
    (window as unknown as { __V2__: V2Api }).__V2__.getDocument());
  return document.pages[0].nodes[0]!;
};

test('dragging a quadrant point writes x/y and the panel follows', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('v2-canvas').focus();
  await page.getByRole('button', { name: 'Charts' }).click();
  await page.getByRole('option', { name: 'Quadrant' }).click();
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);
  expect((await node(page)).content.chart).toBe('quadrant');
  const before = (await node(page)).content.points![0]!;

  // Grab Feature A (0.32, 0.78) and drag it right and down.
  const rect = (await page.evaluate((id: string) =>
    (window as unknown as { __V2__: V2Api }).__V2__.getNodeRect(id),
  (await state(page)).nodes[0]!))!;
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  const plot = { x: rect.x + 48, y: rect.y + 8, width: rect.width - 86, height: rect.height - 30 };
  const at = (x: number, y: number) => ({
    x: box.x + plot.x + x * plot.width,
    y: box.y + plot.y + (1 - y) * plot.height,
  });
  const grab = at(before.x, before.y);
  const drop = at(0.6, 0.6);
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(drop.x, drop.y, { steps: 12 });
  await page.mouse.up();

  await expect.poll(async () => (await node(page)).content.points![0]!.x).toBeGreaterThan(0.5);
  const moved = (await node(page)).content.points![0]!;
  expect(moved.x).toBeCloseTo(0.6, 1);
  expect(moved.y).toBeCloseTo(0.6, 1);

  // The points panel shows the same numbers.
  const panel = page.getByRole('complementary', { name: 'Quadrant points' });
  await expect(panel).toBeVisible();
  await expect.poll(async () => Number(
    await panel.getByRole('spinbutton', { name: 'Point 1 x' }).inputValue())).toBeCloseTo(0.6, 1);

  // One undo restores the original coordinates.
  await page.keyboard.press('Meta+z');
  await expect.poll(async () => (await node(page)).content.points![0]!.x).toBeCloseTo(before.x, 5);
});
