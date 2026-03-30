import { describe, expect, it, vi } from 'vitest';
import { createIndexedDbStateStorage } from './indexedDbStateStorage';
import { openFlowPersistenceDatabase } from './indexedDbSchema';

vi.mock('./indexedDbSchema', () => ({
  FLOW_METADATA_STORE_NAME: 'flowMetadata',
  SCHEMA_META_STORE_NAME: 'schemaMeta',
  openFlowPersistenceDatabase: vi.fn(),
}));

type MockRequest<T> = {
  result: T;
  error: Error | null;
  onsuccess: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
};

function createRequest<T>(result: T, error: Error | null = null): IDBRequest<T> {
  const request: MockRequest<T> = {
    result,
    error,
    onsuccess: null,
    onerror: null,
  };

  queueMicrotask(() => {
    if (error) {
      request.onerror?.(new Event('error'));
      return;
    }
    request.onsuccess?.(new Event('success'));
  });

  return request as unknown as IDBRequest<T>;
}

function createMockDatabase(initialRecords: Record<string, string> = {}): IDBDatabase {
  const stateRecords = new Map<string, string>(Object.entries(initialRecords));
  const schemaRecords = new Map<string, string>();

  function createObjectStore(records: Map<string, string>): IDBObjectStore {
    return {
      get: vi.fn((id: string) => {
        const value = records.get(id);
        return createRequest(value ? { id, value } : undefined);
      }),
      put: vi.fn((record: { id: string; value: string }) => {
        records.set(record.id, record.value);
        return createRequest(record.id);
      }),
      delete: vi.fn((id: string) => {
        records.delete(id);
        return createRequest(undefined);
      }),
    } as unknown as IDBObjectStore;
  }

  const stateObjectStore = createObjectStore(stateRecords);
  const schemaObjectStore = createObjectStore(schemaRecords);

  const transaction = {
    objectStore: vi.fn((storeName: string) => {
      if (storeName === 'schemaMeta') {
        return schemaObjectStore;
      }

      return stateObjectStore;
    }),
  } as unknown as IDBTransaction;

  return {
    transaction: vi.fn(() => transaction),
    close: vi.fn(),
  } as unknown as IDBDatabase;
}

describe('indexedDbStateStorage', () => {
  it('migrates localStorage value on first read', async () => {
    const db = createMockDatabase();
    vi.mocked(openFlowPersistenceDatabase).mockResolvedValue(db);
    const localStorageRef = {
      getItem: vi.fn(() => '{"state":{"tabs":[]}}'),
    } as unknown as Storage;

    const storage = createIndexedDbStateStorage({
      indexedDbFactory: {} as IDBFactory,
      localStorageRef,
    });

    const value = await storage.getItem('openflowkit-storage');

    expect(value).toBe('{"state":{"tabs":[]}}');
    expect(localStorageRef.getItem).toHaveBeenCalledWith('openflowkit-storage');
  });

  it('writes and removes values through IndexedDB store', async () => {
    const db = createMockDatabase();
    vi.mocked(openFlowPersistenceDatabase).mockResolvedValue(db);
    const storage = createIndexedDbStateStorage({
      indexedDbFactory: {} as IDBFactory,
      localStorageRef: null,
    });

    await storage.setItem('openflowkit-storage', '{"state":{"activeTabId":"tab-2"}}');
    const storedValue = await storage.getItem('openflowkit-storage');
    expect(storedValue).toBe('{"state":{"activeTabId":"tab-2"}}');

    await storage.removeItem('openflowkit-storage');
    const afterDelete = await storage.getItem('openflowkit-storage');
    expect(afterDelete).toBeNull();
  });
});
