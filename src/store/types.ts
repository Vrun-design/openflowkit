import type {
  Connection,
  EdgeChange,
  NodeChange,
  OnEdgesChange,
  OnNodesChange,
} from '@/lib/reactflowCompat';
import type { ParseDiagnostic } from '@/lib/openFlowDSLParser';
import type {
  DesignSystem,
  DiagramType,
  FlowEdge,
  FlowNode,
  FlowTab,
  GlobalEdgeOptions,
} from '@/lib/types';
import type { ExportSerializationMode } from '@/services/canonicalSerialization';
import type { FlowDocument } from '@/services/storage/flowDocumentModel';

export interface ViewSettings {
  showGrid: boolean;
  snapToGrid: boolean;
  alignmentGuidesEnabled: boolean;
  isShortcutsHelpOpen: boolean;
  defaultIconsEnabled: boolean;
  smartRoutingEnabled: boolean;
  smartRoutingProfile: 'standard' | 'infrastructure';
  smartRoutingBundlingEnabled: boolean;
  architectureStrictMode: boolean;
  largeGraphSafetyMode: 'auto' | 'on' | 'off';
  largeGraphSafetyProfile: 'performance' | 'balanced' | 'quality';
  exportSerializationMode: ExportSerializationMode;
  language: string;
  lintRules: string;
}

export type AIProvider =
  | 'gemini'
  | 'openai'
  | 'claude'
  | 'groq'
  | 'nvidia'
  | 'cerebras'
  | 'mistral'
  | 'openrouter'
  | 'custom';

export type AISettingsStorageMode = 'local' | 'session';

export interface CustomHeaderConfig {
  key: string;
  value: string;
  enabled?: boolean;
}

export interface AISettings {
  provider: AIProvider;
  storageMode: AISettingsStorageMode;
  apiKey?: string;
  model?: string;
  customBaseUrl?: string;
  customHeaders?: CustomHeaderConfig[];
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface MermaidDiagnosticsSnapshot {
  source: 'paste' | 'import' | 'code';
  diagramType?: DiagramType;
  diagnostics: ParseDiagnostic[];
  error?: string;
  updatedAt: number;
}

export interface PendingNodeLabelEditRequest {
  nodeId: string;
  seedText?: string;
  replaceExisting?: boolean;
}

export interface FlowState {
  // -------------------------------------------------------------------------
  // SLICE: Canvas — active node/edge data synced with React Flow
  // -------------------------------------------------------------------------
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  setNodes: (nodes: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void;
  setEdges: (edges: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void;
  onConnect: (connection: Connection) => void;

  // -------------------------------------------------------------------------
  // SLICE: Tabs — multi-diagram workspace
  // -------------------------------------------------------------------------
  documents: FlowDocument[];
  activeDocumentId: string;
  setDocuments: (documents: FlowDocument[]) => void;
  setActiveDocumentId: (id: string) => void;
  createDocument: () => string;
  renameDocument: (id: string, nextName: string) => void;
  duplicateDocument: (id: string) => string | null;
  deleteDocumentRecord: (id: string) => void;
  tabs: FlowTab[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  setTabs: (tabs: FlowTab[]) => void;
  addTab: () => string;
  duplicateActiveTab: () => string | null;
  duplicateTab: (id: string) => string | null;
  deleteTab: (id: string) => void;
  closeTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<FlowTab>) => void;
  copySelectedToTab: (targetTabId: string) => number;
  moveSelectedToTab: (targetTabId: string) => number;

  // -------------------------------------------------------------------------
  // SLICE: History — store-level undo/redo (V2 model)
  // -------------------------------------------------------------------------
  recordHistoryV2: () => void;
  undoV2: () => void;
  redoV2: () => void;
  canUndoV2: () => boolean;
  canRedoV2: () => boolean;

  // -------------------------------------------------------------------------
  // SLICE: Design — design systems and global edge appearance
  // -------------------------------------------------------------------------
  designSystems: DesignSystem[];
  activeDesignSystemId: string;
  globalEdgeOptions: GlobalEdgeOptions;
  setActiveDesignSystem: (id: string) => void;
  addDesignSystem: (ds: DesignSystem) => void;
  updateDesignSystem: (id: string, updates: Partial<DesignSystem>) => void;
  deleteDesignSystem: (id: string) => void;
  duplicateDesignSystem: (id: string) => void;
  setGlobalEdgeOptions: (options: Partial<GlobalEdgeOptions>) => void;

  // -------------------------------------------------------------------------
  // SLICE: View — UI preferences, routing, safety mode, grid
  // -------------------------------------------------------------------------
  viewSettings: ViewSettings;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setShortcutsHelpOpen: (open: boolean) => void;
  setViewSettings: (settings: Partial<ViewSettings>) => void;
  setDefaultIconsEnabled: (enabled: boolean) => void;
  setSmartRoutingEnabled: (enabled: boolean) => void;
  setSmartRoutingProfile: (profile: ViewSettings['smartRoutingProfile']) => void;
  setSmartRoutingBundlingEnabled: (enabled: boolean) => void;
  setLargeGraphSafetyMode: (mode: ViewSettings['largeGraphSafetyMode']) => void;
  setLargeGraphSafetyProfile: (profile: ViewSettings['largeGraphSafetyProfile']) => void;

  // -------------------------------------------------------------------------
  // SLICE: AI — provider config and generation settings
  // -------------------------------------------------------------------------
  aiSettings: AISettings;
  setAISettings: (settings: Partial<AISettings>) => void;

  // -------------------------------------------------------------------------
  // SLICE: Layers — canvas layer management
  // -------------------------------------------------------------------------
  layers: Layer[];
  activeLayerId: string;
  addLayer: (name?: string) => string;
  renameLayer: (id: string, name: string) => void;
  deleteLayer: (id: string) => void;
  setActiveLayerId: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  moveSelectedNodesToLayer: (layerId: string) => void;
  selectNodesInLayer: (layerId: string) => void;

  // -------------------------------------------------------------------------
  // SLICE: Selection & transient UI state
  // -------------------------------------------------------------------------
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hoveredSectionId: string | null;
  pendingNodeLabelEditRequest: PendingNodeLabelEditRequest | null;
  mermaidDiagnostics: MermaidDiagnosticsSnapshot | null;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  setHoveredSectionId: (id: string | null) => void;
  queuePendingNodeLabelEditRequest: (request: PendingNodeLabelEditRequest) => void;
  clearPendingNodeLabelEditRequest: () => void;
  setMermaidDiagnostics: (snapshot: MermaidDiagnosticsSnapshot | null) => void;
  clearMermaidDiagnostics: () => void;

  // -------------------------------------------------------------------------
  // SLICE: Persistence — save status tracking
  // -------------------------------------------------------------------------
  lastUpdateTime: number;
  updateLastSaveTime: () => void;
}

export type { EdgeChange, NodeChange };
