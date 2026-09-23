// The assistant's chats for one document, as stored on this machine: which one
// is open, and each chat's messages. Pure parse/update/serialize so the storage
// rules (legacy migration, caps, image dropping under quota) are testable.
import type { AgentStep } from '../../application/ai/assistantAgent';

export type AssistantScope = 'selection' | 'page';

/** An attached image; `data` is base64, '' once dropped to fit storage. */
export interface ChatImage {
  readonly name: string;
  readonly mediaType: string;
  readonly data: string;
}

export interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  /** User text, or the model's raw reply (prose and blocks). */
  readonly text: string;
  readonly images?: readonly ChatImage[];
  /** User turns: the scope it was asked with; Retry and Edit keep it. */
  readonly scope?: AssistantScope;
  readonly thinking?: string;
  readonly thoughtMs?: number;
  /** Tool calls the agent made on the way to this reply. */
  readonly steps?: readonly AgentStep[];
  readonly model?: string;
  readonly provider?: string;
  readonly status?: 'streaming' | 'done' | 'stopped' | 'error';
  readonly error?: string;
  readonly proposalId?: string;
  readonly outcome?: 'applied' | 'discarded' | 'undone';
  /** What the assistant did beyond the reply: a fixed block, a skipped one. */
  readonly note?: string;
}

export interface StoredChat {
  readonly id: string;
  readonly updatedAt: number;
  readonly messages: readonly ChatMessage[];
}

export interface ChatStore {
  /** The open chat; may not be in `chats` yet (a new, empty chat). */
  readonly active: string;
  readonly chats: readonly StoredChat[];
}

// ponytail: fixed caps; summarise old turns, or move chats to IndexedDB, if people keep long threads.
export const MAX_CHATS = 30;
export const MAX_MESSAGES = 60;

const isMessage = (value: unknown): value is ChatMessage =>
  !!value && typeof value === 'object' && typeof (value as ChatMessage).text === 'string'
  && ((value as ChatMessage).role === 'user' || (value as ChatMessage).role === 'assistant');

/** A reply cut off by a reload reads as stopped, never as still streaming. */
const settle = (messages: readonly unknown[]): ChatMessage[] => messages.filter(isMessage)
  .map((message) => (message.status === 'streaming' ? { ...message, status: 'stopped' as const } : message));

/** Reads what localStorage held; a bare array is the one-thread format before chats. */
export function readChatStore(raw: string | null, mint: () => string, now = Date.now()): ChatStore {
  let parsed: unknown = null;
  try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
  if (Array.isArray(parsed)) {
    const messages = settle(parsed);
    const id = mint();
    return { active: id, chats: messages.length ? [{ id, updatedAt: now, messages }] : [] };
  }
  const record = parsed && typeof parsed === 'object' ? parsed as Partial<ChatStore> : {};
  const chats = (Array.isArray(record.chats) ? record.chats : [])
    .filter((chat): chat is StoredChat => !!chat && typeof chat.id === 'string' && Array.isArray(chat.messages))
    .map((chat) => ({ id: chat.id, updatedAt: Number(chat.updatedAt) || 0, messages: settle(chat.messages) }));
  const active = typeof record.active === 'string' && record.active ? record.active : mint();
  return { active, chats };
}

export const messagesOf = (store: ChatStore, chatId = store.active): readonly ChatMessage[] =>
  store.chats.find(({ id }) => id === chatId)?.messages ?? [];

/** Replaces one chat's messages, creating the chat on its first message. */
export function writeChat(store: ChatStore, chatId: string, messages: readonly ChatMessage[], now = Date.now()): ChatStore {
  const exists = store.chats.some(({ id }) => id === chatId);
  const chats = exists
    ? store.chats.map((chat) => (chat.id === chatId ? { ...chat, messages, updatedAt: now } : chat))
    : [...store.chats, { id: chatId, updatedAt: now, messages }];
  return { ...store, chats };
}

/** Title: the first thing the user asked, on one line. */
export function chatTitle(messages: readonly ChatMessage[]): string {
  const first = messages.find(({ role }) => role === 'user');
  const text = first?.text.replace(/\s+/g, ' ').trim() ?? '';
  if (!text) return first?.images?.length ? 'Image' : 'New chat';
  return text.length > 60 ? `${text.slice(0, 59).trimEnd()}…` : text;
}

/** Newest first, without empty chats. */
export function chatList(store: ChatStore): { id: string; title: string; updatedAt: number; count: number }[] {
  return store.chats.filter(({ messages }) => messages.length)
    .map(({ id, updatedAt, messages }) => ({ id, title: chatTitle(messages), updatedAt, count: messages.length }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

const withoutImages = (chat: StoredChat): StoredChat => ({
  ...chat,
  messages: chat.messages.map((message) => (message.images?.some(({ data }) => data)
    ? { ...message, images: message.images.map((image) => ({ ...image, data: '' })) } : message)),
});

/**
 * The JSON to store, lightest last: everything; then images only in the open
 * chat; then no images. The caller tries each until one fits the quota.
 */
export function serializeChatStore(store: ChatStore): string[] {
  const chats = [...store.chats].filter(({ messages }) => messages.length)
    .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CHATS)
    .map((chat) => ({ ...chat, messages: chat.messages.slice(-MAX_MESSAGES) }));
  const encode = (list: readonly StoredChat[]) => JSON.stringify({ active: store.active, chats: list });
  const hasImages = chats.some(({ messages }) => messages.some(({ images }) => images?.some(({ data }) => data)));
  if (!hasImages) return [encode(chats)];
  return [
    encode(chats),
    encode(chats.map((chat) => (chat.id === store.active ? chat : withoutImages(chat)))),
    encode(chats.map(withoutImages)),
  ];
}
