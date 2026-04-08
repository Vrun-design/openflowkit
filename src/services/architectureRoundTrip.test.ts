import { describe, expect, it } from 'vitest';
import { parseMermaidByType } from '@/services/mermaid/parseMermaidByType';
import { toMermaid } from './exportService';

describe('architecture round-trip', () => {
  it('keeps architecture family and core graph shape through import/export/import', () => {
    const source = `
      architecture-beta
      title "Platform"
      group prod.vpc(cloud)[Prod VPC]
      service api.gateway(server)["API Gateway"] in prod.vpc
      service db.main(database)[Database] in prod.vpc
      api.gateway:R --> L:db.main : https:443
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('architecture');
    expect(first.nodes.length).toBeGreaterThan(0);
    expect(first.edges.length).toBe(1);
    expect(first.nodes.some((node) => node.data.archTitle === 'Platform')).toBe(true);

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported.startsWith('architecture-beta')).toBe(true);
    expect(exported).toContain('title "Platform"');
    expect(exported).toContain('api.gateway:R --> L:db.main : HTTPS:443');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('architecture');
    expect(second.nodes).toHaveLength(first.nodes.length);
    expect(second.edges).toHaveLength(first.edges.length);
    expect(second.nodes.some((node) => node.data.archTitle === 'Platform')).toBe(true);
    expect(second.edges[0].data?.archDirection).toBe('-->');
    expect(second.edges[0].data?.archSourceSide).toBe('R');
    expect(second.edges[0].data?.archTargetSide).toBe('L');
  });

  it('normalizes messy-but-valid architecture edge syntax on export', () => {
    const source = `
      architecture-beta
      service web(server)[Web]
      service api(server)[API]
      T:web -- r:api : hTtp:8080
    `;

    const parsed = parseMermaidByType(source);
    expect(parsed.error).toBeUndefined();
    expect(parsed.diagramType).toBe('architecture');
    expect(parsed.edges).toHaveLength(1);

    const exported = toMermaid(parsed.nodes, parsed.edges);
    expect(exported).toContain('web:T --> R:api : HTTP:8080');
  });

  it('preserves richer architecture node kinds through import/export/import', () => {
    const source = `
      architecture-beta
      person user[User]
      container app(server)[App]
      database_container data(database)[Data Store]
      user:R --> L:app : https
      app:R --> L:data : tcp:5432
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('architecture');
    expect(first.nodes.find((node) => node.id === 'user')?.data.archResourceType).toBe('person');
    expect(first.nodes.find((node) => node.id === 'app')?.data.archResourceType).toBe('container');
    expect(first.nodes.find((node) => node.id === 'data')?.data.archResourceType).toBe('database_container');

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported).toContain('person user[User]');
    expect(exported).toContain('container app(server)[App]');
    expect(exported).toContain('database_container data(database)[Data Store]');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('architecture');
    expect(second.nodes.find((node) => node.id === 'user')?.data.archResourceType).toBe('person');
    expect(second.nodes.find((node) => node.id === 'app')?.data.archResourceType).toBe('container');
    expect(second.nodes.find((node) => node.id === 'data')?.data.archResourceType).toBe('database_container');
  });
});
