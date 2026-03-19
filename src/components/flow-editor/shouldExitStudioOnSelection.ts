import type { FlowEditorMode, StudioTab } from '@/hooks/useFlowEditorUIState';

interface SelectionSnapshot {
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
}

interface ShouldExitStudioOnSelectionParams extends SelectionSnapshot {
    editorMode: FlowEditorMode;
    studioTab: StudioTab;
    studioSelectionSnapshot: SelectionSnapshot | null;
}

// Selecting a node/edge never auto-exits studio — the user stays in Studio
// and can explicitly click "View Properties" to switch.
export function shouldExitStudioOnSelection(_params: ShouldExitStudioOnSelectionParams): boolean {
    return false;
}

export type { SelectionSnapshot };
