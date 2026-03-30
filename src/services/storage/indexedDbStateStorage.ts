import type { StateStorage } from 'zustand/middleware';
import { FLOW_METADATA_STORE_NAME, SCHEMA_META_STORE_NAME, openFlowPersistenceDatabase } from './indexedDbSchema';
import { reportStorageTelemetry } from './storageTelemetry';

const MIGRATION_MARKER_PREFIX = '__migration__:localStorage:v1:';

type PersistRecord = {
  id: string;
  value: string;
};

type IndexedDbStateStorageOptions = {
  indexedDbFactory: IDBFactory;
  localStorageRef: Storage | null;
};

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

async function readRecord(database: IDBDatabase, recordId: string): Promise<PersistRecord | null> {
  const transaction = database.transaction(SCHEMA_META_STORE_NAME, 'readonly');
  const store = transaction.objectStore(SCHEMA_META_STORE_NAME);
  const request = store.get(recordId) as IDBRequest<PersistRecord | undefined>;
  const result = await requestToPromise(request);
  return result ?? null;
}

async function writeRecord(database: IDBDatabase, recordId: string, value: string): Promise<void> {
  const transaction = database.transaction(SCHEMA_META_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SCHEMA_META_STORE_NAME);
  const request = store.put({ id: recordId, value } satisfies PersistRecord);
  await requestToPromise(request);
}

async function readStateRecord(database: IDBDatabase, recordId: string): Promise<PersistRecord | null> {
  const transaction = database.transaction(FLOW_METADATA_STORE_NAME, 'readonly');
  const store = transaction.objectStore(FLOW_METADATA_STORE_NAME);
  const request = store.get(recordId) as IDBRequest<PersistRecord | undefined>;
  const result = await requestToPromise(request);
  return result ?? null;
}

async function writeStateRecord(database: IDBDatabase, recordId: string, value: string): Promise<void> {
  const transaction = database.transaction(FLOW_METADATA_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(FLOW_METADATA_STORE_NAME);
  await requestToPromise(store.put({ id: recordId, value } satisfies PersistRecord));
}

async function deleteStateRecord(database: IDBDatabase, recordId: string): Promise<void> {
  const transaction = database.transaction(FLOW_METADATA_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(FLOW_METADATA_STORE_NAME);
  await requestToPromise(store.delete(recordId));
}

function migrationMarkerKey(storageKey: string): string {
  return `${MIGRATION_MARKER_PREFIX}${storageKey}`;
}

export function createIndexedDbStateStorage(options: IndexedDbStateStorageOptions): StateStorage {
  const migratedKeys = new Set<string>();

  async function withDatabase<T>(handler: (database: IDBDatabase) => Promise<T>): Promise<T> {
    const database = await openFlowPersistenceDatabase(options.indexedDbFactory);
    try {
      return await handler(database);
    } finally {
      database.close();
    }
  }

  async function migrateFromLocalStorageIfNeeded(storageKey: string): Promise<void> {
    if (migratedKeys.has(storageKey)) return;

    await withDatabase(async (database) => {
      const markerId = migrationMarkerKey(storageKey);
      const migrationMarker = await readRecord(database, markerId);
      if (migrationMarker) {
        migratedKeys.add(storageKey);
        return;
      }

      const persistedStateRecord = await readStateRecord(database, storageKey);
      if (persistedStateRecord) {
        await writeRecord(database, markerId, 'done');
        migratedKeys.add(storageKey);
        return;
      }
      if (options.localStorageRef) {
        const localValue = options.localStorageRef.getItem(storageKey);
        if (typeof localValue === 'string') {
          await writeStateRecord(database, storageKey, localValue);
          reportStorageTelemetry({
            area: 'indexeddb-state',
            code: 'STATE_MIGRATED_FROM_LOCAL',
            severity: 'info',
            message: `Migrated persisted state key "${storageKey}" from localStorage to IndexedDB.`,
          });
        }
      }

      await writeRecord(database, markerId, 'done');
      migratedKeys.add(storageKey);
    });
  }

  return {
    getItem: async (storageKey) => {
      await migrateFromLocalStorageIfNeeded(storageKey);
      return withDatabase(async (database) => {
        const record = await readStateRecord(database, storageKey);
        return record ? record.value : null;
      });
    },
    setItem: async (storageKey, value) => {
      await migrateFromLocalStorageIfNeeded(storageKey);
      await withDatabase(async (database) => {
        await writeStateRecord(database, storageKey, value);
      });
    },
    removeItem: async (storageKey) => {
      await withDatabase(async (database) => {
        await deleteStateRecord(database, storageKey);
      });
    },
  };
}
