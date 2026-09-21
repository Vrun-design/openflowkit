import { describe, expect, it } from 'vitest';
import { compile, hashDslScene, slugifyDslId } from './compile';

describe('compile presentation mapping', () => {
  it('maps shapes onto renderer kinds and shapes', async () => {
    const result = await compile('flowchart\nStart [ellipse]\nCheck [diamond]\nStore [cylinder]\nDoc [doc]\nActor [person]\nComponent [component]');
    const byId = Object.fromEntries(result.nodes.map((node) => [node.id, node]));
    expect(byId.start).toMatchObject({ kind: 'process', content: { shape: 'ellipse' } });
    expect(byId.check).toMatchObject({ kind: 'process', content: { shape: 'diamond' } });
    expect(byId.store).toMatchObject({ kind: 'process', content: { shape: 'cylinder' } });
    expect(byId.doc).toMatchObject({ kind: 'process', content: { shape: 'document' } });
    expect(byId.actor).toMatchObject({ kind: 'process', content: { shape: 'actor' } });
    expect(byId.component).toMatchObject({ kind: 'process', content: { shape: 'rounded' } });
    expect(byId.component?.metadata.dsl).toMatchObject({ shape: 'component' });
  });

  it('sizes nodes from the measured label, not a fixed box', async () => {
    const result = await compile('flowchart\nA [cylinder]\nA background worker with a long label [cylinder]');
    const short = result.nodes.find((node) => node.id === 'a')!;
    const long = result.nodes.find((node) => node.id === 'a-background-worker-with-a-long-label')!;
    expect(long.size.width).toBeGreaterThan(short.size.width);
    expect(long.size.height).toBeGreaterThanOrEqual(short.size.height);
  });

  it('writes palette fills the style bar and renderer share', async () => {
    const result = await compile('flowchart\nA [blue]\nB [bold, red]\nC [outline, green]\nD [shadow]');
    const byId = Object.fromEntries(result.nodes.map((node) => [node.id, node]));
    expect(byId.a?.appearance).toMatchObject({ fill: '#eff6ff', stroke: '#60a5fa' });
    expect(byId.b?.appearance).toMatchObject({ fill: '#dc2626' });
    expect(byId.c?.appearance).toMatchObject({ fill: 'transparent' });
    expect(byId.d?.appearance).toMatchObject({ shadow: true });
  });

  it('resolves icons into provider-icon cards and warns on unknown ones', async () => {
    const result = await compile('architecture\nLambda [aws/lambda, green]\nMystery [icon: aws/nope]', {
      resolveIcon: (id) => id === 'aws/lambda' ? { packId: 'aws-pack', shapeId: 'compute-lambda' } : null,
    });
    const lambda = result.nodes.find((node) => node.id === 'lambda')!;
    expect(lambda).toMatchObject({
      kind: 'architecture',
      content: {
        icon: 'aws/lambda', archIconPackId: 'aws-pack', archIconShapeId: 'compute-lambda',
        archProvider: 'aws', archResourceType: 'lambda', assetPresentation: 'icon', color: 'emerald',
      },
    });
    expect(result.diagnostics.some((item) => item.code === 'W132' && item.line === 3)).toBe(true);
  });
});

describe('compile layout', () => {
  it('nests group children inside the group box, parent-relative', async () => {
    const result = await compile('architecture right\ngroup Edge [blue] {\nA\nB\nA -> B\n}\nOutside\nOutside -> A');
    const group = result.groups[0]!;
    const inside = result.nodes.filter((node) => node.parentId === group.id);
    expect(inside).toHaveLength(2);
    for (const node of inside) {
      expect(node.transform.translation.x).toBeGreaterThanOrEqual(0);
      expect(node.transform.translation.y).toBeGreaterThanOrEqual(0);
      expect(node.transform.translation.x + node.size.width).toBeLessThanOrEqual(group.size.width + 1);
      expect(node.transform.translation.y + node.size.height).toBeLessThanOrEqual(group.size.height + 1);
    }
    const outside = result.nodes.find((node) => node.id === 'outside')!;
    expect(outside.parentId).toBe(result.frame.id);
    expect(group.size.width).toBeGreaterThan(0);
  });

  it('keeps frame children parent-relative so a moved frame does not double its origin', async () => {
    const origin = { x: 500, y: 300 };
    const result = await compile('flowchart\nA -> B', { origin });
    expect(result.frame.transform.translation).toEqual(origin);
    for (const node of result.nodes) {
      expect(node.transform.translation.x).toBeLessThan(result.frame.size.width);
      expect(node.transform.translation.y).toBeLessThan(result.frame.size.height);
    }
  });

  it('honours width, height and pin attributes', async () => {
    const result = await compile('flowchart\nA [width: 300, height: 90]\nB [pin: 40,20]\nC [pin: "10,12"]');
    const a = result.nodes.find((node) => node.id === 'a')!;
    const b = result.nodes.find((node) => node.id === 'b')!;
    const c = result.nodes.find((node) => node.id === 'c')!;
    expect(a.size).toEqual({ width: 300, height: 90 });
    expect(b.transform.translation).toEqual({ x: 40, y: 20 });
    expect(c.transform.translation).toEqual({ x: 10, y: 12 });
  });

  it('creates sticky notes anchored to their target', async () => {
    const result = await compile('flowchart\nAPI\nnote API : retries twice');
    const note = result.nodes.find((node) => node.kind === 'sticky')!;
    const api = result.nodes.find((node) => node.id === 'api')!;
    expect(note.content).toMatchObject({ label: 'retries twice' });
    expect(note.metadata.dsl).toMatchObject({ noteFor: 'api' });
    expect(api.metadata.dsl).toMatchObject({ notes: ['retries twice'] });
    expect(note.transform.translation.x).toBeGreaterThan(api.transform.translation.x + api.size.width);
  });

  it('uses injected measurement and layout ports', async () => {
    const result = await compile('flowchart\nA -> B', {
      measureLabel: () => ({ width: 99, height: 44 }),
      layout: { run: async (graph) => ({ positions: { a: { x: 10, y: 20 }, b: { x: 210, y: 20 } }, sizes: { [graph.rootId]: { width: 500, height: 300 } } }) },
      origin: { x: 100, y: 200 },
    });
    expect(result.nodes[0]).toMatchObject({ size: { width: 99, height: 44 }, transform: { translation: { x: 10, y: 20 } } });
    expect(result.nodes[1]?.transform.translation.x).toBe(210);
    expect(result.frame.size).toEqual({ width: 500, height: 300 });
  });
});

