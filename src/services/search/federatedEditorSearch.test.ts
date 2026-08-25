import { describe, expect, it, vi } from 'vitest';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import type { FlowTemplate } from '@/services/templates';
import { searchFederatedEditorCatalogs } from './federatedEditorSearch';

const template = {
  id: 'checkout',
  name: 'Checkout service blueprint',
  description: 'Commerce payment workflow',
  category: 'architecture',
  tags: ['payment'],
  useCase: 'Build checkout infrastructure',
  outcome: 'Reliable checkout',
  replacementHints: ['replace payment provider'],
  nodes: [],
  edges: [],
} as FlowTemplate;
const icon: DomainLibraryItem = {
  id: 'aws-lambda',
  category: 'aws',
  label: 'Lambda function',
  description: 'AWS serverless compute',
  icon: 'Box',
  color: 'amber',
  assetPresentation: 'icon',
};

describe('searchFederatedEditorCatalogs', () => {
  it('returns ranked multi-word results across templates, shapes, and icons', async () => {
    const dependencies = {
      loadTemplates: vi.fn(async () => [template]),
      loadAssets: vi.fn(async () => [icon]),
    };

    await expect(
      searchFederatedEditorCatalogs(
        'payment workflow',
        { includeAssets: true, includeTemplates: true },
        dependencies
      )
    ).resolves.toMatchObject([{ kind: 'template', label: 'Checkout service blueprint' }]);
    await expect(
      searchFederatedEditorCatalogs(
        'decision branch',
        { includeAssets: true, includeTemplates: true },
        dependencies
      )
    ).resolves.toMatchObject([{ kind: 'shape', label: 'Diamond' }]);
    await expect(
      searchFederatedEditorCatalogs(
        'serverless compute',
        { includeAssets: true, includeTemplates: true },
        dependencies
      )
    ).resolves.toMatchObject([{ kind: 'icon', label: 'Lambda function' }]);
  });

  it('does not load or return catalogs without executable handlers', async () => {
    const loadTemplates = vi.fn(async () => [template]);
    const loadAssets = vi.fn(async () => [icon]);

    await expect(
      searchFederatedEditorCatalogs(
        'serverless',
        { includeAssets: false, includeTemplates: false },
        { loadTemplates, loadAssets }
      )
    ).resolves.toEqual([]);
    expect(loadTemplates).not.toHaveBeenCalled();
    expect(loadAssets).not.toHaveBeenCalled();
  });
});
