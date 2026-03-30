import type { DesignSystem } from '@/lib/types';
import { createId } from '@/lib/id';
import type { SetFlowState } from '../actionFactory';
import type { FlowState } from '../types';

export function createDesignSystemActions(set: SetFlowState): Pick<
    FlowState,
    'setActiveDesignSystem' | 'addDesignSystem' | 'updateDesignSystem' | 'deleteDesignSystem' | 'duplicateDesignSystem'
> {
    return {
        setActiveDesignSystem: (id) => set({ activeDesignSystemId: id }),

        addDesignSystem: (designSystem) => set((state) => ({ designSystems: [...state.designSystems, designSystem] })),

        updateDesignSystem: (id, updates) => set((state) => ({
            designSystems: state.designSystems.map((designSystem) =>
                designSystem.id === id ? { ...designSystem, ...updates } : designSystem
            ),
        })),

        deleteDesignSystem: (id) => {
            if (id === 'default') return;
            set((state) => {
                const newSystems = state.designSystems.filter((designSystem) => designSystem.id !== id);
                const newActive = state.activeDesignSystemId === id ? 'default' : state.activeDesignSystemId;
                return { designSystems: newSystems, activeDesignSystemId: newActive };
            });
        },

        duplicateDesignSystem: (id) => {
            set((state) => {
                const original = state.designSystems.find((designSystem) => designSystem.id === id);
                if (!original) return {};

                const newId = createId('ds');
                const newSystem: DesignSystem = {
                    ...original,
                    id: newId,
                    name: `${original.name} (Copy)`,
                    isDefault: false,
                };
                return { designSystems: [...state.designSystems, newSystem], activeDesignSystemId: newId };
            });
        },
    };
}
