// Icons from labels, end to end: generate from text, see the icons land, then
// take them off at each scale a user reaches for — one node, then the diagram —
// and check undo gives back exactly what a removal took.
import { expect, test, type Page } from '@playwright/test';
import { centreOf, doc, openCanvas, rect, state, type V2Node } from './helpers';

const META = process.platform === 'darwin' ? 'Meta' : 'Control';

async function nodeById(page: Page, id: string): Promise<V2Node & { content: Record<string, unknown>; metadata: Record<string, unknown> }> {
  const document = await doc(page);
  return document!.pages[0]!.nodes.find((candidate) => candidate.id === id) as never;
}

test('generated nodes get icons from their labels, and each scale of "no" works', async ({ page }) => {
  await openCanvas(page);
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('flowchart right\nWeb app [tech: React] -> API [tech: Node.js] -> Postgres\nAPI -> Validate input');
  await source.press(`${META}+Enter`);
  await expect.poll(async () => (await state(page)).nodes.length, { timeout: 15_000 }).toBeGreaterThan(3);

  expect((await nodeById(page, 'postgres')).content.icon).toBe('developer/database-postgresql');
  expect((await nodeById(page, 'web-app')).content.icon).toBe('developer/frontend-reactjs');
  expect((await nodeById(page, 'api')).content.icon).toBe('developer/backend-nodejs');
  expect((await nodeById(page, 'validate-input')).content.icon).toBeUndefined();
  await expect(page.getByText('3 icons added from labels.')).toBeVisible();
  await page.getByRole('button', { name: 'Close panel' }).click();

  // One node: right-click → Remove icon, then undo.
  const postgres = await centreOf(page, 'postgres');
  await page.mouse.click(postgres.x, postgres.y);
  await page.mouse.click(postgres.x, postgres.y, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Remove icon' }).click();
  await expect.poll(async () => (await nodeById(page, 'postgres')).content.icon).toBeUndefined();
  expect((await nodeById(page, 'postgres')).kind).toBe('process');
  expect((await nodeById(page, 'postgres')).metadata.dsl).toMatchObject({ icon: 'none' });
  await page.getByTestId('v2-canvas').focus();
  await page.keyboard.press(`${META}+z`);
  await expect.poll(async () => (await nodeById(page, 'postgres')).content.icon).toBe('developer/database-postgresql');

  // The whole diagram: the frame's menu shows the toggle ticked; untick it.
  const frameId = (await doc(page))!.pages[0]!.nodes.find((candidate) => candidate.kind === 'frame')!.id;
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  const frame = (await rect(page, frameId))!;
  await page.mouse.click(box.x + frame.x + frame.width / 2, box.y + frame.y + 12, { button: 'right' });
  const toggle = page.getByRole('menuitemcheckbox', { name: 'Icons from labels' });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect.poll(async () => (await doc(page))!.pages[0]!.nodes.filter((candidate) => (candidate as unknown as { content: { icon?: string } }).content.icon).length).toBe(0);
  expect((await nodeById(page, frameId)).metadata.dsl).toMatchObject({ icons: 'off' });
});
