import { describe, expect, it, vi } from 'vitest';

const loadDomainAssetSuggestions = vi.fn();

vi.mock('@/services/assetCatalog', () => ({
  loadDomainAssetSuggestions,
}));

describe('flowpilot asset grounding', () => {
  it('returns provider-backed matches for common services', async () => {
    loadDomainAssetSuggestions.mockImplementation(async (category: string, options: { query?: string }) => {
      if (category === 'aws' && options.query === 'S3') {
        return [
          {
            id: 'aws-official-starter-v1:storage-simple-storage-service',
            category: 'aws',
            label: 'S3',
            description: 'AWS Storage',
            icon: 'Box',
            color: 'amber',
            archIconPackId: 'aws-official-starter-v1',
            archIconShapeId: 'storage-simple-storage-service',
          },
        ];
      }

      return [];
    });

    const { groundFlowpilotAssets } = await import('./assetGrounding');
    const result = await groundFlowpilotAssets('Create an AWS diagram with S3 storage');

    expect(result[0]?.label).toBe('S3');
    expect(result[0]?.archIconPackId).toBe('aws-official-starter-v1');
  });
});
