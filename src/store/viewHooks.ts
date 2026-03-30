import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import type { ViewSettings } from '../store';
import {
    selectCanvasViewSettings,
    selectShortcutHelpActions,
    selectShortcutHelpOpen,
    selectViewSettings,
    selectVisualSettingsActions,
} from './selectors';
import type {
    CanvasViewSettingsSlice,
    ShortcutHelpActionsSlice,
    VisualSettingsActionsSlice,
} from './types';

export function useViewSettings(): ViewSettings {
    return useFlowStore(selectViewSettings);
}

export function useShortcutHelpOpen(): boolean {
    return useFlowStore(selectShortcutHelpOpen);
}

export function useShortcutHelpActions(): ShortcutHelpActionsSlice {
    return useFlowStore(useShallow(selectShortcutHelpActions));
}

export function useCanvasViewSettings(): CanvasViewSettingsSlice {
    return useFlowStore(useShallow(selectCanvasViewSettings));
}

export function useVisualSettingsActions(): VisualSettingsActionsSlice {
    return useFlowStore(useShallow(selectVisualSettingsActions));
}
