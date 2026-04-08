import { describe, expect, it } from 'vitest';
import { parseMermaidByType } from '@/services/mermaid/parseMermaidByType';
import { enrichNodesWithIcons } from '@/lib/nodeEnricher';
import { toMermaid } from '@/services/export/mermaidBuilder';
import type { FlowNode, FlowEdge } from '@/lib/types';

describe('Mermaid Export Quality', () => {
  it('exports rounded shape as (label) not [label]', async () => {
    const input = `flowchart TD
    A("Rounded Node")

    A --> B["Rectangle Node"]`;

    const parsed = parseMermaidByType(input);
    const enriched = await enrichNodesWithIcons(parsed.nodes);
    const exported = toMermaid(enriched, parsed.edges);

    expect(exported).toContain('("Rounded Node")');
  });

  it('exports start/end as stadium ([label])', async () => {
    const input = `flowchart TD
    S(["Start"])
    E(("End"))

    S --> E`;

    const parsed = parseMermaidByType(input);
    const enriched = await enrichNodesWithIcons(parsed.nodes);
    const exported = toMermaid(enriched, parsed.edges);

    expect(exported).toContain('(["Start"])');
    expect(exported).toContain('(("End"))');
  });

  it('exports subgraph blocks', async () => {
    const input = `flowchart TD
    subgraph Frontend
      UI["React App"]
    end
    subgraph Backend
      API["Express API"]
      DB[("PostgreSQL")]
    end
    UI --> API
    API --> DB`;

    const parsed = parseMermaidByType(input);
    const enriched = await enrichNodesWithIcons(parsed.nodes);
    const exported = toMermaid(enriched, parsed.edges);

    expect(exported).toContain('subgraph Frontend');
    expect(exported).toContain('subgraph Backend');
    expect(exported).toContain('React App');
    expect(exported).toContain('Express API');
    expect(exported).toContain('end');
  });

  it('preserves direction when passed', async () => {
    const input = `flowchart LR
    A["Left"] --> B["Right"]`;

    const parsed = parseMermaidByType(input);
    const enriched = await enrichNodesWithIcons(parsed.nodes);
    const exported = toMermaid(enriched, parsed.edges, 'LR');

    expect(exported).toContain('flowchart LR');
  });

  it('defaults to TD when no direction specified', async () => {
    const input = `flowchart TD
    A["A"] --> B["B"]`;

    const parsed = parseMermaidByType(input);
    const enriched = await enrichNodesWithIcons(parsed.nodes);
    const exported = toMermaid(enriched, parsed.edges);

    expect(exported).toContain('flowchart TD');
  });

  it('exports all shape types correctly', async () => {
    const nodes = [
      {
        id: 'a',
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: 'Rounded', shape: 'rounded', color: 'slate' },
      },
      {
        id: 'b',
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: 'Rect', shape: undefined, color: 'slate' },
      },
      {
        id: 'c',
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: 'Diamond', shape: 'diamond', color: 'slate' },
      },
      {
        id: 'd',
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: 'Cylinder', shape: 'cylinder', color: 'slate' },
      },
      {
        id: 'e',
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: 'Circle', shape: 'circle', color: 'slate' },
      },
      {
        id: 'f',
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: 'Capsule', shape: 'capsule', color: 'slate' },
      },
      {
        id: 'g',
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: 'Hexagon', shape: 'hexagon', color: 'slate' },
      },
    ];

    const exported = toMermaid(nodes as unknown as FlowNode[], [] as unknown as FlowEdge[]);

    expect(exported).toContain('("Rounded")');
    expect(exported).toContain('["Rect"]');
    expect(exported).toContain('{"Diamond"}');
    expect(exported).toContain('[("Cylinder")]');
    expect(exported).toContain('(("Circle"))');
    expect(exported).toContain('(["Capsule"])');
    expect(exported).toContain('{{"Hexagon"}}');
  });

  it('roundtrips basic flowchart with shapes', async () => {
    const input = `flowchart TD
    S(["Start"])
    P["Process"]
    D{"Decision"}
    E(("End"))

    S --> P
    P --> D
    D -->|"Yes"| E`;

    const parsed = parseMermaidByType(input);
    const enriched = await enrichNodesWithIcons(parsed.nodes);
    const exported = toMermaid(enriched, parsed.edges);

    expect(exported).toContain('flowchart');
    expect(exported).toContain('Start');
    expect(exported).toContain('Process');
    expect(exported).toContain('Decision');
    expect(exported).toContain('End');
    expect(exported).toContain('Yes');
  });

  it('preserves parens and apostrophes in labels', async () => {
    const input = `flowchart TD
    A["Parse (tokens)"] --> B["O'Brien"]
    B --> C["Say \\"hello\\""]`;

    const parsed = parseMermaidByType(input);
    const enriched = await enrichNodesWithIcons(parsed.nodes);
    const exported = toMermaid(enriched, parsed.edges);

    expect(exported).toContain('Parse (tokens)');
    expect(exported).toContain("O'Brien");
  });

  it('handles empty diagram', () => {
    const exported = toMermaid([], []);
    expect(exported).toContain('flowchart');
  });

  it('exports imported flowchart styling semantics as style and linkStyle directives', async () => {
    const input = `flowchart TD
    A["API"] --> B[("DB")]
    classDef hot fill:#dff,stroke:#08c,color:#024
    class A hot
    linkStyle 0 stroke:#f66,stroke-width:3px`;

    const parsed = parseMermaidByType(input);
    const enriched = await enrichNodesWithIcons(parsed.nodes);
    const exported = toMermaid(enriched, parsed.edges);

    expect(exported).toContain('style A fill:#dff,stroke:#08c,color:#024');
    expect(exported).toContain('linkStyle 0 stroke:#f66,stroke-width:3px');
  });
});
