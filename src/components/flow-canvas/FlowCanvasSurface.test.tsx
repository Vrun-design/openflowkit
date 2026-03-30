import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FlowCanvasSurface } from './FlowCanvasSurface';

vi.mock('@/lib/reactflowCompat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/reactflowCompat')>();
  return {
    ...actual,
    default: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="reactflow-mock">{children}</div>
    ),
    Background: () => <div data-testid="background-mock" />,
  };
});

vi.mock('@/components/NavigationControls', () => ({
  NavigationControls: () => <div data-testid="navigation-controls-mock" />,
}));

vi.mock('./FlowCanvasOverlays', () => ({
  FlowCanvasOverlays: () => <div data-testid="flow-canvas-overlays-mock" />,
}));

vi.mock('./flowCanvasTypes', () => ({
  flowCanvasEdgeTypes: {},
  flowCanvasNodeTypes: {},
}));

describe('FlowCanvasSurface', () => {
  it('shows a multi-select badge when more than one item is selected', () => {
    render(
      <FlowCanvasSurface
        containerClassName="relative"
        wrapperRef={{ current: null }}
        onPasteCapture={vi.fn()}
        onDoubleClickCapture={vi.fn()}
        selectionAnnouncement="2 nodes and 1 edge selected."
        nodes={[
          {
            id: 'node-1',
            type: 'process',
            position: { x: 0, y: 0 },
            selected: true,
            data: { label: 'One' },
          },
          {
            id: 'node-2',
            type: 'process',
            position: { x: 20, y: 20 },
            selected: true,
            data: { label: 'Two' },
          },
        ] as never}
        edges={[
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            selected: true,
          },
        ] as never}
        onNodesChange={vi.fn()}
        onEdgesChange={vi.fn()}
        onConnect={vi.fn()}
        onReconnect={vi.fn()}
        onSelectionChange={vi.fn()}
        onNodeDragStart={vi.fn()}
        onNodeDrag={vi.fn()}
        onNodeDragStop={vi.fn()}
        onMoveStart={vi.fn()}
        onMoveEnd={vi.fn()}
        onNodeDoubleClick={vi.fn()}
        onNodeClick={vi.fn()}
        onEdgeClick={vi.fn()}
        onNodeContextMenu={vi.fn()}
        onSelectionContextMenu={vi.fn()}
        onPaneContextMenu={vi.fn()}
        onEdgeContextMenu={vi.fn()}
        onPaneClick={vi.fn()}
        onConnectStart={vi.fn()}
        onConnectEnd={vi.fn()}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        fitView={true}
        reactFlowConfig={{
          className: 'flow',
          onlyRenderVisibleElements: true,
          connectionMode: 'loose',
          isValidConnection: () => true,
          selectionOnDrag: true,
          selectNodesOnDrag: true,
          selectionKeyCode: null,
          panOnDrag: true,
          panActivationKeyCode: null,
          selectionMode: 'partial',
          multiSelectionKeyCode: null,
          zoomActivationKeyCode: null,
          zoomOnScroll: true,
          zoomOnPinch: true,
          panOnScroll: false,
          panOnScrollMode: 'free',
          preventScrolling: true,
          zoomOnDoubleClick: false,
          defaultEdgeOptions: {},
          background: { variant: 'dots', gap: 16, size: 1, color: '#ccc' },
        } as never}
        snapToGrid={false}
        effectiveShowGrid={false}
        alignmentGuidesEnabled={false}
        alignmentGuides={{ verticalFlowX: null, horizontalFlowY: null }}
        selectionDragPreview={null}
        connectMenu={null}
        setConnectMenu={vi.fn()}
        screenToFlowPosition={(position) => position}
        handleAddAndConnect={vi.fn()}
        handleAddDomainLibraryItemAndConnect={vi.fn()}
        contextMenu={null as never}
        onCloseContextMenu={vi.fn()}
        copySelection={vi.fn()}
        contextActions={{} as never}
      />
    );

    expect(screen.getByText('3 selected')).toBeInTheDocument();
    expect(screen.getByText('(2 nodes, 1 edge)')).toBeInTheDocument();
  });
});
