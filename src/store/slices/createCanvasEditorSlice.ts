import type { GetFlowState, SetFlowState } from '../actionFactory';
import { createAIAndSelectionActions } from '../actions/createAIAndSelectionActions';
import { createCanvasActions } from '../actions/createCanvasActions';
import { createLayerActions } from '../actions/createLayerActions';
import type {
  CanvasActionsSlice,
  SelectionActionsSlice,
} from '../types';
import type { FlowState } from '../types';

type CanvasEditorSliceState = Pick<
  FlowState,
  | 'nodes'
  | 'edges'
  | 'layers'
  | 'activeLayerId'
  | 'selectedNodeId'
  | 'selectedEdgeId'
  | 'hoveredSectionId'
  | 'pendingNodeLabelEditRequest'
  | 'mermaidDiagnostics'
  | 'aiSettings'
>;

type LayerActionsSlice = Pick<
  FlowState,
  | 'addLayer'
  | 'renameLayer'
  | 'deleteLayer'
  | 'setActiveLayerId'
  | 'toggleLayerVisibility'
  | 'toggleLayerLock'
  | 'moveLayer'
  | 'moveSelectedNodesToLayer'
  | 'selectNodesInLayer'
>;

type AISettingsActionsSlice = Pick<FlowState, 'setAISettings'>;

type NodeLabelEditActionsSlice = Pick<
  FlowState,
  'queuePendingNodeLabelEditRequest' | 'clearPendingNodeLabelEditRequest'
>;

type MermaidDiagnosticsActionsSlice = Pick<
  FlowState,
  'setMermaidDiagnostics' | 'clearMermaidDiagnostics'
>;

export type CanvasEditorSlice = CanvasEditorSliceState &
  CanvasActionsSlice &
  LayerActionsSlice &
  AISettingsActionsSlice &
  SelectionActionsSlice &
  NodeLabelEditActionsSlice &
  MermaidDiagnosticsActionsSlice;

export function createCanvasEditorSlice(
  initialState: CanvasEditorSliceState,
  set: SetFlowState,
  get: GetFlowState
): CanvasEditorSlice {
  return {
    nodes: initialState.nodes,
    edges: initialState.edges,
    layers: initialState.layers,
    activeLayerId: initialState.activeLayerId,
    selectedNodeId: initialState.selectedNodeId,
    selectedEdgeId: initialState.selectedEdgeId,
    hoveredSectionId: initialState.hoveredSectionId,
    pendingNodeLabelEditRequest: initialState.pendingNodeLabelEditRequest,
    mermaidDiagnostics: initialState.mermaidDiagnostics,
    aiSettings: initialState.aiSettings,
    ...createCanvasActions(set, get),
    ...createLayerActions(set, get),
    ...createAIAndSelectionActions(set),
  };
}
