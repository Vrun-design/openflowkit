import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import type { DesignSystem } from '@/lib/types';
import type { FlowStoreState } from '../store';

export function useDesignSystemsCatalog(): Pick<FlowStoreState, 'designSystems' | 'activeDesignSystemId'> {
    return useFlowStore(
        useShallow((state) => ({
            designSystems: state.designSystems,
            activeDesignSystemId: state.activeDesignSystemId,
        }))
    );
}

export function useActiveDesignSystem(): DesignSystem {
    return useFlowStore((state) => {
        return state.designSystems.find((designSystem) => designSystem.id === state.activeDesignSystemId) ?? state.designSystems[0];
    });
}

export function useDesignSystemById(systemId: string): DesignSystem | undefined {
    return useFlowStore((state) => state.designSystems.find((designSystem) => designSystem.id === systemId));
}

export function useDesignSystemActions(): Pick<
    FlowStoreState,
    'setActiveDesignSystem' | 'addDesignSystem' | 'updateDesignSystem' | 'deleteDesignSystem' | 'duplicateDesignSystem'
> {
    return useFlowStore(
        useShallow((state) => ({
            setActiveDesignSystem: state.setActiveDesignSystem,
            addDesignSystem: state.addDesignSystem,
            updateDesignSystem: state.updateDesignSystem,
            deleteDesignSystem: state.deleteDesignSystem,
            duplicateDesignSystem: state.duplicateDesignSystem,
        }))
    );
}
