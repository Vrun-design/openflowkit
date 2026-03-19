import { useCallback, useEffect, useRef } from 'react';
import { shouldExitStudioOnSelection, type SelectionSnapshot } from './shouldExitStudioOnSelection';
import type { FlowEditorMode, StudioCodeMode, StudioTab } from '@/hooks/useFlowEditorUIState';

interface UseFlowEditorStudioControllerParams {
    editorMode: FlowEditorMode;
    studioTab: StudioTab;
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    setStudioTab: (tab: StudioTab) => void;
    setStudioCodeMode: (mode: StudioCodeMode) => void;
    setStudioMode: () => void;
    closeCommandBar: () => void;
    setCanvasMode: () => void;
    setSelectedNodeId: (id: string | null) => void;
    setSelectedEdgeId: (id: string | null) => void;
}

interface OpenStudioPanelOptions {
    codeMode?: StudioCodeMode;
    closeLauncher?: boolean;
}

interface UseFlowEditorStudioControllerResult {
    openStudioPanel: (tab: StudioTab, options?: OpenStudioPanelOptions) => void;
    openStudioAI: () => void;
    openStudioCode: (codeMode: StudioCodeMode) => void;
    openStudioPlayback: () => void;
    toggleStudioPanel: () => void;
    closeStudioPanel: () => void;
    handleCanvasEntityIntent: () => void;
}

export function useFlowEditorStudioController({
    editorMode,
    studioTab,
    selectedNodeId,
    selectedEdgeId,
    setStudioTab,
    setStudioCodeMode,
    setStudioMode,
    closeCommandBar,
    setCanvasMode,
    setSelectedNodeId,
    setSelectedEdgeId,
}: UseFlowEditorStudioControllerParams): UseFlowEditorStudioControllerResult {
    const studioSelectionSnapshotRef = useRef<SelectionSnapshot>({
        selectedNodeId: null,
        selectedEdgeId: null,
    });

    const clearSelectionAndSetCanvasMode = useCallback(() => {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setCanvasMode();
    }, [setCanvasMode, setSelectedEdgeId, setSelectedNodeId]);

    const captureStudioSelectionSnapshot = useCallback(() => {
        studioSelectionSnapshotRef.current = {
            selectedNodeId,
            selectedEdgeId,
        };
    }, [selectedEdgeId, selectedNodeId]);

    const openStudioPanel = useCallback((
        tab: StudioTab,
        options?: OpenStudioPanelOptions
    ) => {
        captureStudioSelectionSnapshot();
        setStudioTab(tab);
        if (options?.codeMode) {
            setStudioCodeMode(options.codeMode);
        }
        setStudioMode();
        if (options?.closeLauncher) {
            closeCommandBar();
        }
    }, [captureStudioSelectionSnapshot, closeCommandBar, setStudioCodeMode, setStudioMode, setStudioTab]);

    const openStudioAI = useCallback(() => {
        openStudioPanel('ai', { closeLauncher: true });
    }, [openStudioPanel]);

    const openStudioCode = useCallback((codeMode: StudioCodeMode) => {
        openStudioPanel('code', { codeMode, closeLauncher: true });
    }, [openStudioPanel]);

    const openStudioPlayback = useCallback(() => {
        openStudioPanel('playback', { closeLauncher: true });
    }, [openStudioPanel]);

    const toggleStudioPanel = useCallback(() => {
        if (editorMode === 'studio') {
            clearSelectionAndSetCanvasMode();
            return;
        }

        openStudioAI();
    }, [clearSelectionAndSetCanvasMode, editorMode, openStudioAI]);

    const closeStudioPanel = useCallback(() => {
        clearSelectionAndSetCanvasMode();
    }, [clearSelectionAndSetCanvasMode]);

    // Clicking a node/edge while in studio keeps the studio open.
    // The user explicitly switches via "View Properties" in the studio header.
    const handleCanvasEntityIntent = useCallback(() => undefined, []);

    useEffect(() => {
        if (!shouldExitStudioOnSelection({
            editorMode,
            studioTab,
            studioSelectionSnapshot: studioSelectionSnapshotRef.current,
            selectedNodeId,
            selectedEdgeId,
        })) {
            return;
        }

        setCanvasMode();
    }, [editorMode, selectedEdgeId, selectedNodeId, setCanvasMode, studioTab]);

    return {
        openStudioPanel,
        openStudioAI,
        openStudioCode,
        openStudioPlayback,
        toggleStudioPanel,
        closeStudioPanel,
        handleCanvasEntityIntent,
    };
}
