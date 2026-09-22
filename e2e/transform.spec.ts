// Gap check: resize, rotate and object snapping are pointer-only paths with
// domain tests but no end-to-end proof that the handles are reachable at all.
// npm run e2e:headed -- e2e/transform.spec.ts
import { expect, test } from '@playwright/test';
import { clickNode, drawShape, guidesVisible, node, openCanvas, rect, state } from './helpers';

const canvasBox = async (page: import('@playwright/test').Page) =>
  (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;

test('the south-east handle resizes, and Shift keeps the aspect ratio', async ({ page }) => {
  await openCanvas(page);
  const id = await drawShape(page, 'r', 420, 340);
  await clickNode(page, id);
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual([id]);

  const box = await canvasBox(page);
  const before = (await rect(page, id))!;
  const corner = { x: box.x + before.x + before.width, y: box.y + before.y + before.height };

  await page.mouse.move(corner.x, corner.y);
  await page.mouse.down();
  await page.mouse.move(corner.x + 60, corner.y + 30, { steps: 8 });
  await page.mouse.up();

  await expect.poll(async () => Math.round((await rect(page, id))!.width - before.width)).toBe(60);
  expect(Math.round((await rect(page, id))!.height - before.height)).toBe(30);

  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => Math.round((await rect(page, id))!.width)).toBe(Math.round(before.width));

  // Shift keeps width and height in their original proportion.
  const square = (await rect(page, id))!;
  const ratio = square.width / square.height;
  const corner2 = { x: box.x + square.x + square.width, y: box.y + square.y + square.height };
  // Shift goes down after the grab: held at pointer-down it means "add to
  // selection", so the drag would never start.
  await page.mouse.move(corner2.x, corner2.y);
  await page.mouse.down();
  await page.keyboard.down('Shift');
  await page.mouse.move(corner2.x + 80, corner2.y + 10, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');

  const after = (await rect(page, id))!;
  expect(after.width).toBeGreaterThan(square.width);
  expect(Math.abs(after.width / after.height - ratio)).toBeLessThan(0.02);
});

test('the rotate handle above the selection turns the shape', async ({ page }) => {
  await openCanvas(page);
  const id = await drawShape(page, 'r', 500, 380);
  await clickNode(page, id);
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual([id]);
  expect((await node(page, id)).transform?.rotationRadians ?? 0).toBe(0);

  const box = await canvasBox(page);
  const r = (await rect(page, id))!;
  // PixiTransformOverlay puts it 48 screen px above the top edge, centred.
  const handle = { x: box.x + r.x + r.width / 2, y: box.y + r.y - 48 };
  const centre = { x: box.x + r.x + r.width / 2, y: box.y + r.y + r.height / 2 };

  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  // Swing a quarter turn: from above the centre to the right of it.
  await page.mouse.move(centre.x + (centre.y - handle.y), centre.y, { steps: 12 });
  await page.mouse.up();

  await expect
    .poll(async () => Math.abs((await node(page, id)).transform?.rotationRadians ?? 0))
    .toBeGreaterThan(0.3);

  // One intent, one undo step.
  await page.keyboard.press('ControlOrMeta+z');
  await expect
    .poll(async () => Math.abs((await node(page, id)).transform?.rotationRadians ?? 0))
    .toBeLessThan(0.001);
});

test('dragging near a neighbour snaps and shows a guide; ⌘ drags free', async ({ page }) => {
  await openCanvas(page);
  const anchor = await drawShape(page, 'r', 360, 300);
  const mover = await drawShape(page, 'r', 760, 460);

  const box = await canvasBox(page);
  const anchorRect = (await rect(page, anchor))!;
  const moverRect = (await rect(page, mover))!;
  await clickNode(page, mover);
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual([mover]);

  // Aim the mover's left edge 4 px off the anchor's left edge: inside the 6 px
  // snap threshold, so it should land exactly on it.
  const from = { x: box.x + moverRect.x + moverRect.width / 2, y: box.y + moverRect.y + moverRect.height / 2 };
  const targetLeft = anchorRect.x + 4;
  const to = { x: box.x + targetLeft + moverRect.width / 2, y: from.y };

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  expect(await guidesVisible(page)).toBe(true);
  await page.mouse.up();

  await expect
    .poll(async () => Math.round((await rect(page, mover))!.x))
    .toBe(Math.round(anchorRect.x));
  await expect.poll(async () => guidesVisible(page)).toBe(false);

  // ⌘ held: the drag ignores the neighbour and lands where the pointer says.
  // (The cheatsheet used to call this Alt; Alt resizes from the centre.)
  const free = (await rect(page, mover))!;
  const start = { x: box.x + free.x + free.width / 2, y: box.y + free.y + free.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.keyboard.down('ControlOrMeta');
  await page.mouse.move(start.x + 4, start.y + 120, { steps: 10 });
  expect(await guidesVisible(page)).toBe(false);
  await page.mouse.up();
  await page.keyboard.up('ControlOrMeta');

  await expect.poll(async () => Math.round((await rect(page, mover))!.x - free.x)).toBe(4);
});
