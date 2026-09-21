import { expect, test } from '@playwright/test';

type NodeDebug = { readonly id: string; readonly fill: number };
type V2Api = { getState(): { nodes: string[] }; getNodeDebugSnapshot(): readonly NodeDebug[] | undefined };
const fills = (page: import('@playwright/test').Page) =>
  page.evaluate(() => ((window as unknown as { __V2__?: V2Api }).__V2__?.getNodeDebugSnapshot() ?? []).map((n) => n.fill));
const count = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__?: V2Api }).__V2__?.getState().nodes.length ?? 0);

const BLUE_PASTEL = 0xeff6ff;

// phase-1-style acceptance 1, 11, 12: a palette swatch recolours the shape as
// one undo step, and the next shape inherits the last style.
test('fill swatch recolours the shape, undoes as one step, and sticks to the next shape', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.mouse.click(400, 300);
  await page.keyboard.press('r');
  await page.mouse.click(400, 300);
  await expect.poll(() => count(page)).toBe(1);

  await page.locator('[data-context-bar]').getByRole('button', { name: 'Fill' }).click();
  await page.getByRole('radio', { name: 'Blue', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect.poll(() => fills(page)).toEqual([BLUE_PASTEL]);

  await page.keyboard.press('Meta+z');
  await expect.poll(() => fills(page)).not.toEqual([BLUE_PASTEL]);
  await page.keyboard.press('Meta+Shift+z');
  await expect.poll(() => fills(page)).toEqual([BLUE_PASTEL]);

  await page.keyboard.press('Escape');
  await page.mouse.click(900, 600);
  await page.keyboard.press('r');
  await page.mouse.click(700, 500);
  await expect.poll(() => count(page)).toBe(2);
  await expect.poll(() => fills(page)).toEqual([BLUE_PASTEL, BLUE_PASTEL]);
});

test('right-click selects the shape and opens its menu; ⌘G groups two shapes', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.mouse.click(300, 300);
  await page.keyboard.press('r'); await page.mouse.click(300, 300);
  await page.keyboard.press('Escape'); await page.mouse.click(900, 600);
  await page.keyboard.press('r'); await page.mouse.click(600, 420);
  await page.keyboard.press('Escape'); await page.mouse.click(900, 600);
  await expect.poll(() => count(page)).toBe(2);

  await page.mouse.click(300, 300, { button: 'right' });
  const menu = page.getByRole('menu', { name: 'Canvas actions' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Flip horizontal' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();

  await page.keyboard.down('Shift'); await page.mouse.click(600, 420); await page.keyboard.up('Shift');
  await page.keyboard.press('Meta+g');
  await expect.poll(() => count(page)).toBe(3);
  await page.keyboard.press('Meta+Shift+g');
  await expect.poll(() => count(page)).toBe(2);
});
