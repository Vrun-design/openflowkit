import { ensureFlowPersistenceSchema } from './indexedDbSchema';
import { reportStorageTelemetry } from './storageTelemetry';

let schemaInitializationPromise: Promise<void> | null = null;

export function getBrowserLocalStorage(): Storage {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available in this runtime.');
  }

  return localStorage;
}

export function getBrowserIndexedDbFactory(): IDBFactory | null {
  if (typeof indexedDB === 'undefined') {
    return null;
  }

  return indexedDB;
}

export function ensureStorageSchemaReady(
  indexedDbFactory: IDBFactory | null = getBrowserIndexedDbFactory()
): Promise<void> {
  if (!indexedDbFactory) {
    return Promise.resolve();
  }

  if (!schemaInitializationPromise) {
    schemaInitializationPromise = ensureFlowPersistenceSchema(indexedDbFactory).catch(
      (error) => {
        schemaInitializationPromise = null;
        reportStorageTelemetry({
          area: 'schema',
          code: 'SCHEMA_INIT_FAILED',
          severity: 'warning',
          message: `IndexedDB schema initialization failed; runtime will continue with safe fallback paths. ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    );
  }

  return schemaInitializationPromise;
}

export function resetStorageRuntimeForTests(): void {
  schemaInitializationPromise = null;
}
