import { expect, test } from '@playwright/test';

type Api = { getNodeRect(id: string): DOMRect | null; getDocument(): { pages: Array<{ nodes: Array<{ id: string }> }> } | null };
const api = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const v2 = (window as unknown as { __V2__: Api }).__V2__;
    const id = v2.getDocument()!.pages[0].nodes[0].id;
    return v2.getNodeRect(id)!;
  });

async function pinch(page: import('@playwright/test').Page, dy: number, steps: number): Promise<void> {
  await page.evaluate(({ dy, steps }) => {
    const el = document.querySelector('[data-testid="v2-canvas"] canvas')!;
    for (let i = 0; i < steps; i++) {
      el.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true, cancelable: true, ctrlKey: true, deltaY: dy, clientX: 300, clientY: 300,
      }));
    }
  }, { dy, steps });
}

// The label editor is glued to its node: zooming or typing keeps the text
// centred in the shape instead of leaving it where the previous fit put it.
test('label editor follows the node through zoom', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByTestId('v2-canvas');
  await canvas.focus();
  await page.keyboard.press('r');
  await page.mouse.click(640, 400);
  await page.keyboard.press('Escape');
  await page.mouse.dblclick(640, 400);
  const editor = page.getByRole('textbox', { name: 'Edit node label' });
  await editor.fill('cscxaxaxaxaxax');
  // Each keystroke re-measures; the centring padding must not creep.
  const pad = () => editor.evaluate((el) => getComputedStyle(el).paddingTop);
  const first = await pad();
  await page.keyboard.type('yz');
  expect(await pad()).toBe(first);

  const centred = async () => {
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const node = await api(page);
    const box = (await editor.boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - (node.x + node.width / 2))).toBeLessThan(2);
    expect(Math.abs(box.y + box.height / 2 - (node.y + node.height / 2))).toBeLessThan(2);
    expect(box.height).toBeLessThanOrEqual(node.height + 2);
  };
  await centred();
  await pinch(page, -8, 12);
  await centred();
  await pinch(page, 12, 12);
  await centred();
  await pinch(page, -6, 10);
  await centred();
  await expect(editor).toBeFocused();
});
