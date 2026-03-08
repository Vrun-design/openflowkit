import { describe, expect, it } from 'vitest';
import { MINDMAP_PLUGIN } from './plugin';

describe('MINDMAP_PLUGIN', () => {
  it('parses a simple indentation-based mindmap tree', () => {
    const input = `
      mindmap
        root((Roadmap))
          Product
            Canvas
            Mermaid
          GTM
            Pricing
    `;

    const result = MINDMAP_PLUGIN.parseMermaid(input);

    expect(result.error).toBeUndefined();
    expect(result.nodes).toHaveLength(6);
    expect(result.edges).toHaveLength(5);
    expect(result.nodes[0].data.label).toBe('Roadmap');
    expect(result.nodes[0].type).toBe('mindmap');
    expect(result.nodes.some((node) => node.data.label === 'Mermaid')).toBe(true);
    const productNode = result.nodes.find((node) => node.data.label === 'Product');
    const canvasNode = result.nodes.find((node) => node.data.label === 'Canvas');
    expect(productNode?.data.mindmapParentId).toBe(result.nodes[0].id);
    expect(canvasNode?.data.mindmapParentId).toBe(productNode?.id);
  });

  it('balances parent y-position between children', () => {
    const input = `
      mindmap
        Root
          Left
          Right
    `;

    const result = MINDMAP_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();

    const root = result.nodes.find((node) => node.data.label === 'Root');
    const left = result.nodes.find((node) => node.data.label === 'Left');
    const right = result.nodes.find((node) => node.data.label === 'Right');

    expect(root).toBeDefined();
    expect(left).toBeDefined();
    expect(right).toBeDefined();
    expect(root?.position.x).toBe(0);
    expect(left?.position.x).toBe(260);
    expect(right?.position.x).toBe(260);

    const mid = ((left?.position.y ?? 0) + (right?.position.y ?? 0)) / 2;
    expect(root?.position.y).toBe(mid);
  });

  it('ignores mindmap directives and keeps content nodes', () => {
    const input = `
      mindmap
        Root
          Child A::icon(fa fa-book)
          ::class childStyle
          Child B
    `;

    const result = MINDMAP_PLUGIN.parseMermaid(input);

    expect(result.error).toBeUndefined();
    expect(result.nodes.map((node) => node.data.label)).toEqual(['Root', 'Child A', 'Child B']);
    expect(result.edges).toHaveLength(2);
  });

  it('returns header error when mindmap header is missing', () => {
    const result = MINDMAP_PLUGIN.parseMermaid('Root\n  Child');

    expect(result.error).toBe('Missing mindmap header.');
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('emits diagnostics for indentation jumps and odd indentation widths', () => {
    const input = `
      mindmap
        Root
             DeepChild
           OddIndent
    `;

    const result = MINDMAP_PLUGIN.parseMermaid(input);

    expect(result.error).toBeUndefined();
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.diagnostics?.some((message) => message.includes('Mindmap indentation jump at line'))).toBe(true);
    expect(result.diagnostics?.some((message) => message.includes('Odd indentation width at line'))).toBe(true);
  });

  it('emits diagnostics for malformed wrapped labels', () => {
    const input = `
      mindmap
        Root
          bad((Unclosed
          Child
    `;

    const result = MINDMAP_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.diagnostics?.some((message) => message.includes('Malformed mindmap wrapper syntax at line'))).toBe(true);
  });
});
