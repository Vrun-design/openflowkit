import { createJSONStorage, type PersistStorage, type StateStorage } from 'zustand/middleware';
import type { PersistedFlowStateSlice } from '@/store/persistence';
import { createIndexedDbStateStorage } from './indexedDbStateStorage';
import {
  ensureStorageSchemaReady,
  getBrowserIndexedDbFactory,
  getBrowserLocalStorage,
} from './storageRuntime';

const PERSIST_WRITE_DEBOUNCE_MS = 250;

function createDebouncedStateStorage(storage: StateStorage, debounceMs = PERSIST_WRITE_DEBOUNCE_MS): StateStorage {
  const pendingValues = new Map<string, string>();
  const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const pendingPromises = new Map<string, {
    promise: Promise<void>;
    resolve: () => void;
    reject: (error: unknown) => void;
  }>();
  const inFlightWrites = new Map<string, Promise<void>>();

  async function flushKey(storageKey: string): Promise<void> {
    const timer = pendingTimers.get(storageKey);
    if (timer) {
      clearTimeout(timer);
      pendingTimers.delete(storageKey);
    }

    if (!pendingValues.has(storageKey)) {
      await (inFlightWrites.get(storageKey) ?? Promise.resolve());
      return;
    }

    const value = pendingValues.get(storageKey);
    pendingValues.delete(storageKey);
    if (value === undefined) {
      pendingPromises.get(storageKey)?.resolve();
      pendingPromises.delete(storageKey);
      return;
    }

    const pendingWrite = pendingPromises.get(storageKey);
    const writePromise = Promise.resolve(storage.setItem(storageKey, value)).then(() => undefined);
    inFlightWrites.set(storageKey, writePromise);

    try {
      await writePromise;
      pendingWrite?.resolve();
    } catch (error) {
      pendingWrite?.reject(error);
      throw error;
    } finally {
      if (inFlightWrites.get(storageKey) === writePromise) {
        inFlightWrites.delete(storageKey);
      }
      pendingPromises.delete(storageKey);
    }
  }

  return {
    getItem: async (storageKey) => {
      await flushKey(storageKey);
      return storage.getItem(storageKey);
    },
    setItem: (storageKey, value) => {
      pendingValues.set(storageKey, value);

      const existingTimer = pendingTimers.get(storageKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      let pendingWrite = pendingPromises.get(storageKey);
      if (!pendingWrite) {
        let resolve!: () => void;
        let reject!: (error: unknown) => void;
        const promise = new Promise<void>((promiseResolve, promiseReject) => {
          resolve = promiseResolve;
          reject = promiseReject;
        });
        pendingWrite = { promise, resolve, reject };
        pendingPromises.set(storageKey, pendingWrite);
      }

      const timer = setTimeout(() => {
        pendingTimers.delete(storageKey);
        void flushKey(storageKey).catch((error) => {
          // Storage runtime already reports schema/bootstrap failures.
          // Keep write failures visible without coupling this module to telemetry details.
          console.warn(
            `Debounced persisted state write failed for "${storageKey}": ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        });
      }, debounceMs);
      pendingTimers.set(storageKey, timer);

      return pendingWrite.promise;
    },
    removeItem: async (storageKey) => {
      const timer = pendingTimers.get(storageKey);
      if (timer) {
        clearTimeout(timer);
        pendingTimers.delete(storageKey);
      }
      pendingValues.delete(storageKey);
      pendingPromises.get(storageKey)?.resolve();
      pendingPromises.delete(storageKey);
      await (inFlightWrites.get(storageKey) ?? Promise.resolve());
      await storage.removeItem(storageKey);
    },
  };
}

function resolveStateStorage(): StateStorage {
  const localStorageRef = typeof localStorage === 'undefined' ? null : localStorage;
  const indexedDbFactory = getBrowserIndexedDbFactory();

  if (!indexedDbFactory) {
    return getBrowserLocalStorage();
  }

  return createIndexedDbStateStorage({
    indexedDbFactory,
    localStorageRef,
  });
}

export function initializeIndexedDbSchemaScaffold(): void {
  void ensureStorageSchemaReady();
}

export function createFlowPersistStorage(): PersistStorage<PersistedFlowStateSlice> {
  initializeIndexedDbSchemaScaffold();
  return createJSONStorage<PersistedFlowStateSlice>(() => createDebouncedStateStorage(resolveStateStorage()));
}
