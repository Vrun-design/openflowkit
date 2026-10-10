import { rect, state } from './helpers';
import { expect, test } from './test';

type V2Api = { getState(): { nodes: string[] } };
const count = (page: import('@playwright/test').Page) => page.evaluate(() =>
  (window as unknown as { __V2__?: V2Api }).__V2__?.getState().nodes.length ?? 0);

test('diagram source generates and regenerates as one undo step', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await expect(source).toBeVisible();
  await source.fill('%% ofk 1\nflowchart\nStart -> Build -> Ship');
  await source.press('ControlOrMeta+Enter');
  await expect.poll(() => count(page)).toBe(4);
  await source.fill('%% ofk 1\nflowchart\nStart -> Test -> Build -> Ship');
  await source.press('ControlOrMeta+Enter');
  await expect.poll(() => count(page)).toBe(5);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => count(page)).toBe(4);
  await expect(page.locator('#v2-code-diagnostics')).toBeHidden();
});

test('code panel reports bad lines and offers attribute completion', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('flowchart\nCache [');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(source).not.toHaveValue('flowchart\nCache [');
  await source.fill('flowchart\nBroken [oops');
  await expect(page.getByText('W101', { exact: true })).toBeVisible();
});

test('a generated diagram fits the canvas the open panel leaves free @gate', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  // Short enough to fit readably beside the panel: a longer one lands readable on its start and runs under it (readable-views).
  await source.fill('flowchart right\nA -> B -> C -> D -> E -> F');
  await source.press('ControlOrMeta+Enter');
  await expect.poll(() => count(page)).toBeGreaterThan(5);
  const panelLeft = (await page.getByRole('textbox', { name: 'Diagram source' }).boundingBox())!.x;
  await expect.poll(async () => {
    const [frame] = (await state(page)).selectedNodes;
    const frameRect = frame ? await rect(page, frame) : null;
    return frameRect ? Math.round(frameRect.x + frameRect.width) : Infinity;
  }).toBeLessThanOrEqual(panelLeft);
});

test('a long edge label wraps instead of running over the nodes it joins @gate', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('flowchart right\nA -> B : email the customer a receipt once the order has shipped');
  await source.press('ControlOrMeta+Enter');
  await expect.poll(() => count(page)).toBeGreaterThan(2);
  await expect.poll(async () => page.evaluate(() => (window as unknown as {
    __V2__: { getConnectorDebugSnapshot(): { labels: number; widestLabel: number } };
  }).__V2__.getConnectorDebugSnapshot())).toMatchObject({ labels: 1, widestLabel: expect.any(Number) });
  const widest = await page.evaluate(() => (window as unknown as {
    __V2__: { getConnectorDebugSnapshot(): { widestLabel: number } };
  }).__V2__.getConnectorDebugSnapshot().widestLabel);
  expect(widest).toBeGreaterThan(0);
  expect(widest).toBeLessThanOrEqual(150);
});

test('the code editor wraps long lines in step with its highlight, and ⌘Z undoes a Tab or a completion, not the text @gate', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('');
  await page.keyboard.type('flowchart\nA -> B');
  await page.keyboard.press('Tab');
  await expect(source).toHaveValue('flowchart\nA -> B  ');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(source).toHaveValue('flowchart\nA -> B');
  await page.keyboard.type(' [');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(source).not.toHaveValue('flowchart\nA -> B [');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(source).toHaveValue('flowchart\nA -> B [');

  // A long AI-written line wraps; the highlight underneath wraps at the same places.
  const long = `flowchart\n${Array.from({ length: 12 }, (_, index) => `Step${index}`).join(' -> ')} -> ${'x'.repeat(120)}\nEmoji 🚀 -> Tab\tEnd`;
  await source.fill(long);
  const metrics = await page.evaluate(() => {
    const editor = document.querySelector<HTMLTextAreaElement>('.ofk-v2-code-editor')!;
    const highlight = document.querySelector<HTMLPreElement>('.ofk-v2-code-highlight')!;
    return {
      sideways: editor.scrollWidth > editor.clientWidth + 1,
      editorHeight: editor.scrollHeight, highlightHeight: highlight.scrollHeight,
      editorWidth: editor.clientWidth, highlightWidth: highlight.clientWidth,
      text: highlight.textContent, value: editor.value,
    };
  });
  expect(metrics.sideways).toBe(false);
  expect(metrics.highlightWidth).toBe(metrics.editorWidth);
  expect(Math.abs(metrics.highlightHeight - metrics.editorHeight)).toBeLessThanOrEqual(2);
  expect(metrics.text?.replace(/\n$/, '')).toBe(metrics.value);
});
