import { describe, expect, it } from 'vitest';
import { readIconManifest, renderIconManifest } from '../../../scripts/gen-icon-manifest.mjs';
import { PROVIDER_ICON_MANIFEST } from './providerIconManifest';
import { hasProviderIconPack, loadProviderIconUrl } from './providerIconUrls';

describe('provider icon manifest', () => {
  it('lists exactly the SVGs on disk (after adding or removing one: node scripts/gen-icon-manifest.mjs)', () => {
    expect(renderIconManifest(PROVIDER_ICON_MANIFEST)).toBe(renderIconManifest(readIconManifest()));
  });

  it('every provider in it has a URL pack to load from', () => {
    for (const provider of Object.keys(PROVIDER_ICON_MANIFEST)) expect(hasProviderIconPack(provider), provider).toBe(true);
  });

  it('resolves a manifest path to its URL, and null for one it does not have', async () => {
    expect(await loadProviderIconUrl('aws', 'Compute/Lambda')).toMatch(/\S/);
    expect(await loadProviderIconUrl('aws', 'Compute/Nope')).toBeNull();
    expect(await loadProviderIconUrl('nope', 'Compute/Lambda')).toBeNull();
  });
});
