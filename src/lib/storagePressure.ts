const DEFAULT_LOCAL_STORAGE_QUOTA_BYTES = 5 * 1024 * 1024;
const OPENFLOWKIT_STORAGE_KEY = 'openflowkit-storage';
const STORAGE_WARNING_RATIO = 0.75;
const STORAGE_CRITICAL_RATIO = 0.9;

export type StoragePressureLevel = 'healthy' | 'warning' | 'critical' | 'unavailable';

export interface StoragePressureSnapshot {
  readonly level: StoragePressureLevel;
  readonly usageBytes: number | null;
  readonly quotaBytes: number | null;
  readonly ratio: number | null;
  readonly persisted: boolean | null;
  readonly source: 'storage-estimate' | 'local-fallback' | 'write-failure' | 'unavailable';
}

interface StorageManagerPort {
  estimate: () => Promise<{ usage?: number; quota?: number }>;
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}

export type PersistentStorageRequestResult = 'granted' | 'denied' | 'unsupported' | 'error';

function bytesForLocalStorageEntry(key: string, value: string): number {
  // localStorage values are UTF-16 strings; 2 bytes per code unit is a practical estimate.
  return (key.length + value.length) * 2;
}

export function estimateTrackedLocalStorageUsageBytes(storage: Storage): number {
  let total = 0;
  const trackedKeys = [OPENFLOWKIT_STORAGE_KEY];

  for (const key of trackedKeys) {
    const value = storage.getItem(key);
    if (!value) continue;
    total += bytesForLocalStorageEntry(key, value);
  }

  return total;
}

export function estimateTrackedLocalStorageUsageRatio(
  storage: Storage,
  quotaBytes = DEFAULT_LOCAL_STORAGE_QUOTA_BYTES
): number {
  if (quotaBytes <= 0) return 0;
  const usageBytes = estimateTrackedLocalStorageUsageBytes(storage);
  return usageBytes / quotaBytes;
}

export function classifyStoragePressure(ratio: number): Exclude<StoragePressureLevel, 'unavailable'> {
  if (ratio >= STORAGE_CRITICAL_RATIO) return 'critical';
  if (ratio >= STORAGE_WARNING_RATIO) return 'warning';
  return 'healthy';
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export async function inspectBrowserStoragePressure(params: {
  storageManager?: StorageManagerPort | null;
  fallbackStorage?: Storage | null;
} = {}): Promise<StoragePressureSnapshot> {
  const storageManager = params.storageManager
    ?? (typeof navigator !== 'undefined' ? navigator.storage : null);
  if (storageManager?.estimate) {
    try {
      const estimate = await storageManager.estimate();
      if (finiteNonNegative(estimate.usage)
        && finiteNonNegative(estimate.quota)
        && estimate.quota > 0) {
        const ratio = Math.min(estimate.usage / estimate.quota, 1);
        let persisted: boolean | null = null;
        try {
          persisted = storageManager.persisted ? await storageManager.persisted() : null;
        } catch {
          persisted = null;
        }
        return {
          level: classifyStoragePressure(ratio),
          usageBytes: estimate.usage,
          quotaBytes: estimate.quota,
          ratio,
          persisted,
          source: 'storage-estimate',
        };
      }
    } catch {
      // Fall through to the conservative localStorage estimate.
    }
  }

  const fallbackStorage = params.fallbackStorage
    ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  if (fallbackStorage) {
    const usageBytes = estimateTrackedLocalStorageUsageBytes(fallbackStorage);
    const ratio = Math.min(usageBytes / DEFAULT_LOCAL_STORAGE_QUOTA_BYTES, 1);
    return {
      level: classifyStoragePressure(ratio),
      usageBytes,
      quotaBytes: DEFAULT_LOCAL_STORAGE_QUOTA_BYTES,
      ratio,
      persisted: null,
      source: 'local-fallback',
    };
  }

  return {
    level: 'unavailable',
    usageBytes: null,
    quotaBytes: null,
    ratio: null,
    persisted: null,
    source: 'unavailable',
  };
}

export function isQuotaExceededError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; code?: unknown };
  return candidate.name === 'QuotaExceededError'
    || candidate.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || candidate.code === 22
    || candidate.code === 1014;
}

export async function requestBrowserPersistentStorage(
  storageManager: StorageManagerPort | null = typeof navigator !== 'undefined'
    ? navigator.storage
    : null
): Promise<PersistentStorageRequestResult> {
  if (!storageManager?.persist) return 'unsupported';
  try {
    if (storageManager.persisted && await storageManager.persisted()) return 'granted';
    return await storageManager.persist() ? 'granted' : 'denied';
  } catch {
    return 'error';
  }
}

export {
  DEFAULT_LOCAL_STORAGE_QUOTA_BYTES,
  OPENFLOWKIT_STORAGE_KEY,
  STORAGE_CRITICAL_RATIO,
  STORAGE_WARNING_RATIO,
};
