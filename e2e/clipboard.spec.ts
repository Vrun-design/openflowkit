// Gap check: duplicate, copy/cut/paste, paste style, nudge and lock are on the
// cheatsheet and in the dispatcher, but no end-to-end check proved their effect.
// npm run e2e:headed -- e2e/clipboard.spec.ts
import { expect, test } from './test';
import { clickNode, drawShape, isLocked, node, openCanvas, rect, state } from './helpers';

// Paste prefers the system clipboard when it can read it; granting the
// permission keeps the path deterministic instead of falling back in-memory.
test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
});

test('duplicate, copy/paste and cut each land as one undo step', async ({ page }) => {
  await openCanvas(page);
  const original = await drawShape(page, 'r', 380, 320);
  await clickNode(page, original);
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual([original]);
  const source = (await rect(page, original))!;

  // ⌘D duplicates, selects the copy, and offsets it so it is visible.
  await page.keyboard.press('ControlOrMeta+d');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(2);
  const copyId = (await state(page)).selectedNodes[0]!;
  expect(copyId).not.toBe(original);
  const copyRect = (await rect(page, copyId))!;
  expect(Math.hypot(copyRect.x - source.x, copyRect.y - source.y)).toBeGreaterThan(0);

  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);

  // ⌘C / ⌘V adds one more and selects what was pasted.
  await clickNode(page, original);
  await page.keyboard.press('ControlOrMeta+c');
  await page.keyboard.press('ControlOrMeta+v');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(2);
  const pasted = (await state(page)).selectedNodes;
  expect(pasted).toHaveLength(1);
  expect(pasted[0]).not.toBe(original);

  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);

  // ⌘X removes the shape; the undo brings it back.
  await clickNode(page, original);
  await page.keyboard.press('ControlOrMeta+x');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(0);
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);
});

test('copy style carries the fill to another shape without moving it', async ({ page }) => {
  await openCanvas(page);
  // Both shapes exist before any recolour: a new fill sticks to the next shape
  // drawn, which would hide whether paste-style did anything.
  const source = await drawShape(page, 'r', 340, 300);
  const target = await drawShape(page, 'r', 760, 300);

  await clickNode(page, source);
  await page.locator('[data-context-bar]').getByRole('button', { name: 'Fill' }).click();
  await page.getByRole('radio', { name: 'Blue', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await node(page, source)).appearance?.fill).toBeTruthy();
  const blue = (await node(page, source)).appearance!.fill!;
  expect((await node(page, target)).appearance?.fill).not.toBe(blue);

  await clickNode(page, source);
  await page.keyboard.press('ControlOrMeta+Alt+c');
  await clickNode(page, target);
  const targetBefore = (await rect(page, target))!;
  await page.keyboard.press('ControlOrMeta+Alt+v');

  await expect.poll(async () => (await node(page, target)).appearance?.fill).toBe(blue);
  // Style only: the shape must not move.
  const targetAfter = (await rect(page, target))!;
  expect(Math.round(targetAfter.x)).toBe(Math.round(targetBefore.x));
  expect(Math.round(targetAfter.y)).toBe(Math.round(targetBefore.y));

  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => (await node(page, target)).appearance?.fill).not.toBe(blue);
});

test('arrows nudge 1px, Shift nudges 10px, and a locked shape refuses both', async ({ page }) => {
  await openCanvas(page);
  const id = await drawShape(page, 'r', 420, 340);
  await clickNode(page, id);
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual([id]);

  const start = (await rect(page, id))!;
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Math.round((await rect(page, id))!.x - start.x)).toBe(1);

  await page.keyboard.press('Shift+ArrowRight');
  await expect.poll(async () => Math.round((await rect(page, id))!.x - start.x)).toBe(11);

  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => Math.round((await rect(page, id))!.y - start.y)).toBe(1);

  // ⌘L locks: the same keys now do nothing.
  await page.keyboard.press('ControlOrMeta+l');
  await expect.poll(async () => isLocked(page, id)).toBe(true);
  const locked = (await rect(page, id))!;
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  await page.waitForTimeout(150);
  const after = (await rect(page, id))!;
  expect(Math.round(after.x)).toBe(Math.round(locked.x));
  expect(Math.round(after.y)).toBe(Math.round(locked.y));

  // Unlock and it moves again.
  await page.keyboard.press('ControlOrMeta+l');
  await expect.poll(async () => isLocked(page, id)).toBe(false);
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Math.round((await rect(page, id))!.x - locked.x)).toBe(1);
});
