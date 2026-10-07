import { expect, test } from './test';
import { doc, rect, state } from './helpers';

test('C4 starter, keyboard inspection, focused camera and visual flow authoring @gate', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  const workspace = page.getByRole('toolbar', { name: 'Workspace', exact: true });
  await workspace.getByRole('button', { name: 'Architecture model', exact: true }).click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page))?.pages.length).toBe(3);
  // The three views are the only pages: the empty page it was made on became the first.
  expect((await doc(page))?.pages.every((entry) => entry.nodes.length > 0)).toBe(true);
  // ...and the first view lands fitted, not at 100% off the edge of the screen.
  const landscape = (await doc(page))!.pages[0]!.nodes.find((entry) => entry.kind === 'frame')!;
  await expect.poll(async () => {
    const box = await rect(page, landscape.id);
    const view = page.viewportSize()!;
    return !!box && box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height;
  }).toBe(true);
  await expect(page.getByRole('button', { name: 'Shop architecture', exact: true })).toBeVisible();
  await workspace.getByRole('button', { name: 'Architecture model', exact: true }).click();
  await expect(page.getByLabel('Search architecture')).toBeVisible();
  await page.getByLabel('Search architecture').fill('Go');
  const api = page.locator('.ofk-v2-model-row', { hasText: 'API' });
  await api.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('API');
  await expect(page.getByRole('list', { name: 'Relationships of API' })).toContainText(
    'stores orders'
  );
  await page.getByLabel('Search architecture').fill('');
  await page.getByRole('button', { name: 'Collapse Shop', exact: true }).click();
  await expect(page.locator('.ofk-v2-model-row', { hasText: 'Database' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Expand Shop', exact: true }).click();
  await page.locator('.ofk-v2-model-row', { hasText: 'Shop' }).first().focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Open Container view', exact: true }).click();
  await expect(page.locator('.ofk-v2-breadcrumb-current')).toHaveText('Containers: Shop');
  await page.locator('.ofk-v2-model-row', { hasText: 'Web' }).first().click();
  await expect
    .poll(async () => {
      const id = (await state(page)).selectedNodes[0];
      const box = id ? await rect(page, id) : null;
      const panel = await page
        .getByRole('complementary', { name: 'Architecture model' })
        .boundingBox();
      return (
        !!box &&
        !!panel &&
        box.x >= 64 &&
        box.y >= 64 &&
        box.x + box.width <= panel.x &&
        box.y + box.height <= 1000
      );
    })
    .toBe(true);
  await expect(page.getByRole('button', { name: 'Zoom 140%', exact: true })).toContainText('140%');
  await page.getByRole('tab', { name: /Flows/ }).click();
  await page.getByRole('button', { name: 'Create flow', exact: true }).click();
  const form = page.getByRole('form', { name: 'Create flow' });
  await form.getByLabel('Flow name').fill('Track order');
  await form.getByRole('combobox', { name: 'From', exact: true }).selectOption('shop.web');
  await form.getByRole('combobox', { name: 'To', exact: true }).selectOption('shop.api');
  await form.getByLabel('Message', { exact: true }).fill('Fetch order');
  await form.getByRole('button', { name: 'Save flow' }).click();
  await expect(page.getByRole('button', { name: /^Track order/ }).first()).toBeVisible();
  await page
    .getByRole('button', { name: /^Track order/ })
    .first()
    .click();
  await expect(page.getByRole('region', { name: 'Flow Track order' })).toContainText(
    'Web → API · Fetch order'
  );
  await page.getByRole('button', { name: 'Close flow' }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Track order/ })).toHaveCount(0);
});

test('phone welcome exposes C4 creation and hides keyboard hints', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await expect(page.locator('.ofk-v2-welcome-keys')).toBeHidden();
  const starter = page.getByRole('button', { name: 'C4 architecture workspace', exact: true });
  await expect(starter).toBeVisible();
  const box = (await starter.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
});

test('Generate from the untouched starter draft keeps a view made in the model panel @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  const workspace = page.getByRole('toolbar', { name: 'Workspace', exact: true });
  const modelButton = workspace.getByRole('button', { name: 'Architecture model', exact: true });
  await modelButton.click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page))?.pages.length).toBe(3);
  const modelPanel = page.getByRole('complementary', { name: 'Architecture model' });
  if (!(await modelPanel.isVisible())) await modelButton.click();
  await modelPanel.locator('.ofk-v2-model-row', { hasText: 'API' }).first().click();
  await page.getByRole('button', { name: 'Create Component view', exact: true }).click();
  await expect.poll(async () => (await doc(page))?.pages.length).toBe(4);
  const generate = page.getByRole('button', { name: 'Generate diagram' });
  if (!(await generate.isVisible())) await workspace.getByRole('button', { name: 'Diagram as code' }).click();
  await generate.click();
  await expect(generate).toBeEnabled();
  await expect.poll(async () => (await doc(page))?.pages.length).toBe(4);
  if (!(await modelPanel.isVisible())) await modelButton.click();
  await modelPanel.getByRole('tab', { name: /Views/ }).click();
  await expect(modelPanel.getByRole('list', { name: 'Views' })).toContainText('Component');
});

test('a second model opens on its own landscape, not the first model\'s @gate', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const editor = page.getByRole('textbox', { name: 'Diagram source' });
  const generate = page.getByRole('button', { name: 'Generate diagram' });
  const model = (person: string, system: string) =>
    `architecture\nmodel {\n  person ${person}\n  system ${system}\n  ${person} -> ${system}\n}\n`;
  await editor.fill(model('Alice', 'Shop'));
  await generate.click();
  await expect.poll(async () => (await doc(page))?.pages.length).toBe(1);
  await expect.poll(async () => rect(page, 'alice')).not.toBeNull();
  await editor.fill(model('Bob', 'Bank'));
  await generate.click();
  await expect.poll(async () => (await doc(page))?.pages.length).toBe(2);
  // The canvas draws the open page only: Bob is on screen, Alice is not.
  await expect.poll(async () => rect(page, 'bob')).not.toBeNull();
  expect(await rect(page, 'alice')).toBeNull();
});
