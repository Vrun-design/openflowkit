import type { BrandKit } from '@/store';

export type EditorTab = 'identity' | 'colors' | 'typography' | 'ui';
export type BrandConfigUpdater = (config: Partial<BrandKit>) => void;

export interface EditorProps {
    config: BrandKit;
    update: BrandConfigUpdater;
}
