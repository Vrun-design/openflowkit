import { describe, expect, it } from 'vitest';
import { enrichNodesWithIcons } from './nodeEnricher';
import type { FlowNode } from './types';

function makeNode(id: string, label: string, overrides?: Partial<FlowNode>): FlowNode {
  return {
    id,
    type: 'process',
    position: { x: 0, y: 0 },
    data: { label, color: 'slate' },
    ...overrides,
  } as FlowNode;
}

describe('enrichNodesWithIcons', () => {
  it('assigns color based on semantic classification', async () => {
    const nodes = [
      makeNode('start', 'Start'),
      makeNode('end', 'End'),
      makeNode('db', 'PostgreSQL'),
      makeNode('check', 'Is Valid?', {
        data: { label: 'Is Valid?', color: 'slate', shape: 'diamond' },
      }),
    ];

    const enriched = await enrichNodesWithIcons(nodes);

    expect(enriched[0].data.color).toBe('emerald');
    expect(enriched[1].data.color).toBe('red');
    expect(enriched[2].data.color).toBe('violet');
    expect(enriched[3].data.color).toBe('amber');
  });

  it('assigns icons for known technologies', async () => {
    const nodes = [
      makeNode('db', 'PostgreSQL'),
      makeNode('cache', 'Redis Cache'),
      makeNode('api', 'Express API'),
    ];

    const enriched = await enrichNodesWithIcons(nodes);

    // All three should get provider icons (any catalog)
    expect(enriched[0].data.archIconPackId).toBeTruthy();
    expect(enriched[0].data.archIconShapeId).toContain('postgresql');
    expect(enriched[0].data.assetProvider).toBe('developer');

    expect(enriched[1].data.archIconPackId).toBeTruthy();
    expect(enriched[1].data.archIconShapeId).toContain('redis');
    expect(enriched[1].data.assetProvider).toBe('developer');

    expect(enriched[2].data.archIconPackId).toBeTruthy();
    expect(enriched[2].data.assetProvider).toBeTruthy();
  });

  it('skips section and group nodes', async () => {
    const nodes = [
      { ...makeNode('grp', 'Group'), type: 'section' as const },
      makeNode('x', 'Something'),
    ];

    const enriched = await enrichNodesWithIcons(nodes);

    expect(enriched[0].data.color).toBe('slate');
    expect(enriched[0].data.icon).toBeUndefined();
  });

  it('preserves existing non-slate colors', async () => {
    const nodes = [
      {
        id: 'a',
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: 'Start', color: 'pink' },
      },
    ];

    const enriched = await enrichNodesWithIcons(nodes as FlowNode[]);

    expect(enriched[0].data.color).toBe('pink');
  });

  it('preserves existing icons', async () => {
    const nodes = [
      {
        id: 'a',
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: 'PostgreSQL', color: 'violet', icon: 'my-icon' },
      },
    ];

    const enriched = await enrichNodesWithIcons(nodes as FlowNode[]);

    expect(enriched[0].data.icon).toBe('my-icon');
  });

  it('handles empty node array', async () => {
    const enriched = await enrichNodesWithIcons([]);
    expect(enriched).toEqual([]);
  });

  it('preserves nodes with no changes', async () => {
    const nodes = [
      {
        id: 'a',
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: 'Something Random', color: 'blue', icon: 'Box' },
      },
    ];

    const enriched = await enrichNodesWithIcons(nodes as FlowNode[]);
    expect(enriched[0]).toEqual(nodes[0]);
  });

  it('classifies decision shape correctly', async () => {
    const nodes = [
      makeNode('check', 'Validate?', {
        data: { label: 'Validate?', color: 'slate', shape: 'diamond' },
      }),
    ];

    const enriched = await enrichNodesWithIcons(nodes);
    expect(enriched[0].data.color).toBe('amber');
  });

  it('classifies cylinder shape as database', async () => {
    const nodes = [
      makeNode('pg', 'PostgreSQL DB', {
        data: { label: 'PostgreSQL DB', color: 'slate', shape: 'cylinder' },
      }),
    ];

    const enriched = await enrichNodesWithIcons(nodes);
    expect(enriched[0].data.color).toBe('violet');
    if (!enriched[0].data.archIconPackId) {
      expect(enriched[0].data.icon).toBe('database');
    }
  });

  it('uses icon attribute for explicit catalog search', async () => {
    const nodes = [
      makeNode('cache', 'My Cache', {
        data: { label: 'My Cache', color: 'slate', icon: 'redis' },
      }),
    ];

    const enriched = await enrichNodesWithIcons(nodes);
    expect(enriched[0].data.archIconPackId).toBeTruthy();
    expect(enriched[0].data.archIconShapeId).toContain('redis');
    expect(enriched[0].data.assetProvider).toBe('developer');
  });

  it('uses provider filter when set', async () => {
    const nodes = [
      makeNode('db', 'Database', {
        data: { label: 'Database', color: 'slate', provider: 'aws' },
      }),
    ];

    const enriched = await enrichNodesWithIcons(nodes);
    if (enriched[0].data.archIconPackId) {
      expect(enriched[0].data.archIconPackId).toBe('aws-official-starter-v1');
      expect(enriched[0].data.assetProvider).toBe('aws');
    }
  });

  it('disables aggressive label-based icon enrichment during mermaid import', async () => {
    const nodes = [makeNode('payment', 'Payment Processing Flow')];

    const enriched = await enrichNodesWithIcons(nodes, {
      diagramType: 'flowchart',
      mode: 'mermaid-import',
    });

    expect(enriched[0].data.archIconPackId).toBeUndefined();
  });

  it('keeps technology icon enrichment enabled for flowchart imports', async () => {
    const nodes = [
      makeNode('db', 'PostgreSQL'),
      makeNode('cache', 'Redis Cache'),
      makeNode('queue', 'Kafka'),
      makeNode('proxy', 'Nginx'),
      makeNode('app', 'React App'),
      makeNode('bucket', 'Amazon S3'),
      makeNode('fn', 'AWS Lambda'),
    ];

    const enriched = await enrichNodesWithIcons(nodes, {
      diagramType: 'flowchart',
      mode: 'mermaid-import',
    });

    expect(enriched[0].data.archIconShapeId).toContain('postgresql');
    expect(enriched[1].data.archIconShapeId).toContain('redis');
    expect(enriched[2].data.archIconPackId).toBeTruthy();
    expect(enriched[3].data.archIconPackId).toBeTruthy();
    expect(enriched[4].data.archIconPackId).toBeTruthy();
    expect(enriched[5].data.archIconPackId).toBeTruthy();
    expect(enriched[6].data.archIconPackId).toBeTruthy();
  });

  it('skips import-time icon enrichment for diagram families with specialized visuals', async () => {
    const nodes = [makeNode('idle', 'Idle')];

    const enriched = await enrichNodesWithIcons(nodes, {
      diagramType: 'stateDiagram',
      mode: 'mermaid-import',
    });

    expect(enriched[0].data.archIconPackId).toBeUndefined();
    expect(enriched[0].data.icon).toBeUndefined();
  });

  it('keeps ambiguous flowchart imports iconless', async () => {
    const nodes = [
      makeNode('payment', 'Payment Processing Flow'),
      makeNode('check', 'Check Conditions'),
      makeNode('frontend', 'Frontend'),
      makeNode('auth', 'Auth'),
      makeNode('service', 'Service'),
      makeNode('gateway', 'API Gateway'),
      makeNode('oauth', 'OAuth'),
      makeNode('jwt', 'JWT'),
      makeNode('sso', 'SSO'),
      makeNode('llm', 'LLM Router'),
    ];

    const enriched = await enrichNodesWithIcons(nodes, {
      diagramType: 'flowchart',
      mode: 'mermaid-import',
    });

    for (const node of enriched) {
      expect(node.data.archIconPackId).toBeUndefined();
      expect(node.data.assetProvider).toBeUndefined();
    }
  });
});
