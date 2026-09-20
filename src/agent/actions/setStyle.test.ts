import { describe, expect, it } from 'vitest';
import { buildStyleNodesCommand } from '@/opencanvas/domain/commands/styleNodes';
import { createTestDocument, createTestNode } from '@/opencanvas/testing/builders/documentBuilder';
import { resolveAgentActionCommand } from '../runAction';
import { setStyle } from './setStyle';

describe('set_style', () => {
  it('emits the same batch the style popover commits', () => {
    const document = createTestDocument({ nodes: [createTestNode('a'), createTestNode('b')] });
    const patch = { fill: '#c9b8ed', stroke: '#252724', strokeWidth: 3, strokeStyle: 'dashed', opacity: 0.5 };
    const manual = buildStyleNodesCommand(document.pages[0], ['a', 'b'], patch);
    const agent = resolveAgentActionCommand(setStyle, { ids: ['a', 'b'], ...patch }, document, 'page-1');
    expect(agent.command).toEqual(manual);
    expect(agent.output).toEqual({ ids: ['a', 'b'] });
  });

  it('returns no command when nothing changes and rejects bad input', () => {
    const document = createTestDocument({ nodes: [createTestNode('a', { appearance: { fill: '#abcdef' } })] });
    expect(resolveAgentActionCommand(setStyle, { ids: ['a'], fill: '#abcdef' }, document, 'page-1').command).toBeNull();
    expect(() => resolveAgentActionCommand(setStyle, { ids: ['a'], fill: 'red' }, document, 'page-1')).toThrow();
    expect(() => resolveAgentActionCommand(setStyle, { ids: ['a'], strokeStyle: 'wavy' }, document, 'page-1')).toThrow();
    expect(() => resolveAgentActionCommand(setStyle, { ids: ['nope'], fill: '#000000' }, document, 'page-1')).toThrow(/not found/);
    expect(() => resolveAgentActionCommand(setStyle, { ids: ['a'] }, document, 'page-1')).toThrow(/at least one/i);
  });
});
