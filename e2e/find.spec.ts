import { doc, rect, state } from './helpers';
import { expect, test } from './test';

test('find on canvas steps through matches and Escape puts the selection back @gate', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('%% ofk 1\nflowchart down\nStart -> Alpha Build -> Beta Build -> Ship');
  await source.press('ControlOrMeta+Enter');
  await expect.poll(async () => (await state(page)).nodes.length).toBeGreaterThan(4);
  const labelOf = async (id: string) =>
    ((await doc(page))!.pages[0]!.nodes.find((node) => node.id === id)!.content ?? {}) as { label?: string };
  const selectedLabel = async () => {
    const { selectedNodes } = await state(page);
    return selectedNodes.length === 1 ? (await labelOf(selectedNodes[0]!)).label : null;
  };

  await page.getByTestId('v2-canvas').focus();
  const before = await state(page);
  await page.keyboard.press('ControlOrMeta+f');
  const find = page.getByRole('searchbox', { name: 'Find on canvas' });
  await expect(find).toBeFocused();
  await find.fill('build');
  await expect(page.getByText('2 found')).toBeVisible();
  await find.press('Enter');
  await expect(page.getByText('1 of 2')).toBeVisible();
  expect(await selectedLabel()).toBe('Alpha Build');
  const onScreen = async () => {
    const [id] = (await state(page)).selectedNodes;
    const box = await rect(page, id!);
    const view = page.viewportSize()!;
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(view.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(view.height);
  };
  await expect.poll(async () => { try { await onScreen(); return true; } catch { return false; } }).toBe(true);
  await find.press('Enter');
  expect(await selectedLabel()).toBe('Beta Build');
  await find.press('Enter');
  expect(await selectedLabel()).toBe('Alpha Build');
  await find.press('Shift+Enter');
  expect(await selectedLabel()).toBe('Beta Build');
  await expect.poll(async () => { try { await onScreen(); return true; } catch { return false; } }).toBe(true);
  await find.fill('zzz');
  await expect(page.getByText('No matches')).toBeVisible();

  await find.press('Escape');
  await expect(find).toBeHidden();
  const after = await state(page);
  expect(after.selectedNodes).toEqual(before.selectedNodes);
  expect(after.revision).toBe(before.revision);

  // The X keeps where the search ended; Escape (above) restores.
  await page.getByTestId('v2-canvas').focus();
  await page.keyboard.press('ControlOrMeta+f');
  await find.fill('alpha');
  await find.press('Enter');
  expect(await selectedLabel()).toBe('Alpha Build');
  await page.getByRole('button', { name: 'Close find' }).click();
  await expect(find).toBeHidden();
  expect(await selectedLabel()).toBe('Alpha Build');
  expect((await state(page)).revision).toBe(before.revision);
});
