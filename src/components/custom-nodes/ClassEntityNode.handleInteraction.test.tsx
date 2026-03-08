import { render, screen } from '@testing-library/react';
import type { CSSProperties } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ClassNode from './ClassNode';
import EntityNode from './EntityNode';

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

function assertSelectedHandlesAreConnectable(): void {
  for (const handleId of ['top', 'bottom', 'left', 'right']) {
    const handle = screen.getByTestId(`handle-${handleId}`);
    expect(handle.getAttribute('data-pointer')).toBe('all');
  }
}

function assertUnselectedHandlesAreDiscoverable(): void {
  for (const handleId of ['top', 'bottom', 'left', 'right']) {
    const handle = screen.getByTestId(`handle-${handleId}`);
    expect(handle.getAttribute('data-class')).toContain('flow-handle-hitarea');
    expect(handle.getAttribute('data-pointer')).toBe('all');
  }
}

describe('Class/Entity handle interaction policy', () => {
  it('keeps selected ClassNode handles connectable in visualQualityV2', () => {
    render(
      <ClassNode
        id="class-1"
        type="class"
        selected={true}
        dragging={false}
        zIndex={1}
        data={{ label: 'User', classAttributes: ['+ id: UUID'], classMethods: ['+ save(): void'] }}
        isConnectable={true}
        xPos={0}
        yPos={0}
      />
    );

    assertSelectedHandlesAreConnectable();
  });

  it('keeps unselected ClassNode handles discoverable', () => {
    render(
      <ClassNode
        id="class-2"
        type="class"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{ label: 'Order', classAttributes: [], classMethods: [] }}
        isConnectable={true}
        xPos={0}
        yPos={0}
      />
    );

    assertUnselectedHandlesAreDiscoverable();
  });

  it('keeps selected EntityNode handles connectable in visualQualityV2', () => {
    render(
      <EntityNode
        id="entity-1"
        type="er_entity"
        selected={true}
        dragging={false}
        zIndex={1}
        data={{ label: 'Account', erFields: ['id PK', 'email'] }}
        isConnectable={true}
        xPos={0}
        yPos={0}
      />
    );

    assertSelectedHandlesAreConnectable();
  });

  it('keeps unselected EntityNode handles discoverable', () => {
    render(
      <EntityNode
        id="entity-2"
        type="er_entity"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{ label: 'Invoice', erFields: [] }}
        isConnectable={true}
        xPos={0}
        yPos={0}
      />
    );

    assertUnselectedHandlesAreDiscoverable();
  });

  it('keeps EntityNode handles visible when the store selection remains active after drag', () => {
    selectedNodeId = 'entity-4';
    currentNodeId = 'entity-4';

    render(
      <EntityNode
        id="entity-4"
        type="er_entity"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{ label: 'Payment', erFields: [] }}
        isConnectable={true}
        xPos={0}
        yPos={0}
      />
    );

    for (const handleId of ['top', 'bottom', 'left', 'right']) {
      const handle = screen.getByTestId(`handle-${handleId}`);
      expect(handle.getAttribute('data-class')).not.toContain('flow-handle-hitarea');
      expect(handle.getAttribute('data-pointer')).toBe('all');
    }
  });

  it('exposes elevated min-height diagnostics for dense ClassNode content', () => {
    const { container } = render(
      <ClassNode
        id="class-3"
        type="class"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{
          label: 'DenseClass',
          classAttributes: ['+ a: string', '+ b: string', '+ c: string', '+ d: string', '+ e: string'],
          classMethods: ['+ m1(): void', '+ m2(): void', '+ m3(): void', '+ m4(): void'],
        }}
        isConnectable={true}
        xPos={0}
        yPos={0}
      />
    );

    const diagnosticsNode = container.querySelector('[data-transform-family="class"]');
    expect(diagnosticsNode).not.toBeNull();
    const minHeight = Number(diagnosticsNode?.getAttribute('data-transform-min-height') ?? '0');
    expect(minHeight).toBeGreaterThan(140);
  });

  it('exposes elevated min-height diagnostics for dense EntityNode content', () => {
    const { container } = render(
      <EntityNode
        id="entity-3"
        type="er_entity"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{
          label: 'DenseEntity',
          erFields: ['id PK', 'email', 'name', 'createdAt', 'updatedAt', 'status', 'ownerId'],
        }}
        isConnectable={true}
        xPos={0}
        yPos={0}
      />
    );

    const diagnosticsNode = container.querySelector('[data-transform-family="entity"]');
    expect(diagnosticsNode).not.toBeNull();
    const minHeight = Number(diagnosticsNode?.getAttribute('data-transform-min-height') ?? '0');
    expect(minHeight).toBeGreaterThan(130);
  });
});
