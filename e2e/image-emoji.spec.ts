// Slice 6.5 headed check: image insert (picker + drop), emoji search + insert.
import { expect, test } from './test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type V2Api = {
  getState(): { nodes: string[]; tool: string; save: string };
  getDocument(): {
    pages: [{ nodes: {
      id: string; kind: string;
      content: Record<string, unknown>; appearance: Record<string, unknown>;
    }[] }];
  };
};
// The reload boots the app again: read defensively until __V2__ is up.
const state = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    (window as unknown as { __V2__?: V2Api }).__V2__?.getState() ?? { nodes: [], tool: '', save: 'booting' });
const doc = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getDocument());

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII=';

test('emoji search inserts a glyph and undo removes it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await page.getByTestId('v2-canvas').focus();
  // Emoji live in the icon library: E opens it straight on the Emoji tab.
  await page.keyboard.press('e');
  await expect(page.getByRole('tab', { name: 'Emoji' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('searchbox', { name: 'Search emoji' }).fill('rocket');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);
  const node = (await doc(page)).pages[0].nodes[0]!;
  expect(node.kind).toBe('text');
  expect(node.content.label).toBe('🚀');
  expect(node.appearance.fontSize).toBe(48);
  expect(errors).toEqual([]);
  // The picker closes onto its trigger: the shortcut still lands.
  await expect.poll(() => page.evaluate(() =>
    Boolean((document.activeElement as HTMLElement)?.closest?.('.ofk-v2')))).toBe(true);
  await page.keyboard.press('Meta+z');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(0);
});

test('a png becomes an image node with an asset id, and survives a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('v2-canvas').focus();
  const dir = mkdtempSync(join(tmpdir(), 'ofk-e2e-'));
  const file = join(dir, 'pixel.png');
  writeFileSync(file, Buffer.from(PNG_BASE64, 'base64'));

  // Path 1: the rail's picker (⇧I opens the same input).
  await page.setInputFiles('input[type=file]', file);
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);
  const node = (await doc(page)).pages[0].nodes[0]!;
  expect(node.kind).toBe('image');
  expect(String(node.content.imageAssetId)).toMatch(/^asset-/);
  expect(String(node.content.imageUrl)).toMatch(/^data:image\/png;base64,/);

  // Path 2: dropping a file on the canvas.
  const dataTransfer = await page.evaluateHandle(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], 'dropped.png', { type: 'image/png' }));
    return transfer;
  }, PNG_BASE64);
  await page.dispatchEvent('[data-testid="v2-canvas"]', 'drop', { dataTransfer });
  await expect.poll(async () => (await state(page)).nodes.length).toBe(2);

  // Autosave must land before the reload or the dropped node is not there yet.
  await expect.poll(async () => (await state(page)).save).toBe('saved');
  await page.reload();
  await expect.poll(async () => (await state(page)).nodes.length).toBe(2);
  expect((await doc(page)).pages[0].nodes.map((entry) => entry.kind)).toEqual(['image', 'image']);
});
