import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from './test';

// Phase 12.3: a browser holding real v1 data (all three storage locations, the
// database still at v1's version 3) boots v2 and finds every live diagram.
// npm run e2e:headed -- e2e/v1-import.spec.ts

const FIXTURES = 'src/services/storage/v2/__fixtures__/v1';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped v1 fixture JSON
type Json = Record<string, any>;
const read = (file: string): Json => JSON.parse(readFileSync(`${FIXTURES}/${file}`, 'utf8'));
const current = read('indexeddb.json');
const fallback = read('localstorage-fallback.json');
const premarch = read('premarch-tabs.json');
const manifest = read('manifest.json') as Record<string, string>;
// One browser, three sources: v1's documents store, the fallback key, pre-March tabs.
const seed = {
  stores: { ...current.indexedDb, flowMetadata: premarch.indexedDb.flowMetadata },
  localStorage: fallback.localStorage as Record<string, string>,
};
const tabs = JSON.parse(premarch.indexedDb.flowMetadata.find((row: Json) => row.id === 'openflowkit-storage').value).state.tabs;
const expected = [
  ...current.indexedDb.documents.map((row: Json) => `v1-${row.id}`),
  ...JSON.parse(fallback.localStorage['openflowkit-documents-fallback']).map((row: Json) => `v1-${row.id}`),
  ...tabs.map((tab: Json) => `v1-${tab.id}`),
].sort();

