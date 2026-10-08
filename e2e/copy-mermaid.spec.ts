// Copy as Mermaid: the export panel puts the diagram on the clipboard as Mermaid text and names what it lost.
import { expect, test } from './test';
import { openCanvas, state } from './helpers';

const META = process.platform === 'darwin' ? 'Meta' : 'Control';

test('Copy as Mermaid puts flowchart text on the clipboard @gate', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openCanvas(page);
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('flowchart right\nClient -> API : login\nAPI -> Database');
  await source.press(`${META}+Enter`);
  await expect.poll(async () => (await state(page)).nodes.length, { timeout: 15_000 }).toBeGreaterThan(3);
  await page.getByRole('button', { name: 'Close panel' }).click();

  await page.getByRole('button', { name: 'Canvas menu' }).click();
  await page.getByRole('menuitem', { name: 'Export…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  const copy = dialog.getByRole('button', { name: 'Copy as Mermaid' });
  await expect(copy).toBeEnabled();
  await copy.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('flowchart diagram” as Mermaid.')).toBeVisible();
  await expect(page.getByText(/Not kept: positions/)).toBeVisible();

  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text.startsWith('flowchart')).toBe(true);
  expect(text).toMatch(/client -->\|"login"\| api/);
  expect(text).toMatch(/api --> database/);
});
