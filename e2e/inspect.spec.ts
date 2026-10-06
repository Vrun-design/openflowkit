// Headed: Inspect opens from the right-click menu, the selection bar and ⌥I,
// shows what the selection is made of, follows a connection, and jumps to code.
import { centreOf, clickNode, state } from './helpers';
import { expect, test } from './test';

test('Inspect shows a node, follows its connections and opens its code @gate', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByTestId('v2-welcome').getByRole('button', { name: 'User authentication' }).click();
  await expect.poll(async () => (await state(page)).nodes).toContain('login');

  const inspect = page.getByRole('complementary', { name: 'Inspect' });
  const at = await centreOf(page, 'login');
  await page.mouse.click(at.x, at.y, { button: 'right' });
  await page.getByRole('menuitem', { name: /^Inspect/ }).click();
  await expect(inspect.getByRole('heading', { name: 'Login' })).toBeVisible();
  await expect(inspect.getByRole('region', { name: 'Style' })).toContainText('#eff6ff');
  await expect(inspect.getByRole('region', { name: 'Code' })).toContainText('-> Login [rounded, blue]');
  const connections = inspect.getByRole('region', { name: 'Connections' });
  await expect(connections).toContainText('Start');

  // A connection selects the node at its other end; the panel follows.
  await connections.getByRole('button', { name: /Valid\?/ }).click();
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['valid']);
  await expect(inspect.getByRole('heading', { name: 'Valid?' })).toBeVisible();

  // ⌥I closes and reopens it; the selection bar opens it too.
  await page.keyboard.press('Alt+KeyI');
  await expect(inspect).toBeHidden();
  // Following the connection glided the camera; click Login only once it stops moving.
  let last = '';
  await expect.poll(async () => {
    const now = JSON.stringify(await centreOf(page, 'login'));
    const settled = now === last;
    last = now;
    return settled;
  }, { intervals: [150] }).toBe(true);
  await clickNode(page, 'login');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['login']);
  await page.getByRole('toolbar', { name: 'Selection actions' }).getByRole('button', { name: 'Inspect' }).click();
  await expect(inspect.getByRole('heading', { name: 'Login' })).toBeVisible();

  await inspect.getByRole('button', { name: 'Show in code' }).click();
  await expect(inspect).toBeHidden();
  await expect(page.getByRole('textbox', { name: 'Diagram source' })).toHaveValue(/Login \[rounded, blue\]/);
});
