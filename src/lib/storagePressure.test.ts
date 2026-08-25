import { describe, expect, it, vi } from 'vitest';
import {
  OPENFLOWKIT_STORAGE_KEY,
  classifyStoragePressure,
  estimateTrackedLocalStorageUsageBytes,
  estimateTrackedLocalStorageUsageRatio,
  inspectBrowserStoragePressure,
  isQuotaExceededError,
  requestBrowserPersistentStorage,
} from './storagePressure';

function createStorage(entries: Record<string, string>): Storage {
  return {
    length: Object.keys(entries).length,
    clear: () => {},
    getItem: (key: string) => entries[key] ?? null,
    key: (index: number) => Object.keys(entries)[index] ?? null,
    removeItem: () => {},
    setItem: () => {},
  };
}

describe('storagePressure', () => {
  it('counts only tracked keys', () => {
    const storage = createStorage({
      [OPENFLOWKIT_STORAGE_KEY]: 'abc',
      unrelated: 'should-not-count',
    });

    const usage = estimateTrackedLocalStorageUsageBytes(storage);
    const expected = (OPENFLOWKIT_STORAGE_KEY.length + 3) * 2;

    expect(usage).toBe(expected);
  });

  it('computes ratio against provided quota', () => {
    const storage = createStorage({
      [OPENFLOWKIT_STORAGE_KEY]: '12345',
    });
    const usage = estimateTrackedLocalStorageUsageBytes(storage);

    expect(estimateTrackedLocalStorageUsageRatio(storage, usage * 2)).toBeCloseTo(0.5, 5);
  });

  it('classifies warning and critical pressure at stable thresholds', () => {
    expect(classifyStoragePressure(0.749)).toBe('healthy');
    expect(classifyStoragePressure(0.75)).toBe('warning');
    expect(classifyStoragePressure(0.9)).toBe('critical');
  });

  it('reads browser-wide quota and persistence state', async () => {
    const snapshot = await inspectBrowserStoragePressure({
      storageManager: {
        estimate: async () => ({ usage: 920, quota: 1000 }),
        persisted: async () => false,
      },
      fallbackStorage: null,
    });
    expect(snapshot).toEqual({
      level: 'critical',
      usageBytes: 920,
      quotaBytes: 1000,
      ratio: 0.92,
      persisted: false,
      source: 'storage-estimate',
    });
  });

  it('falls back safely when the browser estimate fails', async () => {
    const storage = createStorage({ [OPENFLOWKIT_STORAGE_KEY]: '12345' });
    const snapshot = await inspectBrowserStoragePressure({
      storageManager: { estimate: async () => { throw new Error('denied'); } },
      fallbackStorage: storage,
    });
    expect(snapshot.source).toBe('local-fallback');
    expect(snapshot.usageBytes).toBeGreaterThan(0);
  });

  it('recognizes browser quota errors without matching unrelated failures', () => {
    expect(isQuotaExceededError(new DOMException('full', 'QuotaExceededError'))).toBe(true);
    expect(isQuotaExceededError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true);
    expect(isQuotaExceededError(new Error('disk error'))).toBe(false);
  });

  it('requests persistent storage only through the explicit API', async () => {
    const persist = vi.fn(async () => true);
    expect(await requestBrowserPersistentStorage({
      estimate: async () => ({}),
      persisted: async () => false,
      persist,
    })).toBe('granted');
    expect(persist).toHaveBeenCalledTimes(1);
    expect(await requestBrowserPersistentStorage({
      estimate: async () => ({}),
    })).toBe('unsupported');
  });
});
