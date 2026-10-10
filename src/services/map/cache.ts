// The map's cache: facts per `owner/repo@treeSha`, in its own IndexedDB database (the app's schema is untouched).
// A tree sha names the content exactly, so a hit never goes stale; the only job left is keeping the store small.
import { compare } from '../../dsl/discovery/imports/paths';
import type { MapFacts } from '../../dsl/map/types';

export const CACHE_CAP = 50;
/** Bump when what the facts contain changes: old entries then simply never match. (3: partial reads carry `sampled`; 4: `ref`.) */
export const FACTS_VERSION = 4;
/** A repo whose facts are bigger than this is rebuilt each time rather than stored. */
const MAX_ENTRY_CHARS = 5_000_000;

export interface CachedFacts {
  files: { path: string; loc: number }[];
  imports: MapFacts['imports'];
  parts: NonNullable<MapFacts['parts']>;
  links: NonNullable<MapFacts['links']>;
  /** Outside services and stores the parts talk to (`ext:` nodes). */
  services: NonNullable<MapFacts['externals']>;
  /** Broken imports the scan found, for `stats.unresolved`. */
  unresolvedImports: number;
  /** The map was not the whole repo (see `MapProgress.sampled`): a hit says so too. */
  sampled?: { read: number; total: number; truncated?: boolean };
  /** The ref the facts were read at: a tree sha names content, not which branch asked for it. */
  ref?: string;
}

export interface CacheEntry {
  key: string;
  facts: CachedFacts;
  scannedAt: number;
}

/**
 * What the cache needs from storage, so a test (or a browser without IndexedDB) swaps the backend. Use times live
 * apart from the facts: a revisit rewrites a few bytes, never the megabytes of an entry.
 */
export interface CacheStore {
  get(key: string): Promise<CacheEntry | undefined>;
  put(entry: CacheEntry): Promise<void>;
  touch(key: string, usedAt: number): Promise<void>;
  list(): Promise<{ key: string; usedAt: number }[]>;
  remove(key: string): Promise<void>;
}

export const cacheKey = (owner: string, repo: string, treeSha: string): string => `${owner}/${repo}@${treeSha}#v${FACTS_VERSION}`.toLowerCase();

/** The facts for a key, or undefined. Storage trouble is a miss, never an error: the cache only ever saves time. */
export async function readCache(store: CacheStore, key: string): Promise<CachedFacts | undefined> {
  try {
    return (await store.get(key))?.facts;
  } catch {
    return undefined;
  }
}

/**
 * What to show when GitHub will not answer for the tree: the newest facts cached for this repo at `ref`, else the newest
 * at any ref (the caller says which ref it is).
 */
export async function latestCache(store: CacheStore, owner: string, repo: string, ref: string): Promise<CachedFacts | undefined> {
  try {
    const prefix = `${owner}/${repo}@`.toLowerCase();
    const mine = (await store.list()).filter((e) => e.key.startsWith(prefix) && e.key.endsWith(`#v${FACTS_VERSION}`)).sort((a, b) => b.usedAt - a.usedAt);
    const all = (await Promise.all(mine.map((e) => readCache(store, e.key)))).filter((f): f is CachedFacts => f !== undefined);
    return all.find((f) => f.ref === ref) ?? all[0];
  } catch {
    return undefined;
  }
}

/** Marks a hit as used. Called after the map is on screen, since it is only bookkeeping. */
export async function touchCache(store: CacheStore, key: string, now = Date.now()): Promise<void> {
  try {
    await store.touch(key, now);
  } catch {
    // Bookkeeping only.
  }
}

/** Stores the facts, then evicts the least recently used entries beyond the cap. */
export async function writeCache(store: CacheStore, key: string, facts: CachedFacts, now = Date.now(), cap = CACHE_CAP): Promise<void> {
  try {
    if (JSON.stringify(facts).length > MAX_ENTRY_CHARS) return;
    await store.put({ key, facts, scannedAt: now });
    await store.touch(key, now);
    const all = (await store.list()).sort((a, b) => a.usedAt - b.usedAt || compare(a.key, b.key));
    for (const old of all.slice(0, Math.max(0, all.length - cap))) await store.remove(old.key);
  } catch {
    // Quota or a blocked database: the map still loaded.
  }
}

const DB = 'ofk-map-cache';
const FACTS = 'facts';
const USED = 'used';

const asPromise = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
});

/** The IndexedDB backend, or null where there is none (tests, private modes that refuse it). */
export function createIdbStore(given?: IDBFactory | null): CacheStore | null {
  const factory = given === undefined ? (typeof indexedDB === 'undefined' ? null : indexedDB) : given;
  if (!factory) return null;
  const open = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    const request = factory.open(DB, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      // Version 1 kept use times inside each entry: drop those entries (their keys no longer match anyway).
      if (db.objectStoreNames.contains(FACTS)) db.deleteObjectStore(FACTS);
      db.createObjectStore(FACTS, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(USED)) db.createObjectStore(USED, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed.'));
  });
  const inStore = async <T>(name: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await open();
    try {
      return await asPromise(run(db.transaction(name, mode).objectStore(name)));
    } finally {
      db.close();
    }
  };
  return {
    get: (key) => inStore(FACTS, 'readonly', (s) => s.get(key) as IDBRequest<CacheEntry | undefined>),
    put: async (entry) => { await inStore(FACTS, 'readwrite', (s) => s.put(entry)); },
    touch: async (key, usedAt) => { await inStore(USED, 'readwrite', (s) => s.put({ key, usedAt })); },
    list: () => inStore(USED, 'readonly', (s) => s.getAll() as IDBRequest<{ key: string; usedAt: number }[]>),
    remove: async (key) => {
      await inStore(FACTS, 'readwrite', (s) => s.delete(key));
      await inStore(USED, 'readwrite', (s) => s.delete(key));
    },
  };
}
