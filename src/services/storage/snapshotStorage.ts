import type { FlowSnapshot } from '@/lib/types';
import { APP_STORAGE_KEYS } from '@/lib/legacyBranding';
import { FLOW_DOCUMENT_STORE_NAME, openFlowPersistenceDatabase } from './indexedDbSchema';
import { getBrowserIndexedDbFactory } from './storageRuntime';
import {
  readLocalStorageString,
  removeLocalStorageKey,
} from './uiLocalStorage';
import { reportStorageTelemetry } from './storageTelemetry';
import { isQuotaExceededError } from '@/lib/storagePressure';

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
  if (typeof localStorage === 'undefined') throw new Error('localStorage is unavailable.');
  localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
}

export interface SnapshotSaveResult {
  readonly status: 'saved' | 'degraded' | 'failed';
  readonly retainedCount: number;
  readonly droppedAutoCount: number;
}

function quotaRecoveryCandidates(snapshots: readonly FlowSnapshot[]): FlowSnapshot[][] {
  const manual = snapshots.filter((snapshot) => snapshot.kind !== 'auto');
  const newestAuto = snapshots.find((snapshot) => snapshot.kind === 'auto');
  const candidates = [
    newestAuto ? [...manual, newestAuto] : manual,
    manual,
    snapshots.length > 0 ? [snapshots[0]] : [],
  ];
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (candidate.length === 0 || candidate.length >= snapshots.length) return false;
    const identity = candidate.map(({ id }) => id).join('\u0000');
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export async function saveSnapshotsWithQuotaRecovery(
  snapshots: readonly FlowSnapshot[],
  writer: (candidate: FlowSnapshot[]) => Promise<void> | void
): Promise<SnapshotSaveResult> {
  try {
    await writer([...snapshots]);
    return { status: 'saved', retainedCount: snapshots.length, droppedAutoCount: 0 };
  } catch (error) {
    if (!isQuotaExceededError(error)) throw error;
  }

  for (const candidate of quotaRecoveryCandidates(snapshots)) {
    try {
      await writer(candidate);
      return {
        status: 'degraded',
        retainedCount: candidate.length,
        droppedAutoCount: snapshots.filter(({ kind }) => kind === 'auto').length
          - candidate.filter(({ kind }) => kind === 'auto').length,
      };
    } catch (error) {
      if (!isQuotaExceededError(error)) throw error;
    }
  }
  return { status: 'failed', retainedCount: 0, droppedAutoCount: 0 };
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

function reportSaveResult(result: SnapshotSaveResult, target: 'indexeddb' | 'localStorage'): void {
  if (result.status === 'saved') return;
  reportStorageTelemetry({
    area: 'snapshot',
    code: result.status === 'degraded' ? 'SNAPSHOT_QUOTA_AUTO_PRUNED' : 'SNAPSHOT_QUOTA_EXHAUSTED',
    severity: result.status === 'degraded' ? 'warning' : 'error',
    message: result.status === 'degraded'
      ? `${target} quota pressure dropped ${result.droppedAutoCount} automatic snapshots and retained ${result.retainedCount} snapshots.`
      : `${target} quota is exhausted; snapshot persistence could not continue.`,
  });
}

async function saveSnapshotsToLocalStorage(
  snapshots: FlowSnapshot[]
): Promise<SnapshotSaveResult> {
  try {
    const result = await saveSnapshotsWithQuotaRecovery(
      snapshots,
      writeSnapshotsToLocalStorage
    );
    reportSaveResult(result, 'localStorage');
    return result;
  } catch (error) {
    reportStorageTelemetry({
      area: 'snapshot',
      code: 'SNAPSHOT_SAVE_FAILED',
      severity: 'error',
      message: `Snapshot persistence failed. ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    return { status: 'failed', retainedCount: 0, droppedAutoCount: 0 };
  }
}

export async function saveSnapshots(snapshots: FlowSnapshot[]): Promise<SnapshotSaveResult> {
  const indexedDbFactory = getBrowserIndexedDbFactory();
  if (!indexedDbFactory) {
    return saveSnapshotsToLocalStorage(snapshots);
  }

  try {
    const result = await saveSnapshotsWithQuotaRecovery(
      snapshots,
      (candidate) => writeSnapshotRecord(indexedDbFactory, candidate)
    );
    reportSaveResult(result, 'indexeddb');
    if (result.status !== 'failed') removeLocalStorageKey(SNAPSHOT_STORAGE_KEY);
    return result;
  } catch (error) {
    reportStorageTelemetry({
      area: 'snapshot',
      code: 'SNAPSHOT_SAVE_FALLBACK_LOCAL',
      severity: 'warning',
      message: `Snapshot IndexedDB save failed; falling back to localStorage snapshots. ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    return saveSnapshotsToLocalStorage(snapshots);
  }
}
