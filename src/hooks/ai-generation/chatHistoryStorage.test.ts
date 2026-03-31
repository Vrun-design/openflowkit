import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '@/services/aiService';

const replaceChatThread = vi.fn();
const clearChatThread = vi.fn();
const loadChatThread = vi.fn();

vi.mock('@/services/storage/localFirstRepository', () => ({
  localFirstRepository: {
    loadChatThread,
    replaceChatThread,
    clearChatThread,
  },
}));

describe('chatHistoryStorage', () => {
  beforeEach(() => {
    clearChatThread.mockReset();
    loadChatThread.mockReset();
    replaceChatThread.mockReset();
    localStorage.clear();
  });

  it('loads chat history from the local-first repository', async () => {
    loadChatThread.mockResolvedValue([
      {
        id: 'doc-1:0:user',
        documentId: 'doc-1',
        role: 'user',
        parts: [{ text: 'hello' }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const { loadChatHistory } = await import('./chatHistoryStorage');

    await expect(loadChatHistory('doc-1')).resolves.toEqual([
      { role: 'user', parts: [{ text: 'hello' }] } satisfies ChatMessage,
    ]);
  });

  it('falls back to legacy localStorage when repository loading fails', async () => {
    loadChatThread.mockRejectedValue(new Error('offline'));
    localStorage.setItem('ofk_chat_history_doc-2', JSON.stringify([
      { role: 'model', parts: [{ text: 'stored locally' }] },
    ] satisfies ChatMessage[]));

    const { loadChatHistory } = await import('./chatHistoryStorage');

    await expect(loadChatHistory('doc-2')).resolves.toEqual([
      { role: 'model', parts: [{ text: 'stored locally' }] },
    ]);
  });

  it('drops malformed legacy localStorage chat payloads', async () => {
    loadChatThread.mockRejectedValue(new Error('offline'));
    localStorage.setItem(
      'ofk_chat_history_doc-bad',
      JSON.stringify([{ role: 'system', parts: ['bad-shape'] }])
    );

    const { loadChatHistory } = await import('./chatHistoryStorage');

    await expect(loadChatHistory('doc-bad')).resolves.toEqual([]);
  });

  it('writes the full chat thread to the repository', async () => {
    const messages: ChatMessage[] = [
      { role: 'user', parts: [{ text: 'a' }] },
      { role: 'model', parts: [{ text: 'b' }] },
    ];
    const { saveChatHistory } = await import('./chatHistoryStorage');

    await saveChatHistory('doc-3', messages);

    expect(replaceChatThread).toHaveBeenCalledTimes(1);
    expect(replaceChatThread).toHaveBeenCalledWith(
      'doc-3',
      expect.arrayContaining([
        expect.objectContaining({ documentId: 'doc-3', role: 'user', parts: [{ text: 'a' }] }),
        expect.objectContaining({ documentId: 'doc-3', role: 'model', parts: [{ text: 'b' }] }),
      ])
    );
  });

  it('loads assistant thread items with metadata from the repository', async () => {
    loadChatThread.mockResolvedValue([
      {
        id: 'doc-1:1:assistant_plan',
        documentId: 'doc-1',
        role: 'model',
        parts: [{ text: 'Plan first' }],
        createdAt: '2026-01-01T00:00:01.000Z',
        threadType: 'assistant_plan',
        responseMode: 'plan',
        thinkingState: 'planning',
      },
    ]);

    const { loadAssistantThreadHistory } = await import('./chatHistoryStorage');
    const [item] = await loadAssistantThreadHistory('doc-1');

    expect(item?.type).toBe('assistant_plan');
    expect(item?.responseMode).toBe('plan');
    expect(item?.thinkingState).toBe('planning');
  });

  it('clears the repository thread and falls back to localStorage cleanup on failure', async () => {
    clearChatThread.mockRejectedValueOnce(new Error('boom'));
    localStorage.setItem('ofk_chat_history_doc-4', JSON.stringify([
      { role: 'user', parts: [{ text: 'draft' }] },
    ] satisfies ChatMessage[]));

    const { clearChatHistory } = await import('./chatHistoryStorage');

    await clearChatHistory('doc-4');

    expect(clearChatThread).toHaveBeenCalledWith('doc-4');
    expect(localStorage.getItem('ofk_chat_history_doc-4')).toBeNull();
  });
});
