import ELK from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';
import { validateSceneDocumentV1 } from '../../opencanvas/domain/document/validation';
import { SCENE_DOCUMENT_FORMAT, SCENE_DOCUMENT_VERSION } from '../../opencanvas/domain/document/types';
import { paletteResolver } from '../../opencanvas/domain/nodes/nodePalette';
import { budgetEdges } from './edgeBudget';
import { buildMap } from './build';
import { fromElkLayout, toElkGraph, type ElkNode } from './elk';
import { FIXTURE } from './fixture';
import { repoLook } from './repoLook';
import { closedBoxSize, mapScene } from './scene';
import type { Depth } from './types';
import { aggregate, presets } from './view';

const model = buildMap(FIXTURE);
const look = repoLook(model, { swatch: paletteResolver('pastel') });
const JARGON = /\bC4\b|\bContainers?\b|\bContext\b|Software system|External system|\bService\b|Component/;

async function sceneAt(depth: Depth) {
  const shown = presets(model)[depth];
  const edges = budgetEdges(model, aggregate(model, shown).edges).filter((e) => !e.minor);
  const graph = toElkGraph(model, shown, edges, (n) => closedBoxSize(look, n), (t) => t.length * 6);
  const laid = fromElkLayout((await new ELK().layout(graph as never)) as unknown as ElkNode);
  return mapScene(model, shown, { rects: laid.rects, edges }, look);
}

describe('repoLook', () => {
  it.each(['overview', 'detailed', 'everything'] as const)('draws a valid scene at %s with plain words only', async (depth) => {
    const page = await sceneAt(depth);
    const result = validateSceneDocumentV1({
      format: SCENE_DOCUMENT_FORMAT, schemaVersion: SCENE_DOCUMENT_VERSION, id: 'd', name: 'd',
      createdAt: '2026-10-09T00:00:00.000Z', updatedAt: '2026-10-09T00:00:00.000Z', pages: [page], metadata: {}, extensions: {},
    });
    expect(result.success, JSON.stringify('issues' in result ? result.issues : [])).toBe(true);
    const text = page.nodes.flatMap((n) => [n.content.label, n.content.subLabel]).filter((t): t is string => typeof t === 'string');
    expect(text.filter((t) => JARGON.test(t))).toEqual([]);
  });

  it('tags boxes with their repo kind and size, and shows the path', async () => {
    const page = await sceneAt('everything');
    const sub = (id: string) => String(page.nodes.find((n) => n.id === id)!.content.subLabel);
    // An open box is a frame: its title bar carries the tag only; closed boxes also show the path.
    expect(sub('server/routes')).toBe(`[Folder · ${model.nodes['server/routes'].files} files]`);
    expect(sub('server/routes/r00.ts')).toMatch(/^\[File · \d+ lines\]\nserver\/routes\/r00\.ts$/);
    expect(sub('ext:stripe')).toMatch(/^\[Outside service\]/);
  });

  it('draws outside services as the gray external look, and more/group boxes', async () => {
    const page = await sceneAt('everything');
    expect(look.arch.elements.find((e) => e.id === 'ext:stripe')).toMatchObject({ kind: 'external' });
    expect(page.nodes.some((n) => n.id === 'server/routes#more')).toBe(true);
    expect(page.nodes.some((n) => n.id === 'root#outside')).toBe(true);
  });

  it('draws the repo scene at overview', async () => {
    const page = await sceneAt('overview');
    expect(page.nodes.map((n) => [n.id, n.kind, n.parentId, n.size, n.content.label, n.content.subLabel])).toMatchSnapshot();
  });
});

describe('repoLook sizing', () => {
  it('sizes a box for its tag, wider than the same box without tags', () => {
    const long = buildMap({ files: Array.from({ length: 6 }, (_, i) => ({ path: `d/f${i}.ts`, loc: 12345 })), imports: [] });
    const node = long.nodes.d;
    const withTag = repoLook(long, { swatch: paletteResolver('pastel') });
    const tags = new Map([[node.id, 'Folder · 120 files in this folder, all of them']]);
    const wide = closedBoxSize({ ...withTag, tags }, node).width;
    expect(wide).toBeGreaterThan(closedBoxSize({ ...withTag, tags: undefined }, node).width);
  });
});

describe('repoLook words', () => {
  const C4 = /Container|System|Software|Component|Context/i;
  const strings = (v: unknown): string[] => typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

  it('never says "0 files" and counts a group by its descendants', () => {
    const tags = [...look.tags!.values()];
    expect(tags.filter((t) => t.includes('0 files'))).toEqual([]);
    expect(look.tags!.get('root#outside')).toBe('Outside services');
    expect(look.tags!.get('root#files')).toMatch(/^Group · \d+ files?$/);
  });

  it('leaks no C4 word into any drawn field, even when the host infers icons', async () => {
    const withIcons = repoLook(model, { swatch: paletteResolver('pastel'), inferIcon: () => 'aws/lambda', resolveIcon: () => null });
    expect(withIcons.inferIcon).toBeUndefined();
    const shown = presets(model).everything;
    const edges = budgetEdges(model, aggregate(model, shown).edges).filter((e) => !e.minor);
    const graph = toElkGraph(model, shown, edges, (n) => closedBoxSize(withIcons, n), (t) => t.length * 6);
    const laid = fromElkLayout((await new ELK().layout(graph as never)) as unknown as ElkNode);
    const page = mapScene(model, shown, { rects: laid.rects, edges }, withIcons);
    for (const node of page.nodes) expect(strings(node.content).filter((t) => C4.test(t)), node.id).toEqual([]);
  });
});
