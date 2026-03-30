import { openFlowPersistenceDatabase } from './indexedDbSchema';

export type StoredRecord = { id: string };

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

export function getIndexedDbFactory(): IDBFactory | null {
  if (typeof indexedDB === 'undefined') return null;
  return indexedDB;
}

export async function withDatabase<T>(handler: (database: IDBDatabase) => Promise<T>): Promise<T> {
  const indexedDbFactory = getIndexedDbFactory();
  if (!indexedDbFactory) {
    throw new Error('IndexedDB is not available.');
  }

  const database = await openFlowPersistenceDatabase(indexedDbFactory);
  try {
    return await handler(database);
  } finally {
    database.close();
  }
}

export async function getAllRecords<T extends StoredRecord>(
  database: IDBDatabase,
  storeName: string
): Promise<T[]> {
  const transaction = database.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);
  const request = store.getAll() as IDBRequest<T[]>;
  return requestToPromise(request);
}

export async function getAllRecordsByIndex<T>(
  database: IDBDatabase,
  storeName: string,
  indexName: string,
  query: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  const transaction = database.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);
  const index = store.index(indexName);
  const request = index.getAll(query) as IDBRequest<T[]>;
  return requestToPromise(request);
}

export async function getRecord<T>(
  database: IDBDatabase,
  storeName: string,
  id: string
): Promise<T | null> {
  const transaction = database.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);
  const request = store.get(id) as IDBRequest<T | undefined>;
  const result = await requestToPromise(request);
  return result ?? null;
}

export async function putRecord<T>(
  database: IDBDatabase,
  storeName: string,
  value: T
): Promise<void> {
  const transaction = database.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  await requestToPromise(store.put(value));
}

export async function deleteRecord(
  database: IDBDatabase,
  storeName: string,
  id: string
): Promise<void> {
  const transaction = database.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  await requestToPromise(store.delete(id));
}

export async function deleteWhereDocumentId(
  database: IDBDatabase,
  storeName: string,
  documentId: string
): Promise<void> {
  const transaction = database.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  const allRequest = store.getAll() as IDBRequest<Array<{ id: string; documentId?: string }>>;
  const existing = await requestToPromise(allRequest);
  await Promise.all(
    existing
      .filter((record) => record.documentId === documentId)
      .map((record) => requestToPromise(store.delete(record.id)))
  );
}

export async function deleteRecordsByIndex(
  database: IDBDatabase,
  storeName: string,
  indexName: string,
  query: IDBValidKey | IDBKeyRange
): Promise<void> {
  const transaction = database.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  const index = store.index(indexName);
  const existing = await requestToPromise(
    index.getAll(query) as IDBRequest<Array<{ id: string }>>
  );

  await Promise.all(
    existing.map((record) => requestToPromise(store.delete(record.id)))
  );
}
