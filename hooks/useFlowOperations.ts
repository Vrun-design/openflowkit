import { useCallback, useRef } from 'react';
import { Node, Edge, Connection, addEdge, MarkerType, OnSelectionChangeParams } from 'reactflow';
import { NodeData } from '../types';
import { EDGE_STYLE, EDGE_LABEL_STYLE, EDGE_LABEL_BG_STYLE, NODE_WIDTH, NODE_HEIGHT } from '../constants';

export const useFlowOperations = (
  nodes: Node[],
  edges: Edge[],
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  recordHistory: () => void,
  setSelectedNodeId: (id: string | null) => void,
  setSelectedEdgeId: (id: string | null) => void,
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number },
  onShowConnectMenu?: (position: { x: number; y: number }, sourceId: string, sourceHandle: string | null) => void
) => {
  const connectingNodeId = useRef<string | null>(null);
  const connectingHandleId = useRef<string | null>(null);
  const isConnectionValid = useRef<boolean>(false);
  // --- Node Data Updates ---
  const updateNodeData = useCallback((id: string, data: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) => node.id === id ? { ...node, data: { ...node.data, ...data } } : node)
    );
  }, [setNodes]);

  const updateNodeType = useCallback((id: string, type: string) => {
    recordHistory();
    setNodes((nds) => nds.map((node) => node.id === id ? { ...node, type } : node));
  }, [setNodes, recordHistory]);

  const updateNodeZIndex = useCallback((id: string, action: 'front' | 'back') => {
    recordHistory();
    setNodes((nds) => {
      const node = nds.find((n) => n.id === id);
      if (!node) return nds;

      const zIndices = nds.map((n) => n.zIndex || 0);
      const maxZ = Math.max(...zIndices, 0);
      const minZ = Math.min(...zIndices, 0);

      const newZ = action === 'front' ? maxZ + 1 : minZ - 1;

      return nds.map((n) => (n.id === id ? { ...n, zIndex: newZ } : n));
    });
  }, [setNodes, recordHistory]);

  // --- Edge Updates ---
  const updateEdge = useCallback((id: string, updates: Partial<Edge>) => {
    recordHistory();
    setEdges((eds) => eds.map((edge) => edge.id === id ? { ...edge, ...updates } : edge));
  }, [setEdges, recordHistory]);

  // --- Delete Operations ---
  const deleteNode = useCallback((id: string) => {
    recordHistory();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setSelectedNodeId(null);
  }, [setNodes, recordHistory, setSelectedNodeId]);

  const deleteEdge = useCallback((id: string) => {
    recordHistory();
    setEdges((eds) => eds.filter((e) => e.id !== id));
    setSelectedEdgeId(null);
  }, [setEdges, recordHistory, setSelectedEdgeId]);

  // --- Duplicate ---
  const duplicateNode = useCallback((id: string) => {
    const nodeToDuplicate = nodes.find((n) => n.id === id);
    if (!nodeToDuplicate) return;
    recordHistory();
    const newNodeId = `${Date.now()}`;
    const newNode: Node = {
      ...nodeToDuplicate,
      id: newNodeId,
      position: { x: nodeToDuplicate.position.x + 50, y: nodeToDuplicate.position.y + 50 },
      selected: true,
    };
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
    setSelectedNodeId(newNodeId);
  }, [nodes, recordHistory, setNodes, setSelectedNodeId]);

  // --- Connection ---
  const onConnect = useCallback((params: Connection) => {
    isConnectionValid.current = true;
    recordHistory();
    setEdges((eds) =>
      addEdge({
        ...params,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: true,
        style: EDGE_STYLE,
        labelStyle: EDGE_LABEL_STYLE,
        labelBgStyle: EDGE_LABEL_BG_STYLE,
        labelBgPadding: [8, 4] as [number, number],
        labelBgBorderRadius: 4,
      }, eds)
    );
  }, [setEdges, recordHistory]);

  const onConnectStart = useCallback((_, { nodeId, handleId }: { nodeId: string | null; handleId: string | null }) => {
    connectingNodeId.current = nodeId;
    connectingHandleId.current = handleId;
    isConnectionValid.current = false;
  }, []);

  const onConnectEnd = useCallback(
    (event: any) => {
      if (!connectingNodeId.current) return;
      if (isConnectionValid.current) return;

      const { clientX, clientY } = event;
      const position = screenToFlowPosition({
        x: clientX,
        y: clientY,
      });

      // --- PHASE 1: Smarter Drop (Auto-Snap) ---
      let closestHandle: { nodeId: string, handleId: string, dist: number } | null = null;

      nodes.forEach(node => {
        const hPoints = [
          { id: 'top', x: node.position.x + NODE_WIDTH / 2, y: node.position.y },
          { id: 'bottom', x: node.position.x + NODE_WIDTH / 2, y: node.position.y + NODE_HEIGHT },
          { id: 'left', x: node.position.x, y: node.position.y + NODE_HEIGHT / 2 },
          { id: 'right', x: node.position.x + NODE_WIDTH, y: node.position.y + NODE_HEIGHT / 2 },
        ];

        hPoints.forEach(hp => {
          const dist = Math.sqrt((hp.x - position.x) ** 2 + (hp.y - position.y) ** 2);
          if (dist < 40 && (!closestHandle || dist < closestHandle.dist)) {
            closestHandle = { nodeId: node.id, handleId: hp.id, dist };
          }
        });
      });

      if (closestHandle) {
        onConnect({
          source: connectingNodeId.current,
          sourceHandle: connectingHandleId.current,
          target: (closestHandle as any).nodeId,
          targetHandle: (closestHandle as any).handleId,
        } as Connection);
        return;
      }

      // --- PHASE 3: Context Menu ---
      const targetIsPane = event.target.classList.contains('react-flow__pane');

      if (targetIsPane && onShowConnectMenu) {
        onShowConnectMenu(
          { x: clientX, y: clientY },
          connectingNodeId.current,
          connectingHandleId.current
        );
      }
    },
    [nodes, screenToFlowPosition, onConnect, onShowConnectMenu]
  );

  // --- Selection ---
  const onSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
    setSelectedNodeId(selectedNodes.length > 0 ? selectedNodes[0].id : null);
    setSelectedEdgeId(selectedNodes.length === 0 && selectedEdges.length > 0 ? selectedEdges[0].id : null);
  }, [setSelectedNodeId, setSelectedEdgeId]);

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  // --- Add Nodes ---
  const handleAddNode = useCallback((position?: { x: number; y: number }) => {
    recordHistory();
    const id = `${Date.now()}`;
    const newNode: Node = {
      id,
      position: position || { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { label: 'New Node', subLabel: 'Process Step', icon: 'Settings', color: 'slate' },
      type: 'process',
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
  }, [setNodes, recordHistory, setSelectedNodeId]);

  const handleAddAnnotation = useCallback((position?: { x: number; y: number }) => {
    recordHistory();
    const id = `${Date.now()}`;
    const newNode: Node = {
      id,
      position: position || { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { label: 'Note', subLabel: 'Add your comments here.', color: 'yellow' },
      type: 'annotation',
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
  }, [setNodes, recordHistory, setSelectedNodeId]);

  const handleAddSection = useCallback((position?: { x: number; y: number }) => {
    recordHistory();
    const id = `section-${Date.now()}`;
    const newNode: Node = {
      id,
      position: position || { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 },
      data: { label: 'New Section', subLabel: '', color: 'blue' },
      type: 'section',
      style: { width: 500, height: 400 },
      zIndex: -1,
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
  }, [setNodes, recordHistory, setSelectedNodeId]);

  const handleAddTextNode = useCallback((position?: { x: number; y: number }) => {
    recordHistory();
    const id = `text-${Date.now()}`;
    const newNode: Node = {
      id,
      position: position || { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { label: 'Text', subLabel: '', color: 'slate' },
      type: 'text',
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
  }, [setNodes, recordHistory, setSelectedNodeId]);

  // --- Drag into/out of Section ---
  const onNodeDragStart = useCallback(() => {
    recordHistory();
  }, [recordHistory]);

  const onNodeDragStop = useCallback((_event: React.MouseEvent, draggedNode: Node) => {
    if (draggedNode.type === 'section') return;

    // Compute absolute position of the dragged node
    let absX = draggedNode.position.x;
    let absY = draggedNode.position.y;
    if (draggedNode.parentNode) {
      const currentParent = nodes.find((n) => n.id === draggedNode.parentNode);
      if (currentParent) {
        absX += currentParent.position.x;
        absY += currentParent.position.y;
      }
    }

    const sectionNodes = nodes.filter((n) => n.type === 'section' && n.id !== draggedNode.id);
    let newParent: Node | null = null;

    for (const section of sectionNodes) {
      const sW = (section.style?.width as number) || 500;
      const sH = (section.style?.height as number) || 400;
      const sX = section.position.x;
      const sY = section.position.y;

      if (
        absX > sX &&
        absX < sX + sW &&
        absY > sY &&
        absY < sY + sH
      ) {
        newParent = section;
        break;
      }
    }

    // If the node is already in the correct parent, do nothing
    if (newParent?.id === draggedNode.parentNode) return;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== draggedNode.id) return n;
        if (newParent) {
          // Reparent: convert absolute → relative to new parent
          return {
            ...n,
            parentNode: newParent.id,
            extent: 'parent' as const,
            position: {
              x: absX - newParent.position.x,
              y: absY - newParent.position.y,
            },
          };
        } else if (n.parentNode) {
          // Unparent: convert relative → absolute
          const { parentNode, extent, ...rest } = n as any;
          return { ...rest, position: { x: absX, y: absY } };
        }
        return n;
      })
    );
  }, [nodes, setNodes]);

  // --- Clear Canvas ---
  const handleClear = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the canvas?')) {
      recordHistory();
      setNodes([]);
      setEdges([]);
    }
  }, [setNodes, setEdges, recordHistory]);

  // --- Clipboard Operations ---
  const copySelection = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);

    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      const clipboardData = {
        nodes: selectedNodes,
        edges: selectedEdges,
      };
      localStorage.setItem('flowmind-clipboard', JSON.stringify(clipboardData));
    }
  }, [nodes, edges]);

  const pasteSelection = useCallback((position?: { x: number; y: number }) => {
    const clipboardDataStr = localStorage.getItem('flowmind-clipboard');
    if (!clipboardDataStr) return;

    try {
      const { nodes: copiedNodes, edges: copiedEdges } = JSON.parse(clipboardDataStr);

      if (!copiedNodes || !Array.isArray(copiedNodes)) return;

      recordHistory();

      // Calculate offset
      // If position is provided (mouse paste), offset relative to top-left of copied nodes
      // If not (keyboard paste), offset slightly from original
      let offsetX = 50;
      let offsetY = 50;

      if (position && copiedNodes.length > 0) {
        const minX = Math.min(...copiedNodes.map((n: Node) => n.position.x));
        const minY = Math.min(...copiedNodes.map((n: Node) => n.position.y));
        offsetX = position.x - minX;
        offsetY = position.y - minY;
      }

      const idMap = new Map<string, string>();

      const newNodes = copiedNodes.map((node: Node) => {
        const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        idMap.set(node.id, newId);

        return {
          ...node,
          id: newId,
          position: {
            x: position ? node.position.x + offsetX : node.position.x + 50,
            y: position ? node.position.y + offsetY : node.position.y + 50
          },
          selected: true,
          parentNode: undefined, // Reset parent for now to avoid issues
          extent: undefined
        };
      });

      const newEdges = copiedEdges
        .filter((edge: Edge) => idMap.has(edge.source) && idMap.has(edge.target))
        .map((edge: Edge) => ({
          ...edge,
          id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: idMap.get(edge.source)!,
          target: idMap.get(edge.target)!,
          selected: true
        }));

      setNodes((nds) => nds.map(n => ({ ...n, selected: false })).concat(newNodes));
      setEdges((eds) => eds.map(e => ({ ...e, selected: false })).concat(newEdges));

      if (newNodes.length > 0) setSelectedNodeId(newNodes[0].id);
    } catch (error) {
      console.error('Failed to paste from clipboard', error);
    }
  }, [setNodes, setEdges, recordHistory, setSelectedNodeId]);

  const handleAddAndConnect = useCallback((type: string, position: { x: number; y: number }, sourceId: string, sourceHandle: string | null) => {
    recordHistory();
    const id = `${Date.now()}`;
    const newNode: Node = {
      id,
      position,
      data: {
        label: type === 'annotation' ? 'Note' : 'New Node',
        subLabel: type === 'decision' ? 'Branch' : 'Process Step',
        icon: type === 'decision' ? 'Sparkles' : (type === 'annotation' ? 'StickyNote' : 'Settings'),
        color: type === 'annotation' ? 'yellow' : (type === 'decision' ? 'amber' : 'slate')
      },
      type,
    };

    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) =>
      eds.concat({
        id: `e-${sourceId}-${id}`,
        source: sourceId,
        sourceHandle,
        target: id,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: true,
        style: EDGE_STYLE,
        labelStyle: EDGE_LABEL_STYLE,
        labelBgStyle: EDGE_LABEL_BG_STYLE,
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 4,
      })
    );
    setSelectedNodeId(id);
  }, [setNodes, setEdges, recordHistory, setSelectedNodeId]);

  return {
    updateNodeData,
    updateNodeType,
    updateNodeZIndex,
    updateEdge,
    deleteNode,
    deleteEdge,
    duplicateNode,
    onConnect,
    onConnectStart,
    onConnectEnd,
    onSelectionChange,
    onNodeDoubleClick,
    onNodeDragStart,
    onNodeDragStop,
    handleAddNode,
    handleAddAnnotation,
    handleAddSection,
    handleClear,
    copySelection,
    pasteSelection,
    handleAddTextNode,
    handleAddAndConnect,
  };
};
