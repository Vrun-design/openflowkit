// Headed check: a creation tool ghosts its shape under the pointer and the
// click drops the shape at its own size (an actor is tall, a folder is wide).
import { expect, test } from './test';

type V2Api = {
  getState(): { nodes: string[]; tool: string };
  getDocument(): { pages: [{ nodes: { id: string; content: Record<string, unknown>; size: { width: number; height: number } }[] }] };
};
const api = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const v2 = (window as unknown as { __V2__: V2Api }).__V2__;
    return { state: v2.getState(), nodes: v2.getDocument().pages[0].nodes };
  });

test('shape tools ghost under the pointer and drop at the shape size', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('v2-canvas').focus();
  const shapes = page.getByRole('button', { name: 'Shapes' });
  await shapes.click();
  await page.getByRole('option', { name: 'Actor' }).click();
  await expect.poll(async () => (await api(page)).state.tool).toBe('shape');

  await page.mouse.move(500, 400);
  await page.screenshot({ path: 'test-results/placement-ghost-actor.png' });
  await page.mouse.click(500, 400);
  await expect.poll(async () => (await api(page)).nodes.length).toBe(1);
  const [actor] = (await api(page)).nodes;
  expect(actor.content.shape).toBe('actor');
  expect(actor.size).toEqual({ width: 112, height: 136 });

  await shapes.click();
  await page.getByRole('option', { name: 'Folder' }).click();
  await page.mouse.move(800, 400);
  await page.screenshot({ path: 'test-results/placement-ghost-folder.png' });
  await page.mouse.click(800, 400);
  await expect.poll(async () => (await api(page)).nodes.length).toBe(2);
  const folder = (await api(page)).nodes[1];
  expect(folder.content.shape).toBe('folder');
  expect(folder.size).toEqual({ width: 168, height: 120 });
  await page.screenshot({ path: 'test-results/placement-ghost-placed.png' });
});
