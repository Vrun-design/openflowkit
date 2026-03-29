import { describe, expect, it } from 'vitest';
import {
    getDomainAssetCatalogCount,
    loadDomainAssetCatalog,
    loadDomainAssetSuggestions,
} from './assetCatalog';

describe('assetCatalog', () => {
    it('includes embedded network, C4, and security entries inside the icons catalog', async () => {
        const items = await loadDomainAssetCatalog('icons');

        expect(items.some((item) => item.id === 'net-router' && item.category === 'icons' && item.providerShapeCategory === 'Network')).toBe(true);
        expect(items.some((item) => item.id === 'c4-container' && item.category === 'icons' && item.providerShapeCategory === 'C4')).toBe(true);
        expect(items.some((item) => item.id === 'sec-firewall' && item.category === 'icons' && item.providerShapeCategory === 'Security')).toBe(true);
    });

    it('supports category filtering and search across embedded icon entries', async () => {
        const networkItems = await loadDomainAssetSuggestions('icons', { category: 'Network', query: 'router' });
        const c4Items = await loadDomainAssetSuggestions('icons', { category: 'C4', query: 'container' });
        const securityItems = await loadDomainAssetSuggestions('icons', { category: 'Security', query: 'firewall' });

        expect(networkItems.some((item) => item.id === 'net-router')).toBe(true);
        expect(c4Items.some((item) => item.id === 'c4-container')).toBe(true);
        expect(securityItems.some((item) => item.id === 'sec-firewall')).toBe(true);
    });

    it('counts embedded network, C4, and security entries inside the icons total', async () => {
        const items = await loadDomainAssetCatalog('icons');

        expect(getDomainAssetCatalogCount('icons')).toBe(items.length);
    });
});
