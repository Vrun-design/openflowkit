import { APP_STORAGE_KEYS } from '@/lib/legacyBranding';
import {
  ASSETS_STORE_NAME,
  CHAT_MESSAGES_STORE_NAME,
  CHAT_THREADS_STORE_NAME,
  DOCUMENT_SESSIONS_STORE_NAME,
  FLOW_DOCUMENT_STORE_NAME,
  FLOW_METADATA_STORE_NAME,
  PERSISTED_DOCUMENTS_STORE_NAME,
  PREFERENCES_STORE_NAME,
  WORKSPACE_META_STORE_NAME,
  openFlowPersistenceDatabase,
} from './indexedDbSchema';
import { getBrowserIndexedDbFactory } from './storageRuntime';

export type StorageAccountingCategory =
  | 'documents'
  | 'snapshots'
  | 'assets'
  | 'conversations'
  | 'appData';

export interface StorageCategoryAccounting {
  readonly category: StorageAccountingCategory;
  readonly estimatedBytes: number;
  readonly records: number;
}

export interface StorageAccountingSnapshot {
  readonly status: 'complete' | 'partial' | 'unavailable';
  readonly source: 'indexeddb' | 'local-storage' | 'none';
  readonly categories: readonly StorageCategoryAccounting[];
  readonly categorizedBytes: number;
  readonly browserUsageBytes: number | null;
  readonly browserQuotaBytes: number | null;
  readonly unattributedBytes: number | null;
  readonly truncated: boolean;
}

const CATEGORY_ORDER: readonly StorageAccountingCategory[] = [
  'documents',
  'snapshots',
  'assets',
  'conversations',
  'appData',
];
const MAX_RECORDS_PER_STORE = 5_000;
const MAX_VALUE_NODES = 100_000;

interface ValueEstimate {
  readonly bytes: number;
  readonly truncated: boolean;
}

export function estimateStructuredStorageBytes(value: unknown): ValueEstimate {
  const seen = new WeakSet<object>();
  let visited = 0;
  let truncated = false;

  function visit(candidate: unknown): number {
    visited += 1;
    if (visited > MAX_VALUE_NODES) {
      truncated = true;
      return 0;
    }
    if (candidate === null || candidate === undefined) return 0;
    if (typeof candidate === 'string') return candidate.length * 2;
    if (typeof candidate === 'number') return 8;
    if (typeof candidate === 'boolean') return 4;
    if (typeof candidate === 'bigint') return 8;
    if (typeof candidate !== 'object') return 0;
    if (candidate instanceof Blob) return candidate.size;
    if (candidate instanceof ArrayBuffer) return candidate.byteLength;
    if (ArrayBuffer.isView(candidate)) return candidate.byteLength;
    if (candidate instanceof Date) return 8;
    if (seen.has(candidate)) return 0;
    seen.add(candidate);

    if (Array.isArray(candidate)) {
      return candidate.reduce((sum, item) => sum + visit(item), 0);
    }
    return Object.entries(candidate).reduce(
      (sum, [key, item]) => sum + key.length * 2 + visit(item),
      0
    );
  }

  return { bytes: visit(value), truncated };
}

function categoryForRecord(storeName: string, value: unknown): StorageAccountingCategory {
  if (storeName === ASSETS_STORE_NAME) return 'assets';
  if (storeName === CHAT_MESSAGES_STORE_NAME || storeName === CHAT_THREADS_STORE_NAME) {
    return 'conversations';
  }
  if (storeName === FLOW_DOCUMENT_STORE_NAME
    && typeof value === 'object'
    && value !== null
    && (value as { id?: unknown }).id === APP_STORAGE_KEYS.snapshots) {
    return 'snapshots';
  }
  if ([
    FLOW_DOCUMENT_STORE_NAME,
    FLOW_METADATA_STORE_NAME,
    PERSISTED_DOCUMENTS_STORE_NAME,
    DOCUMENT_SESSIONS_STORE_NAME,
    WORKSPACE_META_STORE_NAME,
  ].includes(storeName)) return 'documents';
  return 'appData';
}

