import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StaleSessionRevisionError } from '../../application/session/session';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { useV2Proposal } from './useV2Proposal';

function setup(readOnly = false) {
  let document = createTestDocument({ nodes: [createTestNode('a'), createTestNode('b', { content: { label: '' } })] });
  let revision = 3;
  const commit = vi.fn((command: DocumentCommand, expectedRevision?: number) => {
    if (expectedRevision !== undefined && expectedRevision !== revision) {
      throw new StaleSessionRevisionError(expectedRevision, revision);
    }
    revision += 1;
  });
  const announce = vi.fn();
  const hook = renderHook(
    (props: { document: SceneDocumentV1; revision: number }) =>
      useV2Proposal({
        document: props.document, revision: props.revision, pageId: 'page-1',
        selectionRef: { current: { nodeIds: ['a'], primaryNodeId: 'a' } },
        commit, readOnly, announce, mintId: (prefix) => `${prefix}-x`,
      }),
    { initialProps: { document, revision } }
  );
  const external = () => { revision += 1; document = { ...document }; hook.rerender({ document, revision }); };
  return { ...hook, commit, announce, external, sync: () => hook.rerender({ document, revision }) };
}

describe('useV2Proposal', () => {
  it('starts idle and becomes ready with every change accepted', async () => {
    const { result } = setup();
    expect(result.current.phase).toBe('idle');
    await act(() => result.current.request('label-unlabeled'));
    expect(result.current.phase).toBe('ready');
    expect(result.current.proposal?.baseRevision).toBe(3);
    expect(result.current.changes.map(({ kind }) => kind)).toEqual(['modification']);
    expect(result.current.decisions).toEqual({ 'label:b': 'accepted' });
  });

  it('fails visibly when the intent has no precondition', async () => {
    const { result } = setup();
    await act(() => result.current.request('tidy-row'));
    expect(result.current.phase).toBe('failed');
    expect(result.current.error).toMatch(/two nodes/i);
    expect(result.current.proposal).toBeNull();
  });

  it('decides per change and applies once at the base revision', async () => {
    const { result, commit, announce, sync } = setup();
    await act(() => result.current.request('add-step-after-selection'));
    const [add, connect] = result.current.changes.map(({ id }) => id);
    act(() => result.current.decide(connect, 'rejected'));
    expect(result.current.decisions[connect]).toBe('rejected');
    expect(result.current.proposal?.preview.pages[0].connectors).toHaveLength(0);
    await act(() => result.current.apply());
    expect(commit).toHaveBeenCalledTimes(1);
    const [command, expected] = commit.mock.calls[0];
    expect(expected).toBe(3);
    expect(command).toMatchObject({ kind: 'batch', attribution: { kind: 'agent', source: 'local-agent' } });
    expect((command as { commands: readonly DocumentCommand[] }).commands.map(({ kind }) => kind)).toEqual(['insert-node']);
    expect(result.current.phase).toBe('applied');
    expect(announce).toHaveBeenCalledWith('Agent proposal applied: 1 change. Press ⌘Z to undo.');
    sync();
    // Double-click on Apply: the same proposal id never commits twice.
    await act(() => result.current.apply());
    expect(commit).toHaveBeenCalledTimes(1);
    expect(add).toBeDefined();
  });

  it('goes stale when the document moved on after the request', async () => {
    const { result, commit, external } = setup();
    await act(() => result.current.request('label-unlabeled'));
    external();
    expect(result.current.stale).toBe(true);
    await act(() => result.current.apply());
    expect(commit).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('stale');
    await act(() => result.current.request('label-unlabeled'));
    expect(result.current.phase).toBe('ready');
    expect(result.current.proposal?.baseRevision).toBe(4);
  });

  it('surfaces a session rejection as stale even when the hook thought it was current', async () => {
    const { result, commit } = setup();
    await act(() => result.current.request('label-unlabeled'));
    commit.mockImplementationOnce(() => { throw new StaleSessionRevisionError(3, 4); });
    await act(() => result.current.apply());
    expect(result.current.phase).toBe('stale');
  });

  it('never applies on a read-only document', async () => {
    const { result, commit } = setup(true);
    await act(() => result.current.request('label-unlabeled'));
    expect(result.current.phase).toBe('ready');
    expect(result.current.canApply).toBe(false);
    await act(() => result.current.apply());
    expect(commit).not.toHaveBeenCalled();
  });

  it('discard clears everything', async () => {
    const { result } = setup();
    await act(() => result.current.request('label-unlabeled'));
    act(() => result.current.highlight('label:b'));
    expect(result.current.highlightedChangeId).toBe('label:b');
    act(() => result.current.discard());
    expect(result.current.phase).toBe('idle');
    expect(result.current.proposal).toBeNull();
    expect(result.current.highlightedChangeId).toBeNull();
  });
});
