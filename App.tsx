import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
  MiniMap,
  getRectOfNodes,
  SelectionMode,
} from 'reactflow';
import dagre from 'dagre';
import CustomNode from './components/CustomNode';
import AnnotationNode from './components/AnnotationNode';
import SectionNode from './components/SectionNode';
import TextNode from './components/TextNode';
import { CustomBezierEdge, CustomSmoothStepEdge, CustomStepEdge } from './components/CustomEdge';
import { CommandBar } from './components/CommandBar';
import { Toolbar } from './components/Toolbar';
import { NavigationControls } from './components/NavigationControls';
import { PropertiesPanel } from './components/PropertiesPanel';
// import { TemplatesPanel } from './components/TemplatesPanel'; // Removed
import { SnapshotsPanel } from './components/SnapshotsPanel';
import { ContextMenu, ContextMenuProps } from './components/ContextMenu';
import { TopNav } from './components/TopNav';
import { FlowTemplate } from './services/templates';
import { toMermaid, toPlantUML } from './services/exportService';
import { toFigmaSVG } from './services/figmaExportService';
import { toFlowMindDSL } from './services/flowmindDSLExporter';

import { useSnapshots } from './hooks/useSnapshots';
import { useAutoSave } from './hooks/useAutoSave';
import { useFlowHistory } from './hooks/useFlowHistory';
import { useFlowOperations } from './hooks/useFlowOperations';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAIGeneration } from './hooks/useAIGeneration';
import { useFlowExport } from './hooks/useFlowExport';
import { INITIAL_NODES, INITIAL_EDGES, NODE_WIDTH, NODE_HEIGHT, EDGE_STYLE, EDGE_LABEL_STYLE, EDGE_LABEL_BG_STYLE } from './constants';
import { FlowTab } from './types';

const MINIMAP_NODE_COLORS: Record<string, string> = {
  start: '#10b981',
  end: '#ef4444',
  decision: '#f59e0b',
  annotation: '#facc15',
  section: '#60a5fa',
  text: '#94a3b8',
};

import { useToast } from './components/ui/ToastContext';

