import type { FlowState, BrandConfig, BrandKit } from '../types';
import { DEFAULT_BRAND_KIT } from '../defaults';

type SetFlowState = (partial: Partial<FlowState> | ((state: FlowState) => Partial<FlowState>)) => void;

export function createBrandActions(set: SetFlowState): Pick<
    FlowState,
    'setBrandConfig' | 'resetBrandConfig' | 'addBrandKit' | 'updateBrandKitName' | 'deleteBrandKit' | 'setActiveBrandKitId'
> {
    return {
        setBrandConfig: (config) => set((state) => {
            const newConfig = { ...state.brandConfig, ...config };
            const updatedKits = state.brandKits.map((kit) =>
                kit.id === state.activeBrandKitId ? { ...kit, ...config } : kit
            );
            return { brandConfig: newConfig, brandKits: updatedKits };
        }),

        resetBrandConfig: () => set((state) => {
            const defaultKit = state.brandKits.find((kit) => kit.id === 'default') || DEFAULT_BRAND_KIT;
            return { brandConfig: defaultKit, activeBrandKitId: 'default' };
        }),

        addBrandKit: (name: string, base?: BrandConfig) => set((state) => {
            const newId = `brand-${crypto.randomUUID()}`;
            const baseConfig = base || state.brandConfig;
            const newKit: BrandKit = {
                ...baseConfig,
                id: newId,
                name,
                isDefault: false,
            };
            return {
                brandKits: [...state.brandKits, newKit],
                activeBrandKitId: newId,
                brandConfig: newKit,
            };
        }),

        updateBrandKitName: (id: string, name: string) => set((state) => ({
            brandKits: state.brandKits.map((kit) => (kit.id === id ? { ...kit, name } : kit)),
        })),

        deleteBrandKit: (id: string) => set((state) => {
            const kitToDelete = state.brandKits.find((kit) => kit.id === id);
            if (!kitToDelete || kitToDelete.isDefault) return {};
            const newKits = state.brandKits.filter((kit) => kit.id !== id);
            let newActiveId = state.activeBrandKitId;
            let newConfig = state.brandConfig;

            if (state.activeBrandKitId === id) {
                newActiveId = 'default';
                const defaultKit = newKits.find((kit) => kit.id === 'default') || DEFAULT_BRAND_KIT;
                newConfig = defaultKit;
            }

            return {
                brandKits: newKits,
                activeBrandKitId: newActiveId,
                brandConfig: newConfig,
            };
        }),

        setActiveBrandKitId: (id: string) => set((state) => {
            const kit = state.brandKits.find((brandKit) => brandKit.id === id);
            if (!kit) return {};
            return {
                activeBrandKitId: id,
                brandConfig: kit,
            };
        }),
    };
}
