import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlowNode } from '@/lib/types';
import { useFlowStore } from '@/store';
import { useContextualCommandItems } from './useContextualCommandItems';

vi.mock('@/config/rolloutFlags', () => ({
  ROLLOUT_FLAGS: { openCanvasContextualCommandsV1: true },
}));

function node(id: string, selected: boolean): FlowNode {
  return {
    id,
    type: 'process',
    position: { x: 0, y: 0 },
    data: { label: id },
    selected,
  };
}

describe('useContextualCommandItems', () => {
  const originalRunCommand = useFlowStore.getState().runContextualEditorCommand;

  beforeEach(() => {
    useFlowStore.setState({
      nodes: [node('a', true), node('b', true), node('c', false)],
      edges: [],
      selectedNodeId: 'a',
      selectedEdgeId: null,
      runContextualEditorCommand: originalRunCommand,
    });
  });

  afterEach(() => {
    useFlowStore.setState({ runContextualEditorCommand: originalRunCommand });
  });

  it('exposes only valid selection commands and binds exact typed command', () => {
    const runCommand = vi.fn(() => true);
    useFlowStore.setState({ runContextualEditorCommand: runCommand });
    const { result } = renderHook(() => useContextualCommandItems());

    expect(result.current.map((item) => item.label)).toContain('Align Left');
    expect(result.current.map((item) => item.label)).not.toContain('Distribute Horizontally');
    expect(result.current.map((item) => item.label)).not.toContain('Reverse Direction');
    act(() => {
      result.current.find((item) => item.label === 'Align Left')?.action?.();
    });
    expect(runCommand).toHaveBeenCalledWith({ kind: 'align', direction: 'left' });
  });

  it('updates result context when selection changes', () => {
    const { result } = renderHook(() => useContextualCommandItems());
    act(() => {
      useFlowStore.setState((state) => ({
        nodes: state.nodes.map((entry) => ({ ...entry, selected: true })),
      }));
    });

    expect(result.current.map((item) => item.label)).toContain('Distribute Horizontally');
  });
});
