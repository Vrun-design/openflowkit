import { render, screen } from '@testing-library/react';
import type { CSSProperties } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Position } from '@/lib/reactflowCompat';
import { DEFAULT_DESIGN_SYSTEM, useFlowStore } from '@/store';
import CustomNode from './CustomNode';

let currentNodeId: string | null = null;

vi.mock('@/config/rolloutFlags', () => ({
  ROLLOUT_FLAGS: {
    visualQualityV2: true,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
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

describe('CustomNode handle interaction policy', () => {
  beforeEach(() => {
    currentNodeId = null;
    useFlowStore.setState({
      designSystems: [DEFAULT_DESIGN_SYSTEM],
      activeDesignSystemId: 'default',
      selectedNodeId: null,
    });
  });

  it('keeps selected handles interactive in visualQualityV2', () => {
    render(
      <CustomNode
        id="n1"
        type="process"
        selected={true}
        dragging={false}
        zIndex={1}
        data={{ label: 'Node A' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
      />
    );

    for (const handleId of ['top', 'bottom', 'left', 'right']) {
      const handle = screen.getByTestId(`handle-${handleId}`);
      expect(handle.getAttribute('data-pointer')).toBe('all');
    }
  });

  it('keeps hit-area class and pointer events enabled while not selected', () => {
    render(
      <CustomNode
        id="n2"
        type="process"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{ label: 'Node B' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
      />
    );

    for (const handleId of ['top', 'bottom', 'left', 'right']) {
      const handle = screen.getByTestId(`handle-${handleId}`);
      expect(handle.getAttribute('data-class')).toContain('flow-handle-hitarea');
      expect(handle.getAttribute('data-pointer')).toBe('all');
    }
  });

  it('exposes transform diagnostics attributes in test mode', () => {
    const { container } = render(
      <CustomNode
        id="n3"
        type="process"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{ label: 'Diagnostics Node', subLabel: 'Sub', icon: 'Settings' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
      />
    );

    const diagnosticsNode = container.querySelector('[data-transform-diagnostics="1"]');
    expect(diagnosticsNode).not.toBeNull();
    expect(diagnosticsNode?.getAttribute('data-transform-family')).toBe('custom');
  });

  it('shows an empty-shape prompt instead of seeded fallback text', () => {
    currentNodeId = 'n4';
    render(
      <CustomNode
        id="n4"
        type="process"
        selected={true}
        dragging={false}
        zIndex={1}
        data={{ label: '', subLabel: '' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
      />
    );

    expect(screen.getByText('Add text')).toBeTruthy();
    expect(screen.queryByText('Node')).toBeNull();
  });

  it('applies richer V2 fills for preset colors', () => {
    currentNodeId = 'n-fill';
    const { container } = render(
      <CustomNode
        id="n-fill"
        type="process"
        selected={true}
        dragging={false}
        zIndex={1}
        data={{ label: 'Blue node', color: 'blue' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
      />
    );

    const diagnosticsNode = container.querySelector('[data-transform-diagnostics="1"]') as HTMLElement | null;
    expect(diagnosticsNode?.style.backgroundColor).toBe('rgb(239, 246, 255)');
    expect(diagnosticsNode?.style.borderColor).toBe('rgb(96, 165, 250)');
  });

  it('renders custom filled colors for generic shapes', () => {
    currentNodeId = 'n-custom-fill';
    const { container } = render(
      <CustomNode
        id="n-custom-fill"
        type="process"
        selected={true}
        dragging={false}
        zIndex={1}
        data={{ label: 'Custom node', color: 'custom', colorMode: 'filled', customColor: '#14b8a6' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
      />
    );

    const diagnosticsNode = container.querySelector('[data-transform-diagnostics="1"]') as HTMLElement | null;
    expect(diagnosticsNode?.style.backgroundColor).toBe('rgb(20, 184, 166)');
    expect(diagnosticsNode?.style.borderColor).toBe('rgb(16, 151, 136)');
  });

  it('keeps empty shapes visually blank when they are not selected', () => {
    currentNodeId = 'n5';
    render(
      <CustomNode
        id="n5"
        type="process"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{ label: '', subLabel: '' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
      />
    );

    expect(screen.queryByText('Add text')).toBeNull();
    expect(screen.queryByText('Node')).toBeNull();
  });

  it('keeps the empty-shape prompt visible when store selection stays active after drag', () => {
    currentNodeId = 'n6';
    useFlowStore.setState({ selectedNodeId: 'n6' });

    render(
      <CustomNode
        id="n6"
        type="process"
        selected={false}
        dragging={false}
        zIndex={1}
        data={{ label: '', subLabel: '' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
      />
    );

    expect(screen.getByText('Add text')).toBeTruthy();
  });

  it('does not clamp multi-line labels in visualQualityV2', () => {
    currentNodeId = 'n-long';

    const { container } = render(
      <CustomNode
        id="n-long"
        type="process"
        selected={true}
        dragging={false}
        zIndex={1}
        data={{ label: 'Line one\nLine two\nLine three\nLine four' }}
        isConnectable={true}
        xPos={0}
        yPos={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
      />
    );

    const labelSurface = container.querySelector('.markdown-content') as HTMLElement | null;
    expect(labelSurface).not.toBeNull();
    expect(labelSurface?.style.maxHeight).toBe('');
    expect(labelSurface?.style.overflow).toBe('');
  });

  it('applies independent typography to the description text', () => {
    currentNodeId = 'n-desc-style';

    const { container } = render(
      <CustomNode
        id="n-desc-style"
        type="process"
        selected={true}
        dragging={false}
        zIndex={1}
        data={{
          label: 'Styled node',
          subLabel: 'Secondary copy',
          subLabelFontFamily: 'roboto',
          subLabelFontSize: '16',
          subLabelFontWeight: 'bold',
          subLabelFontStyle: 'italic',
        }}
        isConnectable={true}
        xPos={0}
        yPos={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
      />
    );

    const markdownSurfaces = container.querySelectorAll('.markdown-content');
    const subLabelSurface = markdownSurfaces[1] as HTMLElement | undefined;
    expect(subLabelSurface).toBeTruthy();
    expect(subLabelSurface?.className).toContain('font-roboto');
    expect(subLabelSurface?.style.fontSize).toBe('16px');
    expect(subLabelSurface?.style.fontWeight).toBe('bold');
    expect(subLabelSurface?.style.fontStyle).toBe('italic');
  });
});
