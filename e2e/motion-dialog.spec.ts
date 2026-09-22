import { expect, test } from '@playwright/test';

// Slice 7.5 gate: the Animation section of Export previews the exact SVG it
// downloads, the scrubber re-renders the still, space plays and the preset
// picker drives the timeline. Run headed:
// npm run e2e:headed -- e2e/motion-dialog.spec.ts

const DSL = `%% ofk 1
flowchart down

  Client [blue] -> API [green] : HTTPS
  API -> Cache [cylinder, orange]
  API -> Store [cylinder, red]
  Store -> Worker [rounded, violet]
`;

async function openAnimationExport(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const editor = page.getByRole('textbox', { name: 'Diagram source' });
  await editor.fill(DSL);
  await editor.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect.poll(async () => page.evaluate(() => {
    const api = (window as unknown as { __V2__?: { getState(): { nodes: string[] } } }).__V2__;
    return api?.getState().nodes.length ?? 0;
  })).toBeGreaterThan(5);
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  await page.getByRole('menuitem', { name: 'Export…' }).click();
  await page.getByRole('radio', { name: 'Animation' }).check();
  await expect(page.getByRole('img', { name: 'Animation preview' })).toBeVisible();
}

const srcLength = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (document.querySelector('.ofk-motion-preview img')?.getAttribute('src') ?? '').length);
const readout = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.querySelector('.ofk-motion-transport output')?.textContent ?? '');

test('animation export previews, scrubs, plays and downloads', async ({ page }) => {
  await openAnimationExport(page);
  const preview = page.getByRole('img', { name: 'Animation preview' });
  await expect(preview).toHaveAttribute('alt', /Build preview, 5 steps/);

  // The scrubber re-renders the still: arrow keys jump whole steps.
  const first = await srcLength(page);
  await page.locator('.ofk-motion-transport input[type="range"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => srcLength(page)).not.toBe(first);
  expect(await readout(page)).toMatch(/^1\.7s/);

  // Space plays from the playhead and pauses where it is.
  await preview.focus();
  await page.keyboard.press('Space');
  await expect.poll(() => readout(page), { timeout: 4000 }).not.toMatch(/^1\.7s/);
  await page.getByRole('button', { name: /Pause/ }).click();
  const paused = await readout(page);
  await page.waitForTimeout(300);
  expect(await readout(page)).toBe(paused);

  // Walkthrough adds the camera: the still carries its transform, the
  // animated preview its keyframes.
  await page.getByRole('radio', { name: 'Walkthrough' }).check();
  await expect.poll(async () => page.evaluate(() => {
    const src = document.querySelector('.ofk-motion-preview img')?.getAttribute('src') ?? '';
    return decodeURIComponent(src).includes('transform-box:view-box');
  })).toBe(true);
  await page.getByRole('button', { name: /Play/ }).click();
  await expect.poll(async () => page.evaluate(() => {
    const src = document.querySelector('.ofk-motion-preview img')?.getAttribute('src') ?? '';
    return decodeURIComponent(src).includes('ofk-camera');
  })).toBe(true);
  await page.getByRole('button', { name: /Pause/ }).click();

  await page.getByRole('radio', { name: 'Build' }).check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download SVG/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/-build\.svg$/);
  const path = await file.path();
  const text = await (await import('node:fs/promises')).readFile(path!, 'utf8');
  expect(text).toContain('@keyframes');
  expect(text).toContain('prefers-reduced-motion');
  expect(text).toContain('data-node-id=');
  expect(text).not.toContain('ofk-camera');
});

test('an empty page says so instead of failing', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  await page.getByRole('menuitem', { name: 'Export…' }).click();
  await page.getByRole('radio', { name: 'Animation' }).check();
  await expect(page.getByText('Nothing to animate here')).toBeVisible();
  await expect(page.getByRole('button', { name: /Download SVG/ })).toBeDisabled();
  // Esc closes the dialog and returns focus to the opener.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('radio', { name: 'Animation' })).toBeHidden();
});
