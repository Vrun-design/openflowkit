import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { CACHE_CAP, cacheKey, createIdbStore, FACTS_VERSION, readCache, touchCache, writeCache, type CacheEntry, type CacheStore, type CachedFacts } from './cache';

const memory = (): CacheStore & { rows: Map<string, CacheEntry> } => {
  const rows = new Map<string, CacheEntry>();
  const used = new Map<string, number>();
  return {
    rows,
    get: async (key) => rows.get(key),
    put: async (entry) => { rows.set(entry.key, entry); },
    touch: async (key, usedAt) => { used.set(key, usedAt); },
    list: async () => [...used].map(([key, usedAt]) => ({ key, usedAt })),
    remove: async (key) => { rows.delete(key); used.delete(key); },
  };
};
const facts = (loc = 1): CachedFacts => ({ files: [{ path: 'a.ts', loc }], imports: [], parts: [], links: [], services: [], unresolvedImports: 0 });

describe('map cache', () => {
  it('keys on owner/repo@treeSha plus the facts version, lowercased', () => {
    expect(cacheKey('Vrun', 'Repo', 'ABC')).toBe(`vrun/repo@abc#v${FACTS_VERSION}`);
  });

  it('returns what was written, and a miss for anything else', async () => {
    const store = memory();
    await writeCache(store, 'k', facts(7), 100);
    expect((await readCache(store, 'k'))?.files[0]?.loc).toBe(7);
    expect(await readCache(store, 'other')).toBeUndefined();
  });

  it('keeps 50 entries and evicts the least recently used, counting a touch as a use', async () => {
    const store = memory();
    for (let i = 0; i < CACHE_CAP; i++) await writeCache(store, `k${i}`, facts(), 1000 + i);
    await touchCache(store, 'k0', 5000); // k0 is now the freshest
    await writeCache(store, 'new', facts(), 6000);
    expect(store.rows.size).toBe(CACHE_CAP);
    expect(store.rows.has('k0')).toBe(true);
    expect(store.rows.has('k1')).toBe(false);
    expect(store.rows.has('new')).toBe(true);
  });

  it('does not store an entry over 5 MB', async () => {
    const store = memory();
    await writeCache(store, 'huge', { ...facts(), files: Array.from({ length: 150_000 }, (_, i) => ({ path: `some/long/path/to/file${i}.ts`, loc: i })) });
    expect(store.rows.size).toBe(0);
  });

  it('treats a failing store as a miss and a lost write, not an error', async () => {
    const fail = async (): Promise<never> => { throw new Error('x'); };
    const broken: CacheStore = { get: fail, put: fail, touch: fail, list: async () => [], remove: async () => undefined };
    expect(await readCache(broken, 'k')).toBeUndefined();
    await expect(writeCache(broken, 'k', facts())).resolves.toBeUndefined();
    await expect(touchCache(broken, 'k')).resolves.toBeUndefined();
  });
});

describe('IndexedDB store', () => {
  it('round-trips, evicts through the same four calls, and a missing factory means no cache', async () => {
    expect(createIdbStore(null)).toBeNull();
    const store = createIdbStore(indexedDB)!;
    await writeCache(store, 'one', facts(3), 100, 2);
    await writeCache(store, 'two', facts(4), 200, 2);
    await touchCache(store, 'one', 300);
    await writeCache(store, 'three', facts(5), 400, 2);
    expect((await readCache(store, 'one'))?.files[0]?.loc).toBe(3);
    expect(await readCache(store, 'two')).toBeUndefined();
    expect((await store.list()).map((e) => e.key).sort()).toEqual(['one', 'three']);
  });
});
