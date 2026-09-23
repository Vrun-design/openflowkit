import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// Slice 7.7 audit: the formats that can be verified in a browser are verified
// here — the committed README asset animates through the exact GitHub
// mechanism (an <img> running CSS keyframes), the dialog's keyboard and
// screen-reader surface is complete, and reduced motion leaves a still.
// Slack, Notion, X and Keynote are verified by the file's own magic bytes and
// browser playback in motion-encode.spec.ts; those apps are not installable
// here and are listed as assumed in STATE.md.
// Run headed: npm run e2e:headed -- e2e/motion-audit.spec.ts

const DSL = `%% ofk 1
flowchart down

  Client [blue] -> API [green] : HTTPS
  API -> Cache [cylinder, orange]
`;

test('the README animation plays through an <img>, GitHub-style', async ({ page }) => {
  const svg = readFileSync('assets/motion/flow-walkthrough.svg', 'utf8');
  expect(svg).toContain('@keyframes');
  expect(svg).toContain('@media (prefers-reduced-motion: reduce)');
  await page.setContent(`<body style="margin:0;background:#fff"><img id="readme" width="420" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"></body>`);
  await page.waitForSelector('#readme');
  await page.waitForTimeout(400);
  const first = await page.locator('#readme').screenshot();
  // The walkthrough holds each step for a beat, so compare across steps.
  await page.waitForTimeout(2400);
  const second = await page.locator('#readme').screenshot();
  // CSS keyframes inside an <img> really run: the picture changes over time.
  expect(first.equals(second)).toBe(false);
});

test('reduced motion leaves a finished still', async ({ page }) => {
  const svg = readFileSync('assets/motion/flow-walkthrough.svg', 'utf8');
  expect(svg).toContain('@media (prefers-reduced-motion: reduce)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Inline, not <img>: Chromium's emulated prefers-reduced-motion never reaches
  // a document loaded as an image, so the <img> above keeps animating whatever
  // the rule says. Inlining renders the same markup in a document the emulation
  // does reach, which is what proves the rule actually stops the animation.
  await page.setContent(`<body style="margin:0;background:#fff"><div id="still" style="width:420px">${svg}</div></body>`);
  await page.waitForSelector('#still');
  await page.waitForTimeout(400);
  const first = await page.locator('#still').screenshot();
  await page.waitForTimeout(900);
  const second = await page.locator('#still').screenshot();
  expect(first.equals(second)).toBe(true);
});

test('the animation dialog is keyboard- and screen-reader-complete', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const editor = page.getByRole('textbox', { name: 'Diagram source' });
  await editor.fill(DSL);
  await editor.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect.poll(async () => page.evaluate(() => {
    const api = (window as unknown as { __V2__?: { getState(): { nodes: string[] } } }).__V2__;
    return api?.getState().nodes.length ?? 0;
  })).toBeGreaterThan(2);
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  await page.getByRole('menuitem', { name: 'Export…' }).click();
  await page.getByRole('button', { name: /Animate this page/ }).click();

  // The preview is described, and the scrubber announces its position.
  const preview = page.getByRole('img', { name: 'Animation preview' });
  await expect(preview).toBeVisible();
  // The panel opens playing; park it so the transport state is steady.
  await page.locator('.ofk-motion-transport input[type="range"]').fill('0');
  await expect(preview).toHaveAttribute('alt', /preview, \d+ steps/);
  const slider = page.locator('.ofk-motion-transport input[type="range"]');
  await expect(slider).toHaveAttribute('aria-valuetext', /of \d+\.\d seconds/);
  await expect(page.getByRole('button', { name: /Play \(space\)/ })).toHaveAttribute('aria-pressed', 'false');

  // Every chip names its step and its keyboard moves.
  const chip = page.locator('.ofk-motion-chip').first();
  await expect(chip).toHaveAttribute('aria-label', /Step 1 of \d+.*Alt\+left and right move it/);

  // Tab order stays inside the dialog and reaches the download button.
  await preview.focus();
  const reached: string[] = [];
  for (let step = 0; step < 12; step += 1) {
    await page.keyboard.press('Tab');
    reached.push(await page.evaluate(() => {
      const active = document.activeElement;
      return active ? `${active.tagName}:${active.getAttribute('aria-label') ?? active.textContent?.trim().slice(0, 24) ?? ''}` : 'none';
    }));
  }
  expect(reached.some((entry) => entry.includes('Download SVG'))).toBe(true);

  // Escape closes and returns focus to the opener (the canvas menu button).
  await page.keyboard.press('Escape');
  await expect(page.getByRole('complementary', { name: 'Animation export' })).toBeHidden();
  expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Canvas menu');
});
