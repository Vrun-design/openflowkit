import type { ChatMessage } from '@/services/aiService';
import type { PersistedDocument, WorkspaceMeta } from './persistenceTypes';
import {
  readLocalStorageJson,
  removeLocalStorageKey,
  writeLocalStorageJson,
} from './uiLocalStorage';

const DOCUMENTS_FALLBACK_KEY = 'openflowkit-documents-fallback';
const WORKSPACE_META_FALLBACK_KEY = 'openflowkit-workspace-meta-fallback';
const CHAT_HISTORY_STORAGE_KEY_PREFIX = 'ofk_chat_history_';

export function loadFallbackDocuments(): PersistedDocument[] {
  return readLocalStorageJson<PersistedDocument[]>(DOCUMENTS_FALLBACK_KEY, []);
}

export function saveFallbackDocuments(documents: PersistedDocument[]): void {
  writeLocalStorageJson(DOCUMENTS_FALLBACK_KEY, documents);
}

export function loadFallbackWorkspaceMeta(
  createDefaultWorkspaceMeta: () => WorkspaceMeta
): WorkspaceMeta {
  return readLocalStorageJson<WorkspaceMeta>(
    WORKSPACE_META_FALLBACK_KEY,
    createDefaultWorkspaceMeta()
  );
}

export function saveFallbackWorkspaceMeta(workspaceMeta: WorkspaceMeta): void {
  writeLocalStorageJson(WORKSPACE_META_FALLBACK_KEY, workspaceMeta);
}

export function readLegacyChatHistory(documentId: string): ChatMessage[] {
  return readLocalStorageJson<ChatMessage[]>(`${CHAT_HISTORY_STORAGE_KEY_PREFIX}${documentId}`, []);
}

export function removeLegacyChatHistory(documentId: string): void {
  removeLocalStorageKey(`${CHAT_HISTORY_STORAGE_KEY_PREFIX}${documentId}`);
}

export function writeLegacyChatHistory(documentId: string, messages: ChatMessage[]): void {
  writeLocalStorageJson(`${CHAT_HISTORY_STORAGE_KEY_PREFIX}${documentId}`, messages);
}
