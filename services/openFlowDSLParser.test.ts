import { describe, it, expect } from 'vitest';
import { parseOpenFlowDSL } from './openFlowDSLParser';

describe('openFlowDSLParser', () => {
    it('should parse a basic flow with title and nodes', () => {
        const input = `
            flow: "My Simple Flow"
            [start] Begin
            [end] Finish
            Begin -> Finish
        `;
        const result = parseOpenFlowDSL(input);
        expect(result.title).toBe('My Simple Flow');
        expect(result.nodes).toHaveLength(2);
        expect(result.edges).toHaveLength(1);
        expect(result.nodes[0].data.label).toBe('Begin');
        expect(result.nodes[1].data.label).toBe('Finish');
        expect(result.nodes[0].type).toBe('start');
        expect(result.nodes[1].type).toBe('end');
    });

    it('should handle auto-registration of nodes from edges', () => {
        const input = `
            A -> B
        `;
        const result = parseOpenFlowDSL(input);
        expect(result.nodes).toHaveLength(2);
        expect(result.nodes.map(n => n.data.label)).toContain('A');
        expect(result.nodes.map(n => n.data.label)).toContain('B');
        expect(result.edges).toHaveLength(1);
    });

    it('should parse edges with labels', () => {
        const input = `
            A ->|link| B
        `;
        const result = parseOpenFlowDSL(input);
        expect(result.edges[0].label).toBe('link');
    });

    it('should handle direction', () => {
        const input = `
            direction: LR
            A -> B
        `;
        const result = parseOpenFlowDSL(input);
        expect(result.nodes[1].position.x).toBeGreaterThan(result.nodes[0].position.x);
    });

    it('should ignore comments and empty lines', () => {
        const input = `
            # This is a comment
            
            [start] Start
        `;
        const result = parseOpenFlowDSL(input);
        expect(result.nodes).toHaveLength(1);
        expect(result.nodes[0].data.label).toBe('Start');
    });

    it('should return error if no nodes are found', () => {
        const input = `flow: "Empty"`;
        const result = parseOpenFlowDSL(input);
        expect(result.error).toBeDefined();
    });
});
