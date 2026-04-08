import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FlowEditor } from './FlowEditor';
import type { ImportFidelityReport } from '@/services/importFidelity';

const openStudioCode = vi.fn();
const importRecoveryDialogMock = vi.fn();
const useMermaidDiagnosticsMock = vi.fn();
const useFlowEditorScreenModelMock = vi.fn();

vi.mock('./FlowCanvas', () => ({
  FlowCanvas: () => <div>FlowCanvas</div>,
}));

vi.mock('./CinematicExportOverlay', () => ({
  CinematicExportOverlay: () => <div>CinematicExportOverlay</div>,
}));

vi.mock('./flow-editor/FlowEditorChrome', () => ({
  FlowEditorChrome: () => <div>FlowEditorChrome</div>,
}));

vi.mock('@/context/CinematicExportContext', () => ({
  useCinematicExportState: () => ({ active: false, backgroundMode: 'light' }),
}));

vi.mock('@/context/ArchitectureLintContext', () => ({
  ArchitectureLintProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/context/DiagramDiffContext', () => ({
  DiagramDiffProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ShareEmbedModal', () => ({
  ShareEmbedModal: () => <div>ShareEmbedModal</div>,
}));

vi.mock('@/components/ImportRecoveryDialog', () => ({
  ImportRecoveryDialog: (props: unknown) => {
    importRecoveryDialogMock(props);
    return <div>ImportRecoveryDialog</div>;
  },
}));

vi.mock('@/store/selectionHooks', () => ({
  useMermaidDiagnostics: () => useMermaidDiagnosticsMock(),
}));

vi.mock('./flow-editor/useFlowEditorScreenModel', () => ({
  useFlowEditorScreenModel: () => useFlowEditorScreenModelMock(),
}));

function createMermaidDiagnostics() {
  return {
    source: 'code',
    diagramType: 'flowchart',
    importState: 'editable_partial',
    statusLabel: 'Ready with warnings',
    statusDetail: 'Original source is preserved for recovery.',
    originalSource: 'flowchart TD\nA-->B',
    diagnostics: [{ message: 'warning' }],
    updatedAt: 1,
  };
}

function createFlowEditorScreenModel(
  importRecoveryState: { fileName: string; report: Pick<ImportFidelityReport, 'source' | 'importState' | 'originalSource'> } | null = null
) {
  return {
    nodes: [],
    edges: [],
    pages: [],
    activePageId: null,
    viewSettings: { lintRules: '{}' },
    diffBaseline: null,
    setDiffBaseline: vi.fn(),
    recordHistory: vi.fn(),
    isSelectMode: true,
    reactFlowWrapper: { current: null },
    fileInputRef: { current: null },
    handleImportJSON: vi.fn(),
    onFileImport: vi.fn(),
    importRecoveryState,
    dismissImportRecovery: vi.fn(),
    shareViewerUrl: null,
    clearShareViewerUrl: vi.fn(),
    collaborationEnabled: false,
    remotePresence: [],
    collaborationNodePositions: {},
    isLayouting: false,
    flowEditorController: {
      shouldRenderPanels: true,
      handleCanvasEntityIntent: vi.fn(),
      openStudioCode,
      panels: {},
      chrome: {
        topNav: {},
        playback: {},
        toolbar: {},
        emptyState: {},
      },
    },
    t: (key: string) => key,
  };
}

describe('FlowEditor', () => {
  beforeEach(() => {
    openStudioCode.mockReset();
    importRecoveryDialogMock.mockReset();
    useMermaidDiagnosticsMock.mockReturnValue(createMermaidDiagnostics());
    useFlowEditorScreenModelMock.mockReturnValue(createFlowEditorScreenModel());
  });

  it('opens Mermaid code recovery from the shell diagnostics banner', () => {
    render(<FlowEditor onGoHome={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Mermaid code' }));
    expect(openStudioCode).toHaveBeenCalledWith('mermaid');
  });

  it('passes Mermaid recovery action into the import recovery dialog when source is preserved', () => {
    useMermaidDiagnosticsMock.mockReturnValue(null);
    useFlowEditorScreenModelMock.mockReturnValue(
      createFlowEditorScreenModel({
        fileName: 'unsupported.mmd',
        report: {
          source: 'mermaid',
          importState: 'unsupported_family',
          originalSource: 'gitGraph\ncommit id: "a1"',
        },
      })
    );

    render(<FlowEditor onGoHome={vi.fn()} />);

    expect(importRecoveryDialogMock).toHaveBeenCalled();
    const props = importRecoveryDialogMock.mock.calls[0][0] as {
      actionLabel?: string;
      onAction?: () => void;
    };
    expect(props.actionLabel).toBe('Open Mermaid code');

    props.onAction?.();
    expect(openStudioCode).toHaveBeenCalledWith('mermaid');
  });
});
