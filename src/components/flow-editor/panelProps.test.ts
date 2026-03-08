import { describe, expect, it, vi } from 'vitest';
import type { FlowEdge, FlowNode, FlowSnapshot } from '@/lib/types';
import { buildFlowEditorPanelsProps } from './panelProps';

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

    const result = buildFlowEditorPanelsProps({
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
      commandBarView: 'assets',
      handleAddAnnotation: vi.fn(),
      handleAddSection: vi.fn(),
      handleAddTextNode: vi.fn(),
      handleAddJourneyNode: vi.fn(),
      handleAddMindmapNode: vi.fn(),
      handleAddArchitectureNode: vi.fn(),
      handleAddImage: vi.fn(),
      handleAddWireframe: vi.fn(),
      handleAddDomainLibraryItem: vi.fn(),
      showGrid: true,
      toggleGrid: vi.fn(),
      snapToGrid: false,
      toggleSnap: vi.fn(),
      isHistoryOpen: true,
      closeHistory: vi.fn(),
      snapshots,
      manualSnapshots: snapshots,
      autoSnapshots: snapshots,
      saveSnapshot,
      handleRestoreSnapshot: vi.fn(),
      deleteSnapshot: vi.fn(),
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
      handleAddMindmapChild: vi.fn(),
      handleAddMindmapSibling: vi.fn(),
      handleAddArchitectureService: vi.fn(),
      handleCreateArchitectureBoundary: vi.fn(),
      clearSelection,
      closeStudioPanel: vi.fn(),
      handleCommandBarApply: vi.fn(),
      handleAIRequest: vi.fn(async () => undefined),
      isGenerating: false,
      chatMessages: [],
      clearChat: vi.fn(),
      studioTab: 'ai',
      setStudioTab: vi.fn(),
      studioCodeMode: 'flowmind',
      setStudioCodeMode: vi.fn(),
      editorMode: 'studio',
    });

    expect(result.commandBar.initialView).toBe('assets');
    expect(result.snapshots.isOpen).toBe(true);
    expect(result.properties.selectedNode?.id).toBe('n1');
    expect(result.studio.activeTab).toBe('ai');

    result.commandBar.onOpenStudioFlowMind();
    expect(openStudioCode).toHaveBeenCalledWith('flowmind');

    result.snapshots.onSaveSnapshot('Snapshot 1');
    expect(saveSnapshot).toHaveBeenCalledWith('Snapshot 1', nodes, edges);

    result.properties.onClose();
    expect(clearSelection).toHaveBeenCalled();
  });
});
