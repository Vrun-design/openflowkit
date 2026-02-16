import { useCallback } from 'react';
import { OnSelectionChangeParams } from 'reactflow';
import { useFlowStore } from '../store';
import { useNodeOperations } from './useNodeOperations';
import { useEdgeOperations } from './useEdgeOperations';
import { useLayoutOperations } from './useLayoutOperations';
import { useClipboardOperations } from './useClipboardOperations';

export const useFlowOperations = (
  recordHistory: () => void,
  onShowConnectMenu?: (position: { x: number; y: number }, sourceId: string, sourceHandle: string | null) => void
) => {
  const { setNodes, setEdges, setSelectedNodeId, setSelectedEdgeId } = useFlowStore();

  // Compose specialized hooks
  const nodeOps = useNodeOperations(recordHistory);
  const edgeOps = useEdgeOperations(recordHistory, onShowConnectMenu);
  const layoutOps = useLayoutOperations(recordHistory);
  const clipboardOps = useClipboardOperations(recordHistory);

  // --- Selection ---
  const onSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
    setSelectedNodeId(selectedNodes.length > 0 ? selectedNodes[0].id : null);
    setSelectedEdgeId(selectedNodes.length === 0 && selectedEdges.length > 0 ? selectedEdges[0].id : null);
  }, [setSelectedNodeId, setSelectedEdgeId]);

  // --- Clear Canvas ---
  const handleClear = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the canvas?')) {
      recordHistory();
      setNodes([]);
      setEdges([]);
    }
  }, [setNodes, setEdges, recordHistory]);

  return {
    // Node Ops
    updateNodeData: nodeOps.updateNodeData,
    updateNodeType: nodeOps.updateNodeType,
    updateNodeZIndex: nodeOps.updateNodeZIndex,
    deleteNode: nodeOps.deleteNode,
    duplicateNode: nodeOps.duplicateNode,
    handleAddNode: nodeOps.handleAddNode,
    handleAddAnnotation: nodeOps.handleAddAnnotation,
    handleAddSection: nodeOps.handleAddSection,
    handleAddTextNode: nodeOps.handleAddTextNode,
    handleAddImage: nodeOps.handleAddImage,
    onNodeDragStart: nodeOps.onNodeDragStart,
    onNodeDrag: nodeOps.onNodeDrag,
    onNodeDragStop: nodeOps.onNodeDragStop,
    onNodeDoubleClick: nodeOps.onNodeDoubleClick,

    // Edge Ops
    updateEdge: edgeOps.updateEdge,
    deleteEdge: edgeOps.deleteEdge,
    onConnect: edgeOps.onConnect,
    onConnectStart: edgeOps.onConnectStart,
    onConnectEnd: edgeOps.onConnectEnd,
    onEdgeUpdate: edgeOps.onEdgeUpdate,
    handleAddAndConnect: edgeOps.handleAddAndConnect,

    // Layout Ops
    handleAlignNodes: layoutOps.handleAlignNodes,
    handleDistributeNodes: layoutOps.handleDistributeNodes,
    handleGroupNodes: layoutOps.handleGroupNodes,

    // Clipboard Ops
    copySelection: clipboardOps.copySelection,
    pasteSelection: clipboardOps.pasteSelection,

    // Local
    onSelectionChange,
    handleClear,
  };
};
