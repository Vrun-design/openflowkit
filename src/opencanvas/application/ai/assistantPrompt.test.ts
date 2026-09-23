import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { grammarAppendix, grammarSection } from '../../../dsl/grammar';
import {
  assistantSystemPrompt, buildAssistantMessages, describeCanvas, parseAssistantReply,
  type AssistantContext,
} from './assistantPrompt';

const grammar = readFileSync('src/dsl/grammar.md', 'utf8');

const context: AssistantContext = {
  pageName: 'Checkout', scope: 'page', focus: [], outOfScope: 0,
  frames: [{ id: 'dsl-1', title: 'Payment', family: 'flowchart', dsl: 'flowchart\n  Pay -> Ship' }],
};

describe('grammar text helpers', () => {
  it('extracts the cheat-sheet appendix without its fence', () => {
    const appendix = grammarAppendix(grammar);
    expect(appendix).toContain('OFK diagram language, v1');
    expect(appendix).not.toContain('```');
    expect(appendix.length).toBeLessThan(5000);
  });

  it('narrows to a family section and degrades to the whole document', () => {
    const sequence = grammarSection(grammar, 'sequence');
    expect(sequence.toLowerCase()).toContain('sequence');
    expect(sequence.length).toBeLessThan(grammar.length / 2);
    expect(grammarSection(grammar)).toBe(grammar);
    expect(grammarSection(grammar, 'nope')).toBe(grammar);
  });
});

describe('assistant prompt', () => {
  it('lets the model talk, and makes a block the only way to draw', () => {
    const system = assistantSystemPrompt(grammar);
    expect(system).toContain('Do not draw');
    expect(system).toContain('```openflow frame=<id>');
    expect(system).toContain('OFK diagram language, v1');
  });

  it('with tools, writes go through the write tools and blocks are not taught', () => {
    const system = assistantSystemPrompt(grammar, { tools: true });
    expect(system).toContain('update_diagram');
    expect(system).not.toContain('```openflow frame=<id>');
  });

  it('lists frames past the budget without their text, so a tool model reads them', () => {
    const big = { id: 'dsl-2', title: null, family: 'flowchart', dsl: 'flowchart\n  A -> B\n  B -> C' };
    const text = describeCanvas({ ...context, frames: [...context.frames, big] }, context.frames[0]!.dsl.length);
    expect(text).toContain('Pay -> Ship');
    expect(text).toContain('frame=dsl-2 family=flowchart — not shown (3 lines): call read_diagram first.');
    expect(text).not.toContain('B -> C');
  });

  it('re-sends only the newest eight images and notes the rest', () => {
    const image = { mediaType: 'image/png', data: 'x' };
    const history = [
      { role: 'user' as const, text: 'old', images: [image, image, image] },
      { role: 'user' as const, text: 'mid', images: [image, image, image, image] },
    ];
    const messages = buildAssistantMessages(history, { role: 'user', text: 'new', images: [image, image] }, context);
    expect(messages.map(({ images }) => images?.length ?? 0)).toEqual([2, 4, 2]);
    expect(messages[0]!.text).toBe('old\n[1 earlier image not re-sent]');
  });

  it('shows the model every diagram in scope with its id and text', () => {
    const text = describeCanvas({ ...context, scope: 'selection', focus: ['Pay'], outOfScope: 2 });
    expect(text).toContain('Page: Checkout');
    expect(text).toContain("user's selection (1 diagram)");
    expect(text).toContain('Selected shapes: Pay');
    expect(text).toContain('frame=dsl-1 family=flowchart title="Payment"');
    expect(text).toContain('Pay -> Ship');
    expect(text).toContain('2 other diagrams on this page are out of scope');
  });

  it('says so when there is nothing to edit', () => {
    expect(describeCanvas({ ...context, frames: [] })).toContain('no diagrams yet');
  });

  it('keeps history as real turns and puts the canvas on the newest message only', () => {
    const messages = buildAssistantMessages(
      [{ role: 'user', text: 'hi' }, { role: 'assistant', text: 'Hello!' }, { role: 'assistant', text: ' ' }],
      { role: 'user', text: 'add a refund branch' }, context);
    expect(messages.map(({ role }) => role)).toEqual(['user', 'assistant', 'user']);
    expect(messages[0]!.text).toBe('hi');
    expect(messages[2]!.text).toMatch(/^<canvas>[\s\S]*<\/canvas>\n\nadd a refund branch$/);
  });
});

describe('assistant reply', () => {
  it('is pure talk when there is no block', () => {
    expect(parseAssistantReply('Hi! What would you like to map?'))
      .toEqual({ prose: 'Hi! What would you like to map?', blocks: [], drafting: false });
  });

  it('splits prose from replace and add blocks', () => {
    const reply = parseAssistantReply([
      'I added a refund path and a new ops view.',
      '```openflow frame=dsl-1', 'flowchart', '  Pay -> Ship', '  Pay -> Refund', '```',
      '```openflow new', 'architecture', '  Web -> Api', '```',
      'Want retries too?',
    ].join('\n'));
    expect(reply.prose).toBe('I added a refund path and a new ops view.\n\nWant retries too?');
    expect(reply.blocks).toEqual([
      { frameId: 'dsl-1', dsl: 'flowchart\n  Pay -> Ship\n  Pay -> Refund' },
      { frameId: null, dsl: 'architecture\n  Web -> Api' },
    ]);
  });

  it('hides a half-written block while it streams', () => {
    const reply = parseAssistantReply('Drawing it now.\n```openflow new\nflowchart\n  A ->');
    expect(reply).toEqual({ prose: 'Drawing it now.', blocks: [], drafting: true });
  });

  it('takes bare DSL from weaker models, but not prose that starts with a family word', () => {
    expect(parseAssistantReply('flowchart\n  A -> B').blocks).toEqual([{ frameId: null, dsl: 'flowchart\n  A -> B' }]);
    expect(parseAssistantReply('flowchart is the right family here.\nWant one?').blocks).toEqual([]);
  });

  it('leaves other code fences in the prose', () => {
    expect(parseAssistantReply('Use:\n```\nA -> B\n```').prose).toContain('```\nA -> B\n```');
  });
});
