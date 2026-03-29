import { DEFAULT_AI_SETTINGS } from '../defaults';
import { sanitizeAISettings } from '../aiSettings';
import { persistAISettings } from '../aiSettingsPersistence';
import type { FlowState } from '../types';

type SetFlowState = (partial: Partial<FlowState> | ((state: FlowState) => Partial<FlowState>)) => void;

export function createAIAndSelectionActions(set: SetFlowState): Pick<
    FlowState,
    | 'setAISettings'
    | 'setSelectedNodeId'
    | 'setSelectedEdgeId'
    | 'setHoveredSectionId'
    | 'queuePendingNodeLabelEditRequest'
    | 'clearPendingNodeLabelEditRequest'
    | 'setMermaidDiagnostics'
    | 'clearMermaidDiagnostics'
> {
    return {
        setAISettings: (settings) => set((state) => {
            const nextAISettings = sanitizeAISettings({ ...state.aiSettings, ...settings }, DEFAULT_AI_SETTINGS);
            persistAISettings(nextAISettings);
            return {
                aiSettings: nextAISettings,
            };
        }),

        setSelectedNodeId: (id) => set({ selectedNodeId: id }),
        setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),
        setHoveredSectionId: (id) => set({ hoveredSectionId: id }),
        queuePendingNodeLabelEditRequest: (request) => set({ pendingNodeLabelEditRequest: request }),
        clearPendingNodeLabelEditRequest: () => set({ pendingNodeLabelEditRequest: null }),
        setMermaidDiagnostics: (snapshot) => set({ mermaidDiagnostics: snapshot }),
        clearMermaidDiagnostics: () => set({ mermaidDiagnostics: null }),
    };
}
