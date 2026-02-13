import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import 'reactflow/dist/style.css';
import {
  ReactFlowProvider,
  useReactFlow,
  getRectOfNodes,
} from 'reactflow';
import { useFlowStore } from './store';
import { getElkLayout, LayoutAlgorithm } from './services/elkLayout';

// import CustomConnectionLine from './components/CustomConnectionLine'; // Moved
import { CommandBar } from './components/CommandBar';
import { Toolbar } from './components/Toolbar';
import { FlowCanvas } from './components/FlowCanvas';
// import { NavigationControls } from './components/NavigationControls'; // Moved to FlowCanvas
import { PropertiesPanel } from './components/PropertiesPanel';
// import { TemplatesPanel } from './components/TemplatesPanel'; // Removed
import { SnapshotsPanel } from './components/SnapshotsPanel';
import { TopNav } from './components/TopNav';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { FlowTemplate } from './services/templates';
import { toMermaid, toPlantUML } from './services/exportService';
import { toFigmaSVG } from './services/figmaExportService';
import { toFlowMindDSL } from './services/flowmindDSLExporter';
import { HomePage } from './components/HomePage';



import { useSnapshots } from './hooks/useSnapshots';
import { useAutoSave } from './hooks/useAutoSave';
import { useFlowHistory } from './hooks/useFlowHistory';
import { useFlowOperations } from './hooks/useFlowOperations';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAIGeneration } from './hooks/useAIGeneration';
import { useFlowExport } from './hooks/useFlowExport';
import { INITIAL_NODES, INITIAL_EDGES, NODE_WIDTH, NODE_HEIGHT, EDGE_STYLE, EDGE_LABEL_STYLE, EDGE_LABEL_BG_STYLE } from './constants';
import { FlowTab, FlowSnapshot } from './types';

const MINIMAP_NODE_COLORS: Record<string, string> = {
  start: '#10b981',
  end: '#ef4444',
  decision: '#f59e0b',
  annotation: '#facc15',
  section: '#60a5fa',
  text: '#94a3b8',
};

import { useToast } from './components/ui/ToastContext';
import { useBrandTheme } from './hooks/useBrandTheme';

