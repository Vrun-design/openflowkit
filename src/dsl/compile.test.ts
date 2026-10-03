import { describe, expect, it } from 'vitest';
import { format, serialize } from './serialize';
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

  it('resolves bare references to an explicit id', async () => {
    const result = await compile('flowchart\napi = API Gateway [rounded]\ndb = Customer records [cylinder]\napi -> db : reads');
    expect(result.nodes.map((node) => node.id)).toEqual(['api', 'db']);
    expect(result.nodes[0]?.content.label).toBe('API Gateway');
    expect(result.connectors[0]).toMatchObject({ source: { nodeId: 'api' }, target: { nodeId: 'db' } });
  });

  it('an explicit id is a new node even when its label is taken (two nodes called API)', async () => {
    const result = await compile('flowchart\ngroup A {\n  API\n}\ngroup B {\n  api-2 = API\n}\nAPI -> api-2\nAPI -> Client');
    expect(result.nodes.slice(0, 2).map((node) => [node.id, node.content.label, node.parentId])).toEqual([['api', 'API', 'a'], ['api-2', 'API', 'b']]);
    expect(result.diagnostics.filter((item) => item.code === 'W121')).toEqual([]);
    expect(result.connectors.map((connector) => connector.source.nodeId)).toEqual(['api', 'api']);
    const again = await compile(serialize({ frame: result.frame, nodes: result.nodes, groups: result.groups, connectors: result.connectors }));
    expect(again.nodes.map((node) => [node.id, node.content.label])).toEqual(result.nodes.map((node) => [node.id, node.content.label]));
  });

  it.each([
    'flowchart\nAPI -> DB\ngateway = API [blue]',
    'flowchart\ngw = API\napi = API\ngw -> api',
    'flowchart\nAPI -> DB\nAPI = API [blue]',
  ])('shared labels survive serialize → compile: %s', async (source) => {
    const first = await compile(source);
    const shape = (result: typeof first) => [
      result.nodes.map((node) => `${node.id}:${String(node.content.label)}`).sort(),
      result.connectors.map((connector) => `${connector.source.nodeId}->${connector.target.nodeId}`).sort(),
    ];
    const again = await compile(serialize({ frame: first.frame, nodes: first.nodes, groups: first.groups, connectors: first.connectors }));
    expect(shape(again)).toEqual(shape(first));
  });

  it('labels that read as keywords or punctuation (queue, ...etc) survive serialize → compile', async () => {
    const result = await compile('flowchart\n"queue" [queue]\n"person" [person]\n"system"\n"...etc" -> "(beta) API"\n"title" [blue]\n"direction" -> "group"');
    expect(result.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    const text = serialize({ frame: result.frame, nodes: result.nodes, groups: result.groups, connectors: result.connectors });
    const again = await compile(text);
    expect(again.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    expect(again.nodes.map((node) => node.content.label).sort()).toEqual(['queue', 'person', 'system', '...etc', '(beta) API', 'title', 'direction', 'group'].sort());
  });

  it('an edge that names a group ends on the group frame, wherever the group opens; a node statement of that name wins', async () => {
    const result = await compile('flowchart\nClient -> Payments : pays\ngroup Payments {\n  Pay -> Stripe\n  Pay -> Payments\n}\ngroup pay-box = Box {\n  x\n}\nClient -> pay-box');
    expect(result.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    expect(result.nodes.map((node) => node.id).sort()).toEqual(['client', 'pay', 'stripe', 'x']);
    expect(result.connectors.map((connector) => `${connector.source.nodeId}->${connector.target.nodeId}`))
      .toEqual(['client->payments', 'pay->stripe', 'pay->payments', 'client->pay-box']);
    const text = serialize({ frame: result.frame, nodes: result.nodes, groups: result.groups, connectors: result.connectors });
    const again = await compile(text);
    expect(again.nodes.map((node) => node.id).sort()).toEqual(['client', 'pay', 'stripe', 'x']);
    expect(again.connectors.map((connector) => connector.target.nodeId).sort()).toEqual(['pay-box', 'payments', 'payments', 'stripe']);

    const shadowed = await compile('flowchart\ngroup Payments {\n  Pay\n}\nPayments [red]\nClient -> Payments');
    expect(shadowed.connectors[0]?.target.nodeId).toBe('payments-2');
    const shadowedText = serialize({ frame: shadowed.frame, nodes: shadowed.nodes, groups: shadowed.groups, connectors: shadowed.connectors });
    expect((await compile(shadowedText)).connectors[0]?.target.nodeId).toBe('payments-2');

    // A group and a node that share a label, with edges to both: the edge to the group names its id.
    for (const source of ['flowchart\ngroup API {\n  API\n}\nClient -> API\nAPI -> Client', 'flowchart\nAPI [red]\ngroup API {\n  x\n}\nClient -> API']) {
      const both = await compile(source);
      both.connectors.forEach((connector) => connector.target.nodeId === 'client' || expect(connector.target.nodeId).toBe(both.nodes.find((node) => node.content.label === 'API')!.id));
      const bothText = serialize({ frame: both.frame, nodes: both.nodes, groups: both.groups, connectors: both.connectors });
      const ends = (scene: typeof both) => scene.connectors.map((connector) => `${connector.source.nodeId}->${connector.target.nodeId}`);
      expect(ends(await compile(bothText)), bothText).toEqual(ends(both));
    }
    const toGroup = await compile('flowchart\ngroup API {\n  API\n}\nClient -> api');
    const groupText = serialize({ frame: toGroup.frame, nodes: toGroup.nodes, groups: toGroup.groups, connectors: toGroup.connectors });
    expect(toGroup.connectors[0]?.target.nodeId).toBe('api');
    expect((await compile(groupText)).connectors[0]?.target.nodeId, groupText).toBe('api');
  });

  it('a quoted \\n is a line break in node, edge and mindmap labels, and survives serialize → compile', async () => {
    const result = await compile('flowchart\n"Line one\\nLine two" -> B : "edge\\nlabel"');
    expect(result.nodes.map((node) => node.content.label)).toEqual(['Line one\nLine two', 'B']);
    expect(result.connectors[0]?.labels[0]?.text).toBe('edge\nlabel');
    const text = serialize({ frame: result.frame, nodes: result.nodes, groups: result.groups, connectors: result.connectors });
    expect(text).toContain('"Line one\\nLine two" -> B : "edge\\nlabel"');
    expect((await compile(text)).nodes[0]?.content.label).toBe('Line one\nLine two');
    expect((await compile('mindmap\nRoot\n  "kid\\nline"')).nodes.map((node) => node.content.label)).toContain('kid\nline');
  });

  it('a quoted \\n anywhere a writer does not quote (attrs, notes, conditions, steps, members) stays one line', async () => {
    for (const source of [
      'flowchart\nx [desc: "a\\nb"] -> y',
      'flowchart\nx -> y\nnote x : "a\\nb"',
      'sequence\nalt "c1\\nc2" {\n  A -> B : x\n}',
      'flowchart\nx -> y\nanimate {\n  step "one\\ntwo" : x -> y\n}',
      'class\nFoo {\n  "+a\\nb"\n}',
    ]) {
      const once = await format(source);
      expect(await format(once), once).toBe(once);
      expect((await compile(once)).diagnostics.filter((item) => item.severity !== 'info'), once).toEqual([]);
    }
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
