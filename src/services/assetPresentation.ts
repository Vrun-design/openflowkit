import type { DomainLibraryCategory } from '@/services/domainLibrary';

export function getAssetCategoryDisplayName(category: DomainLibraryCategory): string {
    switch (category) {
        case 'icons':
            return 'Icons';
        case 'developer':
            return 'Developer Logos';
        case 'aws':
            return 'AWS';
        case 'azure':
            return 'Azure';
        case 'gcp':
            return 'GCP';
        case 'cncf':
            return 'CNCF';
        case 'network':
            return 'Network';
        case 'c4':
            return 'C4';
        case 'security':
            return 'Security';
        default:
            return category;
    }
}

export function getAssetCategoryNoun(category: DomainLibraryCategory): string {
    return category === 'developer' ? 'logos' : 'icons';
}