const FlowEditor = ({ onGoHome }: { onGoHome: () => void }) => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  // useBrandTheme moved to App for global consistency

  // --- Global Store ---
  const {
    nodes, edges, onNodesChange, onEdgesChange, setNodes, setEdges,
    tabs, setTabs, activeTabId, setActiveTabId, addTab, closeTab, updateTab,
    viewSettings, toggleGrid, toggleSnap, toggleMiniMap,
    selectedNodeId, setSelectedNodeId, selectedEdgeId, setSelectedEdgeId
  } = useFlowStore();

  const { showGrid, snapToGrid, showMiniMap } = viewSettings;

  // Snapshots
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { snapshots, saveSnapshot, deleteSnapshot, restoreSnapshot } = useSnapshots();

  // Command Bar State
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);

  const [commandBarView, setCommandBarView] = useState<'root' | 'ai' | 'mermaid' | 'flowmind' | 'templates' | 'search' | 'layout' | 'design-system'>('root');

  const openCommandBar = (view: 'root' | 'ai' | 'mermaid' | 'flowmind' | 'templates' | 'search' | 'layout' | 'design-system' = 'root') => {
    setCommandBarView(view);
    setIsCommandBarOpen(true);
  };

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, screenToFlowPosition } = useReactFlow();

  const getCenter = useCallback(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    return screenToFlowPosition({ x: centerX, y: centerY });
  }, [screenToFlowPosition]);

  // View Settings (Migrated to Store)

  // Context Menu and Connect Menu State removed (managed by FlowCanvas)

  const onCloseContextMenu = useCallback(() => { }, []); // No-op if needed, or remove usage below





  // --- History ---
  const { recordHistory, undo, redo, canUndo, canRedo, setPast, setFuture, past, future } = useFlowHistory();

  // --- Auto Save ---
  useAutoSave(
    tabs, activeTabId, nodes, edges,
    setTabs, setActiveTabId,
    setNodes, setEdges,
    setPast, setFuture
  );

  // --- Tab Management ---
  const handleSwitchTab = useCallback((newTabId: string) => {
    navigate(`/flow/${newTabId}`);
    // Fit view will happen after route update triggers store update
  }, [navigate]);

  const handleAddTab = useCallback(() => {
    const newId = addTab();
    navigate(`/flow/${newId}`);
  }, [addTab, navigate]);

  const handleCloseTab = useCallback((tabId: string) => {
    if (tabs.length === 1) {
      alert("Cannot close the last tab.");
      return;
    }
    closeTab(tabId);
  }, [tabs.length, closeTab]);

  const handleRenameTab = useCallback((tabId: string, newName: string) => {
    updateTab(tabId, { name: newName });
  }, [updateTab]);


  // --- Core Operations ---
  const {
    updateNodeData, updateNodeType, updateNodeZIndex, updateEdge,
    deleteNode, deleteEdge, duplicateNode,
    handleAddNode, handleAddAnnotation, handleAddSection, handleAddTextNode, handleAddImage,
    handleClear
  } = useFlowOperations(recordHistory);

  const selectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
    setEdges((eds) => eds.map((e) => ({ ...e, selected: true })));
  }, [setNodes, setEdges]);

  // --- Keyboard Shortcuts ---
  // --- Keyboard Shortcuts ---
  useKeyboardShortcuts({
    selectedNodeId, selectedEdgeId,
    deleteNode, deleteEdge, undo, redo, duplicateNode, selectAll,
    onCommandBar: () => openCommandBar('root'),
    onSearch: () => openCommandBar('search'),
    onShortcutsHelp: () => useFlowStore.getState().setShortcutsHelpOpen(true)
  });

  // --- AI ---
  const { isGenerating, handleAIRequest } = useAIGeneration(
    recordHistory
  );

  // --- Export ---
  const { fileInputRef, handleExport, handleExportJSON, handleImportJSON, onFileImport } = useFlowExport(
    recordHistory, reactFlowWrapper
  );

  // --- Auto Layout (ELK) ---
  const [isLayouting, setIsLayouting] = useState(false);
  const onLayout = useCallback(async (
    direction: 'TB' | 'LR' | 'RL' | 'BT' = 'TB',
    algorithm: LayoutAlgorithm = 'layered',
    spacing: 'compact' | 'normal' | 'loose' = 'normal'
  ) => {
    if (nodes.length === 0) return;
    setIsLayouting(true);
    recordHistory();

    try {
      const layoutedNodes = await getElkLayout(nodes, edges, {
        direction,
        algorithm,
        spacing,
      });
      setNodes(layoutedNodes);
      setTimeout(() => fitView({ duration: 800 }), 50);
    } catch (err) {
      console.error('ELK layout failed:', err);
    } finally {
      setIsLayouting(false);
    }
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

  return (
    <div className="w-full h-screen bg-[var(--brand-background)] flex flex-col relative" ref={reactFlowWrapper}>
      {/* Header */}
      <TopNav
        showMiniMap={showMiniMap}
        toggleMiniMap={toggleMiniMap}
        showGrid={showGrid}
        toggleGrid={toggleGrid}
        snapToGrid={snapToGrid}
        toggleSnapToGrid={toggleSnap}
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
        onGoHome={onGoHome}
      />

      <ErrorBoundary fallbackMessage="The canvas encountered an error. Click 'Try Again' to recover.">
        <FlowCanvas
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          recordHistory={recordHistory}
          isSelectMode={isSelectMode}
        />
      </ErrorBoundary>

      {/* Layout loading overlay */}
      {isLayouting && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/60 backdrop-blur-sm pointer-events-none" aria-live="polite">
          <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-2xl shadow-xl border border-slate-200">
            <svg className="w-5 h-5 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium text-slate-600">Applying layout…</span>
          </div>
        </div>
      )}

      <Toolbar
        onCommandBar={() => openCommandBar('root')}
        onDesignSystemPanel={() => {
          setCommandBarView('design-system');
          setIsCommandBarOpen(true);
        }}
        isDesignSystemPanelOpen={isCommandBarOpen && commandBarView === 'design-system'}
        onClear={handleClear}

        onAddNode={handleAddNode}
        onAddAnnotation={handleAddAnnotation}
        onAddSection={handleAddSection}
        onAddText={handleAddTextNode}
        onAddImage={handleAddImage}
        onUndo={undo}
        onRedo={redo}
        onLayout={() => openCommandBar('layout')}
        onTemplates={() => openCommandBar('templates')}
        canUndo={canUndo}
        canRedo={canRedo}
        isSelectMode={isSelectMode}
        onToggleSelectMode={() => setIsSelectMode(true)}
        isCommandBarOpen={isCommandBarOpen}
        onTogglePanMode={() => setIsSelectMode(false)}
        getCenter={getCenter}
      />



      <ErrorBoundary fallbackMessage="The command bar encountered an error.">
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
            onToggleGrid: toggleGrid,
            snapToGrid,
            onToggleSnap: toggleSnap,
            showMiniMap,
            onToggleMiniMap: toggleMiniMap,
          }}
        />
      </ErrorBoundary>

      {/* TemplatesPanel removed - functionality moved to CommandBar */}

      <SnapshotsPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        snapshots={snapshots}
        onSaveSnapshot={(name) => saveSnapshot(name, nodes, edges)}
        onRestoreSnapshot={handleRestoreSnapshot}
        onDeleteSnapshot={deleteSnapshot}
      />

      <ErrorBoundary fallbackMessage="The properties panel encountered an error.">
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
      </ErrorBoundary>

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
        id="json-import-input"
      />

      <KeyboardShortcutsModal />
    </div>
  );
};

