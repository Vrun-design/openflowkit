import { describe, expect, it } from 'vitest';
import { parseMermaidByType } from '@/services/mermaid/parseMermaidByType';
import { enrichNodesWithIcons } from '@/lib/nodeEnricher';

describe('Mermaid → Enrichment Pipeline (E2E)', () => {
  it('flowchart: assigns colors and icons to all node types', async () => {
    const mermaid = `
      flowchart TD
        S([Start]) --> login[Login Form]
        login --> valid{Credentials Valid?}
        valid -->|Yes| db[(PostgreSQL)]
        valid -->|No| fail((Access Denied))
        db --> redis[Redis Cache]
        redis --> done((Dashboard))
    `;

    const parsed = parseMermaidByType(mermaid);
    expect(parsed.error).toBeUndefined();
    expect(parsed.nodes.length).toBeGreaterThan(0);

    const enriched = await enrichNodesWithIcons(parsed.nodes);

    const startNode = enriched.find((n) => n.id === 'S');
    expect(startNode?.data.color).toBe('emerald');
    expect(startNode?.data.icon).toBe('play');

    const endNode = enriched.find((n) => n.id === 'fail');
    expect(endNode?.data.color).toBe('red');
    expect(endNode?.data.icon).toBe('check-circle');

    const decisionNode = enriched.find((n) => n.id === 'valid');
    expect(decisionNode?.data.color).toBe('amber');
    expect(decisionNode?.data.icon).toBe('help-circle');

    const dbNode = enriched.find((n) => n.id === 'db');
    expect(dbNode?.data.color).toBe('violet');
    expect(dbNode?.data.archIconPackId).toBeTruthy();
    expect(dbNode?.data.assetProvider).toBeTruthy();

    const redisNode = enriched.find((n) => n.id === 'redis');
    expect(redisNode?.data.color).toBe('red');
    expect(redisNode?.data.archIconPackId).toBeTruthy();
    expect(redisNode?.data.assetProvider).toBeTruthy();
  });

  it('flowchart with subgraphs: creates section nodes with proper hierarchy', async () => {
    const mermaid = `
      flowchart TD
        subgraph Backend
          API[Express API]
          DB[(PostgreSQL)]
        end
        subgraph Frontend
          UI[React App]
        end
        UI --> API
        API --> DB
    `;

    const parsed = parseMermaidByType(mermaid);
    expect(parsed.error).toBeUndefined();

    const enriched = await enrichNodesWithIcons(parsed.nodes);

    const sectionNodes = enriched.filter((n) => n.type === 'section');
    expect(sectionNodes).toHaveLength(2);

    const backendSection = sectionNodes.find((n) => n.data.label === 'Backend');
    expect(backendSection).toBeDefined();

    const apiNode = enriched.find((n) => n.id === 'API');
    expect(apiNode?.parentId).toBe(backendSection?.id);
    expect(apiNode?.data.color).toBe('blue');

    const dbNode = enriched.find((n) => n.id === 'DB');
    expect(dbNode?.parentId).toBe(backendSection?.id);
    expect(dbNode?.data.color).toBe('violet');
  });

  it('sequence diagram: parses participants and messages', async () => {
    const mermaid = `
      sequenceDiagram
        participant Client
        participant Server
        participant Database
        Client->>Server: HTTP Request
        Server->>Database: SQL Query
        Database-->>Server: Results
        Server-->>Client: JSON Response
    `;

    const parsed = parseMermaidByType(mermaid);
    expect(parsed.error).toBeUndefined();
    expect(parsed.diagramType).toBe('sequence');
    expect(parsed.nodes.length).toBeGreaterThanOrEqual(3);
    expect(parsed.edges.length).toBeGreaterThanOrEqual(4);
  });

  it('sequence diagram: handles fragments (alt/loop) and activations', async () => {
    const mermaid = `
      sequenceDiagram
        participant A
        participant B
        A->>B: Request
        activate B
        alt success
          B-->>A: 200 OK
        else failure
          B-->>A: 500 Error
        end
        loop every minute
          A->>B: Heartbeat
        end
        deactivate B
    `;

    const parsed = parseMermaidByType(mermaid);
    expect(parsed.error).toBeUndefined();
    expect(parsed.diagramType).toBe('sequence');
    expect(parsed.nodes.length).toBeGreaterThanOrEqual(2);
  });

  it('sequence diagram: handles notes over participants', async () => {
    const mermaid = `
      sequenceDiagram
        participant A
        participant B
        Note over A,B: This is a note
        A->>B: Message
    `;

    const parsed = parseMermaidByType(mermaid);
    expect(parsed.error).toBeUndefined();
    expect(parsed.nodes.length).toBeGreaterThanOrEqual(2);
  });

  it('architecture diagram: preserves archIconPackId when set by AI', async () => {
    // Simulate AI-generated nodes with provider icons already set
    const aiGeneratedNodes = [
      {
        id: 'api_gw',
        type: 'architecture' as const,
        position: { x: 0, y: 0 },
        data: {
          label: 'API Gateway',
          subLabel: '',
          color: 'violet',
          archIconPackId: 'aws-official-starter-v1',
          archIconShapeId: 'api-gateway',
          assetPresentation: 'icon' as const,
        },
      },
    ];

    const enriched = await enrichNodesWithIcons(aiGeneratedNodes);

    // Enricher should preserve existing archIconPackId
    expect(enriched[0].data.archIconPackId).toBe('aws-official-starter-v1');
    expect(enriched[0].data.archIconShapeId).toBe('api-gateway');
    expect(enriched[0].data.assetProvider).toBe('aws');
    expect(enriched[0].data.color).toBe('violet');
  });

  it('does not modify section nodes', async () => {
    const mermaid = `
      flowchart TD
        subgraph Group A
          A[Node A]
        end
    `;

    const parsed = parseMermaidByType(mermaid);
    const enriched = await enrichNodesWithIcons(parsed.nodes);

    const sectionNode = enriched.find((n) => n.type === 'section');
    expect(sectionNode?.data.icon).toBeUndefined();
    expect(sectionNode?.data.archIconPackId).toBeUndefined();
  });

  it('edge labels are preserved through parse+enrich', async () => {
    const mermaid = `
      flowchart TD
        A[Start] -->|Yes| B[Process]
        A -->|No| C[End]
    `;

    const parsed = parseMermaidByType(mermaid);
    expect(parsed.edges).toHaveLength(2);
    expect(parsed.edges[0].label).toBe('Yes');
    expect(parsed.edges[1].label).toBe('No');
  });
});
