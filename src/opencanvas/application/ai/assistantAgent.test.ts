import { describe, expect, it, vi } from 'vitest';
import { compile } from '../../../dsl/compile';
import type { AiMessage, AiTurn } from '../../../services/ai/provider';
import type { ScenePage } from '../../domain/document/types';
import { createEmptyV2Document, createEmptyV2Page } from '../../presentation/v2/v2Document';
import { buildDslPageCommand } from '../dsl/dslPageCommand';
import { runAssistantAgent, type AgentStep } from './assistantAgent';
import { assistantToolkit } from './assistantTools';

async function setup() {
  const seed = await compile('flowchart\nPay -> Ship', { origin: { x: 0, y: 0 } });
  const page = (buildDslPageCommand(createEmptyV2Page(), seed) as { after: ScenePage }).after;
  const document = { ...createEmptyV2Document('doc'), pages: [page] };
  const toolkit = assistantToolkit({
    document, pageId: page.id, inScope: new Set([seed.frame.id]),
    capabilities: { syntax: () => '## Flowchart', searchIcons: async () => [{ provider: 'aws', slug: 'rds', label: 'RDS' }] },
    // The compiler is lenient (bad lines warn); BROKEN stands in for a real error.
    compile: async (text) => {
      const result = await compile(text.replace('BROKEN', ''));
      return text.includes('BROKEN')
        ? { ...result, diagnostics: [{ code: 'E001', severity: 'error', line: 2, col: 1, endCol: 1, message: 'Unexpected token', source: 'parse' }] } as typeof result
        : result;
    },
  });
  return { frameId: seed.frame.id, toolkit };
}

const turn = (text: string, calls: [string, Record<string, unknown>][] = []): AiTurn =>
  ({ text, toolCalls: calls.map(([name, input], index) => ({ id: `c${index}`, name, input })), replay: null });

describe('assistant agent', () => {
  it('reads, fixes a draft that did not compile, then queues it and answers', async () => {
    const { frameId, toolkit } = await setup();
    const seen: AiMessage[][] = [];
    const replies = [
      turn('Let me look.', [['read_diagram', { frame_id: frameId }]]),
      turn('', [['update_diagram', { frame_id: frameId, dsl: 'flowchart\nBROKEN' }]]),
      turn('', [['update_diagram', { frame_id: frameId, dsl: 'flowchart\nPay -> Ship\nPay -> Refund' }]]),
      turn('Added a refund path.'),
    ];
    const steps = new Map<string, AgentStep>();
    const narration: string[] = [];
    const result = await runAssistantAgent({
      onNarration: (text) => narration.push(text),
      messages: [{ role: 'user', content: 'add a refund path' }], toolkit,
      respond: async (messages) => { seen.push([...messages]); return replies.shift()!; },
      onStep: (step) => steps.set(step.id, step),
    });

    expect(result).toEqual({ text: 'Added a refund path.', rounds: 4 });
    expect(narration).toEqual(['Let me look.']);
    expect([...steps.values()].map(({ status, label }) => `${status}: ${label}`)).toEqual([
      'done: Read the diagram',
      'error: Draft for the diagram did not compile',
      'done: Drafted changes to the diagram',
    ]);
    const firstResult = seen[1]!.at(-1) as Extract<AiMessage, { role: 'tool' }>;
    expect(firstResult.results[0]!.content).toContain('Pay -> Ship');
    const failed = seen[2]!.at(-1) as Extract<AiMessage, { role: 'tool' }>;
    expect(failed.results[0]).toMatchObject({ isError: true });
    expect(toolkit.blocks()).toEqual([{ frameId, dsl: 'flowchart\nPay -> Ship\nPay -> Refund' }]);
  });

  it('refuses a diagram outside the scope and never queues it', async () => {
    const { toolkit } = await setup();
    const outcome = await toolkit.run({ id: 'x', name: 'update_diagram', input: { frame_id: 'elsewhere', dsl: 'flowchart\nA -> B' } });
    expect(outcome).toMatchObject({ isError: true });
    expect(toolkit.blocks()).toEqual([]);
  });

  it('stops at the round cap and tells the model to wrap up first', async () => {
    const { toolkit } = await setup();
    const respond = vi.fn(async (_messages: readonly AiMessage[]) => turn('', [['list_diagrams', {}]]));
    const result = await runAssistantAgent({ messages: [], toolkit, respond, onStep: () => undefined, maxRounds: 3 });
    expect(result.rounds).toBe(3);
    const last = respond.mock.calls[2]![0].at(-1) as Extract<AiMessage, { role: 'tool' }>;
    expect(last.results[0]!.content).toContain('Step limit reached');
  });

  it('finds icon ids through the concept search', async () => {
    const { toolkit } = await setup();
    const outcome = await toolkit.run({ id: 'i', name: 'find_icons', input: { concept: 'database' } });
    expect(outcome.content).toContain('aws/rds — RDS');
  });
});
