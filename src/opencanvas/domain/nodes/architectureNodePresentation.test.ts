import { describe, expect, it } from 'vitest';
import type { JsonObject } from '../document/json';
import type { SceneNode } from '../document/types';
import { createPixiSpikePage } from '../../infrastructure/pixi/spikeFixture';
import { resolveArchitectureNodePresentation } from './architectureNodePresentation';

function node(kind: string, content: JsonObject): SceneNode {
  return { ...createPixiSpikePage(1).nodes[0], kind, content };
}

describe('architecture node presentation', () => {
  it('resolves a provider-backed architecture card and unique metadata', () => {
    expect(
      resolveArchitectureNodePresentation(
        node('architecture', {
          label: 'Orders API',
          archProvider: 'aws',
          archResourceType: 'service',
          archEnvironment: 'prod',
          archZone: 'prod',
          archTrustDomain: 'payments',
          archIconPackId: 'aws-official-starter-v1',
          archIconShapeId: 'compute-lambda',
        })
      )
    ).toMatchObject({
      kind: 'architecture',
      display: 'architecture-card',
      providerLabel: 'AWS',
      metadata: ['prod', 'payments'],
      icon: {
        kind: 'provider',
        packId: 'aws-official-starter-v1',
        shapeId: 'compute-lambda',
      },
    });
  });

  it('resolves icon-first provider assets independently of canonical node kind', () => {
    expect(
      resolveArchitectureNodePresentation(
        node('custom', {
          label: 'Kubernetes',
          assetPresentation: 'icon',
          assetProvider: 'cncf',
          archIconPackId: 'cncf-artwork-icons-v1',
          archIconShapeId: 'projects-kubernetes',
        })
      )
    ).toMatchObject({ kind: 'provider-icon', display: 'provider-icon', provider: 'cncf' });
  });

  it('prefers a safe custom-provider URL and preserves unresolved asset IDs', () => {
    expect(
      resolveArchitectureNodePresentation(
        node('architecture', { archProvider: 'custom', customIconUrl: 'data:image/svg+xml,ok' })
      )
    ).toMatchObject({ icon: { kind: 'url', url: 'data:image/svg+xml,ok' } });
    expect(
      resolveArchitectureNodePresentation(
        node('custom', { assetPresentation: 'icon', iconAssetId: 'sha256:abc' })
      )
    ).toMatchObject({ icon: { kind: 'asset', assetId: 'sha256:abc' } });
    expect(
      resolveArchitectureNodePresentation(
        node('custom', { assetPresentation: 'icon', customIconUrl: 'javascript:alert(1)' })
      )
    ).toMatchObject({ icon: { kind: 'builtin' } });
  });

  it('rejects unrelated structured families', () => {
    expect(resolveArchitectureNodePresentation(node('process', {}))).toBeNull();
  });
});
