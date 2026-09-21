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
});