export function calculateStorageCategoryAccounting(
  records: readonly { readonly storeName: string; readonly value: unknown }[]
): { categories: StorageCategoryAccounting[]; truncated: boolean } {
  const totals = new Map<StorageAccountingCategory, { bytes: number; records: number }>(
    CATEGORY_ORDER.map((category) => [
    category,
    { bytes: 0, records: 0 },
    ])
  );
  let truncated = false;
  for (const record of records) {
    const category = categoryForRecord(record.storeName, record.value);
    const estimate = estimateStructuredStorageBytes(record.value);
    const total = totals.get(category);
    if (!total) continue;
    total.bytes += estimate.bytes;
    total.records += 1;
    truncated ||= estimate.truncated;
  }
  return {
    categories: CATEGORY_ORDER.map((category) => ({
      category,
      estimatedBytes: totals.get(category)?.bytes ?? 0,
      records: totals.get(category)?.records ?? 0,
    })),
    truncated,
  };
}

async function readStoreRecords(
  database: IDBDatabase,
  storeName: string
): Promise<{ records: Array<{ storeName: string; value: unknown }>; truncated: boolean }> {
  return new Promise((resolve, reject) => {
    const records: Array<{ storeName: string; value: unknown }> = [];
    const transaction = database.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).openCursor();
    request.onerror = () => reject(request.error ?? new Error(`Failed to inspect ${storeName}.`));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve({ records, truncated: false });
        return;
      }
      records.push({ storeName, value: cursor.value });
      if (records.length >= MAX_RECORDS_PER_STORE) {
        resolve({ records, truncated: true });
        return;
      }
      cursor.continue();
    };
  });
}

function localStorageRecords(storage: Storage): Array<{ storeName: string; value: unknown }> {
  const records: Array<{ storeName: string; value: unknown }> = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !/^(openflowkit|flowmind|ofk_)/.test(key)) continue;
    const value = storage.getItem(key);
    if (value === null) continue;
    const storeName = key === APP_STORAGE_KEYS.snapshots
      ? FLOW_DOCUMENT_STORE_NAME
      : key.startsWith('ofk_chat_history_')
        ? CHAT_MESSAGES_STORE_NAME
        : key.includes('document') || key === 'openflowkit-storage'
          ? PERSISTED_DOCUMENTS_STORE_NAME
          : PREFERENCES_STORE_NAME;
    records.push({ storeName, value: { id: key, value } });
  }
  return records;
}

async function browserEstimate(): Promise<{ usage: number | null; quota: number | null }> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    return {
      usage: typeof estimate?.usage === 'number' ? estimate.usage : null,
      quota: typeof estimate?.quota === 'number' ? estimate.quota : null,
    };
  } catch {
    return { usage: null, quota: null };
  }
}

export async function inspectStorageAccounting(params: {
  indexedDbFactory?: IDBFactory | null;
  fallbackStorage?: Storage | null;
} = {}): Promise<StorageAccountingSnapshot> {
  const indexedDbFactory = params.indexedDbFactory ?? getBrowserIndexedDbFactory();
  const fallbackStorage = params.fallbackStorage
    ?? (typeof localStorage === 'undefined' ? null : localStorage);
  const estimate = await browserEstimate();
  let source: StorageAccountingSnapshot['source'] = 'none';
  let status: StorageAccountingSnapshot['status'] = 'complete';
  let records: Array<{ storeName: string; value: unknown }> = [];
  let scanTruncated = false;

  if (indexedDbFactory) {
    try {
      const database = await openFlowPersistenceDatabase(indexedDbFactory);
      try {
        for (const storeName of Array.from(database.objectStoreNames)) {
          const scanned = await readStoreRecords(database, storeName);
          records.push(...scanned.records);
          scanTruncated ||= scanned.truncated;
        }
        source = 'indexeddb';
      } finally {
        database.close();
      }
    } catch {
      status = 'partial';
    }
  }
  if (source === 'none' && fallbackStorage) {
    records = localStorageRecords(fallbackStorage);
    source = 'local-storage';
  }
  if (source === 'none') status = 'unavailable';

  const calculated = calculateStorageCategoryAccounting(records);
  const categorizedBytes = calculated.categories.reduce(
    (sum, category) => sum + category.estimatedBytes,
    0
  );
  const truncated = scanTruncated || calculated.truncated;
  if (truncated && status === 'complete') status = 'partial';
  return {
    status,
    source,
    categories: calculated.categories,
    categorizedBytes,
    browserUsageBytes: estimate.usage,
    browserQuotaBytes: estimate.quota,
    unattributedBytes: estimate.usage === null
      ? null
      : Math.max(estimate.usage - categorizedBytes, 0),
    truncated,
  };
}

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1_024) return `${Math.round(bytes)} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}
