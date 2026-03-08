import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FlowEditorPanels } from './FlowEditorPanels';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
  withTranslation: () => <TProps extends object>(Component: React.ComponentType<TProps>) => Component,
}));

vi.mock('./CommandBar', () => ({
  CommandBar: () => <div data-testid="command-bar" />,
}));

vi.mock('./SnapshotsPanel', () => ({
  SnapshotsPanel: () => <div data-testid="snapshots-panel" />,
}));

vi.mock('./PropertiesPanel', () => ({
  PropertiesPanel: () => <div data-testid="properties-panel" />,
}));

vi.mock('./StudioPanel', () => ({
  StudioPanel: () => <div data-testid="studio-panel" />,
}));

const baseProps = {
  commandBar: {
    isOpen: false,
    onClose: vi.fn(),
    nodes: [],
    edges: [],
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onLayout: vi.fn(async () => undefined),
    onSelectTemplate: vi.fn(),
    onOpenStudioAI: vi.fn(),
    onOpenStudioFlowMind: vi.fn(),
    onOpenStudioMermaid: vi.fn(),
    initialView: 'root' as const,
    onAddAnnotation: vi.fn(),
    onAddSection: vi.fn(),
    onAddText: vi.fn(),
    onAddImage: vi.fn(),
    onAddBrowserWireframe: vi.fn(),
    onAddMobileWireframe: vi.fn(),
    showGrid: true,
    onToggleGrid: vi.fn(),
    snapToGrid: false,
    onToggleSnap: vi.fn(),
  },
  snapshots: {
    isOpen: false,
    onClose: vi.fn(),
    snapshots: [],
    manualSnapshots: [],
    autoSnapshots: [],
    onSaveSnapshot: vi.fn(),
    onRestoreSnapshot: vi.fn(),
    onDeleteSnapshot: vi.fn(),
  },
  properties: {
    selectedNode: null,
    selectedNodes: [],
    selectedEdge: null,
    onChangeNode: vi.fn(),
    onBulkChangeNodes: vi.fn(),
    onChangeNodeType: vi.fn(),
    onChangeEdge: vi.fn(),
    onDeleteNode: vi.fn(),
    onDuplicateNode: vi.fn(),
    onDeleteEdge: vi.fn(),
    onUpdateZIndex: vi.fn(),
    onAddMindmapChild: vi.fn(),
    onAddMindmapSibling: vi.fn(),
    onAddArchitectureService: vi.fn(),
    onCreateArchitectureBoundary: vi.fn(),
    onClose: vi.fn(),
  },
  studio: {
    onClose: vi.fn(),
    onApply: vi.fn(),
    onAIGenerate: vi.fn(),
    isGenerating: false,
    chatMessages: [],
    onClearChat: vi.fn(),
    activeTab: 'ai' as const,
    onTabChange: vi.fn(),
    codeMode: 'flowmind' as const,
    onCodeModeChange: vi.fn(),
  },
  isHistoryOpen: false,
};

const selectedNode = {
  id: 'node-1',
  type: 'custom',
  position: { x: 0, y: 0 },
  data: { label: 'Node 1' },
} as const;

describe('FlowEditorPanels', () => {
  it('shows the properties panel in canvas mode', async () => {
    render(
      <FlowEditorPanels
        {...baseProps}
        editorMode="canvas"
        properties={{ ...baseProps.properties, selectedNode }}
      />
    );

    expect(await screen.findByTestId('properties-panel')).not.toBeNull();
    expect(screen.queryByTestId('studio-panel')).toBeNull();
  });

  it('shows the studio panel in studio mode', async () => {
    render(<FlowEditorPanels {...baseProps} editorMode="studio" />);

    expect(await screen.findByTestId('studio-panel')).not.toBeNull();
    expect(screen.queryByTestId('properties-panel')).toBeNull();
  });
});
