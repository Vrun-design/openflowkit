import type React from 'react';
import type { DomainLibraryCategory } from '@/services/domainLibrary';

export type AssetTab = 'general' | 'icons' | 'developer' | 'aws' | 'azure' | 'gcp' | 'cncf';

export interface GeneralAssetItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    keywords: string[];
    action: () => void;
}

export interface CloudTabDefinition {
    id: Extract<AssetTab, 'icons' | 'developer' | 'aws' | 'azure' | 'gcp' | 'cncf'>;
    label: string;
    category: DomainLibraryCategory;
}

export const TAB_ORDER: AssetTab[] = ['general', 'icons', 'developer', 'aws', 'azure', 'gcp', 'cncf'];

export const CLOUD_TABS: CloudTabDefinition[] = [
    { id: 'icons', label: 'Icons', category: 'icons' },
    { id: 'developer', label: 'Developer Logos', category: 'developer' },
    { id: 'aws', label: 'AWS', category: 'aws' },
    { id: 'azure', label: 'Azure', category: 'azure' },
    { id: 'gcp', label: 'GCP', category: 'gcp' },
    { id: 'cncf', label: 'CNCF', category: 'cncf' },
];

export const IMAGE_UPLOAD_INPUT_ID = 'assets-image-upload-input';
export const MAX_CLOUD_RESULTS = 240;
export const PROVIDER_BACKED_TABS = new Set<AssetTab>(['developer', 'aws', 'azure', 'gcp', 'cncf']);

export type CloudAssetState = 'idle' | 'loading' | 'ready' | 'error';

export function getTileClass(): string {
    return 'group flex aspect-square flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-4 text-center transition-colors hover:border-[var(--brand-primary-200)] hover:bg-[var(--brand-primary-50)]';
}
