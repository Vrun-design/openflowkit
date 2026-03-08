import { fireEvent, render, screen } from '@testing-library/react';
import type { CSSProperties } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TextNode from './TextNode';
import MindmapNode from './custom-nodes/MindmapNode';
import { Position } from '@/lib/reactflowCompat';

let selectedNodeId: string | null = null;
let currentNodeId: string | null = null;

vi.mock('@/config/rolloutFlags', () => ({
  ROLLOUT_FLAGS: {
    visualQualityV2: true,
  },
}));

vi.mock('@/lib/reactflowCompat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/reactflowCompat')>();

  return {
    ...actual,
    Handle: ({
      className,
      style,
      id,
      position,
      type,
    }: {
      className?: string;
      style?: CSSProperties;
      id?: string;
      position?: string;
      type?: string;
    }) => (
      <div
        data-testid={`handle-${id ?? `${type}-${position}`}`}
        data-class={className ?? ''}
        data-pointer={String(style?.pointerEvents ?? '')}
        data-left={String(style?.left ?? '')}
      />
    ),
    NodeResizer: () => null,
    NodeResizeControl: () => null,
    useNodeId: () => currentNodeId,
    Position: {
      Top: 'top',
      Right: 'right',
      Bottom: 'bottom',
      Left: 'left',
    },
  };
});

vi.mock('@/store', () => ({
  useFlowStore: (selector?: (state: { selectedNodeId: string | null; setNodes: ReturnType<typeof vi.fn> }) => unknown) => {
    const state = { selectedNodeId, setNodes: vi.fn() };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

afterEach(() => {
  selectedNodeId = null;
  currentNodeId = null;
});

describe('lightweight node handle interaction policy', () => {
  it('keeps selected TextNode handles connectable in visualQualityV2', () => {
    render(
      <TextNode
        id="text-1"
        type="text"
        selected={true}
        dragging={false}
        zIndex={1}
        data={{ label: 'Hello' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
      />
    );

    for (const handleId of ['target-top', 'target-left', 'source-right', 'source-bottom']) {
      const handle = screen.getByTestId(`handle-${handleId}`);
      expect(handle.getAttribute('data-pointer')).toBe('all');
    }
  });

  it('keeps unselected TextNode handles discoverable', () => {
    render(
      <TextNode
        id="text-2"
        type="text"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{ label: 'Hello' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
      />
    );

    for (const handleId of ['target-top', 'target-left', 'source-right', 'source-bottom']) {
      const handle = screen.getByTestId(`handle-${handleId}`);
      expect(handle.getAttribute('data-class')).toContain('flow-handle-hitarea');
      expect(handle.getAttribute('data-pointer')).toBe('all');
    }
  });

  it('keeps TextNode handles visible when the store selection stays active after drag', () => {
    selectedNodeId = 'text-3';
    currentNodeId = 'text-3';

    render(
      <TextNode
        id="text-3"
        type="text"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{ label: 'Hello' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
      />
    );

    for (const handleId of ['target-top', 'target-left', 'source-right', 'source-bottom']) {
      const handle = screen.getByTestId(`handle-${handleId}`);
      expect(handle.getAttribute('data-class')).not.toContain('flow-handle-hitarea');
      expect(handle.getAttribute('data-pointer')).toBe('all');
    }
  });

  it('keeps selected MindmapNode handles connectable in visualQualityV2', () => {
    render(
      <MindmapNode
        id="mindmap-1"
        type="mindmap"
        selected={true}
        dragging={false}
        zIndex={1}
        data={{ label: 'Root', mindmapDepth: 0 }}
        isConnectable={true}
        xPos={0}
        yPos={0}
      />
    );

    for (const handleId of ['left', 'right']) {
      const handle = screen.getByTestId(`handle-${handleId}`);
      expect(handle.getAttribute('data-pointer')).toBe('all');
    }
    expect(screen.getByTestId('handle-left').getAttribute('data-left')).toBe('8px');
    expect(screen.getByTestId('handle-right').getAttribute('data-left')).toBe('calc(100% - 8px)');
    expect(screen.queryByTestId('handle-top')).toBeNull();
    expect(screen.queryByTestId('handle-bottom')).toBeNull();
  });

  it('keeps unselected MindmapNode handles discoverable', () => {
    render(
      <MindmapNode
        id="mindmap-2"
        type="mindmap"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{ label: 'Child', mindmapDepth: 1 }}
        isConnectable={true}
        xPos={0}
        yPos={0}
      />
    );

    for (const handleId of ['left', 'right']) {
      const handle = screen.getByTestId(`handle-${handleId}`);
      expect(handle.getAttribute('data-class')).toContain('flow-handle-hitarea');
      expect(handle.getAttribute('data-pointer')).toBe('all');
    }
    expect(screen.queryByTestId('handle-top')).toBeNull();
    expect(screen.queryByTestId('handle-bottom')).toBeNull();
  });

  it('uses multiline editing for MindmapNode topics', () => {
    render(
      <MindmapNode
        id="mindmap-3"
        type="mindmap"
        selected={true}
        dragging={false}
        zIndex={1}
        data={{ label: 'Topic', mindmapDepth: 1 }}
        isConnectable={true}
        xPos={0}
        yPos={0}
      />
    );

    expect(screen.queryByText('Topic')).not.toBeNull();
  });

  it('dispatches a side-aware child request from visible root mindmap affordances', () => {
    const requestListener = vi.fn();
    window.addEventListener('flowmind:mindmap-topic-action-request', requestListener as EventListener);

    try {
      render(
        <MindmapNode
          id="mindmap-4"
          type="mindmap"
          selected={true}
          dragging={false}
          zIndex={1}
          data={{ label: 'Root', mindmapDepth: 0 }}
          isConnectable={true}
          xPos={0}
          yPos={0}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Add right topic' }));
      expect(requestListener).toHaveBeenCalledTimes(1);
      const [event] = requestListener.mock.calls[0] as [CustomEvent<{ nodeId: string; action: string; side: string }>];
      expect(event.detail).toEqual({
        nodeId: 'mindmap-4',
        action: 'child',
        side: 'right',
      });
    } finally {
      window.removeEventListener('flowmind:mindmap-topic-action-request', requestListener as EventListener);
    }
  });

  it('dispatches a sibling request from the branch topic affordance', () => {
    const requestListener = vi.fn();
    window.addEventListener('flowmind:mindmap-topic-action-request', requestListener as EventListener);

    try {
      render(
        <MindmapNode
          id="mindmap-5"
          type="mindmap"
          selected={true}
          dragging={false}
          zIndex={1}
          data={{ label: 'Topic', mindmapDepth: 1, mindmapSide: 'right' }}
          isConnectable={true}
          xPos={0}
          yPos={0}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Add sibling topic' }));
      expect(requestListener).toHaveBeenCalledTimes(1);
      const [event] = requestListener.mock.calls[0] as [CustomEvent<{ nodeId: string; action: string; side?: string | null }>];
      expect(event.detail).toEqual({
        nodeId: 'mindmap-5',
        action: 'sibling',
        side: undefined,
      });
    } finally {
      window.removeEventListener('flowmind:mindmap-topic-action-request', requestListener as EventListener);
    }
  });

});
