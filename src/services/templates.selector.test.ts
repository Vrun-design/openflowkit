import { describe, expect, it } from 'vitest';
import { FLOW_TEMPLATES, getFlowTemplates } from './templates';

describe('template selector', () => {
  it('returns the curated registry-backed templates', () => {
    const templates = getFlowTemplates();
    const ids = templates.map((template) => template.id);

    expect(templates).toEqual(FLOW_TEMPLATES);
    expect(ids).toHaveLength(12);
    expect(ids).toContain('production-release-train');
    expect(ids).toContain('c4-system-context');
    expect(ids).toContain('edge-security-zero-trust-access');
    expect(ids).toContain('aws-event-driven-saas-platform');
    expect(ids).toContain('azure-ai-application-platform');
  });

  it('sorts featured templates ahead of non-featured templates and preserves editorial metadata', () => {
    const templates = getFlowTemplates();
    const firstNonFeaturedIndex = templates.findIndex((template) => !template.featured);

    expect(firstNonFeaturedIndex).toBeGreaterThan(0);
    expect(templates.slice(0, firstNonFeaturedIndex).every((template) => template.featured)).toBe(
      true
    );
    expect(templates[0]?.replacementHints.length).toBeGreaterThanOrEqual(3);
    expect(templates[0]?.outcome.length).toBeGreaterThan(10);
  });
});
