// Headed: a handle on a shape inside a diagram frame quick-creates beside it, in that frame;
// a handle dragged to empty canvas lands the new shape where it was released (FigJam, Miro).
import { rect, state } from './helpers';
import { expect, test } from './test';

const parentOf = (page: import('@playwright/test').Page, id: string) => page.evaluate((nodeId) =>
  (window as unknown as { __V2__: { getDocument(): { pages: { nodes: { id: string; parentId: string | null }[] }[] } } })
    .__V2__.getDocument().pages[0]!.nodes.find((node) => node.id === nodeId)?.parentId ?? null, id);

test('quick-create from a shape in a template frame lands beside it, and a drag lands where released @gate', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByTestId('v2-welcome').getByRole('button', { name: 'User authentication' }).click();
  await expect.poll(async () => (await state(page)).nodes).toContain('login');
  await page.keyboard.press('Escape');
  await page.mouse.click(1300, 860);
  const canvas = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;

  // Click the right-side handle of Login.
  const login = (await rect(page, 'login'))!;
  const handle = { x: canvas.x + login.x + login.width + 22, y: canvas.y + login.y + login.height / 2 };
  await page.mouse.move(canvas.x + login.x + login.width / 2, handle.y);
  await page.mouse.move(handle.x, handle.y, { steps: 5 });
  const before = (await state(page)).nodes.length;
  await page.mouse.click(handle.x, handle.y);
  await expect.poll(async () => (await state(page)).nodes.length).toBe(before + 1);
  const beside = (await state(page)).nodes.at(-1)!;
  expect(await parentOf(page, beside)).toBe('dsl-2blysz');
  const placed = (await rect(page, beside))!;
  expect(Math.abs(placed.y - login.y)).toBeLessThan(1);
  expect(placed.x).toBeGreaterThan(login.x + login.width);
  await page.keyboard.type('Retry');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');

  // Drag Token's bottom handle well below the frame and release on empty canvas.
  await page.mouse.click(1300, 860);
  const token = (await rect(page, 'token'))!;
  const from = { x: canvas.x + token.x + token.width / 2, y: canvas.y + token.y + token.height + 22 };
  const drop = { x: canvas.x + token.x + token.width / 2 + 320, y: canvas.y + token.y + 60 };
  await page.mouse.move(from.x, from.y - 30);
  await page.mouse.move(from.x, from.y, { steps: 5 });
  await page.mouse.down();
  await page.mouse.move(drop.x, drop.y, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).nodes.length).toBe(before + 2);
  const dropped = (await rect(page, (await state(page)).nodes.at(-1)!))!;
  expect(Math.abs(canvas.x + dropped.x + dropped.width / 2 - drop.x)).toBeLessThan(2);
  expect(Math.abs(canvas.y + dropped.y + dropped.height / 2 - drop.y)).toBeLessThan(2);
});
