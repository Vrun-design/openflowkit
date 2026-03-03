import { useState } from 'react';
import { trackEvent } from '@/lib/analytics';

export type CommandBarView =
    | 'root'
    | 'ai'
    | 'mermaid'
    | 'flowmind'
    | 'templates'
    | 'search'
    | 'layout'
    | 'design-system'
    | 'wireframes';

interface UseFlowEditorUIStateResult {
    isHistoryOpen: boolean;
    isCommandBarOpen: boolean;
    commandBarView: CommandBarView;
    isSelectMode: boolean;
    isDesignSystemPanelOpen: boolean;
    openHistory: () => void;
    closeHistory: () => void;
    openCommandBar: (view?: CommandBarView) => void;
    closeCommandBar: () => void;
    openDesignSystemPanel: () => void;
    enableSelectMode: () => void;
    enablePanMode: () => void;
}

export function useFlowEditorUIState(): UseFlowEditorUIStateResult {
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
    const [commandBarView, setCommandBarView] = useState<CommandBarView>('root');
    const [isSelectMode, setIsSelectMode] = useState(false);

    function openHistory(): void {
        setIsHistoryOpen(true);
    }

    function closeHistory(): void {
        setIsHistoryOpen(false);
    }

    function openCommandBar(view: CommandBarView = 'root'): void {
        trackEvent('open_command_bar', { view });
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
        isSelectMode,
        isDesignSystemPanelOpen: isCommandBarOpen && commandBarView === 'design-system',
        openHistory,
        closeHistory,
        openCommandBar,
        closeCommandBar,
        openDesignSystemPanel,
        enableSelectMode,
        enablePanMode,
    };
}
