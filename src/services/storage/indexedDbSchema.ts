import { V2StorageBlockedError } from './v2/v2Errors';

export const FLOW_PERSISTENCE_DB_NAME = 'openflowkit-persistence';
export const FLOW_PERSISTENCE_DB_VERSION = 5;
export const FLOW_DOCUMENT_STORE_NAME = 'flowDocuments';
export const FLOW_METADATA_STORE_NAME = 'flowMetadata';
export const SCHEMA_META_STORE_NAME = 'schemaMeta';
export const PERSISTED_DOCUMENTS_STORE_NAME = 'documents';
export const DOCUMENT_SESSIONS_STORE_NAME = 'documentSessions';
export const CHAT_THREADS_STORE_NAME = 'chatThreads';
export const CHAT_MESSAGES_STORE_NAME = 'chatMessages';
export const WORKSPACE_META_STORE_NAME = 'workspaceMeta';
export const AI_SETTINGS_PERSISTENT_STORE_NAME = 'aiSettingsPersistent';
export const PREFERENCES_STORE_NAME = 'preferences';
export const ASSETS_STORE_NAME = 'assets';
export const V2_DOCUMENTS_STORE_NAME = 'v2Documents';
export const V2_RECOVERY_STORE_NAME = 'v2Recovery';
/** v5: home-page previews, one per document, kept apart so listing and saving stay cheap. */
export const V2_THUMBNAILS_STORE_NAME = 'v2Thumbnails';
export const CHAT_MESSAGES_BY_DOCUMENT_ID_INDEX = 'byDocumentId';
export const CHAT_MESSAGES_BY_DOCUMENT_ID_AND_CREATED_AT_INDEX =
  'byDocumentIdAndCreatedAt';

type ObjectStoreIndexDefinition = {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
};

type ObjectStoreDefinition = {
  name: string;
  keyPath?: string;
  indexes?: ObjectStoreIndexDefinition[];
};

const OBJECT_STORE_DEFINITIONS: ObjectStoreDefinition[] = [
  { name: FLOW_DOCUMENT_STORE_NAME, keyPath: 'id' },
  { name: FLOW_METADATA_STORE_NAME, keyPath: 'id' },
  { name: SCHEMA_META_STORE_NAME, keyPath: 'id' },
  { name: PERSISTED_DOCUMENTS_STORE_NAME, keyPath: 'id' },
  { name: DOCUMENT_SESSIONS_STORE_NAME, keyPath: 'id' },
  { name: CHAT_THREADS_STORE_NAME, keyPath: 'id' },
  {
    name: CHAT_MESSAGES_STORE_NAME,
    keyPath: 'id',
    indexes: [
      {
        name: CHAT_MESSAGES_BY_DOCUMENT_ID_INDEX,
        keyPath: 'documentId',
      },
      {
        name: CHAT_MESSAGES_BY_DOCUMENT_ID_AND_CREATED_AT_INDEX,
        keyPath: ['documentId', 'createdAt'],
      },
    ],
  },
  { name: WORKSPACE_META_STORE_NAME, keyPath: 'id' },
  { name: AI_SETTINGS_PERSISTENT_STORE_NAME, keyPath: 'id' },
  { name: PREFERENCES_STORE_NAME, keyPath: 'id' },
  { name: ASSETS_STORE_NAME, keyPath: 'id' },
  { name: V2_DOCUMENTS_STORE_NAME, keyPath: 'id' },
  { name: V2_RECOVERY_STORE_NAME, keyPath: 'id' },
  { name: V2_THUMBNAILS_STORE_NAME, keyPath: 'id' },
];

function ensureObjectStore(
  database: IDBDatabase,
  definition: ObjectStoreDefinition,
  upgradeTransaction: IDBTransaction | null
): IDBObjectStore {
  if (!database.objectStoreNames.contains(definition.name)) {
    return database.createObjectStore(definition.name, {
      keyPath: definition.keyPath ?? 'id',
    });
  }

  if (!upgradeTransaction) {
    throw new Error(
      `Missing upgrade transaction while ensuring IndexedDB store "${definition.name}".`
    );
  }

  return upgradeTransaction.objectStore(definition.name);
}

function ensureObjectStoreIndex(
  store: IDBObjectStore,
  definition: ObjectStoreIndexDefinition
): void {
  if (!store.indexNames.contains(definition.name)) {
    store.createIndex(definition.name, definition.keyPath, definition.options);
  }
}

/** Opens still waiting on another tab; a second open would queue behind one and hang. */
const blockedOpens = new WeakMap<IDBFactory, IDBOpenDBRequest>();

export function openFlowPersistenceDatabase(indexedDbFactory: IDBFactory): Promise<IDBDatabase> {
  if (blockedOpens.has(indexedDbFactory)) return Promise.reject(new V2StorageBlockedError());
  return new Promise((resolve, reject) => {
    const request = indexedDbFactory.open(FLOW_PERSISTENCE_DB_NAME, FLOW_PERSISTENCE_DB_VERSION);

    request.onerror = () => {
      blockedOpens.delete(indexedDbFactory);
      reject(request.error ?? new Error('Failed to open IndexedDB persistence database.'));
    };

    request.onupgradeneeded = () => {
      const database = request.result;
      const upgradeTransaction = request.transaction;
      for (const definition of OBJECT_STORE_DEFINITIONS) {
        const store = ensureObjectStore(database, definition, upgradeTransaction);
        for (const indexDefinition of definition.indexes ?? []) {
          ensureObjectStoreIndex(store, indexDefinition);
        }
      }
    };

    // An older tab that will not let go would otherwise leave this open waiting forever: say so instead.
    let blocked = false;
    request.onblocked = () => {
      blocked = true;
      blockedOpens.set(indexedDbFactory, request);
      reject(new V2StorageBlockedError());
    };

    request.onsuccess = () => {
      // Opened after all, once the other tab closed: nobody is waiting for this connection now, and the next open goes through.
      if (blocked) {
        blockedOpens.delete(indexedDbFactory);
        request.result.close();
        return;
      }
      // A newer tab upgrading the schema must not wait on this connection.
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

export async function ensureFlowPersistenceSchema(indexedDbFactory: IDBFactory): Promise<void> {
  const database = await openFlowPersistenceDatabase(indexedDbFactory);
  database.close();
}
