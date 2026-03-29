import { describe, expect, it, vi } from 'vitest';
import type { FlowEdge, FlowNode, FlowSnapshot } from '@/lib/types';
import {
  buildFlowEditorPanelsProps,
} from './panelProps';

function createNode(id: string): FlowNode {
  return {
    id,
    type: 'process',
    position: { x: 0, y: 0 },
    data: { label: id, color: 'slate', shape: 'rounded' },
  };
}

function createEdge(id: string, source: string, target: string): FlowEdge {
  return { id, source, target };
}

function createSnapshot(id: string): FlowSnapshot {
  return {
    id,
    name: id,
    timestamp: '2026-03-07T00:00:00.000Z',
    nodes: [],
    edges: [],
  };
}

describe('buildFlowEditorPanelsProps', () => {
  it('builds panel props and preserves action wiring', () => {
    const nodes = [createNode('n1')];
    const edges = [createEdge('e1', 'n1', 'n1')];
    const snapshots = [createSnapshot('s1')];
    const saveSnapshot = vi.fn();
    const openStudioCode = vi.fn();
    const clearSelection = vi.fn();

    const commandBar = {
      isCommandBarOpen: true,
      closeCommandBar: vi.fn(),
      nodes,
      edges,
      undo: vi.fn(),
      redo: vi.fn(),
      onLayout: vi.fn(async () => undefined),
      handleInsertTemplate: vi.fn(),
      openStudioAI: vi.fn(),
      openStudioCode,
      openStudioPlayback: vi.fn(),
      commandBarView: 'assets' as const,
      handleAddAnnotation: vi.fn(),
      handleAddSection: vi.fn(),
      handleAddTextNode: vi.fn(),
      handleAddJourneyNode: vi.fn(),
      handleAddMindmapNode: vi.fn(),
      handleAddArchitectureNode: vi.fn(),
      handleAddSequenceParticipant: vi.fn(),
      handleAddClassNode: vi.fn(),
      handleAddEntityNode: vi.fn(),
      handleAddImage: vi.fn(),
      handleAddWireframe: vi.fn(),
      handleAddDomainLibraryItem: vi.fn(),
      showGrid: true,
      toggleGrid: vi.fn(),
      snapToGrid: false,
      toggleSnap: vi.fn(),
    };
    const snapshotsPanel = {
      isHistoryOpen: true,
      closeHistory: vi.fn(),
      snapshots,
      manualSnapshots: snapshots,
      autoSnapshots: snapshots,
      saveSnapshot,
      handleRestoreSnapshot: vi.fn(),
      deleteSnapshot: vi.fn(),
      nodes,
      edges,
    };
    const properties = {
      selectedNode: nodes[0],
      selectedNodes: nodes,
      selectedEdge: edges[0],
      updateNodeData: vi.fn(),
      applyBulkNodeData: vi.fn(),
      updateNodeType: vi.fn(),
      updateEdge: vi.fn(),
      deleteNode: vi.fn(),
      duplicateNode: vi.fn(),
      deleteEdge: vi.fn(),
      updateNodeZIndex: vi.fn(),
      fitSectionToContents: vi.fn(),
      releaseFromSection: vi.fn(),
      handleBringContentsIntoSection: vi.fn(),
      handleAddMindmapChild: vi.fn(),
      handleAddMindmapSibling: vi.fn(),
      handleAddArchitectureService: vi.fn(),
      handleCreateArchitectureBoundary: vi.fn(),
      handleApplyArchitectureTemplate: vi.fn(),
      handleGenerateEntityFields: vi.fn(),
      handleSuggestArchitectureNode: vi.fn(),
      handleConvertEntitySelectionToClassDiagram: vi.fn(),
      handleOpenMermaidCodeEditor: vi.fn(),
      clearSelection,
    };
    const studio = {
      closeStudioPanel: vi.fn(),
      handleCommandBarApply: vi.fn(),
      handleAIRequest: vi.fn(async () => true),
      handleCodeAnalysis: vi.fn(async () => true),
      handleSqlAnalysis: vi.fn(async () => true),
      handleTerraformAnalysis: vi.fn(async () => true),
      handleOpenApiAnalysis: vi.fn(async () => true),
      setCanvasMode: vi.fn(),
      isGenerating: false,
      streamingText: null,
      retryCount: 0,
      cancelGeneration: vi.fn(),
      pendingDiff: null,
      confirmPendingDiff: vi.fn(),
      discardPendingDiff: vi.fn(),
      aiReadiness: {
        canGenerate: true,
        blockingIssue: null,
        advisory: null,
      },
      lastAIError: null,
      onClearAIError: vi.fn(),
      chatMessages: [],
      clearChat: vi.fn(),
      selectedNode: nodes[0],
      selectedNodeCount: nodes.length,
      studioTab: 'ai' as const,
      setStudioTab: vi.fn(),
      studioCodeMode: 'openflow' as const,
      setStudioCodeMode: vi.fn(),
      playback: {
        currentStepIndex: -1,
        totalSteps: 0,
        isPlaying: false,
        onStartPlayback: vi.fn(),
        onPlayPause: vi.fn(),
        onStop: vi.fn(),
        onScrubToStep: vi.fn(),
        onNext: vi.fn(),
        onPrev: vi.fn(),
        playbackSpeed: 2000,
        onPlaybackSpeedChange: vi.fn(),
      },
    };

    const result = buildFlowEditorPanelsProps({
      commandBar,
      snapshots: snapshotsPanel,
      properties,
      studio,
      isHistoryOpen: true,
      editorMode: 'studio',
    });

    expect(result.commandBar.initialView).toBe('assets');
    expect(result.snapshots.isOpen).toBe(true);
    expect(result.properties.selectedNode?.id).toBe('n1');
    expect(result.studio.activeTab).toBe('ai');

    result.commandBar.onOpenStudioOpenFlow();
    expect(openStudioCode).toHaveBeenCalledWith('openflow');

    result.snapshots.onSaveSnapshot('Snapshot 1');
    expect(saveSnapshot).toHaveBeenCalledWith('Snapshot 1', nodes, edges);

    result.properties.onClose();
    expect(clearSelection).toHaveBeenCalled();
  });
});
