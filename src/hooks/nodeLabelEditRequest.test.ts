import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFlowStore } from '@/store';
import { queueNodeLabelEditRequest } from './nodeLabelEditRequest';
import { useInlineNodeTextEdit } from './useInlineNodeTextEdit';

describe('queueNodeLabelEditRequest', () => {
  it('queues an explicit pending edit request in store state', () => {
    act(() => {
      queueNodeLabelEditRequest('shape-1', { replaceExisting: true });
    });

    expect(useFlowStore.getState().pendingNodeLabelEditRequest).toEqual({
      nodeId: 'shape-1',
      replaceExisting: true,
      seedText: undefined,
    });
  });

  it('activates editing when the matching pending request is consumed', () => {
    const { result } = renderHook(() => useInlineNodeTextEdit('shape-2', 'label', 'Original'));

    act(() => {
      queueNodeLabelEditRequest('shape-2', { replaceExisting: true });
    });

    expect(result.current.isEditing).toBe(true);
    expect(useFlowStore.getState().pendingNodeLabelEditRequest).toBeNull();
  });
});
