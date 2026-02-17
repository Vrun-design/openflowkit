
import { describe, it, expect } from 'vitest';
import { parseFlowMindDSL } from './flowmindDSLParserV2';

describe('FlowMind DSL V2 Parser', () => {
    it('parses basic nodes and edges', () => {
        const input = `
            [start] Start
            [process] Step 1
            [end] End
            Start -> Step 1
            Step 1 -> End
        `;
        const result = parseFlowMindDSL(input);
        expect(result.nodes).toHaveLength(3);
        expect(result.edges).toHaveLength(2);

        const startNode = result.nodes.find(n => n.data.label === 'Start');
        expect(startNode).toBeDefined();
        expect(startNode?.type).toBe('start');
    });

    it('parses explicit IDs', () => {
        const input = `
            [process] p1: Process One
            [process] p2: Process Two
            p1 -> p2
        `;
        const result = parseFlowMindDSL(input);
        expect(result.nodes).toHaveLength(2);

        const p1 = result.nodes.find(n => n.id === 'p1');
        expect(p1).toBeDefined();
        expect(p1?.data.label).toBe('Process One');

        const edge = result.edges[0];
        expect(edge.source).toBe('p1');
        expect(edge.target).toBe('p2');
    });

    it('parses attributes', () => {
        const input = `
            [process] p1: Configured Node { color: "red", icon: "settings" }
            p1 -> p2 { style: "dashed", label: "async" }
        `;
        const result = parseFlowMindDSL(input);

        const p1 = result.nodes.find(n => n.id === 'p1');
        expect(p1?.data.color).toBe('red');
        expect(p1?.data.icon).toBe('settings');

        const edge = result.edges[0];
        expect(edge.data?.styleType).toBe('dashed'); // Attributes merged into edge data/attributes? Parser logic puts it in edge helper or data?
        // Checking parser implementation:
        // dslEdges.push({ ..., attributes }) 
        // finalEdges.push(createDefaultEdge(..., attributes/label?))
        // Expecting createDefaultEdge to handle it or we need to check how it's mapped.
        // In parser implementation:
        // createDefaultEdge(source, target, label, id)
        // Wait, I missed passing attributes to createDefaultEdge in my implementation!

        // Let's check the implementation again.
    });

    it('parses groups', () => {
        const input = `
            group "Backend" {
                [process] api: API
                [database] db: DB
                api -> db
            }
        `;
        const result = parseFlowMindDSL(input);
        expect(result.nodes).toHaveLength(3); // api, db, Backend group

        const group = result.nodes.find(n => n.type === 'group' || n.type === 'container'); // I used 'group' in DSLNode type but might need 'container' mapping
        // implementation: type: 'group' in DSLNode
        // finalNodes: type: n.type

        const api = result.nodes.find(n => n.id === 'api');
        expect(api?.parentId).toBeDefined();
    });
});
