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

async function addRectangle(page: Page): Promise<void> {
  await page.getByTestId('toolbar-add-toggle').click();
  await page.getByRole('button', { name: 'Rectangle', exact: true })
    .filter({ hasNot: page.locator('[title]') }).last().click();
}

async function zoomPercent(page: Page): Promise<number> {
  const text = await page.getByTestId('canvas-zoom-readout').innerText();
  return Number(text.replace('%', ''));
}

test('zoom and fit controls drive the OpenCanvas camera', async ({ page }) => {
  await createNewFlow(page);
  await addRectangle(page);

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

  await addRectangle(page);
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
  await addRectangle(page);

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

test('drags a connector between two nodes on the OpenCanvas surface', async ({ page }) => {
  await createNewFlow(page);
  const viewport = page.viewportSize()!;
  const center = { x: viewport.width / 2, y: viewport.height / 2 };

  // First node at the camera centre, then pan the camera so the second lands elsewhere.
  await addRectangle(page);
  await page.getByRole('textbox', { name: 'Edit node label' }).fill('A');
  await page.getByRole('textbox', { name: 'Edit node label' }).press('Enter');
  const surface = page.getByTestId('opencanvas-surface');
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 400);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 });
  await page.mouse.up({ button: 'middle' });
  await addRectangle(page);
  await page.getByRole('textbox', { name: 'Edit node label' }).fill('B');
  await page.getByRole('textbox', { name: 'Edit node label' }).press('Enter');

  // B (selected, 120x60) sits at the centre; A is 300px above. Drag from B's
  // top connect handle (22px above its top edge) up into A.
  const handle = { x: center.x + 60, y: center.y - 22 };
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 60, center.y - 150, { steps: 8 });
  await page.mouse.move(center.x + 60, center.y - 270, { steps: 8 });
  await page.mouse.up();

  // Right-click the new connector's midpoint: the edge menu proves it exists.
  // A spans centre-300..centre-240, B starts at the centre: the gap is 240px.
  await page.mouse.click(center.x + 60, center.y - 120, { button: 'right' });
  const menu = page.getByRole('menu', { name: 'Canvas context menu' });
  await expect(menu.getByRole('menuitem', { name: 'Delete Connection' })).toBeVisible();
  await page.keyboard.press('Escape');
});

test('accepts pasted Mermaid and a dropped image on the OpenCanvas surface', async ({ page }) => {
  await createNewFlow(page);
  const surface = page.getByTestId('opencanvas-surface');
  const box = (await surface.boundingBox())!;
  await page.mouse.click(box.x + 200, box.y + 200);

  await page.evaluate(() => {
    const target = document.querySelector('[data-testid="opencanvas-surface"]')!;
    const data = new DataTransfer();
    data.setData('text/plain', 'graph TD\n  A[Start] --> B[Work]\n  B --> C[Done]');
    target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
  });
  // Three imported nodes: the fit control now finds content to fit.
  await page.getByRole('button', { name: 'Fit View' }).click();
  await expect.poll(() => zoomPercent(page)).not.toBe(100);
  await page.mouse.click(box.x + 40, box.y + 40, { button: 'right' });
  await expect(page.getByRole('menu', { name: 'Canvas context menu' })).toBeVisible();
  await page.keyboard.press('Escape');

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  await page.evaluate(async ({ bytes }) => {
    const target = document.querySelector('[data-testid="opencanvas-surface"]')!;
    const file = new File([new Uint8Array(bytes)], 'dot.png', { type: 'image/png' });
    const data = new DataTransfer();
    data.items.add(file);
    target.dispatchEvent(new DragEvent('drop', { dataTransfer: data, bubbles: true, clientX: 300, clientY: 300 }));
  }, { bytes: Array.from(png) });
  // The dropped image becomes a selected node; the inspector opens for it.
  await expect(page.getByRole('heading', { name: /Properties/i }).first()).toBeVisible({ timeout: 10_000 });
});

