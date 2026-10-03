// Phase 12.3 dress rehearsal: the cutover as a user meets it. Browser data is per origin, so
// one static server on ONE port serves the v1 build, then the v2 build, to one browser
// profile. v1's own UI writes the diagrams (production build: no store imports); v2 then
// boots on top and must list every one of them. Read-only on the repo.
//
//   git worktree add --detach "$S/ofk-v1" origin/main     # what app.openflowkit.com serves
//   (cd "$S/ofk-v1" && npm ci && npx vite build --outDir "$S/v1-dist")
//   npx vite build --outDir "$S/v2-dist"
//   V1_DIST="$S/v1-dist" V2_DIST="$S/v2-dist" node scripts/v1-fidelity/rehearsal.mjs
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';

const PORT = Number(process.env.PORT ?? 5190);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const OUT = 'test-results/v1-fidelity';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };

let root = process.env.V1_DIST;
const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, ORIGIN).pathname);
  let file = join(root, path);
  try { if (!statSync(file).isFile()) file = join(root, 'index.html'); } catch { file = join(root, 'index.html'); }
  response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
  response.end(readFileSync(file));
}).listen(PORT, '127.0.0.1');

const FLOWCHART = 'flowchart TD\n  A([Start]) --> B[Receive order]\n  B --> C{In stock?}\n  C -->|yes| D[Ship]\n  C -->|no| E[Back-order]';
const SEQUENCE = 'sequenceDiagram\n  participant U as User\n  participant A as API\n  U->>A: GET /items\n  A-->>U: 200 items';

async function newEditor(page) {
  await page.goto(`${ORIGIN}/#/home`);
  await page.getByTestId(/^home-create-new(-main|-header)?$/).first().click();
  await page.waitForURL(/#\/flow\//);
  await page.getByTestId(/^flow-(page-)?tab$/).first().waitFor();
}

async function applyMermaid(page, source) {
  const apply = page.getByRole('button', { name: 'Apply to canvas' });
  if (!(await apply.isVisible())) {
    await page.mouse.click(60, 820);
    await page.keyboard.press('Meta+k');
    await page.getByText('Edit Mermaid Code').first().click();
  }
  await page.locator('textarea').last().fill(source);
  // The deployed build applies as you type; Apply is only enabled while something is pending.
  await apply.click({ timeout: 2000 }).catch(() => {});
  await page.locator('.react-flow__node').first().waitFor();
  await page.waitForTimeout(1500); // v1 persists on a debounce
}

const readStore = (page, store) => page.evaluate(async (name) => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('openflowkit-persistence');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (!db.objectStoreNames.contains(name)) return [];
  const rows = await new Promise((resolve) => {
    const request = db.transaction(name, 'readonly').objectStore(name).getAll();
    request.onsuccess = () => resolve(request.result);
  });
  db.close();
  return rows;
}, store);

const profile = mkdtempSync(join(tmpdir(), 'ofk-rehearsal-'));
const launch = () => chromium.launchPersistentContext(profile, {
  viewport: { width: 1440, height: 900 },
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const lines = [];
const log = (line) => { console.log(line); lines.push(line); };

// 1. v1, as deployed today.
let context = await launch();
let page = context.pages()[0] ?? (await context.newPage());
await page.addInitScript(() => localStorage.setItem('hasSeenWelcome_v1', 'true'));
await newEditor(page);
await applyMermaid(page, FLOWCHART);
await newEditor(page);
await applyMermaid(page, FLOWCHART);
await page.getByTestId(/^flow-(page|tab)-add$/).click();
await page.waitForTimeout(500);
await applyMermaid(page, SEQUENCE);
await page.goto(`${ORIGIN}/#/home`);
await page.waitForTimeout(1500);
const v1Docs = await readStore(page, 'documents'); // v1 hard-deletes: every row is live
const v1Snapshot = JSON.stringify(v1Docs);
const v1Workers = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
log(`v1: ${v1Docs.length} documents (${v1Docs.map((d) => `${d.pages.length}p`).join(', ')}); service workers: ${v1Workers}`);
await context.close();

// 2. The deploy: same origin, new build, same profile.
root = process.env.V2_DIST;
context = await launch();
page = context.pages()[0] ?? (await context.newPage());
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto(`${ORIGIN}/`);
let shell = 'v2';
try {
  await page.locator('[data-testid="v2-canvas"]').waitFor({ timeout: 15_000 });
} catch {
  // An old worker may answer the first visit with v1 (plan: accepted ceiling); a reload fetches v2.
  shell = 'v1 on first visit, v2 after one reload';
  await page.reload();
  await page.locator('[data-testid="v2-canvas"]').waitFor({ timeout: 15_000 });
}
await page.waitForFunction(() => localStorage.getItem('ofk.v1Import') !== null, null, { timeout: 30_000 });
const marker = JSON.parse(await page.evaluate(() => localStorage.getItem('ofk.v1Import')));
const v2Docs = (await readStore(page, 'v2Documents')).filter((row) => row.id.startsWith('v1-'));
const v1Intact = JSON.stringify(await readStore(page, 'documents')) === v1Snapshot;
const v2Workers = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
await context.close();
server.close();
rmSync(profile, { recursive: true, force: true });

const missing = v1Docs.filter((row) => !v2Docs.some((doc) => doc.id === `v1-${row.id}`));
const pageLoss = v1Docs.filter((row) => {
  const doc = v2Docs.find((item) => item.id === `v1-${row.id}`);
  return doc && row.pages.some((p, i) => (doc.document.pages[i]?.nodes.length ?? -1) < p.content.nodes.length);
});
log(`v2 shell: ${shell}; imported ${v2Docs.length}/${v1Docs.length}; missing ${missing.length}; pages short of nodes ${pageLoss.length}`);
const markerFailures = Object.values(marker.docs).filter((d) => d.status !== 'imported').length;
log(`marker failures: ${markerFailures}; v1 rows byte-identical after: ${v1Intact}`);
log(`service workers after v2 boot: ${v2Workers} (12.6 removes v1's); page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
const ok = missing.length === 0 && pageLoss.length === 0 && markerFailures === 0 && v1Intact && errors.length === 0;
log(ok ? 'REHEARSAL PASS' : 'REHEARSAL FAIL');
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/rehearsal.md`, `# v1 → v2 same-origin rehearsal (${new Date().toISOString().slice(0, 10)})\n\n${lines.map((line) => `- ${line}`).join('\n')}\n`);
process.exit(ok ? 0 : 1);
