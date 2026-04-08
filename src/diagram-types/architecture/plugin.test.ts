import { describe, expect, it } from 'vitest';
import { ARCHITECTURE_PLUGIN } from './plugin';

describe('ARCHITECTURE_PLUGIN', () => {
  it('parses architecture-beta nodes and edges', () => {
    const input = `
      architecture-beta
      group cloud[Cloud]
      service api(server)[API] in cloud
      service db(database)[Database] in cloud
      api:R --> L:db : SQL
    `;

    const result = ARCHITECTURE_PLUGIN.parseMermaid(input);

    expect(result.error).toBeUndefined();
    expect(result.nodes.length).toBeGreaterThanOrEqual(3);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes.every((node) => node.type === 'architecture')).toBe(true);
    expect(result.edges[0].label).toBe('SQL');
    expect(result.edges[0].data?.archProtocol).toBe('SQL');
    expect(result.edges[0].data?.archPort).toBeUndefined();
    expect(result.edges[0].data?.archDirection).toBe('-->');
    expect(result.edges[0].data?.archSourceSide).toBe('R');
    expect(result.edges[0].data?.archTargetSide).toBe('L');
    expect(result.edges[0].sourceHandle).toBe('right');
    expect(result.edges[0].targetHandle).toBe('left');
  });

  it('supports title, dotted ids, and flexible edge label spacing', () => {
    const input = `
      architecture-beta
      title "Platform"
      group prod.vpc(cloud)[Prod VPC]
      service api.gateway(server)["API Gateway"] in prod.vpc
      service db.main(database)[Database] in prod.vpc
      api.gateway:R --> L:db.main:SQL
    `;

    const result = ARCHITECTURE_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes.some((node) => node.data.archTitle === 'Platform')).toBe(true);
    expect(result.nodes.some((node) => node.id === 'api.gateway')).toBe(true);
    expect(result.nodes.some((node) => node.data.label === 'API Gateway')).toBe(true);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].source).toBe('api.gateway');
    expect(result.edges[0].target).toBe('db.main');
    expect(result.edges[0].label).toBe('SQL');
    expect(result.edges[0].data?.archDirection).toBe('-->');
    expect(result.edges[0].data?.archSourceSide).toBe('R');
    expect(result.edges[0].data?.archTargetSide).toBe('L');
    expect(result.edges[0].sourceHandle).toBe('right');
    expect(result.edges[0].targetHandle).toBe('left');
  });

  it('extracts protocol and port metadata when label follows protocol:port format', () => {
    const input = `
      architecture-beta
      service web(server)[Web]
      service app(server)[App]
      web --> app : https:443
    `;

    const result = ARCHITECTURE_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].label).toBe('HTTPS:443');
    expect(result.edges[0].data?.archProtocol).toBe('HTTPS');
    expect(result.edges[0].data?.archPort).toBe('443');
  });

  it('parses official Mermaid architecture edge syntax without labels', () => {
    const input = `
      architecture-beta
      service api(server)[API]
      service db(database)[Database]
      api:R --> L:db
    `;

    const result = ARCHITECTURE_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].source).toBe('api');
    expect(result.edges[0].target).toBe('db');
    expect(result.edges[0].label).toBeUndefined();
    expect(result.edges[0].data?.archDirection).toBe('-->');
    expect(result.edges[0].data?.archSourceSide).toBe('R');
    expect(result.edges[0].data?.archTargetSide).toBe('L');
  });

  it('parses reverse and bidirectional direction tokens', () => {
    const input = `
      architecture-beta
      service api(server)[API]
      service db(database)[Database]
      service cache(server)[Cache]
      api:L <-- R:db : tcp:5432
      db <--> cache
    `;

    const result = ARCHITECTURE_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.edges).toHaveLength(2);
    expect(result.edges[0].data?.archDirection).toBe('<--');
    expect(result.edges[0].data?.archSourceSide).toBe('L');
    expect(result.edges[0].data?.archTargetSide).toBe('R');
    expect(result.edges[1].data?.archDirection).toBe('<-->');
  });

  it('returns header error when architecture header is missing', () => {
    const result = ARCHITECTURE_PLUGIN.parseMermaid('service api[API]');
    expect(result.error).toBe('Missing architecture header.');
  });

  it('returns diagnostics for unrecognized architecture lines', () => {
    const input = `
      architecture-beta
      service api(server)[API]
      nonsense unsupported syntax
      api --> api
    `;

    const result = ARCHITECTURE_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.diagnostics?.length).toBeGreaterThan(0);
    expect(result.diagnostics?.[0]).toContain('Unrecognized architecture line at');
  });

  it('returns line-numbered diagnostic for invalid edge syntax', () => {
    const input = `
      architecture-beta
      service api(server)[API]
      service db(database)[Database]
      api -> db : SQL
    `;

    const result = ARCHITECTURE_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.diagnostics?.some((diag) => diag.includes('Invalid architecture edge syntax at line'))).toBe(true);
  });

  it('reports duplicate node ids and keeps first definition', () => {
    const input = `
      architecture-beta
      service api(server)[API One]
      service api(server)[API Two]
      service db(database)[Database]
      api --> db
    `;

    const result = ARCHITECTURE_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes.filter((node) => node.id === 'api')).toHaveLength(1);
    expect(result.nodes.find((node) => node.id === 'api')?.data.label).toBe('API One');
    expect(result.diagnostics?.some((diag) => diag.includes('Duplicate architecture node id "api"'))).toBe(true);
  });

  it('reports implicit-node recovery when edges reference undefined nodes', () => {
    const input = `
      architecture-beta
      service api(server)[API]
      api --> cache
    `;

    const result = ARCHITECTURE_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes.some((node) => node.id === 'cache')).toBe(true);
    expect(result.diagnostics?.some((diag) => diag.includes('Recovered implicit service node "cache"'))).toBe(true);
  });
});
