import { describe, expect, it } from 'vitest';
import { projectLegacyDocument } from '@/opencanvas/domain/document/legacyProjection';
import { AGENT_ACTIONS, findAgentAction } from './actions';
import { runAgentAction } from './runAction';

function document() {
  return projectLegacyDocument({
    name: 'Agent',
    nodes: [
      { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'b', type: 'process', position: { x: 300, y: 0 }, data: { label: 'B' } },
    ],
    edges: [],
  }, { documentId: 'doc', pageId: 'page', now: '2026-09-19T00:00:00.000Z' });
}

function run(name: string, input: unknown, source = document()) {
  return runAgentAction(findAgentAction(name)!, input, source, 'page');
}

describe('agent actions', () => {
  it('registers unique names with schemas', () => {
    const names = AGENT_ACTIONS.map(({ name }) => name);
    expect(new Set(names).size).toBe(names.length);
    expect(findAgentAction('missing')).toBeNull();
  });

  it('reads the page', () => {
    const { changed, output } = run('get_document', {});
    expect(changed).toBe(false);
    expect(output).toMatchObject({ pageId: 'page', nodes: [{ id: 'a', label: 'A', x: 0 }, { id: 'b' }] });
  });

  it('adds, labels, moves, connects, and deletes through canonical commands', () => {
    let { document: doc } = run('add_node', { kind: 'decision', label: 'Ok?', x: 150, y: 200, id: 'c' });
    expect(doc.pages[0].nodes.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    expect(doc.pages[0].nodes[2].content.label).toBe('Ok?');

    ({ document: doc } = run('set_label', { id: 'c', label: 'Really?' }, doc));
    expect(doc.pages[0].nodes[2].content.label).toBe('Really?');

    ({ document: doc } = run('move_node', { id: 'c', x: 10, y: 20 }, doc));
    expect(doc.pages[0].nodes[2].transform.translation).toEqual({ x: 10, y: 20 });

    ({ document: doc } = run('connect', { source: 'a', target: 'c', id: 'ac' }, doc));
    expect(doc.pages[0].connectors.map(({ id }) => id)).toEqual(['ac']);

    ({ document: doc } = run('delete_node', { id: 'c' }, doc));
    expect(doc.pages[0].nodes.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(doc.pages[0].connectors).toEqual([]);
  });

  it('rejects invalid input and unknown references without touching the document', () => {
    expect(() => run('add_node', { label: '' })).toThrow();
    expect(() => run('connect', { source: 'a', target: 'nope' })).toThrow(/not found/);
    expect(() => run('move_node', { id: 'nope', x: 0, y: 0 })).toThrow(/not found/);
    expect(run('set_label', { id: 'a', label: 'A' }).changed).toBe(false);
  });
});
