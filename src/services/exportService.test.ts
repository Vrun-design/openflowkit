import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { MarkerType } from '@/lib/reactflowCompat';
import { toMermaid } from './exportService';

describe('toMermaid', () => {
  it('exports architecture-only diagrams as architecture-beta', () => {
    const nodes: FlowNode[] = [
      {
        id: 'cloud-main',
        type: 'architecture',
        position: { x: 0, y: 0 },
        data: { label: 'Cloud', archResourceType: 'group' },
      },
      {
        id: 'api',
        type: 'architecture',
        position: { x: 300, y: 0 },
        data: { label: 'API', archResourceType: 'service', archProvider: 'aws', archBoundaryId: 'cloud-main' },
      },
      {
        id: 'db',
        type: 'architecture',
        position: { x: 600, y: 0 },
        data: { label: 'Database', archResourceType: 'service', archBoundaryId: 'cloud-main' },
      },
    ];
    const edges: FlowEdge[] = [
      {
        id: 'e1',
        source: 'api',
        target: 'db',
        data: { archProtocol: 'HTTPS', archPort: '443', archDirection: '<-->', archSourceSide: 'R', archTargetSide: 'L' },
      },
    ];

    const output = toMermaid(nodes, edges);
    expect(output).toContain('architecture-beta');
    expect(output).toContain('group cloud_main[Cloud]');
    expect(output).toContain('service api(aws)[API] in cloud_main');
    expect(output).toContain('api:R <--> L:db : HTTPS:443');
  });

  it('keeps flowchart export path for mixed or non-architecture nodes', () => {
    const nodes: FlowNode[] = [
      { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'b', type: 'architecture', position: { x: 200, y: 0 }, data: { label: 'B', archResourceType: 'service' } },
    ];
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }];

    const output = toMermaid(nodes, edges);
    expect(output.startsWith('flowchart TD')).toBe(true);
  });

  it('derives architecture side qualifiers from handles when semantic side metadata is absent', () => {
    const nodes: FlowNode[] = [
      { id: 'api', type: 'architecture', position: { x: 0, y: 0 }, data: { label: 'API', archResourceType: 'service' } },
      { id: 'db', type: 'architecture', position: { x: 200, y: 0 }, data: { label: 'DB', archResourceType: 'service' } },
    ];
    const edges: FlowEdge[] = [
      {
        id: 'e1',
        source: 'api',
        target: 'db',
        sourceHandle: 'top',
        targetHandle: 'bottom',
        data: { archProtocol: 'TCP', archDirection: '-->' },
      },
    ];

    const output = toMermaid(nodes, edges);
    expect(output).toContain('api:T --> B:db : TCP');
  });

  it('normalizes architecture direction and side casing during export', () => {
    const nodes: FlowNode[] = [
      { id: 'api', type: 'architecture', position: { x: 0, y: 0 }, data: { label: 'API', archResourceType: 'service' } },
      { id: 'db', type: 'architecture', position: { x: 200, y: 0 }, data: { label: 'DB', archResourceType: 'service' } },
    ];
    const edges: FlowEdge[] = [
      {
        id: 'e1',
        source: 'api',
        target: 'db',
        data: {
          archDirection: '<->' as unknown as '-->' | '<--' | '<-->',
          archSourceSide: 'l' as unknown as 'L' | 'R' | 'T' | 'B',
          archTargetSide: 'r' as unknown as 'L' | 'R' | 'T' | 'B',
          archProtocol: 'https',
          archPort: '443',
        },
      },
    ];

    const output = toMermaid(nodes, edges);
    expect(output).toContain('api:L --> R:db : HTTPS:443');
  });

  it('exports richer architecture node kinds without collapsing them to service', () => {
    const nodes: FlowNode[] = [
      { id: 'user', type: 'architecture', position: { x: 0, y: 0 }, data: { label: 'User', archResourceType: 'person' } },
      {
        id: 'app',
        type: 'architecture',
        position: { x: 200, y: 0 },
        data: { label: 'App', archResourceType: 'container', archProvider: 'server' },
      },
      {
        id: 'data',
        type: 'architecture',
        position: { x: 400, y: 0 },
        data: { label: 'Data Store', archResourceType: 'database_container', archProvider: 'database' },
      },
    ];

    const output = toMermaid(nodes, []);
    expect(output).toContain('person user[User]');
    expect(output).toContain('container app(server)[App]');
    expect(output).toContain('database_container data(database)[Data Store]');
  });

  it('exports dashed flowchart edges with dotted mermaid connector', () => {
    const nodes: FlowNode[] = [
      { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'b', type: 'process', position: { x: 200, y: 0 }, data: { label: 'B' } },
    ];
    const edges: FlowEdge[] = [
      {
        id: 'e1',
        source: 'a',
        target: 'b',
        style: { strokeDasharray: '5 3' },
      },
    ];

    const output = toMermaid(nodes, edges);
    expect(output).toContain('a -.-> b');
  });

  it('exports thick flowchart edges with thick mermaid connector', () => {
    const nodes: FlowNode[] = [
      { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'b', type: 'process', position: { x: 200, y: 0 }, data: { label: 'B' } },
    ];
    const edges: FlowEdge[] = [
      {
        id: 'e1',
        source: 'a',
        target: 'b',
        style: { strokeWidth: 4 },
      },
    ];

    const output = toMermaid(nodes, edges);
    expect(output).toContain('a ==> b');
  });

  it('exports markerStart-only flowchart edges as reverse-directed arrows', () => {
    const nodes: FlowNode[] = [
      { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'b', type: 'process', position: { x: 200, y: 0 }, data: { label: 'B' } },
    ];
    const edges: FlowEdge[] = [
      {
        id: 'e1',
        source: 'a',
        target: 'b',
        markerStart: { type: MarkerType.ArrowClosed },
      },
    ];

    const output = toMermaid(nodes, edges);
    expect(output).toContain('a <-- b');
  });

  it('exports flowchart node styles as Mermaid style directives', () => {
    const nodes: FlowNode[] = [
      {
        id: 'a',
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: 'API' },
        style: { backgroundColor: '#dff', borderColor: '#08c', color: '#024' },
      },
      {
        id: 'b',
        type: 'process',
        position: { x: 200, y: 0 },
        data: { label: 'DB' },
      },
    ];
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }];

    const output = toMermaid(nodes, edges);
    expect(output).toContain('style a fill:#dff,stroke:#08c,color:#024');
  });

  it('exports flowchart edge styles as Mermaid linkStyle directives', () => {
    const nodes: FlowNode[] = [
      { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'b', type: 'process', position: { x: 200, y: 0 }, data: { label: 'B' } },
    ];
    const edges: FlowEdge[] = [
      {
        id: 'e1',
        source: 'a',
        target: 'b',
        style: { stroke: '#f66', strokeWidth: 3 },
      },
    ];

    const output = toMermaid(nodes, edges);
    expect(output).toContain('linkStyle 0 stroke:#f66,stroke-width:3px');
  });

  it('exports stateDiagram-only graphs through stateDiagram-v2 path', () => {
    const nodes: FlowNode[] = [
      { id: 'state_start_0', type: 'start', position: { x: 0, y: 0 }, data: { label: '' } },
      { id: 'Idle', type: 'state', position: { x: 150, y: 0 }, data: { label: 'Idle' } },
      { id: 'Running', type: 'state', position: { x: 300, y: 0 }, data: { label: 'Running' } },
    ];
    const edges: FlowEdge[] = [
      { id: 'e1', source: 'state_start_0', target: 'Idle', label: '', type: 'smoothstep' },
      { id: 'e2', source: 'Idle', target: 'Running', label: 'start', type: 'smoothstep' },
      { id: 'e3', source: 'Running', target: 'state_start_0', label: '', type: 'smoothstep' },
    ];

    const output = toMermaid(nodes, edges);
    expect(output.startsWith('stateDiagram-v2')).toBe(true);
    expect(output).toContain('[*] --> Idle');
    expect(output).toContain('Idle --> Running : start');
    expect(output).toContain('Running --> [*]');
  });
});
