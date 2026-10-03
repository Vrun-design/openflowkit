import { readFileSync } from 'node:fs';
import type { Page } from './test';

// Real v1 storage (phase 12.0 fixtures), written into a browser the way v1 left it.
const FIXTURES = 'src/services/storage/v2/__fixtures__/v1';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped v1 fixture JSON
export type Json = Record<string, any>;
const read = (file: string): Json => JSON.parse(readFileSync(`${FIXTURES}/${file}`, 'utf8'));
export const current = read('indexeddb.json');
export const fallback = read('localstorage-fallback.json');
export const premarch = read('premarch-tabs.json');
export const manifest = read('manifest.json') as Record<string, string>;
// One browser, three sources: v1's documents store, the fallback key, pre-March tabs.
const seed = {
  stores: { ...current.indexedDb, flowMetadata: premarch.indexedDb.flowMetadata },
  localStorage: fallback.localStorage as Record<string, string>,
};
export const tabs = JSON.parse(premarch.indexedDb.flowMetadata.find((row: Json) => row.id === 'openflowkit-storage').value).state.tabs;
export const expected = [
  ...current.indexedDb.documents.map((row: Json) => `v1-${row.id}`),
  ...JSON.parse(fallback.localStorage['openflowkit-documents-fallback']).map((row: Json) => `v1-${row.id}`),
  ...tabs.map((tab: Json) => `v1-${tab.id}`),
].sort();

// A same-origin page with no app on it, so v1's database is written before v2 ever opens it.
export async function seedV1(page: Page): Promise<void> {
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

