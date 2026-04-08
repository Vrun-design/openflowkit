import { describe, expect, it } from 'vitest';
import {
    createDomainLibraryNode,
    DOMAIN_LIBRARY_ITEMS,
} from './domainLibrary';

describe('domainLibrary', () => {
    it('contains the generic non-provider categories used by the static library', () => {
        const categories = new Set(DOMAIN_LIBRARY_ITEMS.map((item) => item.category));
        expect(categories.has('azure')).toBe(true);
        expect(categories.has('gcp')).toBe(true);
        expect(categories.has('cncf')).toBe(true);
        expect(categories.has('network')).toBe(true);
        expect(categories.has('security')).toBe(true);
        expect(categories.has('c4')).toBe(true);
    });

    it('creates architecture nodes for network/c4 library items', () => {
        const item = DOMAIN_LIBRARY_ITEMS.find((entry) => entry.id === 'sec-firewall');
        expect(item).toBeDefined();
        const node = createDomainLibraryNode(
            item!,
            'lib-1',
            { x: 120, y: 200 },
            'default'
        );
        // sec-firewall maps to an architecture node with archResourceType 'firewall'
        expect(node.type).toBe('architecture');
        expect(node.data.label).toBe('Firewall');
        expect(node.data.color).toBe('red');
        expect(node.data.layerId).toBe('default');
        expect((node.data as { archResourceType?: string }).archResourceType).toBe('firewall');
    });

    it('creates process nodes from generic items without nodeType', () => {
        const item = DOMAIN_LIBRARY_ITEMS.find((entry) => entry.id === 'sec-waf');
        expect(item).toBeDefined();
        const node = createDomainLibraryNode(
            item!,
            'lib-1',
            { x: 120, y: 200 },
            'default'
        );
        expect(node.type).toBe('process');
        expect(node.data.label).toBe('WAF');
        expect(node.data.layerId).toBe('default');
    });

    it('creates icon-first custom nodes for provider svg assets', () => {
        const node = createDomainLibraryNode(
            {
                id: 'aws-official-starter-v1:analytics-athena',
                category: 'aws',
                label: 'Analytics Athena',
                description: 'AWS Analytics',
                icon: 'Box',
                color: 'amber',
                nodeType: 'custom',
                assetPresentation: 'icon',
                previewUrl: '/mock/athena.svg',
                archIconPackId: 'aws-official-starter-v1',
                archIconShapeId: 'analytics-athena',
            },
            'lib-2',
            { x: 120, y: 200 },
            'default'
        );

        expect(node.type).toBe('custom');
        expect(node.data.assetPresentation).toBe('icon');
        expect(node.data.assetProvider).toBe('aws');
        expect(node.data.assetCategory).toBe('Analytics');
        expect(node.data.customIconUrl).toBeUndefined();
    });
});
