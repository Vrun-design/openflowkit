import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compile } from '../../../dsl/compile';
import { deterministicLayout } from '../../../dsl/layout';
import type { DocumentCommand } from '../../domain/commands/types';
import { createTestDocument } from '../../testing/builders/documentBuilder';
import { useV2Assistant } from './useV2Assistant';
import type { V2AiSettings } from './useV2AiSettings';
import { useV2Proposal } from './useV2Proposal';

const GRAMMAR = '# DSL\n\n## Appendix A\n\n```\nOFK diagram language, v1\n```\n';
const settings: V2AiSettings = { provider: 'openai', connections: { openai: { apiKey: 'sk-test', baseUrl: '', model: 'test-model' } } };
const reply = (content: string) => ({ ok: true, status: 200, headers: new Headers(), text: async () => JSON.stringify({ choices: [{ message: { content } }] }) }) as Response;

const toolCall = (name: string, input: unknown, content: string | null = null) => ({
  ok: true, status: 200, headers: new Headers(),
  text: async () => JSON.stringify({ choices: [{ message: { content, tool_calls: [{ id: 'call_1', type: 'function', function: { name, arguments: JSON.stringify(input) } }] } }] }),
}) as Response;

function harness(replies: Response[], withTools = false) {
  const fetchMock = vi.fn(async () => replies.shift()!);
  vi.stubGlobal('fetch', fetchMock);
  const document = createTestDocument({ nodes: [], connectors: [] });
  const hook = renderHook(() => {
    const proposal = useV2Proposal({
      document, revision: 1, pageId: 'page-1', commit: vi.fn((_command: DocumentCommand) => undefined),
      readOnly: false, announce: vi.fn(), compileDsl: (text) => compile(text, { layout: deterministicLayout }),
    });
    const assistant = useV2Assistant({
      documentId: null, page: document.pages[0]!, selectedIds: [], settings, proposal,
      loadGrammar: async () => GRAMMAR, undo: vi.fn(), announce: vi.fn(),
      ...(withTools ? { tools: {
        document, compile: (text: string) => compile(text, { layout: deterministicLayout }),
        capabilities: { syntax: () => GRAMMAR, searchIcons: async () => [] },
      } } : {}),
    });
    return { proposal, assistant };
  });
  const bodies = () => fetchMock.mock.calls.map((call) => JSON.parse(String((call as unknown as [string, RequestInit])[1].body)) as { messages: { role: string; content: string }[]; tools?: unknown[] });
  return { hook, bodies };
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('assistant conversation', () => {
  it('talks back to a greeting, then draws on request with the first exchange as history', async () => {
    const { hook, bodies } = harness([reply('Hello! What shall we map?'), reply('Done.\n```openflow new\nflowchart\n  A -> B\n```')]);
    act(() => hook.result.current.assistant.send('hi', 'page'));
    await waitFor(() => expect(hook.result.current.assistant.busy).toBe(false));
    expect(hook.result.current.assistant.messages.map(({ role, status }) => `${role}:${status ?? ''}`)).toEqual(['user:', 'assistant:done']);
    expect(hook.result.current.proposal.phase).toBe('idle');

    act(() => hook.result.current.assistant.send('draw a flow', 'page'));
    await waitFor(() => expect(hook.result.current.proposal.phase).toBe('ready'));
    await waitFor(() => expect(hook.result.current.assistant.busy).toBe(false));
    const last = hook.result.current.assistant.messages.at(-1)!;
    expect(last.proposalId).toBe(hook.result.current.proposal.proposal!.id);
    const sent = bodies()[1]!.messages;
    expect(sent.map(({ role }) => role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(sent[3]!.content).toMatch(/^<canvas>[\s\S]*draw a flow$/);
  });

  it('retries a 503 once, quietly, before anything streamed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const down = { ok: false, status: 503, headers: new Headers(), text: async () => '{}' } as Response;
    const { hook } = harness([down, reply('Back.')]);
    act(() => hook.result.current.assistant.send('hi', 'page'));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    await waitFor(() => expect(hook.result.current.assistant.busy).toBe(false));
    expect(hook.result.current.assistant.messages.at(-1)).toMatchObject({ status: 'done', text: 'Back.' });
  });

  it('edits a sent turn: the replies after it are replaced', async () => {
    const { hook } = harness([reply('One.'), reply('Two.')]);
    act(() => hook.result.current.assistant.send('first', 'page'));
    await waitFor(() => expect(hook.result.current.assistant.busy).toBe(false));
    const userId = hook.result.current.assistant.messages[0]!.id;
    act(() => hook.result.current.assistant.edit(userId, 'second'));
    await waitFor(() => expect(hook.result.current.assistant.messages.at(-1)?.text).toBe('Two.'));
    expect(hook.result.current.assistant.messages.map(({ text }) => text)).toEqual(['second', 'Two.']);
  });

  it('runs the agent: a tool drafts the diagram, the step is recorded, the reply carries the proposal', async () => {
    const { hook, bodies } = harness([toolCall('add_diagram', { dsl: 'flowchart\n  A -> B' }), reply('Added a two-step flow.')], true);
    act(() => hook.result.current.assistant.send('draw a flow', 'page'));
    await waitFor(() => expect(hook.result.current.assistant.busy).toBe(false));
    const last = hook.result.current.assistant.messages.at(-1)!;
    expect(last).toMatchObject({ status: 'done', text: 'Added a two-step flow.', proposalId: hook.result.current.proposal.proposal!.id });
    expect(last.steps).toEqual([expect.objectContaining({ tool: 'add_diagram', status: 'done', label: 'Drafted a new flowchart' })]);
    expect(bodies()[0]!.tools).toHaveLength(6);
    expect(bodies()[1]!.messages.map(({ role }) => role)).toEqual(['system', 'user', 'assistant', 'tool']);
  });

  it('falls back to diagram blocks when the model refuses tools', async () => {
    const refused = { ok: false, status: 400, headers: new Headers(), text: async () => '{"error":"does not support tools"}' } as Response;
    const { hook, bodies } = harness([refused, reply('Sure.\n```openflow new\nflowchart\n  A -> B\n```')], true);
    act(() => hook.result.current.assistant.send('draw a flow', 'page'));
    await waitFor(() => expect(hook.result.current.proposal.phase).toBe('ready'));
    expect(bodies()[1]!.tools).toBeUndefined();
  });

  it('keeps past chats: New chat starts fresh, and the old one reopens', async () => {
    const { hook } = harness([reply('One.'), reply('Two.')]);
    act(() => hook.result.current.assistant.send('first', 'page'));
    await waitFor(() => expect(hook.result.current.assistant.busy).toBe(false));
    const firstChat = hook.result.current.assistant.activeChatId;
    act(() => hook.result.current.assistant.newChat());
    expect(hook.result.current.assistant.messages).toEqual([]);
    act(() => hook.result.current.assistant.send('second', 'page'));
    await waitFor(() => expect(hook.result.current.assistant.messages.at(-1)?.text).toBe('Two.'));
    expect(hook.result.current.assistant.chats.map(({ title }) => title)).toEqual(['second', 'first']);
    act(() => hook.result.current.assistant.openChat(firstChat));
    expect(hook.result.current.assistant.messages.map(({ text }) => text)).toEqual(['first', 'One.']);
    act(() => hook.result.current.assistant.deleteChat(firstChat));
    expect(hook.result.current.assistant.chats.map(({ title }) => title)).toEqual(['second']);
    expect(hook.result.current.assistant.messages).toEqual([]);
  });

  it('leaving a chat drops its pending review, so no ghost stays on the canvas', async () => {
    const { hook } = harness([reply('Done.\n```openflow new\nflowchart\n  A -> B\n```')]);
    act(() => hook.result.current.assistant.send('draw a flow', 'page'));
    await waitFor(() => expect(hook.result.current.proposal.phase).toBe('ready'));
    await waitFor(() => expect(hook.result.current.assistant.busy).toBe(false));
    const reply0 = hook.result.current.assistant.messages.at(-1)!.id;
    const chat = hook.result.current.assistant.activeChatId;
    act(() => hook.result.current.assistant.newChat());
    expect(hook.result.current.proposal.phase).toBe('idle');
    act(() => hook.result.current.assistant.openChat(chat));
    expect(hook.result.current.assistant.messages.find(({ id }) => id === reply0)?.outcome).toBe('discarded');
  });
});
