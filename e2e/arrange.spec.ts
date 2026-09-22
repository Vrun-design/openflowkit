// Gap check: align, distribute, flip and z-order are bound in v2Shortcuts and
// drawn in V2ArrangeControls, but nothing proved the document actually moves.
// npm run e2e:headed -- e2e/arrange.spec.ts
import { expect, test } from '@playwright/test';
import { clickNode, drawShape, openCanvas, rect, stackOrder, state } from './helpers';

const lefts = async (page: import('@playwright/test').Page, ids: string[]) =>
  Promise.all(ids.map(async (id) => (await rect(page, id))!.x));

test('align and distribute move the selection, and undo puts it back', async ({ page }) => {
  await openCanvas(page);
  const a = await drawShape(page, 'r', 300, 260);
  const b = await drawShape(page, 'r', 560, 380);
  const c = await drawShape(page, 'r', 820, 300);

  await page.keyboard.press('ControlOrMeta+a');
  await expect.poll(async () => (await state(page)).selectedNodes.length).toBe(3);
  const before = await lefts(page, [a, b, c]);
  expect(new Set(before.map(Math.round)).size).toBe(3); // they start apart

  // Alt + A aligns left: every node shares the leftmost edge.
  await page.keyboard.press('Alt+KeyA');
  await expect
    .poll(async () => new Set((await lefts(page, [a, b, c])).map(Math.round)).size)
    .toBe(1);
  expect(Math.round((await lefts(page, [a, b, c]))[0]!)).toBe(Math.round(Math.min(...before)));

  // One undo step for one intent.
  await page.keyboard.press('ControlOrMeta+z');
  await expect
    .poll(async () => (await lefts(page, [a, b, c])).map(Math.round))
    .toEqual(before.map(Math.round));

  // Alt + W aligns top the same way.
  const tops = async () => Promise.all([a, b, c].map(async (id) => (await rect(page, id))!.y));
  const topsBefore = await tops();
  await page.keyboard.press('Alt+KeyW');
  await expect.poll(async () => new Set((await tops()).map(Math.round)).size).toBe(1);
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => (await tops()).map(Math.round)).toEqual(topsBefore.map(Math.round));

  // Alt + Shift + H distributes horizontally: equal gaps between the three.
  await page.keyboard.press('Alt+Shift+KeyH');
  await expect
    .poll(async () => {
      const boxes = await Promise.all([a, b, c].map(async (id) => (await rect(page, id))!));
      const sorted = boxes.sort((l, r) => l.x - r.x);
      const gap1 = sorted[1]!.x - (sorted[0]!.x + sorted[0]!.width);
      const gap2 = sorted[2]!.x - (sorted[1]!.x + sorted[1]!.width);
      return Math.abs(gap1 - gap2) <= 1;
    })
    .toBe(true);
});

test('z-order shortcuts restack the page, front and back included', async ({ page }) => {
  await openCanvas(page);
  const a = await drawShape(page, 'r', 320, 300);
  const b = await drawShape(page, 'r', 560, 320);
  const c = await drawShape(page, 'r', 800, 340);
  // Stacking is `zIndex`, not array position: last drawn sits in front.
  expect(await stackOrder(page)).toEqual([a, b, c]);

  await clickNode(page, a);
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual([a]);

  // ⌘] steps forward one place, not all the way.
  await page.keyboard.press('ControlOrMeta+BracketRight');
  await expect.poll(async () => stackOrder(page)).toEqual([b, a, c]);

  // ⌘[ steps back again.
  await page.keyboard.press('ControlOrMeta+BracketLeft');
  await expect.poll(async () => stackOrder(page)).toEqual([a, b, c]);

  // Bare ] jumps to the front, [ to the back.
  await page.keyboard.press(']');
  await expect.poll(async () => stackOrder(page)).toEqual([b, c, a]);
  await page.keyboard.press('[');
  await expect.poll(async () => stackOrder(page)).toEqual([a, b, c]);

  // Each of those was one undo step.
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => stackOrder(page)).toEqual([b, c, a]);
});

test('flip mirrors a multi-selection about its own bounds', async ({ page }) => {
  await openCanvas(page);
  // Flip needs none or several selected: with one shape, Shift+H types a label
  // instead (type-to-edit wins on purpose), so this check uses two.
  const a = await drawShape(page, 'r', 320, 300);
  const b = await drawShape(page, 'r', 760, 300);
  await page.keyboard.press('ControlOrMeta+a');
  await expect.poll(async () => (await state(page)).selectedNodes.length).toBe(2);

  const before = await Promise.all([a, b].map(async (id) => (await rect(page, id))!));
  const spanBefore = {
    left: Math.min(...before.map((r) => r.x)),
    right: Math.max(...before.map((r) => r.x + r.width)),
  };

  await page.keyboard.press('Shift+KeyH');
  await expect
    .poll(async () => {
      const after = await Promise.all([a, b].map(async (id) => (await rect(page, id))!));
      // The pair swaps sides; the outer bounds stay put.
      const left = Math.min(...after.map((r) => r.x));
      const right = Math.max(...after.map((r) => r.x + r.width));
      const swapped = Math.round(after[0]!.x) !== Math.round(before[0]!.x);
      return swapped && Math.abs(left - spanBefore.left) <= 1 && Math.abs(right - spanBefore.right) <= 1;
    })
    .toBe(true);

  await page.keyboard.press('ControlOrMeta+z');
  await expect
    .poll(async () => (await rect(page, a))!.x)
    .toBeCloseTo(before[0]!.x, 0);
});