const FlowEditor = () => {
  const { addToast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);

  // Tab State
  const [tabs, setTabs] = useState<FlowTab[]>([
    {
      id: 'tab-1',
      name: 'Untitled Flow',
      nodes: INITIAL_NODES,
      edges: INITIAL_EDGES,
      history: { past: [], future: [] },
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  // Selection
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Snapshots
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { snapshots, saveSnapshot, deleteSnapshot, restoreSnapshot } = useSnapshots();

  // Command Bar State
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [commandBarView, setCommandBarView] = useState<'root' | 'ai' | 'mermaid' | 'flowmind' | 'templates'>('root');

  const openCommandBar = (view: 'root' | 'ai' | 'mermaid' | 'flowmind' | 'templates' = 'root') => {
    setCommandBarView(view);
    setIsCommandBarOpen(true);
  };

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, project } = useReactFlow();

  // View Settings
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuProps & { isOpen: boolean }>({
    id: null,
    type: 'pane',
    position: { x: 0, y: 0 },
    onClose: () => { },
    isOpen: false,
  });

  const closeContextMenu = useCallback(
    () => setContextMenu((prev) => ({ ...prev, isOpen: false })),
    []
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        id: node.id,
        type: 'node',
        position: { x: event.clientX, y: event.clientY },
        onClose: closeContextMenu,
        isOpen: true,
      });
    },
    [closeContextMenu]
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setContextMenu({
        id: null,
        type: 'pane',
        position: { x: event.clientX, y: event.clientY },
        onClose: closeContextMenu,
        isOpen: true,
      });
    },
    [closeContextMenu]
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setContextMenu({
        id: edge.id,
        type: 'edge',
        position: { x: event.clientX, y: event.clientY },
        onClose: closeContextMenu,
        isOpen: true,
      });
    },
    [closeContextMenu]
  );

  const onCloseContextMenu = closeContextMenu;

  const onPaneClick = useCallback(() => {
    closeContextMenu();
  }, [closeContextMenu]);

  const screenToFlowPosition = useCallback((position: { x: number; y: number }) => {
    if (reactFlowWrapper.current) {
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      return project({
        x: position.x - bounds.left,
        y: position.y - bounds.top,
      });
    }
    return position;
  }, [project]);

  // --- Node Types ---
  const nodeTypes = useMemo(() => ({
    start: CustomNode,
    process: CustomNode,
    decision: CustomNode,
    end: CustomNode,
    custom: CustomNode,
    annotation: AnnotationNode,
    section: SectionNode,
    text: TextNode,
  }), []);

  const edgeTypes = useMemo(() => ({
    default: CustomBezierEdge,
    smoothstep: CustomSmoothStepEdge,
    step: CustomStepEdge,
  }), []);

  // --- History ---
  const { recordHistory, undo, redo, canUndo, canRedo, setPast, setFuture, past, future } = useFlowHistory(
    nodes, edges, setNodes, setEdges
  );

  // --- Auto Save ---
  useAutoSave(
    tabs, activeTabId, nodes, edges,
    setTabs, setActiveTabId,
    setNodes, setEdges,
    past, future, setPast, setFuture
  );

  // --- Tab Management ---
  const handleSwitchTab = useCallback((newTabId: string) => {
    if (newTabId === activeTabId) return;

    // 1. Save current state to tabs array
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id === activeTabId) {
          return {
            ...tab,
            nodes,
            edges,
            history: { past, future },
          };
        }
        return tab;
      })
    );

    // 2. Load new state
    const newTab = tabs.find((t) => t.id === newTabId);
    if (newTab) {
      setNodes(newTab.nodes);
      setEdges(newTab.edges);
      setPast(newTab.history.past);
      setFuture(newTab.history.future);
      setActiveTabId(newTabId);
      setTimeout(() => fitView({ duration: 800 }), 50);
    }
  }, [activeTabId, tabs, nodes, edges, past, future, setNodes, setEdges, setPast, setFuture, fitView]);

  const handleAddTab = useCallback(() => {
    const newTabId = `tab-${Date.now()}`;
    const newTab: FlowTab = {
      id: newTabId,
      name: 'New Flow',
      nodes: [],
      edges: [],
      history: { past: [], future: [] },
    };

    // Save current tab state first
    setTabs((prevTabs) => [
      ...prevTabs.map((tab) => {
        if (tab.id === activeTabId) {
          return {
            ...tab,
            nodes,
            edges,
            history: { past, future },
          };
        }
        return tab;
      }),
      newTab
    ]);

    // Switch to new tab
    setNodes(newTab.nodes);
    setEdges(newTab.edges);
    setPast(newTab.history.past);
    setFuture(newTab.history.future);
    setActiveTabId(newTabId);
  }, [activeTabId, nodes, edges, past, future, setNodes, setEdges, setPast, setFuture]);

  const handleCloseTab = useCallback((tabId: string) => {
    if (tabs.length === 1) {
      alert("Cannot close the last tab.");
      return;
    }

    // Determine new active tab if closing the active one
    let newActiveTabId = activeTabId;
    if (tabId === activeTabId) {
      const index = tabs.findIndex(t => t.id === tabId);
      const nextTab = tabs[index + 1] || tabs[index - 1];
      if (nextTab) {
        newActiveTabId = nextTab.id;
        // Load next tab content immediately since we are switching
        setNodes(nextTab.nodes);
        setEdges(nextTab.edges);
        setPast(nextTab.history.past);
        setFuture(nextTab.history.future);
      }
    }

    setTabs((prev) => prev.filter((t) => t.id !== tabId));
    setActiveTabId(newActiveTabId);
  }, [tabs, activeTabId, setNodes, setEdges, setPast, setFuture]);

  const handleRenameTab = useCallback((tabId: string, newName: string) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, name: newName } : t)));
  }, []);


  // --- Core Operations ---
  const {
    updateNodeData, updateNodeType, updateNodeZIndex, updateEdge,
    deleteNode, deleteEdge, duplicateNode,
    onConnect, onSelectionChange, onNodeDoubleClick,
    onNodeDragStart, onNodeDragStop,
    handleAddNode, handleAddAnnotation, handleAddSection, handleAddTextNode,
    handleClear,
    copySelection, pasteSelection,
    onConnectStart, onConnectEnd,
  } = useFlowOperations(
    nodes, edges, setNodes, setEdges, recordHistory, setSelectedNodeId, setSelectedEdgeId,
    screenToFlowPosition
  );

  const selectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
    setEdges((eds) => eds.map((e) => ({ ...e, selected: true })));
  }, [setNodes, setEdges]);

  // --- Keyboard Shortcuts ---
  useKeyboardShortcuts({
    selectedNodeId, selectedEdgeId,
    deleteNode, deleteEdge, undo, redo, duplicateNode, selectAll
  });

  // --- AI ---
  const { isGenerating, handleAIRequest } = useAIGeneration(
    nodes, edges, setNodes, setEdges, recordHistory, fitView
  );

  // --- Export ---
  const { fileInputRef, handleExport, handleExportJSON, handleImportJSON, onFileImport } = useFlowExport(
    nodes, edges, setNodes, setEdges, recordHistory, fitView, reactFlowWrapper
  );

  // --- Auto Layout (dagre) ---
  const onLayout = useCallback(() => {
    recordHistory();
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB' });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });
    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const pos = dagreGraph.node(node.id);
      return { ...node, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } };
    });

    setNodes(layoutedNodes);
    setTimeout(() => fitView({ duration: 800 }), 10);
  }, [nodes, edges, recordHistory, setNodes, fitView]);

  const handleInsertTemplate = useCallback((template: FlowTemplate) => {
    recordHistory();
    const bounds = getRectOfNodes(nodes);
    // Position to the right of current content
    const startX = (bounds.width || 0) + (bounds.x || 0) + 100;
    const startY = (bounds.y || 0);

    const newNodes = template.nodes.map((n) => ({
      ...n,
      id: `${n.id}-${Date.now()}`,
      position: { x: n.position.x + startX, y: n.position.y + startY },
      selected: false,
    }));

    const idMap = new Map<string, string>();
    template.nodes.forEach((n, i) => idMap.set(n.id, newNodes[i].id));

    const newEdges = template.edges.map((e) => ({
      ...e,
      id: `${e.id}-${Date.now()}`,
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
    }));

    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
    // setIsTemplatesOpen(false); // Managed by CommandBar now
    setTimeout(() => fitView({ duration: 800 }), 100);
  }, [nodes, recordHistory, setNodes, setEdges, fitView]);

  const handleExportMermaid = useCallback(async () => {
    const text = toMermaid(nodes, edges);
    try {
      await navigator.clipboard.writeText(text);
      // Ideally show a toast
      alert('Mermaid diagram copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }, [nodes, edges]);

  const handleExportPlantUML = useCallback(async () => {
    const text = toPlantUML(nodes, edges);
    try {
      await navigator.clipboard.writeText(text);
      alert('PlantUML diagram copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }, [nodes, edges]);

  const handleExportFlowMindDSL = useCallback(async () => {
    const text = toFlowMindDSL(nodes, edges);
    try {
      await navigator.clipboard.writeText(text);
      addToast('FlowMind DSL copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy', err);
      addToast('Failed to copy DSL', 'error');
    }
  }, [nodes, edges, addToast]);

  const handleExportFigma = useCallback(async () => {
    try {
      const svg = toFigmaSVG(nodes, edges);
      await navigator.clipboard.writeText(svg);
      addToast('Diagram copied for Figma! You can now paste (Cmd+V) in Figma.', 'success');
    } catch (err: any) {
      console.error('Failed to copy Figma SVG:', err);
      addToast(`Figma Export Failed: ${err?.message || err}`, 'error');
    }
  }, [nodes, edges, addToast]);

  const handleRestoreSnapshot = useCallback((snapshot: any) => {
    restoreSnapshot(snapshot, setNodes, setEdges);
    recordHistory(); // Record the restoration as a new history step
    // setIsHistoryOpen(false); // Optional: close panel on restore?
  }, [restoreSnapshot, setNodes, setEdges, recordHistory]);

  // --- Derived State ---
  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find((e) => e.id === selectedEdgeId) || null, [edges, selectedEdgeId]);

  // Selection Mode
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isSelectionModifierPressed, setIsSelectionModifierPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') setIsSelectionModifierPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') setIsSelectionModifierPressed(false);
    };
    // Reset modifier when window loses focus (prevents stuck state)
    const handleBlur = () => setIsSelectionModifierPressed(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Ctrl/Cmd temporarily enables selection drag; toolbar button permanently toggles
  const isEffectiveSelectMode = isSelectMode || isSelectionModifierPressed;

  return (
    <div className="w-full h-screen bg-slate-50 flex flex-col relative" ref={reactFlowWrapper}>
      {/* Header */}
      <TopNav
        showMiniMap={showMiniMap}
        toggleMiniMap={() => setShowMiniMap(!showMiniMap)}
        showGrid={showGrid}
        toggleGrid={() => setShowGrid(!showGrid)}
        snapToGrid={snapToGrid}
        toggleSnapToGrid={() => setSnapToGrid(!snapToGrid)}
        tabs={tabs}
        activeTabId={activeTabId}
        onSwitchTab={handleSwitchTab}
        onAddTab={handleAddTab}
        onCloseTab={handleCloseTab}
        onRenameTab={handleRenameTab}
        onExportPNG={handleExport}
        onExportJSON={handleExportJSON}
        onExportMermaid={handleExportMermaid}
        onExportPlantUML={handleExportPlantUML}
        onExportFlowMindDSL={handleExportFlowMindDSL}
        onExportFigma={handleExportFigma}
        onImportJSON={handleImportJSON}
        onHistory={() => setIsHistoryOpen(true)}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={onPaneClick}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="bg-slate-50 pt-16"
        minZoom={0.1}
        selectionOnDrag={isEffectiveSelectMode}
        panOnDrag={!isEffectiveSelectMode}
        selectionMode={isEffectiveSelectMode ? SelectionMode.Partial : undefined}
        multiSelectionKeyCode="Alt"
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: EDGE_STYLE,
          labelStyle: EDGE_LABEL_STYLE,
          labelBgStyle: EDGE_LABEL_BG_STYLE,
          labelBgPadding: [8, 4] as [number, number],
          labelBgBorderRadius: 4,
        }}
        snapToGrid={snapToGrid}
      >
        {showGrid && <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />}
        <NavigationControls />
        {showMiniMap && (
          <MiniMap
            nodeColor={(n) => MINIMAP_NODE_COLORS[n.type ?? ''] ?? '#64748b'}
            maskColor="rgba(241, 245, 249, 0.7)"
            className="border border-slate-200 shadow-lg rounded-lg overflow-hidden"
          />
        )}
      </ReactFlow>

      <Toolbar
        onCommandBar={() => openCommandBar('root')}
        onClear={handleClear}
        onFitView={() => fitView({ duration: 800 })}
        onAddNode={handleAddNode}
        onAddAnnotation={handleAddAnnotation}
        onAddSection={handleAddSection}
        onAddText={handleAddTextNode}
        onUndo={undo}
        onRedo={redo}
        onLayout={onLayout}
        onTemplates={() => openCommandBar('templates')}
        canUndo={canUndo}
        canRedo={canRedo}
        isSelectMode={isSelectMode}
        isCommandBarOpen={isCommandBarOpen}
        onToggleSelectMode={() => setIsSelectMode(true)}
        onTogglePanMode={() => setIsSelectMode(false)}
      />

      <CommandBar
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        nodes={nodes}
        edges={edges}
        onApply={(newNodes, newEdges) => {
          recordHistory();
          setNodes(newNodes);
          setEdges(newEdges);
          setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
        }}
        onAIGenerate={handleAIRequest}
        isGenerating={isGenerating}
        onUndo={undo}
        onRedo={redo}
        onFitView={() => fitView({ duration: 800 })}
        onLayout={onLayout}
        onSelectTemplate={handleInsertTemplate}
        initialView={commandBarView}
        settings={{
          showGrid,
          onToggleGrid: () => setShowGrid(!showGrid),
          snapToGrid,
          onToggleSnap: () => setSnapToGrid(!snapToGrid),
          showMiniMap,
          onToggleMiniMap: () => setShowMiniMap(!showMiniMap),
        }}
      />

      {/* TemplatesPanel removed - functionality moved to CommandBar */}

      <SnapshotsPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        snapshots={snapshots}
        onSaveSnapshot={(name) => saveSnapshot(name, nodes, edges)}
        onRestoreSnapshot={handleRestoreSnapshot}
        onDeleteSnapshot={deleteSnapshot}
      />

      <PropertiesPanel
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        onChangeNode={updateNodeData}
        onChangeNodeType={updateNodeType}
        onChangeEdge={updateEdge}
        onDeleteNode={deleteNode}
        onDuplicateNode={duplicateNode}
        onDeleteEdge={deleteEdge}
        onUpdateZIndex={updateNodeZIndex}
        onClose={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
      />

      {/* Empty State */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="text-center space-y-4 opacity-40">
            <div className="w-24 h-24 bg-slate-200 rounded-2xl mx-auto border-4 border-dashed border-slate-300 animate-pulse"></div>
            <p className="text-2xl font-bold text-slate-400">Canvas is empty</p>
            <p className="text-slate-400">Ask AI to build a flow or add nodes manually</p>
          </div>
        </div>
      )}

      {/* Hidden file input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={onFileImport}
        className="hidden"
      />
      {contextMenu.isOpen && (
        <ContextMenu
          {...contextMenu}
          onClose={onCloseContextMenu}
          onCopy={copySelection}
          onPaste={() => {
            if (contextMenu.position) {
              pasteSelection(screenToFlowPosition(contextMenu.position));
            }
            onCloseContextMenu();
          }}
          onDuplicate={() => {
            if (contextMenu.id) duplicateNode(contextMenu.id);
            onCloseContextMenu();
          }}
          onDelete={() => {
            if (contextMenu.id) {
              if (contextMenu.type === 'edge') deleteEdge(contextMenu.id);
              else deleteNode(contextMenu.id);
            }
            onCloseContextMenu();
          }}
          onSendToBack={() => {
            if (contextMenu.id) updateNodeZIndex(contextMenu.id, 'back');
            onCloseContextMenu();
          }}
          canPaste={true}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}

export default App;