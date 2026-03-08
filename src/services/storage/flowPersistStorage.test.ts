import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import { createFlowPersistStorage } from './flowPersistStorage';
import { ensureFlowPersistenceSchema } from './indexedDbSchema';

vi.mock('./indexedDbSchema', () => ({
  ensureFlowPersistenceSchema: vi.fn(() => Promise.resolve()),
}));

describe('flowPersistStorage', () => {
  const originalFlag = ROLLOUT_FLAGS.indexedDbStorageV1;
  const originalIndexedDb = globalThis.indexedDB;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    ROLLOUT_FLAGS.indexedDbStorageV1 = originalFlag;
    vi.mocked(ensureFlowPersistenceSchema).mockClear();
    if (typeof originalIndexedDb === 'undefined') {
      // `delete` is required to restore the undefined global.
      delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    } else {
      globalThis.indexedDB = originalIndexedDb;
    }
    globalThis.localStorage = originalLocalStorage;
  });

  it('uses localStorage storage path when indexedDbStorageV1 is disabled', () => {
    ROLLOUT_FLAGS.indexedDbStorageV1 = false;
    globalThis.indexedDB = {} as IDBFactory;

    const storage = createFlowPersistStorage();

    expect(storage.getItem).toBeTypeOf('function');
    expect(storage.setItem).toBeTypeOf('function');
    expect(ensureFlowPersistenceSchema).not.toHaveBeenCalled();
  });

  it('attempts IndexedDB schema init when indexedDbStorageV1 is enabled', () => {
    ROLLOUT_FLAGS.indexedDbStorageV1 = true;
    globalThis.indexedDB = {} as IDBFactory;

    createFlowPersistStorage();

    expect(ensureFlowPersistenceSchema).toHaveBeenCalledWith(globalThis.indexedDB);
  });

  it('does not attempt schema init when IndexedDB is unavailable', () => {
    ROLLOUT_FLAGS.indexedDbStorageV1 = true;
    delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;

    createFlowPersistStorage();

    expect(ensureFlowPersistenceSchema).not.toHaveBeenCalled();
  });

  it('debounces rapid writes before hitting the underlying storage', async () => {
    ROLLOUT_FLAGS.indexedDbStorageV1 = false;
    const setItem = vi.fn();
    globalThis.localStorage = {
      getItem: vi.fn(() => null),
      setItem,
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    } as unknown as Storage;

    const storage = createFlowPersistStorage();
    const firstWrite = storage.setItem('openflowkit-storage', { state: { activeTabId: 'tab-1' } as never, version: 1 });
    const secondWrite = storage.setItem('openflowkit-storage', { state: { activeTabId: 'tab-2' } as never, version: 1 });

    expect(setItem).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(250);
    await Promise.all([firstWrite, secondWrite]);

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem.mock.calls[0][1]).toContain('"activeTabId":"tab-2"');
  });

  it('flushes a pending write before reading the same key', async () => {
    ROLLOUT_FLAGS.indexedDbStorageV1 = false;
    const setItem = vi.fn();
    const getItem = vi.fn(() => '{"state":{"activeTabId":"tab-2"},"version":1}');
    globalThis.localStorage = {
      getItem,
      setItem,
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    } as unknown as Storage;

    const storage = createFlowPersistStorage();
    const write = storage.setItem('openflowkit-storage', { state: { activeTabId: 'tab-2' } as never, version: 1 });
    const read = storage.getItem('openflowkit-storage');

    await Promise.all([write, read]);

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(getItem).toHaveBeenCalledTimes(1);
  });
});
