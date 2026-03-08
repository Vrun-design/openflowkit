import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import type { BrandConfig, BrandKit, FlowStoreState } from '../store';

export function useBrandConfig(): BrandConfig {
    return useFlowStore((state) => state.brandConfig);
}

export function useBrandButtonStyle(): BrandConfig['ui']['buttonStyle'] {
    return useFlowStore((state) => state.brandConfig.ui.buttonStyle);
}

export function useActiveBrandKitId(): string {
    return useFlowStore((state) => state.activeBrandKitId);
}

export function useBrandKitCatalog(): Pick<FlowStoreState, 'brandKits' | 'activeBrandKitId'> {
    return useFlowStore(
        useShallow((state) => ({
            brandKits: state.brandKits,
            activeBrandKitId: state.activeBrandKitId,
        }))
    );
}

export function useBrandKitActions(): Pick<
    FlowStoreState,
    'setBrandConfig' | 'resetBrandConfig' | 'addBrandKit' | 'updateBrandKitName' | 'deleteBrandKit' | 'setActiveBrandKitId'
> {
    return useFlowStore(
        useShallow((state) => ({
            setBrandConfig: state.setBrandConfig,
            resetBrandConfig: state.resetBrandConfig,
            addBrandKit: state.addBrandKit,
            updateBrandKitName: state.updateBrandKitName,
            deleteBrandKit: state.deleteBrandKit,
            setActiveBrandKitId: state.setActiveBrandKitId,
        }))
    );
}

export function useBrandKitById(kitId: string): BrandKit | undefined {
    return useFlowStore((state) => state.brandKits.find((kit) => kit.id === kitId));
}
