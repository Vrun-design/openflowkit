import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { grammarAppendix, grammarSection } from '../../../dsl/grammar';
import { buildDslPrompt, DSL_SYSTEM_PROMPT, extractDsl } from './dslPrompt';

const grammar = readFileSync('docs/plan/grammar.md', 'utf8');

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

describe('AI prompt', () => {
  it('carries the cheat sheet, the current text and the request', () => {
    const { system, prompt } = buildDslPrompt({
      grammar, intent: 'Add a retry branch after payment',
      currentDsl: 'flowchart\n\n  Pay -> Ship', family: 'flowchart',
    });
    expect(system).toBe(DSL_SYSTEM_PROMPT);
    expect(system).toContain('ONLY the DSL');
    expect(prompt).toContain('OFK diagram language, v1');
    expect(prompt).toContain('Pay -> Ship');
    expect(prompt).toContain('Request: Add a retry branch after payment');
    expect(prompt).toContain('`flowchart` family');
  });

  it('omits empty sections rather than leaving dangling headings', () => {
    const { prompt } = buildDslPrompt({ grammar, intent: 'Draw a login flow' });
    expect(prompt).not.toContain('The diagram it replaces');
    expect(prompt).toContain('Request: Draw a login flow');
  });

  it('unwraps fenced output and leading pleasantries', () => {
    expect(extractDsl('```flowchart\nflowchart\n  A -> B\n```')).toBe('flowchart\n  A -> B');
    expect(extractDsl('Here is your diagram:\nflowchart\n  A -> B')).toBe('flowchart\n  A -> B');
    expect(extractDsl('  flowchart\n  A -> B  ')).toBe('flowchart\n  A -> B');
  });
});
