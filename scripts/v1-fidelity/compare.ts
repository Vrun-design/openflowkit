// Phase 12.0: render every captured v1 page in v1 and through v2's import
// (documentFromFileText → projectLegacyDocument), side by side, plus a table.
// Read-only on the fixtures; both apps run in throwaway headless profiles.
//
//   (cd ../ofk-main && npx vite --port 5179)   # git worktree of `main`
//   npx vite --port 5181                        # this checkout
//   npx tsx scripts/v1-fidelity/compare.ts      # → test-results/v1-fidelity/
import { chromium, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { doc } from '../../e2e/helpers';
import { documentFromFileText } from '../../src/services/storage/v2/openDocumentFile';

const V1 = process.env.V1_URL ?? 'http://127.0.0.1:5179';
const V2 = process.env.V2_URL ?? 'http://127.0.0.1:5181';
const FIXTURES = 'src/services/storage/v2/__fixtures__/v1';
const OUT = 'test-results/v1-fidelity';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped v1 fixture JSON
type Json = Record<string, any>;
interface Case { label: string; source: string; name: string; diagramType: string; nodes: Json[]; edges: Json[] }

const read = (file: string): Json => JSON.parse(readFileSync(`${FIXTURES}/${file}`, 'utf8'));
const manifest = read('manifest.json') as Record<string, string>;
const indexedDb = read('indexeddb.json').indexedDb;
const asset = indexedDb.assets[0] as Json;

function pagesOf(document: Json, label: string, source: string): Case[] {
  return document.pages.map((page: Json, index: number) => ({
    label: document.pages.length > 1 ? `${label} · page ${index + 1}` : label,
    source,
    name: document.name,
    diagramType: page.diagramType,
    nodes: page.content.nodes,
    edges: page.content.edges,
  }));
}

const fallbackDocs = JSON.parse(read('localstorage-fallback.json').localStorage['openflowkit-documents-fallback']);
const premarch = read('premarch-tabs.json').indexedDb.flowMetadata.find((r: Json) => r.id === 'openflowkit-storage');
const cases: Case[] = [
  ...indexedDb.documents.flatMap((d: Json) => pagesOf(d, manifest[d.id], 'IDB documents')),
  ...fallbackDocs.flatMap((d: Json) => pagesOf(d, 'fallback', 'LS documents-fallback')),
  // Pre-March tabs are pages already; the empty default tab has nothing to compare.
  ...JSON.parse(premarch.value).state.tabs
    .filter((tab: Json) => tab.nodes.length > 0)
    .map((tab: Json) => ({ label: `pre-March tab · ${tab.name}`, source: 'IDB flowMetadata tabs', name: tab.name, diagramType: tab.diagramType, nodes: tab.nodes, edges: tab.edges })),
];
const deletedIds = Object.keys(manifest).filter((id) => manifest[id] === 'deleted');
const deletedRows = deletedIds.filter((id) => indexedDb.documents.some((d: Json) => d.id === id));

// The v1 asset row exactly as it sits in the shared `openflowkit-persistence` database.
async function seedAsset(page: Page): Promise<void> {
  await page.evaluate(async (record) => {
    const bytes = await (await fetch(record.bytes.$blob)).blob();
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const request = indexedDB.open('openflowkit-persistence');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('assets', 'readwrite');
      tx.objectStore('assets').put({ ...record, bytes });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, asset);
}

async function renderV1(page: Page, item: Case): Promise<Buffer> {
  await page.goto(`${V1}/#/home`);
  await page.getByTestId(/^home-create-new(-main|-header)?$/).first().click();
  await page.waitForURL(/#\/flow\//);
  await seedAsset(page);
  await page.evaluate(async ({ nodes, edges, diagramType }) => {
    const { useFlowStore } = await import(/* @vite-ignore */ '/src/store.ts');
    const store = useFlowStore.getState();
    store.updateTab(store.activeTabId, { diagramType });
    store.setNodes(nodes);
    store.setEdges(edges);
  }, item);
  await page.locator('.react-flow__node').first().waitFor();
  await page.locator('button:has(svg.lucide-maximize)').first().click();
  await page.waitForTimeout(1200);
  return page.locator('.react-flow').screenshot();
}

async function renderV2(text: string, expectedNodes: number) {
  // A fresh profile per case: `/` reopens the last document, so a shared page would
  // let one case's document (and its errors) stand in for the next.
  const page = await open();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${V2}/`);
  await page.locator('[data-testid="v2-canvas"]').waitFor();
  await seedAsset(page);
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('menuitem', { name: 'Open file…' }).click();
  await (await chooser).setFiles({ name: 'v1.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  const count = async () => (await doc(page))?.pages[0]?.nodes.length ?? -1;
  for (let i = 0; i < 50 && (await count()) !== expectedNodes; i++) await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'Zoom to fit' }).click();
  await page.waitForTimeout(1500);
  const v2Doc = (await doc(page))?.pages[0] ?? null;
  const assetUrl = await page.evaluate(async (id) => {
    const { readAssetUrl } = await import(/* @vite-ignore */ '/src/services/storage/assets.ts');
    return readAssetUrl(id);
  }, asset.id);
  // The canvas catches renderer errors and shows a notice instead of throwing.
  const crash = page.getByText('WebGL renderer unavailable');
  const crashed = (await crash.isVisible()) ? await crash.locator('xpath=..').innerText() : null;
  const png = await page.locator('[data-testid="v2-canvas"]').screenshot();
  await page.context().close();
  return { png, v2Doc, assetUrl, crashed, errors };
}

async function sideBySide(page: Page, title: string, v1: Buffer, v2: Buffer | null): Promise<Buffer> {
  const img = (png: Buffer | null, caption: string) =>
    `<figure><figcaption>${caption}</figcaption>${png ? `<img src="data:image/png;base64,${png.toString('base64')}">` : '<p>not rendered: projection failed</p>'}</figure>`;
  await page.setContent(`<style>body{margin:0;font:14px system-ui;background:#fff}h1{font-size:16px;margin:8px 12px}
    div{display:flex;gap:8px;padding:0 8px 8px}figure{margin:0;flex:1}img{width:100%;border:1px solid #ccc}</style>
    <h1>${title}</h1><div>${img(v1, 'v1 (main)')}${img(v2, 'v2 import')}</div>`);
  return page.screenshot({ fullPage: true });
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const open = async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => localStorage.setItem('hasSeenWelcome_v1', 'true'));
  return context.newPage();
};
const [v1Page, sheet] = [await open(), await open()];
v1Page.on('pageerror', (error) => console.warn('v1 baseline page error:', error.message));

const rows: string[] = [];
const tally = { clean: 0, degraded: 0, failed: 0, unknown: 0 };
for (const [index, item] of cases.entries()) {
  const slug = `${String(index + 1).padStart(2, '0')}-${item.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  const text = JSON.stringify({ name: item.name, diagramType: item.diagramType, nodes: item.nodes, edges: item.edges });
  const projected = documentFromFileText(text, 'fidelity');
  const fatal: string[] = [];
  const problems: string[] = [];
  if ('error' in projected) {
    fatal.push(`projection threw: ${projected.error}`);
  } else {
    const zero = projected.document.pages[0].nodes.filter((n) => n.size.width === 0 || n.size.height === 0);
    if (zero.length) problems.push(`${zero.length}/${item.nodes.length} nodes size 0 (v1 size in \`measured\`)`);
  }
  const v1Png = await renderV1(v1Page, item);
  const v2 = fatal.length ? null : await renderV2(text, item.nodes.length);
  if (v2?.errors.length) fatal.push(`v2 page error: ${v2.errors[0]}`);
  if (v2?.crashed) fatal.push(`v2 canvas crashed: ${v2.crashed.replace(/\s+/g, ' ').slice(0, 90)}`);
  const v2Nodes = v2?.v2Doc?.nodes.length ?? 0;
  const v2Connectors = v2?.v2Doc?.connectors.length ?? 0;
  if (v2 && v2Nodes !== item.nodes.length) fatal.push(`v2 has ${v2Nodes}/${item.nodes.length} nodes`);
  if (v2 && v2Connectors !== item.edges.length) fatal.push(`v2 has ${v2Connectors}/${item.edges.length} connectors`);
  if (item.nodes.some((n) => n.data?.imageAssetId) && !v2?.assetUrl) problems.push('image asset unreadable (v1 `bytes` Blob, v2 wants `dataUrl`)');
  // ponytail: v1's fallback box when headless Chromium can't measure the Mermaid SVG —
  // these rows say nothing about real users until `HEADED=1` capture replaces them.
  const artifact = item.nodes.some((n) => n.type === 'mermaid_svg' && n.style?.width === 100 && n.style?.height === 480);
  if (artifact) problems.push('headless capture artifact: mermaid_svg at v1 fallback 100×480; recapture headed');
  // A node count can't tell a drawn Mermaid SVG from an empty box: a person must look.
  const needsEyes = !artifact && item.nodes.some((n) => n.type === 'mermaid_svg');
  if (needsEyes) problems.push('mermaid_svg: judge the PNG');
  writeFileSync(`${OUT}/${slug}.png`, await sideBySide(sheet, item.label, v1Png, v2?.png ?? null));
  const verdict = artifact || (needsEyes && !fatal.length && problems.length === 1) ? 'unknown' : fatal.length ? 'failed' : problems.length ? 'degraded' : 'clean';
  tally[verdict]++;
  const what = [...fatal, ...problems].join('; ');
  rows.push(`| ${index + 1} | ${item.label} | ${item.source} | ${item.nodes.length}/${item.edges.length} | ${v2Nodes}/${v2Connectors} | ${verdict} | ${what} | ${slug}.png |`);
  console.log(`${verdict.padEnd(8)} ${item.label} ${what}`);
}

const judged = cases.length - tally.unknown;
const table = [
  `# v1 → v2 fidelity (${new Date().toISOString().slice(0, 10)})`,
  '',
  `Clean ${tally.clean}/${judged} judged (${judged ? Math.round((tally.clean / judged) * 100) : 0}%): ${tally.degraded} degraded, ${tally.failed} failed; ${tally.unknown} unknown. Read each PNG before trusting a "clean".`,
  `Deleted docs: ${deletedIds.length} deleted in v1, ${deletedRows.length} rows left behind.`,
  'Measures page content one page at a time. Not measured: multi-page docs as one import, v1 snapshots',
  '(`flowDocuments`/`flowmind_snapshots`), empty tabs. 12 of the rows are v1 starter templates.',
  '',
  '| # | case | v1 source | v1 nodes/edges | v2 nodes/connectors | auto | what | png |',
  '|---|---|---|---|---|---|---|---|',
  ...rows,
].join('\n');
writeFileSync(`${OUT}/table.md`, `${table}\n`);
console.log(`\n${OUT}/table.md — ${tally.clean}/${judged} clean`);
await browser.close();
