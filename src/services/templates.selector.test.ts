import { describe, expect, it } from 'vitest';
import { FLOW_TEMPLATES, getFlowTemplates } from './templates';

describe('template selector', () => {
    it('returns the curated registry-backed templates', () => {
        const templates = getFlowTemplates();
        const ids = templates.map((template) => template.id);

        expect(templates).toEqual(FLOW_TEMPLATES);
        expect(ids).toHaveLength(20);
        expect(ids).toContain('flow-release-train');
        expect(ids).toContain('aws-security-lake');
        expect(ids).toContain('azure-data-estate');
    });
});
