// Slices 6.6–6.7 headed check: the More flyout — frames, tools, wireframe
// widgets, their state from the style bar, and the `wireframe` family.
import { expect, test, type Page } from './test';
import { centreOf, emptyPoint, openCanvas, rect, state } from './helpers';

interface Node {
  id: string;
  kind: string;
  parentId: string | null;
  content: Record<string, unknown>;
  transform: { translation: { x: number; y: number } };
  size: { width: number; height: number };
}
const nodes = (page: Page): Promise<Node[]> => page.evaluate(() =>
  (window as unknown as { __V2__: { getDocument(): { pages: { nodes: Node[] }[] } } }).__V2__.getDocument().pages[0]!.nodes);
const more = (page: Page) => page.getByRole('toolbar', { name: 'Create' }).getByRole('button', { name: 'More', exact: true });
const pick = async (page: Page, name: string) => {
  await more(page).click();
  await page.getByRole('option', { name, exact: true }).click();
};

test('More opens by mouse and keyboard, with frames, tools and wireframe sections @gate', async ({ page }) => {
  await openCanvas(page);
  await more(page).click();
  for (const section of ['Frames', 'Tools', 'Wireframe']) {
    await expect(page.getByRole('group', { name: section })).toBeVisible();
  }
  await expect(page.getByRole('option')).toHaveCount(5 + 4 + 35);
  await page.keyboard.press('Escape');
  await expect(more(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(more(page)).toBeFocused();

  // ⇧S opens it on the first cell; Down crosses from the Frames row into Tools.
  await page.getByTestId('v2-canvas').focus();
  await page.keyboard.press('Shift+S');
  await expect(page.getByRole('option', { name: 'Frame', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'Lasso' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).tool).toBe('lasso');
  await expect(more(page)).toHaveAttribute('aria-pressed', 'true');
});

test('a phone frame collects picked widgets, moves them with it, and undoes step by step @gate', async ({ page }) => {
  await openCanvas(page);
  await pick(page, 'Phone');
  await expect.poll(async () => (await nodes(page)).length).toBe(1);
  const phone = (await nodes(page))[0]!;
  expect(phone.content).toMatchObject({ preset: 'phone', label: 'Phone' });

  // With the frame selected, each widget stacks down its column.
  await pick(page, 'Heading');
  await pick(page, 'Toggle');
  await pick(page, 'Button');
  await expect.poll(async () => (await nodes(page)).length).toBe(4);
  const widgets = (await nodes(page)).filter(({ kind }) => kind === 'widget');
  expect(widgets.map(({ content }) => content.widget)).toEqual(['heading', 'toggle', 'button']);
  expect(widgets.every(({ parentId }) => parentId === phone.id)).toBe(true);
  const ys = widgets.map(({ transform }) => transform.translation.y);
  expect([...ys].sort((a, b) => a - b)).toEqual(ys);

  // Dragging the frame by its body carries the widgets (they are children).
  const from = await centreOf(page, phone.id);
  const grab = { x: from.x, y: from.y + 200 };
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(grab.x + 120, grab.y + 40, { steps: 8 });
  await page.mouse.up();
  const moved = (await nodes(page)).find(({ id }) => id === phone.id)!;
  expect(moved.transform.translation.x - phone.transform.translation.x).toBeGreaterThan(80);
  // Children keep frame-local positions, so they rode along.
  expect((await nodes(page)).filter(({ kind }) => kind === 'widget').map(({ transform }) => transform.translation.y)).toEqual(ys);

  // One undo per intent: the move, then each insert.
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await undo.click();
  await expect.poll(async () => (await nodes(page)).find(({ id }) => id === phone.id)!.transform.translation.x)
    .toBe(phone.transform.translation.x);
  for (const expected of [3, 2, 1, 0]) {
    await undo.click();
    await expect.poll(async () => (await nodes(page)).length).toBe(expected);
  }
});

test('a full phone grows to hold the next pick, and one undo shrinks it back @gate', async ({ page }) => {
  await openCanvas(page);
  await pick(page, 'Phone');
  for (const count of [2, 3, 4]) {
    await pick(page, 'Date picker');
    await expect.poll(async () => (await nodes(page)).length).toBe(count);
  }
  const all = await nodes(page);
  const phone = all.find(({ content }) => content.preset === 'phone')!;
  const last = all.at(-1)!;
  expect(phone.size.height).toBeGreaterThan(740);
  expect(last.transform.translation.y + last.size.height).toBeLessThan(phone.size.height);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await nodes(page)).length).toBe(3);
  expect((await nodes(page)).find(({ id }) => id === phone.id)!.size.height).toBe(740);
});

test('a widget’s state changes from the style bar as one undo step @gate', async ({ page }) => {
  await openCanvas(page);
  await pick(page, 'Toggle');
  await expect.poll(async () => (await nodes(page)).length).toBe(1);
  expect((await nodes(page))[0]!.content.checked).toBe(true);
  await page.getByRole('button', { name: 'State' }).click();
  await page.getByRole('radio', { name: 'Off' }).click();
  await expect.poll(async () => (await nodes(page))[0]!.content.checked).toBe(false);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await nodes(page))[0]!.content.checked).toBe(true);
});

