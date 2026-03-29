import type { FlowTab } from '@/lib/types';
import type { ChatMessage } from '@/services/aiService';
import {
  createFlowTabsFromPersistedDocuments,
  createPersistedDocumentFromFlowDocument,
  createPersistedDocumentsFromTabs,
} from './persistedDocumentAdapters';
import type { FlowDocument } from './flowDocumentModel';
import type {
  LoadedDocument,
  PersistedDocument,
  PersistedDocumentContent,
  PersistedDocumentSession,
  WorkspaceMeta,
} from './persistenceTypes';
import {
  AI_SETTINGS_PERSISTENT_STORE_NAME,
  CHAT_MESSAGES_STORE_NAME,
  CHAT_THREADS_STORE_NAME,
  DOCUMENT_SESSIONS_STORE_NAME,
  PERSISTED_DOCUMENTS_STORE_NAME,
  WORKSPACE_META_STORE_NAME,
} from './indexedDbSchema';
import {
  readLocalStorageString,
  removeLocalStorageKey,
  writeLocalStorageString,
} from './uiLocalStorage';
import { reportStorageTelemetry } from './storageTelemetry';
import {
  withDatabase,
  getAllRecords,
  getRecord,
  putRecord,
  deleteRecord,
  deleteWhereDocumentId,
} from './indexedDbHelpers';
import {
  loadFallbackDocuments,
  saveFallbackDocuments,
  loadFallbackWorkspaceMeta,
  saveFallbackWorkspaceMeta,
  readLegacyChatHistory,
  removeLegacyChatHistory,
  writeLegacyChatHistory,
} from './fallbackStorage';

const WORKSPACE_META_ID = 'workspace';
const AI_SETTINGS_STORAGE_KEY = 'openflowkit-ai-settings';
const PERSISTENT_AI_SETTINGS_RECORD_ID = 'default';

export interface PersistedChatThread {
  id: string;
  documentId: string;
  updatedAt: string;
}

export interface PersistedChatMessage {
  id: string;
  documentId: string;
  role: ChatMessage['role'];
  parts: ChatMessage['parts'];
  createdAt: string;
}

export interface PersistedAISettingsRecord {
  id: 'default';
  value: string;
}

export interface PersistenceRepository {
  loadWorkspaceSnapshot(): Promise<LoadedDocument>;
  loadActiveDocument(): Promise<LoadedDocument>;
  saveDocument(documentId: string, content: PersistedDocumentContent): Promise<void>;
  saveFlowDocuments(documents: FlowDocument[], activeDocumentId: string | null): Promise<void>;
  saveDocuments(documents: PersistedDocument[], activeDocumentId: string | null): Promise<void>;
  saveWorkspace(tabs: FlowTab[], activeDocumentId: string | null): Promise<void>;
  deleteDocument(documentId: string): Promise<void>;
  loadDocumentSession(documentId: string): Promise<PersistedDocumentSession | null>;
  saveDocumentSession(session: PersistedDocumentSession): Promise<void>;
  loadChatThread(documentId: string): Promise<PersistedChatMessage[]>;
  saveChatMessage(documentId: string, message: PersistedChatMessage): Promise<void>;
  replaceChatThread(documentId: string, messages: PersistedChatMessage[]): Promise<void>;
  clearChatThread(documentId: string): Promise<void>;
  loadPersistentAISettings(): Promise<string | null>;
  savePersistentAISettings(serialized: string): Promise<void>;
}

function createDefaultWorkspaceMeta(
  documentOrder: string[] = [],
  activeDocumentId: string | null = null
): WorkspaceMeta {
  return {
    id: WORKSPACE_META_ID,
    activeDocumentId,
    documentOrder,
    lastOpenedAt: new Date().toISOString(),
  };
}

function getNowIso(): string {
  return new Date().toISOString();
}

function toPersistedChatMessages(
  documentId: string,
  messages: ChatMessage[]
): PersistedChatMessage[] {
  const startedAt = Date.now();

  return messages.map((message, index) => ({
    id: `${documentId}:${index}`,
    documentId,
    role: message.role,
    parts: message.parts,
    createdAt: new Date(startedAt + index).toISOString(),
  }));
}

