import { describe, expect, it } from 'vitest';
import { createDefaultEdge } from '@/constants';
import { NodeType, type FlowNode } from '@/lib/types';
import { createTemplateRegistry } from './registry';
import type { TemplateManifest } from './types';

function createNode(id: string, label: string, x: number, y: number): FlowNode {
    return {
        id,
        type: NodeType.PROCESS,
        position: { x, y },
        data: { label, subLabel: '', color: 'slate' },
    };
}

function createTemplate(id: string): TemplateManifest {
    return {
        id,
        name: `Template ${id}`,
        description: 'Template description',
        category: 'flowchart',
        tags: ['starter'],
        audience: 'developers',
        useCase: 'Registry fixture template',
        launchPriority: 1,
        featured: false,
        difficulty: 'starter',
        outcome: 'Supports registry cloning and duplicate-id tests.',
        replacementHints: ['Primary label', 'Key owner', 'Main branch'],
        graph: {
            nodes: [createNode(`${id}-n1`, 'Node A', 0, 0), createNode(`${id}-n2`, 'Node B', 200, 0)],
            edges: [createDefaultEdge(`${id}-n1`, `${id}-n2`)],
        },
    };
}

describe('template registry', () => {
    it('registers templates and resolves by id', () => {
        const registry = createTemplateRegistry();

        registry.registerTemplate(createTemplate('flow-a'));

        expect(registry.getTemplate('flow-a')?.name).toBe('Template flow-a');
        expect(registry.listTemplates()).toHaveLength(1);
    });

    it('rejects duplicate template ids', () => {
        const registry = createTemplateRegistry([createTemplate('flow-a')]);

        expect(() => registry.registerTemplate(createTemplate('flow-a'))).toThrow(
            'Template already registered: flow-a',
        );
    });

    it('returns cloned templates to keep registry immutable from callers', () => {
        const registry = createTemplateRegistry([createTemplate('flow-a')]);
        const template = registry.getTemplate('flow-a');

        if (!template) {
            throw new Error('expected template');
        }

        template.name = 'Mutated';
        template.tags.push('mutated');
        template.graph.nodes[0].data.label = 'Mutated Node';

        const freshTemplate = registry.getTemplate('flow-a');
        expect(freshTemplate?.name).toBe('Template flow-a');
        expect(freshTemplate?.tags).toEqual(['starter']);
        expect(freshTemplate?.graph.nodes[0].data.label).toBe('Node A');
    });
});
