import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ensureStorageSchemaReady,
  getBrowserIndexedDbFactory,
  resetStorageRuntimeForTests,
} from './storageRuntime';
import { ensureFlowPersistenceSchema } from './indexedDbSchema';

vi.mock('./indexedDbSchema', () => ({
  ensureFlowPersistenceSchema: vi.fn(() => Promise.resolve()),
}));

describe('storageRuntime', () => {
  const originalIndexedDb = globalThis.indexedDB;

  afterEach(() => {
    resetStorageRuntimeForTests();
    vi.mocked(ensureFlowPersistenceSchema).mockClear();
    if (typeof originalIndexedDb === 'undefined') {
      delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    } else {
      globalThis.indexedDB = originalIndexedDb;
    }
  });

  it('returns null when IndexedDB is unavailable', () => {
    delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;

    expect(getBrowserIndexedDbFactory()).toBeNull();
  });

  it('initializes schema at most once per runtime', async () => {
    globalThis.indexedDB = {} as IDBFactory;

    await Promise.all([ensureStorageSchemaReady(), ensureStorageSchemaReady()]);

    expect(ensureFlowPersistenceSchema).toHaveBeenCalledTimes(1);
    expect(ensureFlowPersistenceSchema).toHaveBeenCalledWith(globalThis.indexedDB);
  });
});
