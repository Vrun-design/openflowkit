import { describe, it, expect } from 'vitest';
import { parseDockerCompose } from './dockerComposeParser';

const SIMPLE_COMPOSE = `
version: "3.8"
services:
  web:
    image: nginx
    depends_on:
      - api
  api:
    image: node:18
`;

const COMPOSE_WITH_NETWORKS = `
version: "3.8"
services:
  frontend:
    image: nginx
    networks:
      - public
  backend:
    image: node:18
    networks:
      - public
      - private
networks:
  public:
  private:
`;

describe('parseDockerCompose', () => {
  it('parses two services with depends_on and creates an edge', () => {
    const result = parseDockerCompose(SIMPLE_COMPOSE);
    const webNode = result.nodes.find((n) => n.resourceName === 'web');
    const apiNode = result.nodes.find((n) => n.resourceName === 'api');
    expect(webNode).toBeDefined();
    expect(apiNode).toBeDefined();
    expect(webNode!.nodeType).toBe('system');
    expect(result.provider).toBe('docker-compose');

    const edge = result.edges.find((e) => e.from === webNode!.id && e.to === apiNode!.id);
    expect(edge).toBeDefined();
    expect(edge!.label).toBe('depends_on');
  });

  it('parses services with networks and links them to network section nodes', () => {
    const result = parseDockerCompose(COMPOSE_WITH_NETWORKS);
    const netNodes = result.nodes.filter((n) => n.nodeType === 'section');
    expect(netNodes.length).toBeGreaterThanOrEqual(1);

    const frontendNode = result.nodes.find((n) => n.resourceName === 'frontend');
    const publicNet = result.nodes.find((n) => n.resourceName === 'public');
    expect(frontendNode).toBeDefined();
    expect(publicNet).toBeDefined();

    const netEdge = result.edges.find((e) => e.from === frontendNode!.id && e.to === publicNet!.id);
    expect(netEdge).toBeDefined();
  });

  it('extracts port mappings and includes them in the label', () => {
    const compose = `
services:
  web:
    image: nginx
    ports:
      - "8080:80"
  api:
    image: node:18
    ports:
      - "3000:3000"
`;
    const result = parseDockerCompose(compose);
    const webNode = result.nodes.find((n) => n.resourceName === 'web');
    const apiNode = result.nodes.find((n) => n.resourceName === 'api');
    expect(webNode?.label).toContain('8080:80');
    expect(apiNode?.label).toContain('3000:3000');
  });
});
