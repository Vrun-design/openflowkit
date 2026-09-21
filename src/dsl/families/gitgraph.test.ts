import { describe, expect, it } from 'vitest';
import { compile } from '../compile';
import { format } from '../serialize';

describe('gitgraph family', () => {
  it('lays commits out by branch lane and written column', async () => {
    const result = await compile('gitgraph\ncommit A\nbranch feature\ncommit B\ncheckout main\ncommit C');
    const dot = (id: string) => result.nodes.find((node) => node.id === id && node.kind === 'process')!;
    expect(dot('b').transform.translation.y - dot('a').transform.translation.y).toBe(96); // one lane down
    expect(dot('c').transform.translation.y).toBe(dot('a').transform.translation.y); // back on main
    expect(dot('a').transform.translation.x).toBeLessThan(dot('b').transform.translation.x);
    expect(dot('b').transform.translation.x).toBeLessThan(dot('c').transform.translation.x);
    expect(dot('a').size).toEqual({ width: 20, height: 20 });
    expect(dot('a').content).toMatchObject({ shape: 'circle' });
  });

  it('draws lane segments, a fork curve and a merge curve', async () => {
    const result = await compile('gitgraph\ncommit A\nbranch feature\ncommit B\ncheckout main\ncommit C\nmerge feature');
    const routeOf = (id: string) => result.connectors.find((connector) => connector.id === id);
    expect(routeOf('git:lane:a->b')?.route).toMatchObject({ kind: 'bezier', ownership: 'imported-fixed' });
    expect(routeOf('git:merge:b->merge-feature')?.route.kind).toBe('bezier');
    expect(routeOf('git:lane:a->c')?.route.kind).toBe('polyline');
  });

  it('carries tags and flags on the commit record', async () => {
    const result = await compile('gitgraph\ncommit V1 [tag: v1.0, highlight]\ncommit Broken [revert]');
    const v1 = result.nodes.find((node) => node.id === 'v1')!;
    const broken = result.nodes.find((node) => node.id === 'broken')!;
    expect(v1.metadata.dsl).toMatchObject({ gitTag: 'v1.0', gitType: 'highlight', gitOp: 'commit' });
    expect(broken.metadata.dsl).toMatchObject({ gitType: 'revert' });
    expect(result.nodes.some((node) => node.id === 'v1-tag' && node.kind === 'text')).toBe(true);
    expect(await format('gitgraph\ncommit V1 [tag: v1.0, highlight]')).toContain('commit V1 [tag: v1.0, highlight]');
  });

  it('cherry-picks by commit slug with a dashed connector', async () => {
    const result = await compile('gitgraph\ncommit Base\nbranch hotfix\ncommit "Hot fix"\ncheckout main\ncherry-pick "Hot fix"');
    const pick = result.nodes.find((node) => (node.metadata.dsl as { gitOp?: string }).gitOp === 'cherry-pick')!;
    expect(pick.metadata.dsl).toMatchObject({ gitOp: 'cherry-pick', gitPicked: 'hot-fix' });
    expect(result.connectors.find((connector) => connector.id.startsWith('git:pick:'))?.appearance).toMatchObject({ dashPattern: 'dashed' });
  });

  it('keeps main implicit and reports unknown branches and commits', async () => {
    const result = await compile('gitgraph\ncommit A\ncheckout ghost\nmerge ghost\ncherry-pick nowhere\nnot a git statement');
    expect(result.diagnostics.map((item) => item.code)).toEqual(['I002', 'W150', 'W150', 'W150', 'W101']);
    expect(result.nodes.some((node) => node.id === 'a')).toBe(true);
    expect(await format('gitgraph\ncommit A')).not.toContain('branch main');
  });

  it('collapses whitespace inside quoted labels', async () => {
    const result = await compile('gitgraph\ncommit "   spaced   out   "');
    expect(result.nodes.find((node) => node.kind === 'process')?.content.label).toBe('');
    expect(result.nodes.find((node) => node.kind === 'text')?.content.label).toBe('spaced out');
  });
});
