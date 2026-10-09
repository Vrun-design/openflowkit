import { expect, test } from './test';
import { doc } from './helpers';

type Api = { __V2__: { getMapState(): { nodes: string[] } } };

const elementIds = async (page: import('@playwright/test').Page): Promise<string[]> =>
  page.evaluate(() => {
    const document = (window as unknown as { __V2__: { getDocument(): { pages: { nodes: { metadata: { dsl?: { arch?: { model?: { elements: { id: string }[] } } } } }[] }[] } } }).__V2__.getDocument();
    const models = document.pages.flatMap((entry) => entry.nodes.flatMap((node) => node.metadata.dsl?.arch?.model ?? []));
    return models[0]?.elements.map((element) => element.id) ?? [];
  });

test('Model panel adds an element and a child, one undo each, and Map shows it @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  const workspace = page.getByRole('toolbar', { name: 'Workspace', exact: true });
  await workspace.getByRole('button', { name: 'Architecture model', exact: true }).click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page))?.pages.length).toBe(3);
  await expect(page.getByRole('complementary', { name: 'Architecture model' })).toBeVisible();

  await page.getByRole('button', { name: 'Add element', exact: true }).click();
  const name = page.getByLabel('Name', { exact: true });
  await expect(name).toBeFocused();
  await page.keyboard.type('Billing');
  await page.keyboard.press('Enter');
  expect(await elementIds(page)).toContain('new-system');
  const row = (label: string) => page.getByRole('treeitem', { name: new RegExp(`^${label}`) });
  const outline = () => page.getByRole('button', { name: 'All elements', exact: true }).click();
  await outline();
  await expect(row('Billing')).toHaveCount(1);

  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const redo = page.getByRole('button', { name: 'Redo', exact: true });
  await undo.click(); // the rename
  await expect(row('Billing')).toHaveCount(0);
  await undo.click(); // the add: one step
  await expect.poll(() => elementIds(page)).not.toContain('new-system');
  await redo.click();
  await expect.poll(() => elementIds(page)).toContain('new-system');
  await redo.click();
  await expect(row('Billing')).toHaveCount(1);

  await row('Shop').first().click();
  await page.getByRole('button', { name: 'Add inside', exact: true }).click();
  await expect(name).toBeFocused();
  await expect.poll(() => elementIds(page)).toContain('shop.new-container');
  await outline();
  await row('Customer').first().click();
  await expect(page.getByRole('button', { name: 'Add inside', exact: true })).toBeDisabled();

  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Api).__V2__.getMapState().nodes)).toContain('new-system');
});
