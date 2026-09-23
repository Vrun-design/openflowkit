import { describe, expect, it } from 'vitest';
import {
  chatList, chatTitle, MAX_CHATS, messagesOf, readChatStore, serializeChatStore, writeChat, type ChatMessage,
} from './assistantChats';

let minted = 0;
const mint = () => `chat-${++minted}`;
const user = (text: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({ id: `u-${text}`, role: 'user', text, ...extra });

describe('assistant chats', () => {
  it('migrates the one-thread format into a chat, settling a cut-off reply', () => {
    const store = readChatStore(JSON.stringify([user('hi'), { id: 'a', role: 'assistant', text: 'Hel', status: 'streaming' }]), mint, 5);
    expect(store.chats).toHaveLength(1);
    expect(store.chats[0]).toMatchObject({ id: store.active, updatedAt: 5 });
    expect(messagesOf(store).map(({ status }) => status)).toEqual([undefined, 'stopped']);
  });

  it('reads garbage as an empty store with a fresh open chat', () => {
    for (const raw of [null, '{', '42', '{"chats":[{"id":1}]}']) {
      const store = readChatStore(raw, mint);
      expect(store.chats).toEqual([]);
      expect(store.active).toMatch(/^chat-/);
    }
  });

  it('creates a chat on its first message and lists chats newest first, without empty ones', () => {
    let store = readChatStore(null, mint);
    const first = store.active;
    store = writeChat(store, first, [user('Map onboarding for a very long title that keeps going and going past the cap')], 1);
    store = writeChat(store, 'second', [user('Review this')], 2);
    store = writeChat(store, 'empty', [], 3);
    expect(chatList(store).map(({ id, title }) => [id, title])).toEqual([
      ['second', 'Review this'],
      [first, 'Map onboarding for a very long title that keeps going and g…'],
    ]);
    expect(chatTitle([user('', { images: [{ name: 'a.png', mediaType: 'image/png', data: 'x' }] })])).toBe('Image');
  });

  it('keeps the newest chats, and offers lighter copies that drop images first elsewhere', () => {
    let store = { active: 'c0', chats: [] as ChatStore['chats'] };
    for (let index = 0; index <= MAX_CHATS; index += 1) {
      store = writeChat(store, `c${index}`, [user(`q${index}`, { images: [{ name: 'a.png', mediaType: 'image/png', data: 'AAAA' }] })], index);
    }
    const [full, openOnly, none] = serializeChatStore(store).map((json) => JSON.parse(json) as { chats: { id: string; messages: ChatMessage[] }[] });
    expect(full!.chats).toHaveLength(MAX_CHATS);
    expect(full!.chats.some(({ id }) => id === 'c0')).toBe(false);
    expect(openOnly!.chats.every(({ messages }) => messages[0]!.images![0]!.data === '')).toBe(true);
    expect(none!.chats[0]!.messages[0]!.images![0]).toEqual({ name: 'a.png', mediaType: 'image/png', data: '' });
  });
});

type ChatStore = ReturnType<typeof readChatStore>;
