import { render, screen } from '@testing-library/react';
import type { CSSProperties } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Position } from '@/lib/reactflowCompat';
import ImageNode from './ImageNode';
import GroupNode from './GroupNode';
import SwimlaneNode from './SwimlaneNode';

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
    }: {
      className?: string;
      style?: CSSProperties;
      id?: string;
    }) => (
      <div
        data-testid={`handle-${id ?? 'unknown'}`}
        data-class={className ?? ''}
        data-pointer={String(style?.pointerEvents ?? '')}
      />
    ),
    NodeResizer: () => null,
    NodeResizeControl: () => null,
    useNodeId: () => currentNodeId,
    useReactFlow: () => ({
      setNodes: vi.fn(),
    }),
    useNodes: () => [],
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

function assertSelectedConnectableHandles(ids: string[]): void {
  for (const handleId of ids) {
    const handle = screen.getByTestId(`handle-${handleId}`);
    expect(handle.getAttribute('data-pointer')).toBe('all');
  }
}

function assertUnselectedDiscoverableHandles(ids: string[]): void {
  for (const handleId of ids) {
    const handle = screen.getByTestId(`handle-${handleId}`);
    expect(handle.getAttribute('data-class')).toContain('flow-handle-hitarea');
    expect(handle.getAttribute('data-pointer')).toBe('all');
  }
}

describe('container-like node handle interaction policy', () => {
  it('keeps selected ImageNode handles connectable in visualQualityV2', () => {
    render(
      <ImageNode
        id="image-1"
        type="image"
        selected={true}
        dragging={false}
        zIndex={1}
        data={{ label: 'Image', imageUrl: 'https://example.com/x.png' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
      />
    );

    assertSelectedConnectableHandles(['top', 'bottom', 'left', 'right']);
  });

  it('keeps unselected ImageNode handles discoverable', () => {
    render(
      <ImageNode
        id="image-2"
        type="image"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{ label: 'Image' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
      />
    );

    assertUnselectedDiscoverableHandles(['top', 'bottom', 'left', 'right']);
  });

  it('keeps selected GroupNode handles connectable in visualQualityV2', () => {
    render(
      <GroupNode
        id="group-1"
        type="group"
        selected={true}
        dragging={false}
        zIndex={1}
        data={{ label: 'Group A' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
      />
    );

    assertSelectedConnectableHandles(['top-target', 'bottom-source', 'left-target', 'right-source']);
  });

  it('keeps unselected GroupNode handles discoverable', () => {
    render(
      <GroupNode
        id="group-2"
        type="group"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{ label: 'Group B' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
      />
    );

    assertUnselectedDiscoverableHandles(['top-target', 'bottom-source', 'left-target', 'right-source']);
  });

  it('keeps GroupNode handles visible when the store selection remains active after drag', () => {
    selectedNodeId = 'group-3';
    currentNodeId = 'group-3';

    render(
      <GroupNode
        id="group-3"
        type="group"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{ label: 'Group C' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
      />
    );

    for (const handleId of ['top-target', 'bottom-source', 'left-target', 'right-source']) {
      const handle = screen.getByTestId(`handle-${handleId}`);
      expect(handle.getAttribute('data-class')).not.toContain('flow-handle-hitarea');
      expect(handle.getAttribute('data-pointer')).toBe('all');
    }
  });

  it('keeps selected SwimlaneNode handles connectable in visualQualityV2', () => {
    render(
      <SwimlaneNode
        id="swimlane-1"
        type="swimlane"
        selected={true}
        dragging={false}
        zIndex={1}
        data={{ label: 'Lane A' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
      />
    );

    assertSelectedConnectableHandles(['top-target', 'bottom-source', 'left-target', 'right-source']);
  });

  it('keeps unselected SwimlaneNode handles discoverable', () => {
    render(
      <SwimlaneNode
        id="swimlane-2"
        type="swimlane"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{ label: 'Lane B' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
      />
    );

    assertUnselectedDiscoverableHandles(['top-target', 'bottom-source', 'left-target', 'right-source']);
  });
});