const FlowCanvasRoute = () => {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const { setActiveTabId } = useFlowStore();

  useEffect(() => {
    if (flowId) {
      setActiveTabId(flowId);
    }
  }, [flowId, setActiveTabId]);

  return <FlowEditor onGoHome={() => navigate('/')} />;
};

const HomePageRoute = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = location.pathname === '/settings' ? 'settings' : 'home';

  const handleLaunch = () => {
    navigate('/canvas');
  };

  const handleRestore = (snapshot: any) => {
    const { setNodes, setEdges } = useFlowStore.getState();
    // Deep copy to prevent state mutation issues if snapshot is just a ref
    const nodesCopy = JSON.parse(JSON.stringify(snapshot.nodes));
    const edgesCopy = JSON.parse(JSON.stringify(snapshot.edges));
    setNodes(nodesCopy);
    setEdges(edgesCopy);
    navigate('/canvas');
  };

  return (
    <HomePage
      onLaunch={handleLaunch}
      onImportJSON={() => {
        navigate('/canvas');
        setTimeout(() => {
          document.getElementById('json-import-input')?.click();
        }, 100);
      }}
      onRestoreSnapshot={handleRestore}
      activeTab={activeTab}
      onSwitchTab={(tab) => navigate(tab === 'settings' ? '/settings' : '/')}
    />
  );
};

function App() {
  useBrandTheme();

  return (
    <Router>
      <ReactFlowProvider>
        <Routes>
          <Route path="/" element={<HomePageRoute />} />
          <Route path="/settings" element={<HomePageRoute />} />
          <Route path="/canvas" element={<FlowCanvasRoute />} />
          <Route path="/flow/:flowId" element={<FlowCanvasRoute />} />
        </Routes>
      </ReactFlowProvider>
    </Router>
  );
}

export default App;