describe('compile graph structure', () => {
  it('declares nodes once, first group wins, later attributes fill gaps', async () => {
    const result = await compile('flowchart\ngroup One { A }\ngroup Two { A [blue] }\nB -> A');
    expect(result.nodes.map((node) => node.id).sort()).toEqual(['a', 'b']);
    expect(result.nodes.find((node) => node.id === 'a')?.parentId).toBe('one');
    expect(result.nodes.find((node) => node.id === 'a')?.appearance).toMatchObject({ fill: '#eff6ff' });
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'W121' })]));
  });

  it('warns when a repeated declaration tries to move a node between groups', async () => {
    const result = await compile('flowchart\ngroup One { A }\ngroup Two {\n  A\n}');
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'W121', severity: 'warning' })]));
  });

  it('keeps stable ids and utility functions deterministic', async () => {
    const first = await compile('flowchart\nAPI -> API Gateway\nAPI -> API Gateway');
    const second = await compile('flowchart\nAPI -> API Gateway\nAPI -> API Gateway');
    expect(first.nodes.map(({ id }) => id)).toEqual(['api', 'api-gateway']);
    expect(second.nodes.map(({ id }) => id)).toEqual(first.nodes.map(({ id }) => id));
    expect(first.connectors.map(({ id }) => id)).toEqual(['edge:api->api-gateway:1', 'edge:api->api-gateway:2']);
    expect(slugifyDslId('Żółć API')).toBe('zo-c-api');
    expect(hashDslScene('same')).toBe(hashDslScene('same'));
  });

  it('records the frame meta the code panel binds to', async () => {
    const text = 'architecture down\ntitle: Shop\nAPI -> DB';
    const result = await compile(text);
    expect(result.frame).toMatchObject({
      kind: 'frame', content: { label: 'Shop' },
      metadata: { dsl: { family: 'architecture', direction: 'down', version: 1, source: text } },
    });
    expect(typeof result.meta.hash).toBe('string');
  });
});

describe('compile connectors', () => {
  it('writes the appearance keys the renderer honours', async () => {
    const result = await compile('flowchart\nA -> B : solid\nB --> C : dashed\nC <-> D\nD <--> E\nE -- F\nF -> G [thick, head: circle]\nA -> H [from: right, to: left]');
    const byPair = Object.fromEntries(result.connectors.map((connector) => [`${connector.source.nodeId}->${connector.target.nodeId}`, connector]));
    expect(byPair['a->b']?.appearance).toEqual({ markerEnd: 'arrow' });
    expect(byPair['b->c']?.appearance).toEqual({ dashPattern: 'dashed', markerEnd: 'arrow' });
    expect(byPair['c->d']?.appearance).toEqual({ markerStart: 'arrow', markerEnd: 'arrow' });
    expect(byPair['d->e']?.appearance).toEqual({ dashPattern: 'dashed', markerStart: 'arrow', markerEnd: 'arrow' });
    expect(byPair['e->f']?.appearance).toEqual({});
    expect(byPair['f->g']?.appearance).toEqual({ markerEnd: 'circle', strokeWidth: 2.5 });
    expect(byPair['a->h']?.source.anchor).toEqual({ kind: 'side', side: 'right', ratio: 0.5 });
    expect(byPair['a->h']?.target.anchor).toEqual({ kind: 'side', side: 'left', ratio: 0.5 });
    expect(result.connectors[0]?.labels[0]?.text).toBe('solid');
  });

  it('keeps unknown attributes on the record for round-trip', async () => {
    const result = await compile('flowchart\nA -> B : goes [custom: 1]');
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'W131', line: 2 })]));
    expect(result.connectors[0]?.metadata.dsl).toMatchObject({ attrs: [{ key: 'custom', value: '1' }] });
  });
});
