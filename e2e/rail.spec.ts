// Slice 6.1 headed check: the rail's flyouts, their keyboard path, and lock.
import { expect, test } from '@playwright/test';

type V2Api = {
  getState(): { nodes: string[]; connectors: string[]; tool: string };
  getNodeRect(id: string): { x: number; y: number; width: number; height: number } | null;
  getDocument(): {
    pages: [{
      nodes: { id: string; content: Record<string, unknown> }[];
      connectors: { id: string; route: { kind: string }; appearance: Record<string, unknown> }[];
    }];
  };
};
const state = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getState());
const doc = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getDocument());
const nodeRect = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate((nodeId: string) => (window as unknown as { __V2__: V2Api }).__V2__.getNodeRect(nodeId), id);

async function placeShape(page: import('@playwright/test').Page, x: number, y: number): Promise<void> {
  await page.keyboard.press('r');
  await page.mouse.click(x, y);
  await page.keyboard.press('Escape');
}

test('the rail opens flyouts by mouse and keyboard, picks a shape, locks and undoes', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('v2-canvas').focus();

  const shapes = page.getByRole('button', { name: 'Shapes' });
  await expect(shapes).toHaveAttribute('aria-expanded', 'false');

  // Mouse: a click opens the grid (the rail icon never changes), Esc closes,
  // focus returns to the opener, and nothing was armed.
  await shapes.click();
  await expect(shapes).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('option', { name: 'Diamond' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(shapes).toHaveAttribute('aria-expanded', 'false');
  await expect(shapes).toBeFocused();
  expect((await state(page)).tool).toBe('select');

  // Keyboard: ArrowRight opens the grid with focus on the current pick, arrows
  // move between cells, Enter picks.
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('option', { name: 'Diamond' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('option', { name: 'Triangle' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(shapes).toHaveAttribute('aria-expanded', 'false');
  await expect(shapes).toBeFocused();
  await expect.poll(async () => (await state(page)).tool).toBe('shape');

  // The picked variant is what the tool draws.
  await page.mouse.click(420, 330);
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);
  const shapesOnPage = (await doc(page)).pages[0].nodes;
  expect(String(shapesOnPage[0]?.content.shape)).toBe('triangle');

  // Lock is a keyboard action (⌘L) since the rail lost its button, and it undoes.
  const rect = (await nodeRect(page, (await state(page)).nodes[0]))!;
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  await page.mouse.click(box.x + rect.x + rect.width / 2, box.y + rect.y + rect.height / 2);
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);
  await page.keyboard.press('Meta+l');
  await expect.poll(async () => String((await doc(page)).pages[0].nodes[0]?.content.sectionLocked)).toBe('true');
  await page.keyboard.press('Meta+z');
  await expect.poll(async () => String((await doc(page)).pages[0].nodes[0]?.content.sectionLocked)).toBe('undefined');
  await expect(page.getByRole('button', { name: 'Lock' })).toHaveCount(0);
});

test('the connector flyout picks a route kind used by the next connector', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('v2-canvas').focus();
  await placeShape(page, 360, 300);
  await placeShape(page, 760, 300);

  const connector = page.getByRole('button', { name: 'Connector' });
  await connector.click();
  await page.getByRole('option', { name: 'Line' }).click();
  await expect(connector).toHaveAttribute('aria-expanded', 'false');

  const [first, second] = (await state(page)).nodes;
  const rectA = (await nodeRect(page, first!))!;
  const rectB = (await nodeRect(page, second!))!;
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  await page.mouse.move(box.x + rectA.x + rectA.width / 2, box.y + rectA.y + rectA.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + rectB.x + rectB.width / 2, box.y + rectB.y + rectB.height / 2, { steps: 12 });
  await page.mouse.up();

  await expect.poll(async () => (await state(page)).connectors.length).toBe(1);
  const edge = (await doc(page)).pages[0].connectors[0]!;
  expect(edge.route.kind).toBe('direct');
  expect(edge.appearance.markerEnd).toBe('none');
});
