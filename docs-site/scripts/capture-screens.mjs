// Captures the product screenshots the docs embed, from the real app, in both
// themes. Run by hand when the chrome changes (not in the build: it needs the
// dev server and a GPU, and headless Chromium has no WebGL here):
//
//   npm run dev -- --host 127.0.0.1 --port 4173   # repo root, other terminal
//   node docs-site/scripts/capture-screens.mjs
//
// ponytail: screenshots go stale silently when the UI changes; re-run this
// script, or diff them in CI if that starts to bite.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const APP = process.env.APP_URL ?? 'http://127.0.0.1:4173/';
const OUT = fileURLToPath(new URL('../public/screens/', import.meta.url));
const SUBMIT = process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter';

const SHOTS = [
  {
    name: 'editor',
    // The code panel beside the canvas it generated: the product in one frame.
    // Explicit icons, so the picture does not shift with auto-icon heuristics.
    code: true,
    source: `%% ofk 1
architecture down
title: Serverless upload pipeline

Client [person]
Gateway [aws/api-gateway]
Resize [aws/lambda, green]
Bucket [aws/simple-storage-service, orange]
Events [aws/eventbridge, violet]

Client -> Gateway : upload
Gateway -> Resize : invoke
Resize -> Bucket : write image
Resize --> Events : publish result`,
  },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: false });
for (const scheme of ['light', 'dark']) {
  for (const shot of SHOTS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme });
    await page.goto(APP);
    await page.waitForSelector('[data-testid="v2-canvas"]');
    const toggle = page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' });
    await toggle.click();
    const source = page.getByRole('textbox', { name: 'Diagram source' });
    await source.fill(shot.source);
    await source.press(SUBMIT);
    await page.waitForFunction(() => (window.__V2__?.getState().nodes.length ?? 0) > 3);
    if (!shot.code) await toggle.click();
    // Deselect and fit, so no handles or focus rings land in the picture.
    await page.getByTestId('v2-canvas').focus();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Shift+1');
    await page.mouse.move(1, 1);
    await page.waitForTimeout(800);
    // WebP at 2x: sharp on retina, a fraction of the PNG's weight on a phone.
    await sharp(await page.screenshot()).webp({ quality: 86 }).toFile(`${OUT}${shot.name}-${scheme}.webp`);
    await page.close();
  }
}
await browser.close();
