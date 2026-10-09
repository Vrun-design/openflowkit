import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { resolveArchitectureNodePresentation } from './architectureNodePresentation';
import { createIconNode, withIcon } from './iconNode';

const lambda = { provider: 'aws', packId: 'aws-official-starter-v1', shapeId: 'compute-lambda', label: 'Lambda' };

describe('icon nodes', () => {
  it('creates an icon node the architecture presentation renders as a provider icon', () => {
    const page = createTestDocument().pages[0];
    const node = createIconNode(page, { id: 'n1', at: { x: 10, y: 20 }, icon: lambda });
    expect(node.content).toMatchObject({ label: 'Lambda', icon: 'aws/compute-lambda', assetPresentation: 'icon' });
    expect(resolveArchitectureNodePresentation(node)).toMatchObject({
      display: 'provider-icon', icon: { kind: 'provider', packId: lambda.packId, shapeId: lambda.shapeId },
    });
  });

  it('swaps the icon of any node and keeps its label', () => {
    const rect = createTestNode('r', { content: { label: 'API', shape: 'rectangle' } });
    const swapped = withIcon(rect, { ...lambda, shapeId: 'app-integration-api-gateway' });
    expect(swapped.kind).toBe('architecture');
    expect(swapped.content).toMatchObject({ label: 'API', archIconShapeId: 'app-integration-api-gateway' });
  });

  it('a card keeps being a card: only its icon changes, never into a bare icon tile (owner bug 2026-10-09)', () => {
    const card = createTestNode('customer', { kind: 'architecture', content: {
      label: 'Customer', subLabel: '[Person]\nPlaces and tracks orders', icon: 'tabler/user', archProvider: 'tabler',
      archProviderLabel: 'Person', archResourceType: 'React', archIconPackId: 'tabler', archIconShapeId: 'user', assetPresentation: 'card',
    } });
    const swapped = withIcon(card, lambda);
    expect(swapped.content).toMatchObject({
      label: 'Customer', assetPresentation: 'card', archProviderLabel: 'Person', archResourceType: 'React',
      icon: 'aws/compute-lambda', archProvider: 'aws', archIconPackId: lambda.packId, archIconShapeId: lambda.shapeId,
    });
    expect(resolveArchitectureNodePresentation(swapped)).toMatchObject({
      display: 'architecture-card', icon: { kind: 'provider', packId: lambda.packId, shapeId: lambda.shapeId },
    });
  });
});
