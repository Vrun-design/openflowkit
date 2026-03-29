import type { DomainLibraryCategory } from '@/services/domainLibrary';

export type AssetTab = 'developer' | 'aws' | 'azure' | 'gcp' | 'cncf' | 'icons';

export interface CloudTabDefinition {
    id: AssetTab;
    label: string;
    category: DomainLibraryCategory;
}

export const TAB_ORDER: AssetTab[] = ['developer', 'aws', 'azure', 'gcp', 'cncf', 'icons'];

export const CLOUD_TABS: CloudTabDefinition[] = [
    { id: 'developer', label: 'Developer Logos', category: 'developer' },
    { id: 'aws', label: 'AWS', category: 'aws' },
    { id: 'azure', label: 'Azure', category: 'azure' },
    { id: 'gcp', label: 'GCP', category: 'gcp' },
    { id: 'cncf', label: 'CNCF', category: 'cncf' },
    { id: 'icons', label: 'Icons', category: 'icons' },
];

export const MAX_CLOUD_RESULTS = 240;
export const PROVIDER_BACKED_TABS = new Set<AssetTab>(['developer', 'aws', 'azure', 'gcp', 'cncf']);

export type CloudAssetState = 'idle' | 'loading' | 'ready' | 'error';

export function getTileInnerClass(): string {
    return 'flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] text-[var(--brand-secondary)] transition-colors group-hover:border-[var(--brand-primary-200)] group-hover:bg-[var(--brand-surface)] group-hover:text-[var(--brand-primary)]';
}
