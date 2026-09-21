import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { serialize } from './serialize';
import { paletteResolver, paletteSwatch } from '../opencanvas/domain/nodes/nodePalette';
import type { SceneNode } from '../opencanvas/domain/document/types';

const source = (header: string) => `${header}\nflowchart\n  Client [blue] -> "API Gateway" [emerald]\n  "API Gateway" -> DB [cylinder, red]`;

function nodeNamed(nodes: readonly SceneNode[], id: string): SceneNode {
  const node = nodes.find((candidate) => candidate.id === id);
  if (!node) throw new RangeError(`missing ${id}`);
  return node;
}

describe('appearance directive', () => {
  it('compiles with the default palette when none is authored', async () => {
    const result = await compile(source('%% ofk 1'));
    expect(nodeNamed(result.nodes, 'client').appearance.fill).toBe(paletteSwatch('blue', 'pastel').fill);
    expect(result.meta.appearance).toBeUndefined();
  });

  it('applies an authored palette to every swatch and records it on the frame and nodes', async () => {
    const result = await compile(source('flowchart\nappearance: paper'));
    const paper = paletteResolver('paper');
    expect(nodeNamed(result.nodes, 'client').appearance.fill).toBe(paper('blue', 'pastel').fill);
    expect(nodeNamed(result.nodes, 'api-gateway').appearance.fill).toBe(paper('emerald', 'pastel').fill);
    expect(nodeNamed(result.nodes, 'db').appearance.stroke).toBe(paper('red', 'pastel').stroke);
    expect(result.meta.appearance).toEqual({ palette: 'paper' });
    expect(result.frame.metadata.dsl).toMatchObject({ appearance: { palette: 'paper' } });
    for (const node of result.nodes) expect(node.metadata.dsl).toMatchObject({ appearance: { palette: 'paper' } });
  });

  it('warns and falls back for an unknown palette', async () => {
    const result = await compile(source('flowchart\nappearance: neon'));
    expect(result.diagnostics.some(({ code }) => code === 'W102')).toBe(true);
    expect(result.meta.appearance).toBeUndefined();
    expect(nodeNamed(result.nodes, 'client').appearance.fill).toBe(paletteSwatch('blue', 'pastel').fill);
  });

  it('writes the directive back and stays stable under a second round-trip', async () => {
    for (const palette of ['paper', 'builder', 'mono'] as const) {
      const once = serialize(await compile(source(`%% ofk 1\nflowchart\nappearance: ${palette}`)));
      expect(once).toContain(`appearance: ${palette}`);
      expect(serialize(await compile(once))).toBe(once);
    }
  });

  it('keeps authored colour words as words under a non-default palette', async () => {
    const text = serialize(await compile('%% ofk 1\nflowchart\nappearance: mono\n\nA [emerald] -> B [bold, violet]'));
    // `green` and `blue` are the canonical words for the emerald / violet keys.
    expect(text).toContain('A [green]');
    expect(text).toContain('B [violet, bold]');
    expect(text).not.toMatch(/#[0-9a-f]{6}/);
  });

  it('lets the authored directive win over a compile option', async () => {
    const result = await compile(source('flowchart\nappearance: mono'), { appearance: { palette: 'paper' } });
    expect(result.meta.appearance).toEqual({ palette: 'mono' });
  });
});
