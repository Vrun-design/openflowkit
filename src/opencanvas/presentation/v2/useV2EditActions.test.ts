import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { replaceSelection } from '../../application/selection/selection';
import type { DocumentCommand } from '../../domain/commands/types';
import { useV2EditActions } from './useV2EditActions';

function setup(nodeIds: readonly string[]) {
  const page = createTestDocument({
    nodes: [createTestNode('a'), createTestNode('b', { metadata: { model: { elementId: 'api' } } })],
  }).pages[0]!;
  const commit = vi.fn<(command: DocumentCommand) => void>();
  const announce = vi.fn();
  const applySelection = vi.fn();
  let minted = 0;
  const { result } = renderHook(() => useV2EditActions({
    commit, pageRef: { current: page }, selectionRef: { current: replaceSelection(nodeIds) }, selectedConnectorIds: [],
    mintId: (prefix) => `${prefix}-${++minted}`, readOnly: false, applySelection, applyConnectorSelection: vi.fn(), announce,
  }));
  return { actions: result.current, commit, announce, applySelection };
}

describe('useV2EditActions paste', () => {
  it('pastes our own clipboard JSON from the paste event, and leaves other text alone', () => {
    const source = setup(['a']);
    const writeText = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    source.actions.copySelection();
    const json = (writeText.mock.calls[0] as unknown as [string])[0];

    const target = setup([]);
    expect(target.actions.pasteShapes('just words')).toBe(false);
    expect(target.actions.pasteShapes(json)).toBe(true);
    expect(target.commit).toHaveBeenCalledOnce();
    expect(target.applySelection).toHaveBeenCalledWith(expect.objectContaining({ nodeIds: [expect.stringMatching(/^node-/)] }));
  });

  it('pastes the in-memory copy when no text is given (the menu, or a clipboard that is not ours)', () => {
    const t = setup(['a']);
    expect(t.actions.pasteShapes()).toBe(false);
    t.actions.copySelection();
    expect(t.actions.pasteShapes()).toBe(true);
    expect(t.commit).toHaveBeenCalledOnce();
  });
});

describe('useV2EditActions delete', () => {
  it('a mixed selection on a model view deletes all of it in one step and says the model keeps the elements', () => {
    const t = setup(['a', 'b']);
    t.actions.deleteSelection();
    expect(t.commit).toHaveBeenCalledOnce();
    const command = t.commit.mock.calls[0]![0];
    const removed = command.kind === 'batch' ? command.commands.flatMap((c) => (c.kind === 'remove-node' ? [c.node.id] : [])) : [];
    expect(removed.sort()).toEqual(['a', 'b']);
    expect(t.announce).toHaveBeenCalledWith(expect.stringContaining('The model keeps'));
  });

  it('a plain delete just says so', () => {
    const t = setup(['a']);
    t.actions.deleteSelection();
    expect(t.announce).toHaveBeenCalledWith('Selection deleted.');
  });
});

describe('useV2EditActions ⌘V without a paste event (WebKit outside a field)', () => {
  afterEach(() => vi.useRealTimers());
  it('the key alone pastes the in-memory copy after a beat', () => {
    vi.useFakeTimers();
    const t = setup(['a']);
    t.actions.copySelection();
    t.actions.pasteKeyPressed();
    expect(t.commit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(t.commit).toHaveBeenCalledOnce();
  });

  it('a paste event that follows the key takes over: no second paste', () => {
    vi.useFakeTimers();
    const t = setup(['a']);
    t.actions.copySelection();
    t.actions.pasteKeyPressed();
    t.actions.pasteEventArrived();
    vi.advanceTimersByTime(500);
    expect(t.commit).not.toHaveBeenCalled();
  });
});
