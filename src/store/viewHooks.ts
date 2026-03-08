import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import type { FlowStoreState, ViewSettings } from '../store';

export function useViewSettings(): ViewSettings {
    return useFlowStore((state) => state.viewSettings);
}

export function useShortcutHelpOpen(): boolean {
    return useFlowStore((state) => state.viewSettings.isShortcutsHelpOpen);
}

export function useShortcutHelpActions(): Pick<FlowStoreState, 'setShortcutsHelpOpen'> {
    return useFlowStore(
        useShallow((state) => ({
            setShortcutsHelpOpen: state.setShortcutsHelpOpen,
        }))
    );
}

export function useCanvasViewSettings(): Pick<
    ViewSettings,
    'showGrid' | 'snapToGrid' | 'alignmentGuidesEnabled' | 'largeGraphSafetyMode' | 'largeGraphSafetyProfile' | 'architectureStrictMode'
> {
    return useFlowStore(
        useShallow((state) => ({
            showGrid: state.viewSettings.showGrid,
            snapToGrid: state.viewSettings.snapToGrid,
            alignmentGuidesEnabled: state.viewSettings.alignmentGuidesEnabled,
            largeGraphSafetyMode: state.viewSettings.largeGraphSafetyMode,
            largeGraphSafetyProfile: state.viewSettings.largeGraphSafetyProfile,
            architectureStrictMode: state.viewSettings.architectureStrictMode,
        }))
    );
}

export function useVisualSettingsActions(): Pick<
    FlowStoreState,
    | 'toggleGrid'
    | 'toggleSnap'
    | 'setViewSettings'
    | 'setGlobalEdgeOptions'
    | 'setDefaultIconsEnabled'
    | 'setSmartRoutingEnabled'
    | 'setSmartRoutingProfile'
    | 'setSmartRoutingBundlingEnabled'
    | 'setLargeGraphSafetyMode'
    | 'setLargeGraphSafetyProfile'
    | 'toggleAnalytics'
> {
    return useFlowStore(
        useShallow((state) => ({
            toggleGrid: state.toggleGrid,
            toggleSnap: state.toggleSnap,
            setViewSettings: state.setViewSettings,
            setGlobalEdgeOptions: state.setGlobalEdgeOptions,
            setDefaultIconsEnabled: state.setDefaultIconsEnabled,
            setSmartRoutingEnabled: state.setSmartRoutingEnabled,
            setSmartRoutingProfile: state.setSmartRoutingProfile,
            setSmartRoutingBundlingEnabled: state.setSmartRoutingBundlingEnabled,
            setLargeGraphSafetyMode: state.setLargeGraphSafetyMode,
            setLargeGraphSafetyProfile: state.setLargeGraphSafetyProfile,
            toggleAnalytics: state.toggleAnalytics,
        }))
    );
}
