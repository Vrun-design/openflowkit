import { DesignSystem } from '@/lib/types';
import { useActiveDesignSystem } from '@/store/designSystemHooks';

export const useDesignSystem = (): DesignSystem => {
    return useActiveDesignSystem();
};
