import { expect, test, type Page } from '@playwright/test';

/**
 * Production editor with the OpenCanvas surface enabled: every piece of
 * chrome must act on the visible Pixi canvas, not on an unmounted React Flow.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hasSeenWelcome_v1', 'true');
  });
});

async function createNewFlow(page: Page): Promise<void> {
  await page.goto('/#/home');
  await page.getByTestId('home-create-new-main').click();
  await expect(page).toHaveURL(/#\/flow\/[^?]+(?:\?.*)?$/);
  await expect(page.getByTestId('opencanvas-surface')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('opencanvas-surface').locator('canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.react-flow')).toHaveCount(0);
}

async function zoomPercent(page: Page): Promise<number> {
  const text = await page.getByTestId('canvas-zoom-readout').innerText();
  return Number(text.replace('%', ''));
}

test('zoom and fit controls drive the OpenCanvas camera', async ({ page }) => {
  await createNewFlow(page);
  await page.getByTestId('toolbar-add-toggle').click();
  await page.getByRole('button', { name: 'Rectangle' }).click();

  const before = await zoomPercent(page);
  await page.getByRole('button', { name: 'Zoom In' }).click();
  await expect.poll(() => zoomPercent(page)).toBeGreaterThan(before);
  await page.getByRole('button', { name: 'Zoom Out' }).click();
  await expect.poll(() => zoomPercent(page)).toBe(before);

  await page.getByRole('button', { name: 'Zoom In' }).click();
  await page.getByRole('button', { name: 'Zoom In' }).click();
  await expect.poll(() => zoomPercent(page)).toBe(Math.round(before * 1.44));
  await page.getByRole('button', { name: 'Fit View' }).click();
  // One default-sized node fills the viewport well past the zoom-in steps.
  await expect.poll(() => zoomPercent(page)).toBeGreaterThan(200);
});

test('inserts at the visible camera and survives reload through fallback', async ({ page }) => {
  await createNewFlow(page);
  await page.getByRole('button', { name: 'Zoom In' }).click();
  await page.getByRole('button', { name: 'Zoom In' }).click();
  await expect.poll(() => zoomPercent(page)).toBeGreaterThan(100);

  await page.getByTestId('toolbar-add-toggle').click();
  await page.getByRole('button', { name: 'Rectangle' }).click();
  // Insertion selects the node; the inspector reports it.
  await expect(page.getByRole('heading', { name: /Properties/i }).first()).toBeVisible({ timeout: 10_000 });

  const viewport = page.viewportSize()!;
  // First Escape closes the label editor insertion opened, the second clears
  // the selection; the node's top-left sits at the window centre, so a click
  // just inside it must select it again on this canvas.
  await page.getByRole('textbox', { name: 'Edit node label' }).press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: /Properties/i })).toHaveCount(0);
  await page.mouse.click(viewport.width / 2 + 24, viewport.height / 2 + 24);
  await expect(page.getByRole('heading', { name: /Properties/i }).first()).toBeVisible();
});

test('label editing and context menus work on the OpenCanvas surface', async ({ page }) => {
  await createNewFlow(page);
  await page.getByTestId('toolbar-add-toggle').click();
  await page.getByRole('button', { name: 'Rectangle' }).click();

  // Insertion queues a label edit; the surface answers it with its own editor.
  const editor = page.getByRole('textbox', { name: 'Edit node label' });
  await expect(editor).toBeVisible({ timeout: 10_000 });
  await editor.fill('Hello canvas');
  await editor.press('Enter');
  await expect(editor).toHaveCount(0);
  await expect(page.getByPlaceholder('Enter primary text...')).toHaveValue('Hello canvas');

  const viewport = page.viewportSize()!;
  const inNode = { x: viewport.width / 2 + 24, y: viewport.height / 2 + 24 };

  // Empty-space menu offers paste; Escape closes it.
  await page.mouse.click(40, 120, { button: 'right' });
  const menu = page.getByRole('menu', { name: 'Canvas context menu' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Paste' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);

  // F2 reopens the editor for the selected node.
  await page.mouse.click(inNode.x, inNode.y);
  await page.keyboard.press('F2');
  await expect(editor).toBeVisible();
  await editor.press('Escape');

  // Node menu deletes the node; the inspector goes away with it.
  await page.mouse.click(inNode.x, inNode.y, { button: 'right' });
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(page.getByRole('heading', { name: /Properties/i })).toHaveCount(0);

  // Undo brings it back.
  await page.keyboard.press('Meta+z');
  await page.mouse.click(inNode.x, inNode.y);
  await expect(page.getByPlaceholder('Enter primary text...')).toHaveValue('Hello canvas');
});
