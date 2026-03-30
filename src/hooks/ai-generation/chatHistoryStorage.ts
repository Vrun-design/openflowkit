import type { ChatMessage } from '@/services/aiService';
import { localFirstRepository, type PersistedChatMessage } from '@/services/storage/localFirstRepository';
import { parseLegacyChatMessagesJson } from '@/services/storage/storageSchemas';

const STORAGE_KEY_PREFIX = 'ofk_chat_history_';

function storageKey(diagramId: string): string {
  return `${STORAGE_KEY_PREFIX}${diagramId}`;
}

function toChatMessages(messages: PersistedChatMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    role: message.role,
    parts: message.parts,
  }));
}

function toPersistedChatMessages(diagramId: string, messages: ChatMessage[]): PersistedChatMessage[] {
  const startedAt = Date.now();

  return messages.map((message, index) => ({
    id: `${diagramId}:${index}:${message.role}`,
    documentId: diagramId,
    role: message.role,
    parts: message.parts,
    createdAt: new Date(startedAt + index).toISOString(),
  }));
}

function loadLegacyChatHistory(diagramId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(diagramId));
    return parseLegacyChatMessagesJson(raw);
  } catch {
    return [];
  }
}

function saveLegacyChatHistory(diagramId: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(storageKey(diagramId), JSON.stringify(messages));
  } catch {
    // localStorage may be full or unavailable — fail silently
  }
}

function clearLegacyChatHistory(diagramId: string): void {
  try {
    localStorage.removeItem(storageKey(diagramId));
  } catch {
    // fail silently
  }
}

export async function loadChatHistory(diagramId: string): Promise<ChatMessage[]> {
  try {
    const messages = await localFirstRepository.loadChatThread(diagramId);
    return toChatMessages(messages);
  } catch {
    return loadLegacyChatHistory(diagramId);
  }
}

export async function saveChatHistory(diagramId: string, messages: ChatMessage[]): Promise<void> {
  try {
    await localFirstRepository.replaceChatThread(diagramId, toPersistedChatMessages(diagramId, messages));
  } catch {
    saveLegacyChatHistory(diagramId, messages);
  }
}

export async function clearChatHistory(diagramId: string): Promise<void> {
  try {
    await localFirstRepository.clearChatThread(diagramId);
  } catch {
    clearLegacyChatHistory(diagramId);
  }
}
