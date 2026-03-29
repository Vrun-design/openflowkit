import { describe, expect, it } from 'vitest';
import { createStarterTemplateRegistry, STARTER_TEMPLATE_MANIFESTS } from './starterTemplates';

describe('starter template manifests', () => {
  it('includes the curated launch starter catalog', () => {
    const ids = STARTER_TEMPLATE_MANIFESTS.map((template) => template.id);

    expect(ids).toHaveLength(12);
    expect(ids).toContain('incident-response-command-flow');
    expect(ids).toContain('production-release-train');
    expect(ids).toContain('c4-system-context');
    expect(ids).toContain('edge-security-zero-trust-access');
    expect(ids).toContain('aws-event-driven-saas-platform');
    expect(ids).toContain('azure-ai-application-platform');
    expect(ids).toContain('cncf-gitops-delivery-platform');
    expect(ids).toContain('backend-api-request-handoff');
    expect(ids).toContain('product-discovery-workshop-map');
  });

  it('has deterministic graph integrity for every starter template', () => {
    STARTER_TEMPLATE_MANIFESTS.forEach((template) => {
      const nodeIds = new Set(template.graph.nodes.map((node) => node.id));
      const edgeIds = new Set(template.graph.edges.map((edge) => edge.id));

      expect(nodeIds.size).toBe(template.graph.nodes.length);
      expect(edgeIds.size).toBe(template.graph.edges.length);

      template.graph.edges.forEach((edge) => {
        expect(nodeIds.has(edge.source)).toBe(true);
        expect(nodeIds.has(edge.target)).toBe(true);
      });
    });
  });

  it('requires editorial metadata for every shipped template', () => {
    STARTER_TEMPLATE_MANIFESTS.forEach((template) => {
      expect(template.useCase.length).toBeGreaterThan(10);
      expect(template.outcome.length).toBeGreaterThan(10);
      expect(template.replacementHints.length).toBeGreaterThanOrEqual(3);
      expect(template.launchPriority).toBeGreaterThan(0);
      expect(typeof template.featured).toBe('boolean');
      expect(['starter', 'intermediate', 'advanced']).toContain(template.difficulty);
    });
  });

  it('is consumable by template registry scaffold', () => {
    const registry = createStarterTemplateRegistry();

    expect(registry.listTemplates()).toHaveLength(12);
    expect(registry.getTemplate('incident-response-command-flow')?.graph.nodes).toHaveLength(11);
    expect(registry.getTemplate('aws-event-driven-saas-platform')?.graph.nodes).toHaveLength(9);
    expect(registry.getTemplate('c4-system-context')?.graph.nodes).toHaveLength(7);
    expect(registry.getTemplate('product-discovery-workshop-map')?.graph.nodes).toHaveLength(13);
  });
});
