import { expect, test } from './test';
import { clickNode, doc, state } from './helpers';

async function openC4(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true }).click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page))?.pages.length).toBe(3);
  const panel = page.getByRole('complementary', { name: 'Architecture model' });
  await expect(panel).toBeVisible();
  return panel;
}

test('an element opens as a card that saves as you leave a field, with no Apply @gate', async ({ page }) => {
  test.setTimeout(60_000);
  const panel = await openC4(page);
  await panel.getByRole('treeitem', { name: /^Shop/ }).click();
  const name = panel.getByLabel('Name', { exact: true });
  await expect(name).toHaveValue('Shop');
  await expect(panel.getByRole('button', { name: 'Apply' })).toHaveCount(0);
  await expect(panel.getByText('Software system · ', { exact: false })).toBeVisible();

  // Escape on a dirty field reverts it and leaves the panel open.
  await name.fill('Oops');
  await page.keyboard.press('Escape');
  await expect(name).toHaveValue('Shop');
  await expect(panel).toBeVisible();

  // Enter saves; the whole rename is one undo step.
  await name.fill('Storefront');
  await page.keyboard.press('Enter');
  await expect.poll(async () => JSON.stringify((await doc(page))!.pages[0]!.nodes.map((n) => n.content?.label))).toContain('Storefront');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(name).toHaveValue('Shop');

  // An empty name is not a name.
  await name.fill('');
  await name.blur();
  await expect(name).toHaveValue('Shop');

  // Leaving by the back link keeps what was typed in another field.
  await panel.getByLabel('Technology').fill('Next.js');
  await panel.getByRole('button', { name: 'All elements', exact: true }).click();
  await expect(panel.getByRole('treeitem', { name: /^Shop.*Next\.js/ })).toBeVisible();
});

test('canvas selection opens the card, and All elements clears it @gate', async ({ page }) => {
  test.setTimeout(60_000);
  const panel = await openC4(page);
  await expect(panel.getByRole('tree', { name: 'Model elements' })).toBeVisible();
  const customer = (await doc(page))!.pages[0]!.nodes.find((n) => n.content?.label === 'Customer')!;
  await clickNode(page, customer.id);
  await expect(panel.getByLabel('Name', { exact: true })).toHaveValue('Customer');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual([customer.id]);
  await panel.getByRole('button', { name: 'All elements', exact: true }).click();
  await expect(panel.getByRole('tree', { name: 'Model elements' })).toBeVisible();
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual([]);
});

test('relations split into Talks to and Used by, and removing asks inside the card @gate', async ({ page }) => {
  test.setTimeout(60_000);
  const panel = await openC4(page);
  await panel.getByRole('treeitem', { name: /^API/ }).click();
  await expect(panel.getByRole('list', { name: 'API talks to' })).toContainText('stores orders');
  await expect(panel.getByRole('list', { name: 'API is used by' })).toContainText('submits orders');
  await panel.getByRole('button', { name: 'Inspect Web' }).click();
  await expect(panel.getByLabel('Name', { exact: true })).toHaveValue('Web');
  await panel.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: /Remove from model/ }).click();
  await expect(panel.getByRole('alert')).toContainText('Remove Web from every view?');
  await page.keyboard.press('Escape');
  await expect(panel.getByRole('alert')).toHaveCount(0);
  await expect(panel).toBeVisible();
});

test('Open in Map carries the element across, and the card follows the map selection @gate', async ({ page }) => {
  test.setTimeout(60_000);
  const panel = await openC4(page);
  await panel.getByRole('treeitem', { name: /^Shop/ }).click();
  await panel.getByRole('button', { name: 'Open in Map', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Map', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByLabel('Name', { exact: true })).toHaveValue('Shop');
});

test('Show on canvas from Map selects the element on its page @gate', async ({ page }) => {
  test.setTimeout(60_000);
  const panel = await openC4(page);
  // Open the Shop container page, then into Map: API is placed there, and a Talks-to row leads to it.
  await panel.getByRole('treeitem', { name: /^Shop/ }).click();
  await panel.getByRole('button', { name: 'Open Container view', exact: true }).click();
  await panel.getByRole('button', { name: 'All elements', exact: true }).click();
  await panel.getByRole('treeitem', { name: /^Web/ }).click();
  await panel.getByRole('button', { name: 'Open in Map', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Map', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await panel.getByRole('button', { name: 'Inspect API' }).click();
  await panel.getByRole('button', { name: 'Show on canvas', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Canvas', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByLabel('Name', { exact: true })).toHaveValue('API');
  await expect.poll(async () => {
    const id = (await state(page)).selectedNodes[0];
    return (await doc(page))!.pages.flatMap((p) => p.nodes).find((n) => n.id === id)?.content?.label;
  }).toBe('API');
});