async function migrateLegacyChatHistory(documentId: string): Promise<void> {
  const legacyMessages = readLegacyChatHistory(documentId);
  if (legacyMessages.length === 0) {
    return;
  }

  await localFirstRepository.replaceChatThread(
    documentId,
    toPersistedChatMessages(documentId, legacyMessages)
  );
  removeLegacyChatHistory(documentId);
}

export const localFirstRepository: PersistenceRepository = {
  async loadWorkspaceSnapshot(): Promise<LoadedDocument> {
    try {
      const loaded = await withDatabase(async (database) => {
        const documents = (
          await getAllRecords<PersistedDocument>(database, PERSISTED_DOCUMENTS_STORE_NAME)
        ).filter((document) => document.deletedAt === null);
        const workspaceMeta =
          (await getRecord<WorkspaceMeta>(
            database,
            WORKSPACE_META_STORE_NAME,
            WORKSPACE_META_ID
          )) ??
          createDefaultWorkspaceMeta(
            documents.map((document) => document.id),
            documents[0]?.id ?? null
          );
        const orderedDocuments = workspaceMeta.documentOrder
          .map((documentId) => documents.find((document) => document.id === documentId))
          .filter((document): document is PersistedDocument => Boolean(document));
        const remainingDocuments = documents.filter(
          (document) => !workspaceMeta.documentOrder.includes(document.id)
        );
        const nextDocuments = [...orderedDocuments, ...remainingDocuments];
        const activeDocument =
          nextDocuments.find((document) => document.id === workspaceMeta.activeDocumentId) ??
          nextDocuments[0] ??
          null;

        return {
          document: activeDocument,
          documents: nextDocuments,
          workspaceMeta: {
            ...workspaceMeta,
            activeDocumentId: activeDocument?.id ?? null,
            documentOrder: nextDocuments.map((document) => document.id),
          },
        };
      });

      return loaded;
    } catch {
      const fallbackDocuments = loadFallbackDocuments().filter(
        (document) => document.deletedAt === null
      );
      const fallbackWorkspaceMeta = loadFallbackWorkspaceMeta(() => createDefaultWorkspaceMeta());
      const activeDocument =
        fallbackDocuments.find(
          (document) => document.id === fallbackWorkspaceMeta.activeDocumentId
        ) ??
        fallbackDocuments[0] ??
        null;

      reportStorageTelemetry({
        area: 'schema',
        code: 'LOCAL_FIRST_LOAD_FALLBACK_LOCAL',
        severity: 'warning',
        message:
          'Local-first repository load failed; falling back to localStorage compatibility data.',
      });

      return {
        document: activeDocument,
        documents: fallbackDocuments,
        workspaceMeta: {
          ...fallbackWorkspaceMeta,
          activeDocumentId: activeDocument?.id ?? null,
          documentOrder: fallbackDocuments.map((document) => document.id),
        },
      };
    }
  },

  async loadActiveDocument(): Promise<LoadedDocument> {
    return this.loadWorkspaceSnapshot();
  },

  async saveDocument(documentId: string, content: PersistedDocumentContent): Promise<void> {
    const loaded = await this.loadWorkspaceSnapshot();
    const targetDocument = loaded.documents.find((document) => document.id === documentId);
    if (!targetDocument) {
      return;
    }

    const updatedDocument: PersistedDocument = {
      ...targetDocument,
      content,
      pages:
        targetDocument.pages?.map((page) =>
          page.id === targetDocument.activePageId
            ? { ...page, content, updatedAt: getNowIso() }
            : page
        ) ?? targetDocument.pages,
      updatedAt: getNowIso(),
    };

    try {
      await withDatabase(async (database) => {
        await putRecord(database, PERSISTED_DOCUMENTS_STORE_NAME, updatedDocument);
      });
    } catch {
      const nextDocuments = loaded.documents.map((document) =>
        document.id === documentId ? updatedDocument : document
      );
      saveFallbackDocuments(nextDocuments);
    }
  },

  async saveDocuments(
    documents: PersistedDocument[],
    activeDocumentId: string | null
  ): Promise<void> {
    const nowIso = getNowIso();
    const workspaceMeta = createDefaultWorkspaceMeta(
      documents.map((document) => document.id),
      activeDocumentId ?? documents[0]?.id ?? null
    );

    try {
      await withDatabase(async (database) => {
        const existingDocuments = await getAllRecords<PersistedDocument>(
          database,
          PERSISTED_DOCUMENTS_STORE_NAME
        );
        const nextIds = new Set(documents.map((document) => document.id));

        await Promise.all(
          documents.map((document) =>
            putRecord(database, PERSISTED_DOCUMENTS_STORE_NAME, {
              ...document,
              createdAt:
                existingDocuments.find((existing) => existing.id === document.id)?.createdAt ??
                document.createdAt ??
                nowIso,
              updatedAt: document.updatedAt ?? nowIso,
              deletedAt: null,
            } satisfies PersistedDocument)
          )
        );

        await Promise.all(
          existingDocuments
            .filter((document) => !nextIds.has(document.id))
            .map(async (document) => {
              await deleteRecord(database, PERSISTED_DOCUMENTS_STORE_NAME, document.id);
              await deleteRecord(database, DOCUMENT_SESSIONS_STORE_NAME, document.id);
              await deleteRecord(database, CHAT_THREADS_STORE_NAME, document.id);
              await deleteWhereDocumentId(database, CHAT_MESSAGES_STORE_NAME, document.id);
            })
        );

        await putRecord(database, WORKSPACE_META_STORE_NAME, workspaceMeta);
      });
    } catch {
      reportStorageTelemetry({
        area: 'persist',
        code: 'LOCAL_FIRST_SAVE_FALLBACK_LOCAL',
        severity: 'warning',
        message: 'IndexedDB workspace save failed; writing localStorage compatibility backup.',
      });
      saveFallbackDocuments(
        documents.map((document) => ({
          ...document,
          createdAt: document.createdAt ?? nowIso,
          updatedAt: document.updatedAt ?? nowIso,
          deletedAt: null,
        }))
      );
      saveFallbackWorkspaceMeta(workspaceMeta);
    }
  },

  async saveWorkspace(tabs: FlowTab[], activeDocumentId: string | null): Promise<void> {
    return this.saveDocuments(createPersistedDocumentsFromTabs(tabs), activeDocumentId);
  },

  async saveFlowDocuments(
    documents: FlowDocument[],
    activeDocumentId: string | null
  ): Promise<void> {
    return this.saveDocuments(
      documents.map(createPersistedDocumentFromFlowDocument),
      activeDocumentId
    );
  },

  async deleteDocument(documentId: string): Promise<void> {
    try {
      await withDatabase(async (database) => {
        await deleteRecord(database, PERSISTED_DOCUMENTS_STORE_NAME, documentId);
        await deleteRecord(database, DOCUMENT_SESSIONS_STORE_NAME, documentId);
        await deleteRecord(database, CHAT_THREADS_STORE_NAME, documentId);
        await deleteWhereDocumentId(database, CHAT_MESSAGES_STORE_NAME, documentId);
      });
    } catch {
      const nextDocuments = loadFallbackDocuments().filter(
        (document) => document.id !== documentId
      );
      saveFallbackDocuments(nextDocuments);
      removeLegacyChatHistory(documentId);
    }
  },

  async loadDocumentSession(documentId: string): Promise<PersistedDocumentSession | null> {
    try {
      return await withDatabase((database) =>
        getRecord<PersistedDocumentSession>(database, DOCUMENT_SESSIONS_STORE_NAME, documentId)
      );
    } catch {
      return null;
    }
  },

  async saveDocumentSession(session: PersistedDocumentSession): Promise<void> {
    try {
      await withDatabase(async (database) => {
        await putRecord(database, DOCUMENT_SESSIONS_STORE_NAME, session);
      });
    } catch {
      reportStorageTelemetry({
        area: 'persist',
        code: 'DOCUMENT_SESSION_SAVE_FAILED',
        severity: 'warning',
        message: `Document session save failed for "${session.documentId}".`,
      });
    }
  },

  async loadChatThread(documentId: string): Promise<PersistedChatMessage[]> {
    try {
      const messages = await withDatabase(async (database) => {
        const allMessages = await getAllRecords<PersistedChatMessage>(
          database,
          CHAT_MESSAGES_STORE_NAME
        );
        return allMessages
          .filter((message) => message.documentId === documentId)
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      });

      if (messages.length === 0) {
        await migrateLegacyChatHistory(documentId);
        return await this.loadChatThread(documentId);
      }

      return messages;
    } catch {
      const legacyMessages = readLegacyChatHistory(documentId);
      return toPersistedChatMessages(documentId, legacyMessages);
    }
  },

  async saveChatMessage(documentId: string, message: PersistedChatMessage): Promise<void> {
    try {
      await withDatabase(async (database) => {
        await putRecord(database, CHAT_MESSAGES_STORE_NAME, message);
        await putRecord(database, CHAT_THREADS_STORE_NAME, {
          id: documentId,
          documentId,
          updatedAt: message.createdAt,
        } satisfies PersistedChatThread);
      });
    } catch {
      const existingMessages = readLegacyChatHistory(documentId);
      writeLegacyChatHistory(documentId, [
        ...existingMessages,
        { role: message.role, parts: message.parts } satisfies ChatMessage,
      ]);
    }
  },

  async replaceChatThread(documentId: string, messages: PersistedChatMessage[]): Promise<void> {
    try {
      await withDatabase(async (database) => {
        await deleteWhereDocumentId(database, CHAT_MESSAGES_STORE_NAME, documentId);
        await Promise.all(
          messages.map((message) => putRecord(database, CHAT_MESSAGES_STORE_NAME, message))
        );
        if (messages.length === 0) {
          await deleteRecord(database, CHAT_THREADS_STORE_NAME, documentId);
        } else {
          await putRecord(database, CHAT_THREADS_STORE_NAME, {
            id: documentId,
            documentId,
            updatedAt: messages[messages.length - 1]?.createdAt ?? getNowIso(),
          } satisfies PersistedChatThread);
        }
      });
      removeLegacyChatHistory(documentId);
    } catch {
      writeLegacyChatHistory(
        documentId,
        messages.map(
          (message) => ({ role: message.role, parts: message.parts }) satisfies ChatMessage
        )
      );
    }
  },

  async clearChatThread(documentId: string): Promise<void> {
    try {
      await withDatabase(async (database) => {
        await deleteRecord(database, CHAT_THREADS_STORE_NAME, documentId);
        await deleteWhereDocumentId(database, CHAT_MESSAGES_STORE_NAME, documentId);
      });
      removeLegacyChatHistory(documentId);
    } catch {
      removeLegacyChatHistory(documentId);
    }
  },

  async loadPersistentAISettings(): Promise<string | null> {
    try {
      const record = await withDatabase((database) =>
        getRecord<PersistedAISettingsRecord>(
          database,
          AI_SETTINGS_PERSISTENT_STORE_NAME,
          PERSISTENT_AI_SETTINGS_RECORD_ID
        )
      );
      if (record?.value) {
        return record.value;
      }
    } catch {
      // Fall through to compatibility storage.
    }

    return readLocalStorageString(AI_SETTINGS_STORAGE_KEY);
  },

  async savePersistentAISettings(serialized: string): Promise<void> {
    try {
      await withDatabase(async (database) => {
        await putRecord(database, AI_SETTINGS_PERSISTENT_STORE_NAME, {
          id: PERSISTENT_AI_SETTINGS_RECORD_ID,
          value: serialized,
        } satisfies PersistedAISettingsRecord);
      });
      removeLocalStorageKey(AI_SETTINGS_STORAGE_KEY);
    } catch {
      writeLocalStorageString(AI_SETTINGS_STORAGE_KEY, serialized);
    }
  },
};

export type {
  LoadedDocument,
  PersistedDocument,
  PersistedDocumentContent,
  PersistedDocumentSession,
  WorkspaceMeta,
} from './persistenceTypes';

export {
  createFlowDocumentFromPersistedDocument,
  createFlowDocumentsFromPersistedDocuments,
  convertFlowDocumentsToTabs,
  createLoadedFlowWorkspace,
} from './flowDocumentModel';

export function convertPersistedDocumentsToTabs(documents: PersistedDocument[]): FlowTab[] {
  return createFlowTabsFromPersistedDocuments(documents);
}