// A same-origin page with no app on it, so v1's database is written before v2 ever opens it.
async function seedV1(page: Page): Promise<void> {
  await page.route('**/v1-seed', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>v1</title>' }));
  await page.goto('/v1-seed');
  await page.evaluate(async ({ stores, localStorage: entries }) => {
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const request = indexedDB.open('openflowkit-persistence', 3);
      request.onupgradeneeded = () => { for (const name of Object.keys(stores)) request.result.createObjectStore(name, { keyPath: 'id' }); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    // The capture kept Blobs as data URLs; v1 stores them as Blobs.
    const rows = await Promise.all(Object.entries(stores).flatMap(([name, records]) => (records as Record<string, unknown>[]).map(async (record) => {
      const out: Record<string, unknown> = { ...record };
      for (const [key, value] of Object.entries(record)) {
        if (value && typeof value === 'object' && '$blob' in value) out[key] = await (await fetch(String(value.$blob))).blob();
      }
      // v1 writes `content.playback: tab.playback`, usually undefined; JSON fixtures lost that.
      if (name === 'documents') for (const page of out.pages as { content: Record<string, unknown> }[]) page.content.playback = undefined;
      return [name, out] as const;
    })));
    const tx = db.transaction(Object.keys(stores), 'readwrite');
    for (const [name, record] of rows) tx.objectStore(name).put(record);
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    db.close();
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
  }, seed);
}

function storeIds(page: Page, store: string): Promise<string[]> {
  return page.evaluate(async (name) => {
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const request = indexedDB.open('openflowkit-persistence');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const keys = await new Promise<IDBValidKey[]>((resolve) => {
      const request = db.transaction(name, 'readonly').objectStore(name).getAllKeys();
      request.onsuccess = () => resolve(request.result);
    });
    db.close();
    return keys.map(String).sort();
  }, store);
}

async function bootAndWaitForImport(page: Page) {
  await page.goto('/');
  await expect(page.locator('[data-testid="v2-canvas"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ofk.v1Import')), { timeout: 20_000 }).not.toBeNull();
  return JSON.parse((await page.evaluate(() => localStorage.getItem('ofk.v1Import')))!) as { docs: Record<string, { status: string; error?: string }> };
}

test('v2 imports every v1 diagram once and leaves v1 rows alone @gate', async ({ page }) => {
  await seedV1(page);
  const v1Rows = await storeIds(page, 'documents');
  const marker = await bootAndWaitForImport(page);
  expect(Object.values(marker.docs).filter((entry) => entry.status !== 'imported')).toEqual([]);
  const v2Ids = (await storeIds(page, 'v2Documents')).filter((id) => id.startsWith('v1-'));
  expect(v2Ids).toEqual(expected);
  expect(await storeIds(page, 'documents')).toEqual(v1Rows);
  // The image's bytes ride inside the document, so exports need no v1 row.
  const imageDoc = `v1-${Object.keys(manifest).find((id) => manifest[id] === 'image')}`;
  const imageUrl = await page.evaluate(async (id) => {
    const db: IDBDatabase = await new Promise((resolve) => { const request = indexedDB.open('openflowkit-persistence'); request.onsuccess = () => resolve(request.result); });
    const record = await new Promise<{ document: { pages: { nodes: { kind: string; content: { imageUrl?: string } }[] }[] } }>((resolve) => {
      const request = db.transaction('v2Documents').objectStore('v2Documents').get(id);
      request.onsuccess = () => resolve(request.result);
    });
    db.close();
    return record.document.pages.flatMap((page) => page.nodes).find((node) => node.kind === 'image')?.content.imageUrl ?? null;
  }, imageDoc);
  expect(imageUrl).toMatch(/^data:image\//);

  // A full second run (marker gone) must skip every existing copy, including one edited in v2.
  const edited = expected[0]!;
  await page.evaluate(async (id) => {
    const db: IDBDatabase = await new Promise((resolve) => { const request = indexedDB.open('openflowkit-persistence'); request.onsuccess = () => resolve(request.result); });
    const store = db.transaction('v2Documents', 'readwrite').objectStore('v2Documents');
    await new Promise((resolve) => {
      store.get(id).onsuccess = (event) => {
        const record = (event.target as IDBRequest).result;
        store.put({ ...record, revision: 2, document: { ...record.document, name: 'Edited in v2' } }).onsuccess = resolve;
      };
    });
    db.close();
    localStorage.removeItem('ofk.v1Import');
  }, edited);
  await bootAndWaitForImport(page);
  expect((await storeIds(page, 'v2Documents')).filter((id) => id.startsWith('v1-'))).toEqual(expected);
  const kept = await page.evaluate(async (id) => {
    const db: IDBDatabase = await new Promise((resolve) => { const request = indexedDB.open('openflowkit-persistence'); request.onsuccess = () => resolve(request.result); });
    const record = await new Promise<{ revision: number; document: { name: string } }>((resolve) => {
      db.transaction('v2Documents').objectStore('v2Documents').get(id).onsuccess = (event) => resolve((event.target as IDBRequest).result);
    });
    db.close();
    return [record.revision, record.document.name];
  }, edited);
  expect(kept).toEqual([2, 'Edited in v2']);
});

test('a full disk reports every diagram as failed and keeps v1 rows @gate', async ({ playwright, headless, launchOptions, baseURL }) => {
  // The real condition: Chrome's own quota. Chrome fixes a bucket's quota when IndexedDB
  // first opens, so v1's data goes into a profile, and the browser restarts with the
  // quota shrunk before v2 ever touches the database.
  const profile = mkdtempSync(join(tmpdir(), 'ofk-v1-quota-'));
  const launch = async () => {
    const context = await playwright.chromium.launchPersistentContext(profile, { ...launchOptions, headless, baseURL });
    return { context, page: context.pages()[0] ?? (await context.newPage()) };
  };
  let { context, page } = await launch();
  try {
    await seedV1(page);
    const v1Rows = await storeIds(page, 'documents');
    await context.close();
    ({ context, page } = await launch());
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Storage.overrideQuotaForOrigin', { origin: new URL(baseURL!).origin, quotaSize: 1 });
    const marker = await bootAndWaitForImport(page);
    const entries = Object.values(marker.docs);
    expect(entries).toHaveLength(expected.length);
    expect(entries.filter((entry) => entry.status !== 'failed' || !/quota/i.test(entry.error ?? ''))).toEqual([]);
    expect(await storeIds(page, 'documents')).toEqual(v1Rows);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    rmSync(profile, { recursive: true, force: true });
  }
});
