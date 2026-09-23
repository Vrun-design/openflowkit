import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StaleSessionRevisionError } from '../../application/session/session';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { compile } from '../../../dsl/compile';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { useV2Proposal } from './useV2Proposal';

const DSL = 'flowchart\nStart -> Finish';
const draw = { blocks: [{ dsl: DSL, frameId: null }], intent: 'Draw a flow' };

function setup(readOnly = false, compileDsl: (text: string) => ReturnType<typeof compile> = (text) => compile(text)) {
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
        commit, readOnly, announce, compileDsl,
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
    await act(() => result.current.propose(draw));
    expect(result.current.phase).toBe('ready');
    expect(result.current.proposal?.baseRevision).toBe(3);
    expect(result.current.changes.map(({ kind }) => kind)).toEqual(['modification']);
    expect(Object.values(result.current.decisions)).toEqual(['accepted']);
  });

  it('fails visibly when the compiler rejects the text', async () => {
    const { result } = setup(false, () => Promise.reject(new Error('Layout crashed')));
    await act(() => result.current.propose(draw));
    expect(result.current.phase).toBe('failed');
    expect(result.current.error).toMatch(/layout crashed/i);
    expect(result.current.proposal).toBeNull();
  });

  it('decides per change and applies once at the base revision', async () => {
    const { result, commit, announce, sync } = setup();
    await act(() => result.current.propose(draw));
    const [diagram] = result.current.changes.map(({ id }) => id);
    act(() => result.current.decide(diagram!, 'rejected'));
    expect(result.current.decisions[diagram!]).toBe('rejected');
    expect(result.current.proposal?.preview.pages[0].nodes).toHaveLength(2);
    act(() => result.current.decide(diagram!, 'accepted'));
    expect(result.current.proposal?.preview.pages[0].nodes.length).toBeGreaterThan(2);
    await act(() => result.current.apply());
    expect(commit).toHaveBeenCalledTimes(1);
    const [command, expected] = commit.mock.calls[0];
    expect(expected).toBe(3);
    expect(command).toMatchObject({ kind: 'batch', attribution: { kind: 'agent', source: 'byok' } });
    expect((command as { commands: readonly DocumentCommand[] }).commands.map(({ kind }) => kind)).toEqual(['set-page']);
    expect(result.current.phase).toBe('applied');
    expect(announce).toHaveBeenCalledWith('Applied 1 change. Press ⌘Z to undo.');
    sync();
    // Double-click on Apply: the same proposal id never commits twice.
    await act(() => result.current.apply());
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('goes stale when the document moved on after the request', async () => {
    const { result, commit, external } = setup();
    await act(() => result.current.propose(draw));
    external();
    expect(result.current.stale).toBe(true);
    await act(() => result.current.apply());
    expect(commit).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('stale');
    await act(() => result.current.propose(draw));
    expect(result.current.phase).toBe('ready');
    expect(result.current.proposal?.baseRevision).toBe(4);
  });

  it('surfaces a session rejection as stale even when the hook thought it was current', async () => {
    const { result, commit } = setup();
    await act(() => result.current.propose(draw));
    commit.mockImplementationOnce(() => { throw new StaleSessionRevisionError(3, 4); });
    await act(() => result.current.apply());
    expect(result.current.phase).toBe('stale');
  });

  it('never applies on a read-only document', async () => {
    const { result, commit } = setup(true);
    await act(() => result.current.propose(draw));
    expect(result.current.phase).toBe('ready');
    expect(result.current.canApply).toBe(false);
    await act(() => result.current.apply());
    expect(commit).not.toHaveBeenCalled();
  });

  it('reviews two diagrams as two rows and applies only the kept one', async () => {
    const { result, commit } = setup();
    await act(async () => { await result.current.propose({ blocks: [{ dsl: DSL, frameId: null }, { dsl: 'flowchart\nLogin -> Home', frameId: null }], intent: 'Two flows' }); });
    const [first, second] = result.current.changes.map(({ id }) => id);
    expect(second).toBeDefined();
    act(() => result.current.decide(first!, 'rejected'));
    await act(async () => { expect(await result.current.apply()).toBe(true); });
    const [command] = commit.mock.calls[0]!;
    const commands = (command as { commands: readonly { kind: string; after: { nodes: readonly { id: string }[] } }[] }).commands;
    expect(commands).toHaveLength(1);
    expect(commands[0]!.after.nodes.some(({ id }) => id === 'login')).toBe(true);
    expect(commands[0]!.after.nodes.some(({ id }) => id === 'start')).toBe(false);
  });

  it('hands compile errors back with their line, so the model can fix them', async () => {
    const { result } = setup(false, async (text) => ({
      ...await compile(text),
      diagnostics: [{ code: 'E001', severity: 'error', line: 2, col: 1, endCol: 2, message: 'Document is empty', source: 'parse' }],
    }) as Awaited<ReturnType<typeof compile>>);
    let reason: unknown = null;
    await act(async () => { reason = await result.current.propose(draw); });
    expect(result.current.phase).toBe('failed');
    expect(reason).toEqual({ error: 'Diagram 1, line 2: Document is empty', compile: true });
  });

  it('discard clears everything', async () => {
    const { result } = setup();
    await act(() => result.current.propose(draw));
    act(() => result.current.highlight('diagram:x'));
    expect(result.current.highlightedChangeId).toBe('diagram:x');
    act(() => result.current.discard());
    expect(result.current.phase).toBe('idle');
    expect(result.current.proposal).toBeNull();
    expect(result.current.highlightedChangeId).toBeNull();
  });
});
