import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';

const URL = 'http://127.0.0.1:4173';
const profileDir = path.join(os.tmpdir(), 'ofk-stress-profile');

const entries = [
  ['stress/everything.json', 'Everything — all shapes & diagram types'],
  ['stress/scale-500.json', 'Scale 500'],
  ['stress/scale-2000.json', 'Scale 2000'],
  ['stress/scale-5000.json', 'Scale 5000'],
]
  .map(([file, name]) => ({ file: path.resolve(file), name }))
  .filter((entry) => existsSync(entry.file));

if (entries.length === 0) {
  console.error('No stress files found. Run `npm run stress:generate` first.');
  process.exit(1);
}

async function reachable() {
  try {
    await fetch(URL, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

let server = null;
if (!(await reachable())) {
  console.log('Starting the dev server on 127.0.0.1:4173…');
  server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], {
    stdio: 'ignore',
    detached: false,
  });
  for (let attempt = 0; attempt < 90 && !(await reachable()); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!(await reachable())) {
    console.error('Dev server did not start.');
    server.kill();
    process.exit(1);
  }
}

const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport: { width: 1600, height: 1000 },
});
context.setDefaultTimeout(120_000);

// The canvas can saturate the main thread while a heavy page first paints;
// dispatch the fit click in-page so Playwright's actionability checks wait on
// nothing.
async function zoomToFit(page) {
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(
      (candidate) => candidate.getAttribute('aria-label') === 'Zoom to fit'
    );
    button?.click();
  });
}

const tabs = context.pages()[0] ? [context.pages()[0]] : [await context.newPage()];
for (const [index, entry] of entries.entries()) {
  const page = index < tabs.length ? tabs[index] : await context.newPage();
  tabs[index] = page;
  await page.goto(`${URL}/`);
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.locator('input[type=file][accept*="json"]').setInputFiles(entry.file);
  await page.waitForFunction(
    (name) => window.__V2__?.getDocument()?.name === name,
    entry.name,
    { timeout: 120_000 }
  );
  await page.waitForTimeout(3000);
  await zoomToFit(page);
  await page.waitForTimeout(500);
  const nodes = await page.evaluate(() => window.__V2__.getState().nodes.length);
  console.log(`${path.relative(process.cwd(), entry.file)} → open (${nodes} nodes)`);
}
await tabs[0].bringToFront();
console.log('\nLeave this window open to keep testing. Close the browser to stop the dev server.');

await new Promise((resolve) => context.on('close', resolve));
server?.kill();
