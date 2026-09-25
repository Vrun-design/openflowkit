import { expect, test } from './test';
import { openCanvas } from './helpers';

test('object actions, page menus and connection states stay usable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('openflowkit-v2-preferences', JSON.stringify({ theme: 'dark' })));
  await page.goto('/');
  await expect(page.getByTestId('v2-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
  await page.mouse.move(430, 230);
  await page.mouse.down();
  await page.mouse.move(580, 320);
  await page.mouse.up();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  const layers = page.getByRole('complementary', { name: 'Layers' });
  await expect(layers.getByText('Default', { exact: true })).toHaveCount(0);
  await expect(layers.locator('.ofk-object-row')).toHaveCount(1);
  await layers.getByRole('button', { name: /^Hide / }).click();
  await expect(layers.locator('.ofk-object-row')).toHaveAttribute('data-hidden', 'true');
  await layers.getByRole('button', { name: /^Show / }).click();
  await layers.getByRole('button', { name: /^Lock / }).click();
  await expect(layers.getByRole('button', { name: /^Unlock / })).toBeVisible();
  await layers.getByRole('button', { name: /^Unlock / }).click();
  await layers.locator('.ofk-object-select').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Duplicate', exact: true }).click();
  await expect(layers.locator('.ofk-object-row')).toHaveCount(2);
  await layers.getByRole('button', { name: /^Actions for/ }).first().click();
  await page.screenshot({ animations: 'disabled', path: '/tmp/ofk-layers-polished.png' });
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
  await expect(layers.locator('.ofk-object-row')).toHaveCount(1);
  await layers.getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: /^Pages/ }).click();
  await page.getByRole('button', { name: 'Add page', exact: true }).click();
  const pages = page.getByRole('dialog', { name: 'Pages', exact: true });
  await expect(pages.locator('[aria-current="page"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Actions for Page 2' }).click();
  await page.getByRole('menuitem', { name: 'Rename', exact: true }).click();
  const rename = page.getByRole('textbox', { name: 'Rename Page 2' });
  await rename.fill('Architecture');
  await rename.press('Enter');
  await expect(pages.getByRole('button', { name: 'Architecture', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Actions for Architecture' }).click();
  await page.getByRole('menuitem', { name: 'Rename', exact: true }).click();
  const cancelledRename = page.getByRole('textbox', { name: 'Rename Architecture' });
  await cancelledRename.fill('Do not save');
  await cancelledRename.press('Escape');
  await expect(pages).toBeVisible();
  await expect(pages.getByRole('button', { name: 'Architecture', exact: true })).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: '/tmp/ofk-pages-polished.png' });
  await page.getByRole('button', { name: 'Close pages' }).click();
  await page.getByRole('toolbar', { name: 'Document', exact: true }).getByRole('button', { name: 'Connect agent', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copy MCP configuration' })).toBeVisible();
  await page.getByText('Connection settings', { exact: true }).click();
  await page.getByLabel('Port', { exact: true }).fill('0');
  await expect(page.getByRole('button', { name: 'Connect', exact: true })).toBeDisabled();
  await page.getByLabel('Port', { exact: true }).fill('43119');
  await page.getByText('Connection settings', { exact: true }).click();
  await page.screenshot({ animations: 'disabled', path: '/tmp/ofk-mcp-polished.png' });
  await page.getByRole('button', { name: 'Close agent connection' }).click();
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open diagram as code' })).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: '/tmp/ofk-model-polished.png' });
  await page.getByRole('button', { name: 'Open diagram as code' }).click();
  await expect(page.getByRole('textbox', { name: 'Diagram source' })).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: '/tmp/ofk-code-polished.png' });
});

test('connected agent stays compact on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('openflowkit-v2-preferences', JSON.stringify({ theme: 'light', agentBridgeEnabled: true })));
  await page.route('http://127.0.0.1:43119/**', async (route) => {
    await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.goto('/');
  await expect(page.locator('[data-bridge-status="connected"]')).toBeVisible();
  await page.locator('[data-bridge-status="connected"]').click();
  const connection = page.getByRole('complementary', { name: 'Connect agent' });
  await expect(connection.getByRole('button', { name: 'Disconnect' })).toBeVisible();
  await expect(connection.locator('input:visible')).toHaveCount(0);
  const bounds = await connection.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ animations: 'disabled', path: '/tmp/ofk-mcp-connected.png' });
  await connection.getByRole('button', { name: 'Disconnect' }).click();
  await expect(connection.getByRole('button', { name: 'Connect', exact: true })).toBeVisible();
});

test('document panels replace each other instead of stacking @gate', async ({ page }) => {
  await openCanvas(page);
  const menu = page.getByRole('button', { name: 'Canvas menu', exact: true });
  for (const name of ['Settings', 'Export']) {
    await menu.click();
    await page.getByRole('menuitem', { name: name === 'Export' ? 'Export…' : name, exact: true }).click();
    await expect(page.getByRole('dialog', { name, exact: true })).toBeVisible();
    await menu.click();
    await expect(page.getByRole('menu', { name: 'Canvas menu', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog', { name, exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
  }
});

test('settings and export remain clear in dark, light and narrow layouts', async ({ page }) => {
  await openCanvas(page);
  const menu = page.getByRole('button', { name: 'Canvas menu', exact: true });
  for (const theme of ['Dark', 'Light']) {
    await menu.click();
    await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
    await settings.getByRole('radio', { name: theme, exact: true }).check();
    await expect(settings.getByRole('region', { name: 'Canvas', exact: true })).toBeVisible();
    await expect(settings.locator('details')).toHaveCount(0);
    await settings.screenshot({ path: `/tmp/ofk-settings-${theme.toLowerCase()}.png` });
    await settings.getByRole('button', { name: 'Done' }).click();
  }
  await page.setViewportSize({ width: 390, height: 600 });
  await menu.click();
  await page.getByRole('menuitem', { name: 'Export…', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Export', exact: true });
  await expect(panel.getByRole('button', { name: 'Download', exact: true })).toBeDisabled();
  await panel.getByRole('radio', { name: 'Transparent', exact: true }).check();
  await expect(panel.getByRole('radio', { name: 'Transparent', exact: true })).toBeChecked();
  const box = await panel.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  // The popover re-clamps on the frame after a format switch settles.
  await expect.poll(async () => {
    const settled = (await panel.boundingBox())!;
    return Math.round(settled.y + settled.height);
  }).toBeLessThanOrEqual(600);
  await panel.screenshot({ path: '/tmp/ofk-export-narrow.png' });
});
