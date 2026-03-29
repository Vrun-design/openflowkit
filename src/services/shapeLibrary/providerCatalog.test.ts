import { describe, expect, it } from 'vitest';
import { listProviderCatalogProviders, loadProviderCatalog, loadProviderShapePreview } from './providerCatalog';

describe('providerCatalog', () => {
    it('discovers bundled provider packs from manifest paths', () => {
        expect(listProviderCatalogProviders()).toContain('aws');
        expect(listProviderCatalogProviders()).toContain('azure');
        expect(listProviderCatalogProviders()).toContain('cncf');
        expect(listProviderCatalogProviders()).toContain('developer');
    });

    it('loads the AWS provider catalog from the local manifest pack', async () => {
        const items = await loadProviderCatalog('aws');

        expect(items.length).toBeGreaterThan(300);
        expect(items[0]).toMatchObject({
            category: 'aws',
            nodeType: 'custom',
        });
        expect(items.some((item) => item.archIconShapeId === 'compute-lambda')).toBe(true);
    });

    it('loads a preview for a specific provider icon', async () => {
        const preview = await loadProviderShapePreview('aws-official-starter-v1', 'compute-lambda');

        expect(preview).not.toBeNull();
        expect(preview?.previewUrl.length).toBeGreaterThan(0);
    });

    it('loads Azure and CNCF provider catalogs from local svg packs', async () => {
        const [azureItems, cncfItems] = await Promise.all([
            loadProviderCatalog('azure'),
            loadProviderCatalog('cncf'),
        ]);

        expect(azureItems.length).toBeGreaterThan(200);
        expect(cncfItems.length).toBeGreaterThan(100);
        expect(azureItems[0]?.category).toBe('azure');
        expect(cncfItems[0]?.category).toBe('cncf');
    });

    it('loads the developer icons catalog from the local svg pack', async () => {
        const items = await loadProviderCatalog('developer');

        expect(items.length).toBeGreaterThan(300);
        expect(items[0]?.category).toBe('developer');
        expect(items.some((item) => item.archIconShapeId === 'languages-javascript')).toBe(true);
    });
});