test('a widget edits its label where it draws it; an image has no label to edit @gate', async ({ page }) => {
  await openCanvas(page);
  await pick(page, 'Checkbox');
  await expect.poll(async () => (await nodes(page)).length).toBe(1);
  const checkbox = (await nodes(page))[0]!;
  const at = await centreOf(page, checkbox.id);
  const box = (await rect(page, checkbox.id))!;
  await page.mouse.dblclick(at.x, at.y);
  const editor = page.locator('textarea.pixi-spike__text-editor');
  await expect(editor).toHaveValue('Remember me');
  // Beside the box, left-aligned like the drawn label, not centred over the checkbox.
  const canvas = (await page.getByTestId('v2-canvas').locator('canvas').boundingBox())!;
  expect((await editor.boundingBox())!.x - (canvas.x + box.x)).toBeGreaterThan(16);
  await expect(editor).toHaveCSS('text-align', 'left');
  await editor.fill('Stay signed in');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await nodes(page))[0]!.content.label).toBe('Stay signed in');

  await page.keyboard.press('Escape');
  await pick(page, 'Image');
  await expect.poll(async () => (await nodes(page)).length).toBe(2);
  const image = (await nodes(page))[1]!;
  const imageAt = await centreOf(page, image.id);
  await page.mouse.dblclick(imageAt.x, imageAt.y);
  await page.keyboard.press('Enter');
  await expect(editor).toHaveCount(0);
});

test('the laser points without touching the document; N adds a sticky ready to type @gate', async ({ page }) => {
  await openCanvas(page);
  await page.keyboard.press('k');
  await expect.poll(async () => (await state(page)).tool).toBe('laser');
  const start = await emptyPoint(page, 500, 400);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 200, start.y + 60, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByTestId('v2-laser').locator('path')).toHaveAttribute('d', /^M/);
  expect((await state(page)).nodes).toHaveLength(0);

  await page.keyboard.press('Escape');
  await page.keyboard.press('n');
  await expect.poll(async () => (await nodes(page)).length).toBe(1);
  await page.keyboard.type('Ship it');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await nodes(page))[0]!).toMatchObject({ kind: 'sticky', content: { label: 'Ship it' } });
});

test('Koboyo wireframe text generates screens of widgets from the code panel @gate', async ({ page }) => {
  await openCanvas(page);
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('wireframe\nscreen Login [phone] {\n  heading: Welcome back\n  input: Email\n  button: Sign in [half, primary]\n  button: SSO [half]\n}');
  await source.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect.poll(async () => (await nodes(page)).filter(({ kind }) => kind === 'widget').length).toBe(4);
  const screen = (await nodes(page)).find(({ content }) => content.preset === 'phone')!;
  expect(screen.content.label).toBe('Login');
  expect((await nodes(page)).filter(({ parentId }) => parentId === screen.id)).toHaveLength(4);
  await expect(page.locator('#v2-code-diagnostics')).toBeHidden();
});
