import { expect, test, type Page } from './test';
import { centreOf, doc, openCanvas } from './helpers';

// Map cannot edit the drawing. Every way a reader tries to (double-click, Delete, typing, a drag, right-click) either
// lands where the box can be edited (its card in the model panel) or says why, once per visit, never silently nothing.
// npx playwright test e2e/map-edit-cues.spec.ts

interface MapState { mode: 'canvas' | 'map'; nodes: string[] }
const mapState = (page: Page): Promise<MapState> =>
  page.evaluate(() => (window as unknown as { __V2__: { getMapState(): MapState } }).__V2__.getMapState());
const settled = (page: Page) => expect.poll(() => page.evaluate(() =>
  (window as unknown as { __V2__: { getMapMotion(): { running: boolean } } }).__V2__.getMapMotion().running)).toBe(false);
const switchOf = (page: Page) => page.getByRole('group', { name: 'View mode' });
const panel = (page: Page) => page.getByRole('complementary', { name: 'Architecture model' });
const railModel = (page: Page) => page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true });
const toasts = (page: Page) => page.getByRole('region', { name: 'Notifications' }).locator('.ofk-toast');
const explained = (page: Page) => toasts(page).filter({ hasText: 'Map lays itself out.' });
const nameField = (page: Page) => panel(page).getByLabel('Name', { exact: true });

/** A C4 workspace open in Map with the model panel closed. */
async function openMap(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await railModel(page).click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page).catch(() => null))?.pages.length).toBe(3);
  await railModel(page).click();
  await expect(panel(page)).toHaveCount(0);
  await switchOf(page).getByRole('button', { name: 'Map', exact: true }).click();
  await expect.poll(async () => (await mapState(page)).nodes).toContain('payments');
  await settled(page);
}

test('a double-click on a Map box opens its card with the name ready to type @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openMap(page);
  const at = await centreOf(page, 'payments');
  await page.mouse.dblclick(at.x, at.y);
  const name = nameField(page);
  await expect(name).toHaveValue('Payments');
  await expect(name).toBeFocused();
  // Typing renames the element in the model, and Map draws the new name.
  await name.fill('Billing');
  await name.press('Enter');
  await expect.poll(async () => JSON.stringify((await doc(page))?.pages ?? [])).toContain('Billing');
});

test('Delete, typing and a drag in Map explain once per visit, with a way to edit; nothing in the drawing changes @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openMap(page);
  const before = JSON.stringify(await doc(page));
  const at = await centreOf(page, 'payments');
  await page.mouse.click(at.x, at.y);
  await page.keyboard.press('Delete');
  await expect(explained(page)).toHaveCount(1);
  await page.keyboard.type('rx');
  await expect(explained(page)).toHaveCount(1);
  expect(JSON.stringify(await doc(page))).toBe(before);
  // The toast's way in: the selected box's card, name focused.
  await explained(page).getByRole('button', { name: 'Edit in model', exact: true }).click();
  await expect(nameField(page)).toBeFocused();
  await railModel(page).click();
  // A new visit explains again; a drag from a box moves nothing and draws no marquee.
  await page.keyboard.press('m');
  await page.keyboard.press('m');
  await expect.poll(async () => (await mapState(page)).mode).toBe('map');
  // The first visit's toast times out on its own; the drag must raise a new one.
  await expect(explained(page)).toHaveCount(0, { timeout: 10_000 });
  await settled(page);
  const from = await centreOf(page, 'payments');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 80, from.y + 60, { steps: 6 });
  await page.mouse.up();
  await expect(explained(page)).toHaveCount(1);
  expect(JSON.stringify(await doc(page))).toBe(before);
});

test('right-click in Map offers what Map can do; on Canvas a model element offers Edit in model @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openMap(page);
  const at = await centreOf(page, 'payments');
  await page.mouse.click(at.x, at.y, { button: 'right' });
  const menu = page.getByRole('menu', { name: 'Canvas actions' });
  await expect(menu.getByRole('menuitem', { name: 'Edit in model' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /Edit as drawing/ })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /Remove from model/ })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: /^Cut/ })).toHaveCount(0);
  await menu.getByRole('menuitem', { name: 'Edit in model' }).click();
  await expect(nameField(page)).toHaveValue('Payments');
  await expect(nameField(page)).toBeFocused();
});

test('Map start: starting a model opens the model panel once the model is there @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openCanvas(page);
  await switchOf(page).getByRole('button', { name: 'Map', exact: true }).click();
  await page.getByRole('button', { name: 'Start an architecture model', exact: true }).click();
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).getByRole('tree')).toBeVisible();
});

test('Remove from model (⌘⇧⌫) works in Map, as the panel and the menu offer it, and undoes in one step @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openMap(page);
  const at = await centreOf(page, 'payments');
  await page.mouse.click(at.x, at.y);
  await page.keyboard.press('ControlOrMeta+Shift+Backspace');
  await expect.poll(async () => (await mapState(page)).nodes).not.toContain('payments');
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => (await mapState(page)).nodes).toContain('payments');
});