test('draws a pen stroke that survives reload and the React Flow fallback', async ({ page }) => {
  await createNewFlow(page);
  await addRectangle(page);
  await page.getByRole('textbox', { name: 'Edit node label' }).press('Escape');

  await page.getByRole('button', { name: 'Draw with pen (P)' }).click();
  await expect(page.getByRole('button', { name: 'Draw with pen (P)' })).toHaveAttribute('aria-pressed', 'true');
  const surface = page.getByTestId('opencanvas-surface');
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 160, { steps: 10 });
  await page.mouse.move(box.x + 300, box.y + 120, { steps: 10 });
  await page.mouse.up();
  // Escape disarms the tool; a second Escape clears the selection.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Draw with pen (P)' })).toHaveAttribute('aria-pressed', 'false');

  // Undo removes the stroke, redo restores it (rectangle + stroke = 2 nodes).
  await page.keyboard.press('Meta+z');
  await page.keyboard.press('Meta+Shift+z');
  // Autosave is debounced; give it a moment before the reload below.
  await page.waitForTimeout(1500);

  // Same document without WebGL: React Flow draws the stroke as an SVG node.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (typeof type === 'string' && type.includes('webgl')) return null;
      return (original as (...args: unknown[]) => unknown).call(this, type, ...rest) as never;
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.reload();
  await expect(page.locator('.react-flow')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 30_000 });
  await expect(page.locator('.react-flow__node svg[aria-label="pen"] path')).toHaveCount(1);
});

test('groups, locks, and ungroups nodes through the surface menus', async ({ page }) => {
  await createNewFlow(page);
  const viewport = page.viewportSize()!;
  const center = { x: viewport.width / 2, y: viewport.height / 2 };
  await addRectangle(page);
  await page.getByRole('textbox', { name: 'Edit node label' }).fill('A');
  await page.getByRole('textbox', { name: 'Edit node label' }).press('Enter');
  const surface = page.getByTestId('opencanvas-surface');
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 400);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 });
  await page.mouse.up({ button: 'middle' });
  await addRectangle(page);
  await page.getByRole('textbox', { name: 'Edit node label' }).fill('B');
  await page.getByRole('textbox', { name: 'Edit node label' }).press('Enter');

  // Shift-click A adds it to the selection (B is selected after insertion).
  await page.keyboard.down('Shift');
  await page.mouse.click(center.x + 30, center.y - 270);
  await page.keyboard.up('Shift');
  await page.mouse.click(center.x + 30, center.y + 30, { button: 'right' });
  const menu = page.getByRole('menu', { name: 'Canvas context menu' });
  await menu.getByRole('menuitem', { name: 'Group' }).click();
  // The new section is selected; its inspector shows the section label.
  await expect(page.getByPlaceholder('Enter primary text...')).toHaveValue('Group', { timeout: 10_000 });

  // Lock the section: a drag on a child leaves it where it was.
  await page.mouse.click(center.x + 30, center.y - 100, { button: 'right' });
  await menu.getByRole('menuitem', { name: /Lock/ }).click();
  await page.mouse.move(center.x + 30, center.y + 30);
  await page.mouse.down();
  await page.mouse.move(center.x + 230, center.y + 230, { steps: 6 });
  await page.mouse.up();
  await page.mouse.click(center.x + 30, center.y + 30);
  await expect(page.getByPlaceholder('Enter primary text...')).toHaveValue('B');

  // Unlock through the section menu, then ungroup: the section is gone and
  // the children remain, selected.
  await page.mouse.click(center.x + 30, center.y - 100, { button: 'right' });
  await menu.getByRole('menuitem', { name: /Unlock/ }).click();
  await page.mouse.click(center.x + 30, center.y - 100, { button: 'right' });
  await menu.getByRole('menuitem', { name: 'Ungroup' }).click();
  await expect(page.getByRole('heading', { name: /Bulk edit/i })).toBeVisible();
  await page.mouse.click(center.x + 30, center.y + 30);
  await expect(page.getByPlaceholder('Enter primary text...')).toHaveValue('B');
});
