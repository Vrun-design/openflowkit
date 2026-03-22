import { useState } from 'react';
export type CommandBarView =
    | 'root'
    | 'templates'
    | 'search'
    | 'layout'
    | 'design-system'
    | 'assets';

export type FlowEditorMode = 'canvas' | 'studio';
export type StudioTab = 'ai' | 'code' | 'playback' | 'infra' | 'lint';
export type StudioCodeMode = 'openflow' | 'mermaid';

interface UseFlowEditorUIStateResult {
    isHistoryOpen: boolean;
    isCommandBarOpen: boolean;
    commandBarView: CommandBarView;
    editorMode: FlowEditorMode;
    studioTab: StudioTab;
    studioCodeMode: StudioCodeMode;
    isSelectMode: boolean;
    isDesignSystemPanelOpen: boolean;
    openHistory: () => void;
    closeHistory: () => void;
    openCommandBar: (view?: CommandBarView) => void;
    closeCommandBar: () => void;
    openDesignSystemPanel: () => void;
    setCanvasMode: () => void;
    setStudioMode: () => void;
    setStudioTab: (tab: StudioTab) => void;
    setStudioCodeMode: (mode: StudioCodeMode) => void;
    enableSelectMode: () => void;
    enablePanMode: () => void;
}

export function useFlowEditorUIState(): UseFlowEditorUIStateResult {
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
    const [commandBarView, setCommandBarView] = useState<CommandBarView>('root');
    const [editorMode, setEditorMode] = useState<FlowEditorMode>('canvas');
    const [studioTab, setStudioTab] = useState<StudioTab>('ai');
    const [studioCodeMode, setStudioCodeMode] = useState<StudioCodeMode>('openflow');
    const [isSelectMode, setIsSelectMode] = useState(true);

    function openHistory(): void {
        setIsHistoryOpen(true);
    }

    function closeHistory(): void {
        setIsHistoryOpen(false);
    }

    function openCommandBar(view: CommandBarView = 'root'): void {
        setCommandBarView(view);
        setIsCommandBarOpen(true);
    }

    function closeCommandBar(): void {
        setIsCommandBarOpen(false);
    }

    function openDesignSystemPanel(): void {
        setCommandBarView('design-system');
        setIsCommandBarOpen(true);
    }

    function setCanvasMode(): void {
        setEditorMode('canvas');
    }

    function setStudioMode(): void {
        setEditorMode('studio');
    }

    function enableSelectMode(): void {
        setIsSelectMode(true);
    }

    function enablePanMode(): void {
        setIsSelectMode(false);
    }

    return {
        isHistoryOpen,
        isCommandBarOpen,
        commandBarView,
        editorMode,
        studioTab,
        studioCodeMode,
        isSelectMode,
        isDesignSystemPanelOpen: isCommandBarOpen && commandBarView === 'design-system',
        openHistory,
        closeHistory,
        openCommandBar,
        closeCommandBar,
        openDesignSystemPanel,
        setCanvasMode,
        setStudioMode,
        setStudioTab,
        setStudioCodeMode,
        enableSelectMode,
        enablePanMode,
    };
}
