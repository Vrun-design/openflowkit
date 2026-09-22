import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compile } from '../../../dsl/compile';
import { deterministicLayout } from '../../../dsl/layout';
import { useV2Proposal } from './useV2Proposal';
import { useV2AiRequest } from './useV2AiRequest';
import type { V2AiSettings } from './useV2AiSettings';
import { createTestDocument } from '../../testing/builders/documentBuilder';
import type { DocumentCommand } from '../../domain/commands/types';

const GRAMMAR = `# OpenFlow DSL\n\n## Appendix A — cheat sheet\n\n\`\`\`\nOFK diagram language, v1\nflowchart\n  A -> B\n\`\`\`\n`;

const settings: V2AiSettings = { provider: 'openai', apiKey: 'sk-test', baseUrl: '', model: 'test-model' };

function harness() {
  const document = createTestDocument({ nodes: [], connectors: [] });
  const commit = vi.fn((_command: DocumentCommand) => undefined);
  const hook = renderHook(() => {
    const proposal = useV2Proposal({
      document, revision: 1, pageId: 'page-1', commit,
      readOnly: false, announce: vi.fn(),
      compileDsl: (text) => compile(text, { layout: deterministicLayout }),
    });
    const ai = useV2AiRequest({
      settings, proposal,
      loadGrammar: async () => GRAMMAR,
      currentDsl: () => undefined,
      frameId: () => undefined,
      announce: vi.fn(),
    });
    return { proposal, ai };
  });
  return { hook, commit };
}

const reply = (dsl: string) => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: dsl } }] }) }) as Response;

afterEach(() => { vi.unstubAllGlobals(); });

describe('BYOK generation', () => {
  it('turns a provider reply into a reviewable proposal and one undo step', async () => {
    const fetchMock = vi.fn(async () => reply('```\n%% ofk 1\nflowchart\n\n  Client [blue] -> API [emerald]\n```'));
    vi.stubGlobal('fetch', fetchMock);
    const { hook, commit } = harness();

    await act(() => hook.result.current.ai.ask('Draw a login flow'));
    const { proposal } = hook.result.current;
    expect(proposal.phase).toBe('ready');
    expect(proposal.changes).toHaveLength(1);
    expect(proposal.changes[0]!.label).toContain('diagram');
    // The ghost preview holds the compiled shapes, not just the command.
    const preview = proposal.proposal!.preview.pages[0]!;
    expect(preview.nodes.filter((node) => node.kind !== 'frame')).toHaveLength(2);
    expect(preview.nodes.some((node) => node.kind === 'frame')).toBe(true);

    await act(() => proposal.apply());
    expect(commit).toHaveBeenCalledTimes(1);
    const [command] = commit.mock.calls[0]!;
    expect(command.kind).toBe('batch');
    expect(hook.result.current.proposal.phase).toBe('applied');
  });

  it('sends the cheat sheet, the request and the key to the configured provider', async () => {
    const fetchMock = vi.fn(async () => reply('flowchart\n  A -> B'));
    vi.stubGlobal('fetch', fetchMock);
    const { hook } = harness();
    await act(() => hook.result.current.ai.ask('Draw a two-step flow'));
    const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk-test');
    const body = JSON.parse(String(init.body)) as { messages: { role: string; content: string }[] };
    expect(body.messages[0]!.content).toContain('Return ONLY the DSL text');
    expect(body.messages[1]!.content).toContain('OFK diagram language, v1');
    expect(body.messages[1]!.content).toContain('Request: Draw a two-step flow');
    expect(hook.result.current.ai.lastModel).toBe('test-model');
  });

  it('surfaces provider failures in the panel instead of proposing anything', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, text: async () => '{"error":{"message":"bad key"}}' }) as Response));
    const { hook } = harness();
    await act(() => hook.result.current.ai.ask('Draw a flow'));
    expect(hook.result.current.ai.error).toMatch(/rejected the key/);
    expect(hook.result.current.proposal.phase).toBe('idle');
    expect(hook.result.current.ai.busy).toBe(false);
  });
});
