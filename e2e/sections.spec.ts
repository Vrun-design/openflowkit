import { expect, test } from '@playwright/test';

type NodeShape = { id: string; kind: string; parentId: string | null; size: { width: number; height: number }; transform: { translation: { x: number; y: number }; scale: { x: number } } };
type Api = { getDocument(): { pages: Array<{ nodes: NodeShape[] }> } | null; getNodeRect(id: string): DOMRect | null };
const nodes = (page: import('@playwright/test').Page) => page.evaluate(() =>
  (window as unknown as { __V2__?: Api }).__V2__?.getDocument()?.pages[0]?.nodes ?? []);
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

test('wrap in section pads the selection, resizes without scaling members; ⌘G stays invisible', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('[data-testid="v2-canvas"]');
  await canvas.waitFor();
  for (const x of [400, 700]) {
    await canvas.focus(); await page.keyboard.press('r'); await page.mouse.click(x, 400); await page.keyboard.press('Escape');
  }
  await canvas.focus();
  await page.keyboard.press(`${mod}+a`);
  await page.keyboard.press(`${mod}+Alt+g`);
  const section = (await nodes(page)).find((node) => node.kind === 'section');
  expect(section).toBeTruthy();
  expect((await nodes(page)).filter((node) => node.parentId === section!.id)).toHaveLength(2);

  const screenRect = (id: string) => page.evaluate((nodeId) => (window as unknown as { __V2__: Api }).__V2__.getNodeRect(nodeId), id);
  const memberIds = (await nodes(page)).filter((node) => node.parentId === section!.id).map((node) => node.id);
  const memberRectsBefore = await Promise.all(memberIds.map(screenRect));
  const rect = await screenRect(section!.id);
  await page.mouse.click(rect!.x + 40, rect!.y + 20);
  await page.mouse.move(rect!.x, rect!.y);
  await page.mouse.down();
  await page.mouse.move(rect!.x - 80, rect!.y - 80, { steps: 8 });
  await page.mouse.up();
  const after = await nodes(page);
  const resized = after.find((node) => node.id === section!.id)!;
  expect(resized.size.width).toBeGreaterThan(section!.size.width + 60);
  expect(resized.transform.scale.x).toBe(1);
  // Members keep their screen position and size: the section grew around them.
  for (const [index, id] of memberIds.entries()) {
    const now = await screenRect(id);
    expect(now!.x).toBeCloseTo(memberRectsBefore[index]!.x, 0);
    expect(now!.width).toBeCloseTo(memberRectsBefore[index]!.width, 0);
    expect(after.find((node) => node.id === id)!.transform.scale.x).toBe(1);
  }

  // Drag the section: it moves with its members. Drag a member far out: it leaves.
  const sectionBefore = await screenRect(section!.id);
  await page.mouse.click(sectionBefore!.x + 40, sectionBefore!.y + 20);
  await page.mouse.move(sectionBefore!.x + 40, sectionBefore!.y + 20);
  await page.mouse.down();
  await page.mouse.move(sectionBefore!.x + 140, sectionBefore!.y + 120, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await screenRect(section!.id))!.x).toBeGreaterThan(sectionBefore!.x + 80);
  await page.keyboard.press('Escape');
  const memberRect = await screenRect(memberIds[0]);
  await page.mouse.click(memberRect!.x + 30, memberRect!.y + 30);
  await page.mouse.move(memberRect!.x + 30, memberRect!.y + 30);
  await page.mouse.down();
  await page.mouse.move(memberRect!.x + 30, memberRect!.y + 170, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await nodes(page)).find((node) => node.id === memberIds[0])!.parentId).toBeNull();
  // …and back in.
  const outRect = await screenRect(memberIds[0]);
  const sectionNow = await screenRect(section!.id);
  await page.mouse.click(outRect!.x + 30, outRect!.y + 30);
  await page.mouse.move(outRect!.x + 30, outRect!.y + 30);
  await page.mouse.down();
  await page.mouse.move(sectionNow!.x + 120, sectionNow!.y + 120, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await nodes(page)).find((node) => node.id === memberIds[0])!.parentId).toBe(section!.id);

  const sectionRect = await screenRect(section!.id);
  await page.mouse.click(sectionRect!.x + 40, sectionRect!.y + 20);
  await page.keyboard.press(`${mod}+Shift+g`);
  await expect.poll(async () => (await nodes(page)).some((node) => node.kind === 'section')).toBe(false);
  await page.keyboard.press(`${mod}+a`);
  await page.keyboard.press(`${mod}+g`);
  expect((await nodes(page)).some((node) => node.kind === 'group')).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.locator('textarea.pixi-spike__text-editor')).toHaveCount(0);
});
