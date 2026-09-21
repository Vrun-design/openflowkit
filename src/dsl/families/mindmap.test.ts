import { describe, expect, it } from 'vitest';
import { compile } from '../compile';
import { format, serialize } from '../serialize';

describe('mindmap family', () => {
  it('builds a parent chain from indentation', async () => {
    const result = await compile('mindmap\ncentral: Product\n- Growth\n  - SEO\n    - Keywords\n- Retention');
    const byId = Object.fromEntries(result.nodes.map((node) => [node.id, node]));
    expect(byId.product?.content.mindmapDepth).toBe(0);
    expect(byId.growth?.content).toMatchObject({ mindmapDepth: 1, mindmapParentId: 'product' });
    expect(byId.seo?.content.mindmapParentId).toBe('growth');
    expect(byId.keywords?.content.mindmapDepth).toBe(3);
    const edges = result.connectors.map((connector) => `${connector.source.nodeId}->${connector.target.nodeId}`);
    expect(edges).toHaveLength(4);
    expect(edges).toEqual(expect.arrayContaining(['product->growth', 'growth->seo', 'seo->keywords', 'product->retention']));
  });

  it('splits depth-1 branches across both sides and centres parents', async () => {
    const result = await compile('mindmap\ncentral: Root\n- A\n  - A1\n- B\n- C\n- D');
    const side = (id: string) => result.nodes.find((node) => node.id === id)?.content.mindmapSide;
    expect(side('a')).toBe('right');
    expect(side('d')).toBe('left');
    const a = result.nodes.find((node) => node.id === 'a')!;
    const d = result.nodes.find((node) => node.id === 'd')!;
    expect(d.transform.translation.x).toBeLessThan(a.transform.translation.x);
    // A parent centres over its children.
    const child = result.nodes.find((node) => node.id === 'a1')!;
    expect(child.transform.translation.y).toBeGreaterThanOrEqual(a.transform.translation.y);
  });

  it('cascades a branch colour onto its descendants', async () => {
    const result = await compile('mindmap\ncentral: Root\n- Growth [green]\n  - SEO\n  - Referrals [blue]\n- Other');
    const nodes = Object.fromEntries(result.nodes.map((node) => [node.id, node]));
    expect(nodes.growth?.content.color).toBe('emerald');
    expect(nodes.seo?.content.color).toBe('emerald');
    expect(nodes.referrals?.content.color).toBe('blue');
    expect(nodes.other?.content.color).toBeUndefined();
    const text = serialize(result);
    expect(text).toContain('- Growth [green]');
    expect(text).toContain('- SEO');
    expect(text).toContain('- Referrals [blue]');
    expect(await format(text)).toBe(text);
  });

  it('maps shape words onto wrapper kinds', async () => {
    const result = await compile('mindmap\ncentral: Root\n- A [circle]\n- B [hexagon]\n- C [rect]');
    expect(result.nodes.find((node) => node.id === 'a')?.content.mindmapWrapper).toBe('double-circle');
    expect(result.nodes.find((node) => node.id === 'b')?.content.mindmapWrapper).toBe('hexagon');
    expect(result.nodes.find((node) => node.id === 'c')?.content.mindmapWrapper).toBe('square');
    expect(await format(serialize(result))).toBe(serialize(result));
  });

  it('accepts star bullets, tabs and an implicit root', async () => {
    const result = await compile('mindmap\nImplicit root\n* Star\n\tTabbed');
    const byId = Object.fromEntries(result.nodes.map((node) => [node.id, node]));
    expect(byId['implicit-root']?.content.mindmapDepth).toBe(0);
    expect(byId.star?.content.mindmapParentId).toBe('implicit-root');
    expect(byId.tabbed?.content.mindmapDepth).toBe(2);
  });

  it('collapses depth above six and drops edges and duplicate roots', async () => {
    const result = await compile('mindmap\ncentral: Root\n- 1\n  - 2\n    - 3\n      - 4\n        - 5\n          - 6\n            - 7');
    expect(result.diagnostics.map((item) => item.code)).toContain('W140');
    expect(Math.max(...result.nodes.map((node) => node.content.mindmapDepth as number))).toBe(6);
    const duplicate = await compile('mindmap\ncentral: One\ncentral: Two');
    expect(duplicate.diagnostics.map((item) => item.code)).toContain('W101');
    const edge = await compile('mindmap\ncentral: Root\nA -> B');
    expect(edge.diagnostics.map((item) => item.code)).toContain('W111');
  });
});
