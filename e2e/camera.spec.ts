// Slice 1.2 headed check: pinch stays anchored, shortcuts rebind, wheel modes.
import { expect, test } from '@playwright/test';

type V2Api = {
  getState(): { nodes: string[]; revision: number };
  getNodeRect(id: string): { x: number; y: number; width: number; height: number } | null;
};
const state = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getState());
const rect = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate((nodeId: string) => (window as unknown as { __V2__: V2Api }).__V2__.getNodeRect(nodeId), id);

async function wheel(
  page: import('@playwright/test').Page,
  init: { dx?: number; dy?: number; mode?: number; ctrl?: boolean; x: number; y: number },
  steps = 1
): Promise<void> {
  await page.evaluate(
    ({ dx, dy, mode, ctrl, x, y, n }) => {
      const el = document.querySelector('[data-testid="v2-canvas"] canvas');
      if (!el) throw new Error('canvas missing');
      for (let i = 0; i < n; i++) {
        el.dispatchEvent(
          new WheelEvent('wheel', {
            bubbles: true, cancelable: true, ctrlKey: ctrl,
            deltaX: dx, deltaY: dy, deltaMode: mode, clientX: x, clientY: y,
          })
        );
      }
    },
    { dx: init.dx ?? 0, dy: init.dy ?? 0, mode: init.mode ?? 0, ctrl: init.ctrl ?? false, x: init.x, y: init.y, n: steps }
  );
}

test('camera stays anchored and answers its shortcuts', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByTestId('v2-canvas');
  await canvas.focus();

  // The canvas fills the viewport behind the chrome: only click where
  // elementFromPoint sees the canvas, never a floating control.
  const emptyPoint = (x: number, y: number) => page.evaluate(({ px, py }) => {
    const at = (ax: number, ay: number) => {
      const el = document.elementFromPoint(ax, ay);
      return el instanceof HTMLCanvasElement && el.closest('[data-testid="v2-canvas"]')
        ? { x: ax, y: ay } : null;
    };
    const direct = at(px, py);
    if (direct) return direct;
    for (const [dx, dy] of [[60, 0], [-60, 0], [0, 60], [0, -60], [120, 0], [0, 120], [300, 100], [500, 200]]) {
      const found = at(px + dx, py + dy);
      if (found) return found;
    }
    throw new Error('no empty canvas point');
  }, { px: x, py: y });

  await page.keyboard.press('r');
  const p1 = await emptyPoint(300, 300);
  await page.mouse.click(p1.x, p1.y);
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);
  await page.keyboard.press('Escape');
  const id = (await state(page)).nodes[0];
  const rev0 = (await state(page)).revision;

  // Pinch 20× on the node centre: it must stay under the pointer (≤ 1 px).
  const first = (await rect(page, id))!;
  const cx = first.x + first.width / 2;
  const cy = first.y + first.height / 2;
  const canvasBox = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  await wheel(page, { dy: -4, ctrl: true, x: canvasBox.x + cx, y: canvasBox.y + cy }, 20);
  await page.waitForTimeout(300);
  const zoomed = (await rect(page, id))!;
  const drift = Math.hypot(zoomed.x + zoomed.width / 2 - cx, zoomed.y + zoomed.height / 2 - cy);
  expect(drift).toBeLessThanOrEqual(1);
  expect((await state(page)).revision).toBe(rev0);

  // ⌘1 resets to 100 % after a pinch.
  await page.keyboard.press('ControlOrMeta+1');
  await expect(page.getByRole('button', { name: 'Zoom 100%', exact: true })).toBeVisible();
  expect((await state(page)).revision).toBe(rev0);

  // Wheel modes: 3 lines pan 48 px, 40 px pans 40 px.
  const r0 = (await rect(page, id))!;
  await wheel(page, { dy: 3, mode: 1, x: canvasBox.x + 640, y: canvasBox.y + 360 });
  await page.waitForTimeout(200);
  const r1 = (await rect(page, id))!;
  expect(Math.hypot(r1.x - r0.x, r1.y - r0.y)).toBeGreaterThan(47);
  expect(Math.hypot(r1.x - r0.x, r1.y - r0.y)).toBeLessThan(49);
  await wheel(page, { dy: 40, mode: 0, x: canvasBox.x + 640, y: canvasBox.y + 360 });
  await page.waitForTimeout(200);
  const r2 = (await rect(page, id))!;
  expect(Math.hypot(r2.x - r1.x, r2.y - r1.y)).toBeGreaterThan(39);
  expect(Math.hypot(r2.x - r1.x, r2.y - r1.y)).toBeLessThan(41);
  expect((await state(page)).revision).toBe(rev0);

  // ⌘0 fits: a far second node lands inside the canvas afterwards.
  await page.keyboard.press('r');
  const p2 = await emptyPoint(900, 500);
  await page.mouse.click(p2.x, p2.y);
  await expect.poll(async () => (await state(page)).nodes.length).toBe(2);
  await page.keyboard.press('Escape');
  await page.keyboard.press('ControlOrMeta+0');
  await page.waitForTimeout(300);
  for (const nodeId of (await state(page)).nodes) {
    const r = (await rect(page, nodeId))!;
    expect(r.x).toBeGreaterThanOrEqual(-1);
    expect(r.y).toBeGreaterThanOrEqual(-1);
    expect(r.x + r.width).toBeLessThanOrEqual(canvasBox.width + 1);
    expect(r.y + r.height).toBeLessThanOrEqual(canvasBox.height + 1);
  }
});
