import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import type { DesignSystem } from '@/lib/types';
import {
    createDesignSystemByIdSelector,
    selectActiveDesignSystem,
    selectDesignSystemActions,
    selectDesignSystemsCatalog,
} from './selectors';
import type { DesignSystemActionsSlice, DesignSystemCatalogSlice } from './types';

export function useDesignSystemsCatalog(): DesignSystemCatalogSlice {
    return useFlowStore(useShallow(selectDesignSystemsCatalog));
}

export function useActiveDesignSystem(): DesignSystem {
    return useFlowStore(selectActiveDesignSystem);
}

export function useDesignSystemById(systemId: string): DesignSystem | undefined {
    return useFlowStore(createDesignSystemByIdSelector(systemId));
}

export function useDesignSystemActions(): DesignSystemActionsSlice {
    return useFlowStore(useShallow(selectDesignSystemActions));
}
