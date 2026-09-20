import type { JsonObject } from '@/opencanvas/domain/document/json';
import { migrateSceneDocument } from '@/opencanvas/domain/document/migration';
import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import type { DocumentValidationIssue } from '@/opencanvas/domain/document/validation';
import { getRecord, requestToPromise } from '../indexedDbHelpers';
import {
  V2_DOCUMENTS_STORE_NAME,
  V2_RECOVERY_STORE_NAME,
  openFlowPersistenceDatabase,
} from '../indexedDbSchema';
import {
  V2StorageError,
  V2StorageQuotaError,
  V2StorageUnavailableError,
  isQuotaFailure,
} from './v2Errors';

export interface V2DocumentRecord {
  readonly id: string;
  readonly revision: number;
  readonly schemaVersion: number;
  readonly document: SceneDocumentV1;
  readonly savedAt: string;
}

export type SaveV2DocumentResult =
  | { readonly status: 'saved'; readonly record: V2DocumentRecord }
  | { readonly status: 'stale'; readonly storedRevision: number };

export type LoadV2DocumentResult =
  | { readonly status: 'missing' }
  | { readonly status: 'ok'; readonly record: V2DocumentRecord }
  | {
      readonly status: 'read-only';
      readonly record: V2DocumentRecord;
      readonly preserved: JsonObject;
      readonly schemaVersion: number;
    }
  | { readonly status: 'recovered'; readonly record: V2DocumentRecord }
  | { readonly status: 'corrupt'; readonly issues: readonly DocumentValidationIssue[] };

export interface V2DocumentRepository {
  readonly saveDocument: (
    id: string,
    document: SceneDocumentV1,
    revision: number
  ) => Promise<SaveV2DocumentResult>;
  readonly loadDocument: (id: string) => Promise<LoadV2DocumentResult>;
}

type OpenedRecord =
  | Extract<LoadV2DocumentResult, { status: 'ok' | 'read-only' }>
  | { readonly status: 'invalid'; readonly issues: readonly DocumentValidationIssue[] };

function isV2DocumentRecord(value: unknown): value is V2DocumentRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    Number.isInteger(record.revision) &&
    typeof record.schemaVersion === 'number' &&
    typeof record.savedAt === 'string' &&
    typeof record.document === 'object' &&
    record.document !== null
  );
}

function openRecord(value: unknown): OpenedRecord {
  if (!isV2DocumentRecord(value)) {
    return {
      status: 'invalid',
      issues: [{ path: '$', message: 'Stored v2 record has an unexpected shape.' }],
    };
  }
  const migrated = migrateSceneDocument(value.document);
  if (migrated.success !== false) {
    return { status: 'ok', record: { ...value, document: migrated.document } };
  }
  if (migrated.reason === 'newer-schema') {
    return {
      status: 'read-only',
      record: value,
      preserved: migrated.preserved,
      schemaVersion: migrated.schemaVersion,
    };
  }
  return { status: 'invalid', issues: migrated.issues };
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
  });
}

function throwAsV2StorageError(error: unknown, action: string): never {
  if (
    error instanceof V2StorageError ||
    error instanceof V2StorageQuotaError ||
    error instanceof V2StorageUnavailableError
  ) {
    throw error;
  }
  if (isQuotaFailure(error)) throw new V2StorageQuotaError();
  throw new V2StorageError(`v2 document ${action} failed.`, { cause: error });
}

async function openV2Database(factory: IDBFactory | null): Promise<IDBDatabase> {
  if (!factory) throw new V2StorageUnavailableError();
  try {
    return await openFlowPersistenceDatabase(factory);
  } catch (error) {
    throw new V2StorageUnavailableError(
      `IndexedDB persistence database could not be opened: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function saveRecord(
  database: IDBDatabase,
  id: string,
  document: SceneDocumentV1,
  revision: number
): Promise<SaveV2DocumentResult> {
  // The revision check and both writes share one transaction, so a second
  // tab cannot commit between the read and the write, and an abort leaves
  // neither a partial primary nor a detached last-known-good behind.
  const transaction = database.transaction(
    [V2_DOCUMENTS_STORE_NAME, V2_RECOVERY_STORE_NAME],
    'readwrite'
  );
  try {
    const documents = transaction.objectStore(V2_DOCUMENTS_STORE_NAME);
    const stored = await requestToPromise(documents.get(id));
    const previous = isV2DocumentRecord(stored) ? stored : null;
    if (previous && previous.revision >= revision) {
      return { status: 'stale', storedRevision: previous.revision };
    }
    // Only a record that still opens may become last-known-good; otherwise a
    // corrupt primary would evict the good fallback it was recovered from.
    if (previous && openRecord(previous).status !== 'invalid') {
      await requestToPromise(transaction.objectStore(V2_RECOVERY_STORE_NAME).put(previous));
    }
    const record: V2DocumentRecord = {
      id,
      revision,
      schemaVersion: document.schemaVersion,
      document,
      savedAt: new Date().toISOString(),
    };
    await requestToPromise(documents.put(record));
    // A saved indicator resolves only after durable commit, not after put.
    await transactionComplete(transaction);
    return { status: 'saved', record };
  } catch (error) {
    // A failed request already aborts; a synchronous put failure does not,
    // so abort explicitly to keep the two stores consistent either way.
    try {
      transaction.abort();
    } catch {
      /* transaction already finished */
    }
    throwAsV2StorageError(error, 'save');
  }
}

async function loadRecord(database: IDBDatabase, id: string): Promise<LoadV2DocumentResult> {
  const stored = await getRecord(database, V2_DOCUMENTS_STORE_NAME, id);
  if (stored === null) return { status: 'missing' };
  const primary = openRecord(stored);
  if (primary.status !== 'invalid') return primary;

  const fallback = openRecord(await getRecord(database, V2_RECOVERY_STORE_NAME, id));
  if (fallback.status === 'ok') return { status: 'recovered', record: fallback.record };
  if (fallback.status === 'read-only') return fallback;
  return { status: 'corrupt', issues: primary.issues };
}

// v2 records live in dedicated stores, never alongside v1 records; the
// store name is the namespace, so keys need no prefix.
export function createV2Repository(factory: IDBFactory | null): V2DocumentRepository {
  return {
    saveDocument: async (id, document, revision) => {
      const database = await openV2Database(factory);
      try {
        return await saveRecord(database, id, document, revision);
      } finally {
        database.close();
      }
    },
    loadDocument: async (id) => {
      const database = await openV2Database(factory);
      try {
        return await loadRecord(database, id);
      } catch (error) {
        throwAsV2StorageError(error, 'load');
      } finally {
        database.close();
      }
    },
  };
}
