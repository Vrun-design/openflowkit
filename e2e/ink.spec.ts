// Slice 6.4 headed check: ink draws at input rate, erases and lassos.
import { expect, test } from '@playwright/test';

type V2Api = {
  getState(): { nodes: string[]; tool: string };
  getNodeRect(id: string): { x: number; y: number; width: number; height: number } | null;
  getDocument(): {
    pages: [{
      nodes: { id: string; kind: string; content: Record<string, unknown> }[];
      connectors: unknown[];
    }];
  };
};
const state = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getState());
const doc = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getDocument());
const nodeRect = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate((nodeId: string) => (window as unknown as { __V2__: V2Api }).__V2__.getNodeRect(nodeId), id);

async function drawStroke(
  page: import('@playwright/test').Page, from: { x: number; y: number }, steps: readonly { x: number; y: number }[]
): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (const step of steps) await page.mouse.move(step.x, step.y, { steps: 6 });
  await page.mouse.up();
}

test('pen draws one smoothed stroke per gesture, eraser removes it, one undo each', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('v2-canvas').focus();

  await page.keyboard.press('p');
  await expect.poll(async () => (await state(page)).tool).toBe('pen');
  await drawStroke(page, { x: 380, y: 300 }, [
    { x: 460, y: 260 }, { x: 560, y: 340 }, { x: 660, y: 280 },
  ]);
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);
  const stroke = (await doc(page)).pages[0].nodes[0]!;
  expect(stroke.kind).toBe('pen');
  const points = stroke.content.points as { x: number; y: number }[];
  // Stored points are simplified, not one per pixel — and still a real path.
  expect(points.length).toBeGreaterThanOrEqual(2);
  expect(points.length).toBeLessThan(60);
  expect(stroke.content.strokeColor).toBe('#334155');
  const rect = (await nodeRect(page, stroke.id))!;
  expect(rect.width).toBeGreaterThan(100);

  // Shift+P is the highlighter: same flow, its own ink.
  await page.keyboard.press('Escape');
  await page.keyboard.press('Shift+P');
  await expect.poll(async () => (await state(page)).tool).toBe('highlighter');
  await drawStroke(page, { x: 400, y: 480 }, [{ x: 620, y: 520 }, { x: 780, y: 470 }]);
  await expect.poll(async () => (await state(page)).nodes.length).toBe(2);
  const highlight = (await doc(page)).pages[0].nodes[1]!;
  expect(highlight.kind).toBe('highlighter');
  expect(highlight.content.strokeColor).toBe('#fde047');

  // Ink panel: recolour the pen stroke; the pick sticks to the next stroke.
  await page.keyboard.press('Escape');
  const penRect = (await nodeRect(page, stroke.id))!;
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  await page.mouse.click(box.x + penRect.x + 4, box.y + penRect.y + penRect.height / 2);
  await expect.poll(async () => (await state(page)).nodes.length).toBe(2);
  await page.locator('[data-context-bar]').getByRole('button', { name: 'Ink' }).click();
  const redSwatch = page.getByRole('radio', { name: 'Red', exact: true });
  await redSwatch.click();
  await page.keyboard.press('Escape');
  await expect(redSwatch).toBeHidden();
  await expect.poll(async () => String((await doc(page)).pages[0].nodes[0]!.content.strokeColor))
    .not.toBe('#334155');

  // Eraser: cross the highlight stroke; it disappears, and one undo brings it back.
  // Escape closes the panel; a second clears the selection and hands focus
  // back to the canvas, so the next tool letter still lands.
  await page.keyboard.press('Escape');
  // Clearing the selection unmounts the bar it lived in: focus must come back
  // to the canvas or the next tool letter is typed into the void.
  await expect.poll(() => page.evaluate(() => document.activeElement?.className ?? ''))
    .toContain('ofk-v2-canvas');
  await page.keyboard.press('x');
  await expect.poll(async () => (await state(page)).tool).toBe('eraser');
  const highlightRect = (await nodeRect(page, highlight.id))!;
  await drawStroke(page, { x: box.x + highlightRect.x + 20, y: box.y + highlightRect.y + highlightRect.height / 2 },
    [{ x: box.x + highlightRect.x + highlightRect.width - 20, y: box.y + highlightRect.y + highlightRect.height / 2 }]);
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);
  await page.keyboard.press('Meta+z');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(2);

  // Lasso: a polygon around nothing selects nothing, one around both strokes
  // selects both. Each drag re-arms: a finished gesture returns to select.
  const selectedCount = () => page.evaluate(() =>
    (window as unknown as { __V2__: { getState(): { selectedNodes: string[] } } })
      .__V2__.getState().selectedNodes.length);
  await page.keyboard.press('Escape');
  await page.keyboard.press('q');
  await expect.poll(async () => (await state(page)).tool).toBe('lasso');
  await drawStroke(page, { x: 200, y: 200 }, [{ x: 300, y: 200 }, { x: 300, y: 260 }, { x: 200, y: 260 }]);
  await expect.poll(selectedCount).toBe(0);
  await page.keyboard.press('q');
  await expect.poll(async () => (await state(page)).tool).toBe('lasso');
  await drawStroke(page, { x: 200, y: 180 },
    [{ x: 900, y: 180 }, { x: 900, y: 620 }, { x: 200, y: 620 }]);
  await expect.poll(selectedCount).toBe(2);
});
