import type { FlowSnapshot } from '@/lib/types';
import { APP_STORAGE_KEYS } from '@/lib/legacyBranding';
import { FLOW_DOCUMENT_STORE_NAME, openFlowPersistenceDatabase } from './indexedDbSchema';
import { getBrowserIndexedDbFactory } from './storageRuntime';
import {
  readLocalStorageString,
  removeLocalStorageKey,
  writeLocalStorageString,
} from './uiLocalStorage';
import { reportStorageTelemetry } from './storageTelemetry';

const SNAPSHOT_STORAGE_KEY = APP_STORAGE_KEYS.snapshots;

type SnapshotRecord = {
  id: string;
  value: string;
};

function parseSnapshots(raw: string | null | undefined): FlowSnapshot[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as FlowSnapshot[] : [];
  } catch {
    return [];
  }
}

function readSnapshotsFromLocalStorage(): FlowSnapshot[] {
  return parseSnapshots(readLocalStorageString(SNAPSHOT_STORAGE_KEY));
}

function writeSnapshotsToLocalStorage(snapshots: FlowSnapshot[]): void {
  writeLocalStorageString(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

async function readSnapshotRecord(indexedDbFactory: IDBFactory): Promise<SnapshotRecord | null> {
  const database = await openFlowPersistenceDatabase(indexedDbFactory);
  try {
    const transaction = database.transaction(FLOW_DOCUMENT_STORE_NAME, 'readonly');
    const store = transaction.objectStore(FLOW_DOCUMENT_STORE_NAME);
    const request = store.get(SNAPSHOT_STORAGE_KEY) as IDBRequest<SnapshotRecord | undefined>;
    const record = await requestToPromise(request);
    return record ?? null;
  } finally {
    database.close();
  }
}

async function writeSnapshotRecord(indexedDbFactory: IDBFactory, snapshots: FlowSnapshot[]): Promise<void> {
  const serialized = JSON.stringify(snapshots);
  const database = await openFlowPersistenceDatabase(indexedDbFactory);
  try {
    const transaction = database.transaction(FLOW_DOCUMENT_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(FLOW_DOCUMENT_STORE_NAME);
    const request = store.put({ id: SNAPSHOT_STORAGE_KEY, value: serialized } satisfies SnapshotRecord);
    await requestToPromise(request);
  } finally {
    database.close();
  }
}

export async function loadSnapshots(): Promise<FlowSnapshot[]> {
  const indexedDbFactory = getBrowserIndexedDbFactory();
  if (!indexedDbFactory) {
    return readSnapshotsFromLocalStorage();
  }

  try {
    const record = await readSnapshotRecord(indexedDbFactory);
    if (record) return parseSnapshots(record.value);

    const fallbackSnapshots = readSnapshotsFromLocalStorage();
    if (fallbackSnapshots.length > 0) {
      await writeSnapshotRecord(indexedDbFactory, fallbackSnapshots);
    }
    return fallbackSnapshots;
  } catch {
    reportStorageTelemetry({
      area: 'snapshot',
      code: 'SNAPSHOT_LOAD_FALLBACK_LOCAL',
      severity: 'warning',
      message: 'Snapshot IndexedDB load failed; falling back to localStorage snapshots.',
    });
    return readSnapshotsFromLocalStorage();
  }
}

export async function saveSnapshots(snapshots: FlowSnapshot[]): Promise<void> {
  const indexedDbFactory = getBrowserIndexedDbFactory();
  if (!indexedDbFactory) {
    writeSnapshotsToLocalStorage(snapshots);
    return;
  }

  try {
    await writeSnapshotRecord(indexedDbFactory, snapshots);
    removeLocalStorageKey(SNAPSHOT_STORAGE_KEY);
  } catch {
    reportStorageTelemetry({
      area: 'snapshot',
      code: 'SNAPSHOT_SAVE_FALLBACK_LOCAL',
      severity: 'warning',
      message: 'Snapshot IndexedDB save failed; falling back to localStorage snapshots.',
    });
    writeSnapshotsToLocalStorage(snapshots);
  }
}
