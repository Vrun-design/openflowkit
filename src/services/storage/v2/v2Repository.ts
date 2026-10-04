import type { JsonObject } from '@/opencanvas/domain/document/json';
import { migrateSceneDocument } from '@/opencanvas/domain/document/migration';
import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import type { DocumentValidationIssue } from '@/opencanvas/domain/document/validation';
import { getRecord, requestToPromise } from '../indexedDbHelpers';
import {
  V2_DOCUMENTS_STORE_NAME,
  V2_RECOVERY_STORE_NAME,
  V2_THUMBNAILS_STORE_NAME,
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
  /** Archived at this time: off the list, kept until deleted. A save from a tab still editing it brings it back. */
  readonly archivedAt?: string;
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
  /** Every stored document not archived, most recently saved first. */
  readonly listDocuments: () => Promise<readonly V2DocumentSummary[]>;
  /** Archived documents, most recently archived first. */
  readonly listArchive: () => Promise<readonly V2DocumentSummary[]>;
  /** Archives documents, or restores them; ids not stored are skipped. */
  readonly archiveDocuments: (ids: readonly string[]) => Promise<void>;
  readonly restoreDocuments: (ids: readonly string[]) => Promise<void>;
  /** Removes a document, its last-known-good copy and its thumbnail. */
  readonly deleteDocument: (id: string) => Promise<void>;
  /** Home-page preview of the first page; `null` (nothing drawn) or an oversized pair keeps the placeholder. */
  readonly saveThumbnail: (id: string, thumbnail: V2Thumbnail | null) => Promise<void>;
  /** Every stored preview by document id; `null` means "too big, show the placeholder". */
  readonly listThumbnails: () => Promise<ReadonlyMap<string, V2Thumbnail | null>>;
}

/** Light and dark SVG of a document's first page. */
export interface V2Thumbnail {
  readonly light: string;
  readonly dark: string;
}

/** Both themes together; past this a preview costs more to store and decode than it is worth. */
export const V2_THUMBNAIL_MAX_CHARS = 60_000;

export interface V2DocumentSummary {
  readonly id: string;
  readonly name: string;
  readonly savedAt: string;
  readonly pageCount: number;
  readonly pageIds: readonly string[];
  readonly archivedAt?: string;
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

// ponytail: reads every whole document to list a few fields — fine for one person's diagrams;
// a summary store written beside each save is the upgrade if lists get slow.
async function listRecords(database: IDBDatabase, archived: boolean): Promise<V2DocumentSummary[]> {
  const records = await requestToPromise(database.transaction(V2_DOCUMENTS_STORE_NAME, 'readonly').objectStore(V2_DOCUMENTS_STORE_NAME).getAll());
  return records
    .filter(isV2DocumentRecord)
    .filter((record) => (typeof record.archivedAt === 'string') === archived)
    .map((record) => ({
      id: record.id,
      name: typeof record.document.name === 'string' ? record.document.name : 'Untitled diagram',
      savedAt: record.savedAt,
      pageCount: Array.isArray(record.document.pages) ? record.document.pages.length : 0,
      pageIds: Array.isArray(record.document.pages) ? record.document.pages.map((page) => page.id) : [],
      ...(archived ? { archivedAt: record.archivedAt } : {}),
    }))
    .sort(archived ? (a, b) => (a.archivedAt! < b.archivedAt! ? 1 : -1) : (a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

/** Sets or clears `archivedAt` on each stored record, all in one transaction. */
async function markArchived(database: IDBDatabase, ids: readonly string[], archivedAt: string | null): Promise<void> {
  const transaction = database.transaction(V2_DOCUMENTS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(V2_DOCUMENTS_STORE_NAME);
  for (const id of ids) {
    const stored = await requestToPromise(store.get(id));
    if (!isV2DocumentRecord(stored)) continue;
    const { archivedAt: _previous, ...rest } = stored;
    store.put(archivedAt ? { ...rest, archivedAt } : rest);
  }
  await transactionComplete(transaction);
}

// ponytail: no tombstone — a tab still editing this document saves it back on its next edit;
// a deleted-ids set checked in saveRecord is the upgrade if that bites.
async function deleteRecord(database: IDBDatabase, id: string): Promise<void> {
  const transaction = database.transaction([V2_DOCUMENTS_STORE_NAME, V2_RECOVERY_STORE_NAME, V2_THUMBNAILS_STORE_NAME], 'readwrite');
  transaction.objectStore(V2_DOCUMENTS_STORE_NAME).delete(id);
  transaction.objectStore(V2_RECOVERY_STORE_NAME).delete(id);
  transaction.objectStore(V2_THUMBNAILS_STORE_NAME).delete(id);
  await transactionComplete(transaction);
}

async function saveThumbnailRecord(database: IDBDatabase, id: string, thumbnail: V2Thumbnail | null): Promise<void> {
  const fits = thumbnail !== null && thumbnail.light.length + thumbnail.dark.length <= V2_THUMBNAIL_MAX_CHARS;
  const transaction = database.transaction(V2_THUMBNAILS_STORE_NAME, 'readwrite');
  transaction.objectStore(V2_THUMBNAILS_STORE_NAME).put({ id, thumbnail: fits ? thumbnail : null });
  await transactionComplete(transaction);
}

async function listThumbnailRecords(database: IDBDatabase): Promise<Map<string, V2Thumbnail | null>> {
  const rows: unknown[] = await requestToPromise(database.transaction(V2_THUMBNAILS_STORE_NAME, 'readonly').objectStore(V2_THUMBNAILS_STORE_NAME).getAll());
  const thumbnails = new Map<string, V2Thumbnail | null>();
  for (const row of rows) {
    if (typeof row !== 'object' || row === null) continue;
    const { id, thumbnail } = row as { id?: unknown; thumbnail?: { light?: unknown; dark?: unknown } | null };
    if (typeof id !== 'string') continue;
    thumbnails.set(id, thumbnail && typeof thumbnail.light === 'string' && typeof thumbnail.dark === 'string'
      ? { light: thumbnail.light, dark: thumbnail.dark } : null);
  }
  return thumbnails;
}

async function withDatabase<T>(factory: IDBFactory | null, action: string, run: (database: IDBDatabase) => Promise<T>): Promise<T> {
  const database = await openV2Database(factory);
  try {
    return await run(database);
  } catch (error) {
    throwAsV2StorageError(error, action);
  } finally {
    database.close();
  }
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
    listDocuments: async () => withDatabase(factory, 'list', (database) => listRecords(database, false)),
    listArchive: async () => withDatabase(factory, 'archive list', (database) => listRecords(database, true)),
    archiveDocuments: async (ids) => withDatabase(factory, 'archive', (database) => markArchived(database, ids, new Date().toISOString())),
    restoreDocuments: async (ids) => withDatabase(factory, 'restore', (database) => markArchived(database, ids, null)),
    deleteDocument: async (id) => {
      const database = await openV2Database(factory);
      try {
        await deleteRecord(database, id);
      } catch (error) {
        throwAsV2StorageError(error, 'delete');
      } finally {
        database.close();
      }
    },
    saveThumbnail: async (id, thumbnail) => {
      const database = await openV2Database(factory);
      try {
        await saveThumbnailRecord(database, id, thumbnail);
      } catch (error) {
        throwAsV2StorageError(error, 'thumbnail save');
      } finally {
        database.close();
      }
    },
    listThumbnails: async () => {
      const database = await openV2Database(factory);
      try {
        return await listThumbnailRecords(database);
      } catch (error) {
        throwAsV2StorageError(error, 'thumbnail list');
      } finally {
        database.close();
      }
    },
  };
}
