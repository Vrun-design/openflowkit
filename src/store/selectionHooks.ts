import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import type { MermaidDiagnosticsSnapshot, PendingNodeLabelEditRequest } from './types';
import {
    selectMermaidDiagnosticsActions,
    selectNodeLabelEditActions,
    selectSelectionActions,
    selectSelectionState,
} from './selectors';
import type {
    MermaidDiagnosticsActionsSlice,
    NodeLabelEditActionsSlice,
    SelectionActionsSlice,
    SelectionStateSlice,
} from './types';

export function useSelectionState(): SelectionStateSlice {
    return useFlowStore(useShallow(selectSelectionState));
}

export function useSelectedNodeId(): string | null {
    return useFlowStore((state) => state.selectedNodeId);
}

export function useSelectionActions(): SelectionActionsSlice {
    return useFlowStore(useShallow(selectSelectionActions));
}

export function usePendingNodeLabelEditRequest(): PendingNodeLabelEditRequest | null {
    return useFlowStore((state) => state.pendingNodeLabelEditRequest);
}

export function useNodeLabelEditRequestActions(): NodeLabelEditActionsSlice {
    return useFlowStore(useShallow(selectNodeLabelEditActions));
}

export function useMermaidDiagnostics(): MermaidDiagnosticsSnapshot | null {
    return useFlowStore((state) => state.mermaidDiagnostics);
}

export function useMermaidDiagnosticsActions(): MermaidDiagnosticsActionsSlice {
    return useFlowStore(useShallow(selectMermaidDiagnosticsActions));
}
