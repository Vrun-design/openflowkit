// Slice 1.4 headed check: drag from a side handle quick-creates.
import { expect, test } from '@playwright/test';

type V2Api = {
  getState(): { nodes: string[]; connectors: string[] };
  getNodeRect(id: string): { x: number; y: number; width: number; height: number } | null;
  getDocument(): {
    pages: [{
      nodes: { id: string }[];
      connectors: { id: string; source: { nodeId: string | null; portId: string | null }; target: { nodeId: string | null; portId: string | null } }[];
    }];
  };
};
const state = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getState());
const nodeRect = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate((nodeId: string) => (window as unknown as { __V2__: V2Api }).__V2__.getNodeRect(nodeId), id);
const doc = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getDocument());

test('dragging the right handle 200px quick-creates a bound, labelled node', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByTestId('v2-canvas');
  await canvas.focus();

  const emptyPoint = (x: number, y: number) => page.evaluate(({ px, py }) => {
    const at = (ax: number, ay: number) => {
      const el = document.elementFromPoint(ax, ay);
      return el instanceof HTMLCanvasElement && el.closest('[data-testid="v2-canvas"]')
        ? { x: ax, y: ay } : null;
    };
    return at(px, py) ?? at(px + 60, py) ?? at(px, py + 60) ?? (() => { throw new Error('no empty point'); })();
  }, { px: x, py: y });

  await page.keyboard.press('r');
  const p = await emptyPoint(300, 300);
  await page.mouse.click(p.x, p.y);
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);
  await page.keyboard.press('Escape');

  const first = (await state(page)).nodes[0];
  const rect = (await nodeRect(page, first))!;
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  // Right handle: 22 px outside the bounds, vertically centred (zoom 1).
  const hx = box.x + rect.x + rect.width + 22;
  const hy = box.y + rect.y + rect.height / 2;
  await page.mouse.move(hx, hy);
  await page.mouse.down();
  await page.mouse.move(hx + 200, hy, { steps: 12 });
  await page.mouse.up();

  await expect.poll(async () => (await state(page)).nodes.length).toBe(2);
  expect((await state(page)).connectors).toHaveLength(1);
  const document = await doc(page);
  expect(document.pages[0].connectors).toHaveLength(1);
  const edge = document.pages[0].connectors[0];
  expect(edge.source).toMatchObject({ nodeId: first, portId: null });
  expect(edge.target.portId).toBeNull();
  expect(edge.target.nodeId).not.toBe(first);
  const editor = page.getByRole('textbox', { name: 'Edit node label' });
  await expect(editor).toBeVisible();
  await expect(editor).toBeFocused();
});
