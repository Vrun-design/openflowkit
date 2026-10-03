import { describe, expect, it } from 'vitest';
import { compile } from '../../dsl/compile';
import { format } from '../../dsl/serialize';
import { d2ToDsl, looksLikeD2, type D2Conversion } from './d2ToDsl';

const corpus = import.meta.glob('./fixtures/d2/**/*.d2', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const file = (name: string) => corpus[`./fixtures/d2/${name}`]!;

function convert(source: string): D2Conversion {
  const result = d2ToDsl(source);
  if ('error' in result) throw new Error(result.error);
  return result;
}

describe('d2ToDsl over real files', () => {
  it.each(Object.keys(corpus).sort())('%s compiles without a warning and formats to a fixed point', async (path) => {
    const { dsl } = convert(corpus[path]!);
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter(({ severity }) => severity !== 'info')).toEqual([]);
    expect(compiled.nodes.length + compiled.groups.length).toBeGreaterThan(0);
    const once = await format(dsl);
    expect(await format(once)).toBe(once);
  });

  it('chess: containers become groups, ids keep labels, quoted labels survive', async () => {
    const { dsl, losses } = convert(file('d2-examples/chess_dia.d2'));
    expect(dsl).toContain('group defendants {\n  mc = Magnus Carlsen');
    expect(dsl).toContain('hans -> defendants : sueing for $100M');
    expect(dsl).toContain('playmagnus <-> chesscom : Merger talks');
    expect(losses).toEqual(['connections to a container (defendants) end on a box of the same name']);
    const compiled = await compile(dsl);
    expect(compiled.nodes.find((node) => node.id === 'mc')?.parentId).toBe('defendants');
  });

  it('containers: dotted paths and `_` resolve, the same leaf name in two boxes stays two nodes', async () => {
    const compiled = await compile(convert(file('d2-docs/containers-3.d2')).dsl);
    expect(compiled.nodes.filter((node) => node.content.label === 'db')).toHaveLength(2);
    const underscore = convert(file('d2-docs/containers-underscore.d2')).dsl;
    expect(underscore).toContain('presents -> birthdays-presents : regift');
    expect(underscore).toContain('group christmas [color: #ace1af]');
  });

  it('sequence diagrams: actors, notes in written order, groups flattened and said so', () => {
    const notes = convert(file('d2-docs/sequence-diagrams-note.d2'));
    expect(notes.dsl).toBe('sequence\nparticipant alice\nparticipant bob\nalice -> bob\nnote over bob : "In the eyes of my dog, I\'m a man."\nnote over bob : "Cold hands, no gloves."\nbob -> alice : Chocolate chip.\n');
    expect(notes.losses).toEqual(['sequence group "important insight" flattened']);
    const groups = convert(file('d2-docs/sequence-diagrams-group.d2'));
    expect(groups.dsl.match(/^alice -> bob/gm)).toHaveLength(2);
  });

  it('sql tables become an ERD; a column-level connection relates the tables', () => {
    const { dsl, losses } = convert(file('d2-docs/tables-2.d2'));
    expect(dsl).toContain('objects {\n  id int pk\n  disk int fk\n  json jsonb unique\n  last_updated timestamp_with_time_zone\n}');
    expect(dsl).toContain('objects -> disks');
    expect(losses).toEqual(['column-level connections drawn table to table']);
  });

  it('cloud icon URLs map onto icon ids; other URLs, arrowhead labels and grids are named losses', () => {
    expect(convert(file('d2-docs/icons-1.d2')).dsl).toContain('deploy [icon: aws/codedeploy]');
    expect(convert(file('d2-docs/connections-5.d2')).losses).toEqual(expect.arrayContaining(['arrowhead labels dropped', 'arrowhead shape diamond dropped']));
    expect(convert(file('d2-examples/flipt_input.d2')).losses).toEqual(expect.arrayContaining(['icon URLs outside the cloud packs dropped', 'grid-rows dropped']));
  });

  it('a markdown label keeps its first line; edges carry dashes, animation and a thick stroke', () => {
    const result = convert('doc: |md\n  # Title here\n  - item\n|\na -> b: {\n  style.stroke-dash: 3\n  style.animated: true\n}\nb -> c: {style.stroke-width: 4}');
    expect(result.dsl).toContain('doc = Title here');
    expect(result.dsl).toContain('a --> b [flow]');
    expect(result.dsl).toContain('b -> c [thick]');
    expect(result.losses).toEqual(['markdown and code labels flattened to their first line']);
  });

  it('globs, vars and layers are reported, never emulated; an empty file is an error', () => {
    const result = convert('vars: {\n  x: 1\n}\n*.style.fill: red\na -> b\nlayers: {\n  x: { c }\n}');
    expect(result.losses).toEqual(['vars dropped', 'globs dropped', 'layers dropped']);
    expect(d2ToDsl('# only a comment\n')).toEqual({ error: 'No D2 shapes or connections found' });
  });
});

describe('d2ToDsl edge cases (review findings)', () => {
  const graph = async (source: string) => {
    const result = convert(source);
    const compiled = await compile(result.dsl);
    return {
      result,
      nodes: compiled.nodes.map((node) => String(node.content.label)).sort(),
      edges: compiled.connectors.map((connector) => `${connector.source.nodeId}->${connector.target.nodeId}`),
      warnings: compiled.diagnostics.filter(({ severity }) => severity !== 'info'),
    };
  };

  it('a label that is another node\'s name stays two nodes', async () => {
    const { nodes, edges, warnings } = await graph('svc: db\ndb: { shape: cylinder }\nsvc -> db');
    expect(nodes).toEqual(['db', 'db']);
    expect(edges).toEqual(['svc->db']);
    expect(warnings).toEqual([]);
  });

  it('an apostrophe inside a name is not a quote; an unclosed quote ends with its line', async () => {
    expect((await graph("Bob's laptop -> server\nserver -> db\ndb: { shape: cylinder }")).edges).toHaveLength(2);
    const unclosed = await graph('a: "Hello\nb -> c\nc: { shape: circle }');
    expect(unclosed.edges).toEqual(['b->c']);
    expect(unclosed.result.losses).toContain('unclosed quote ended at the end of its line');
  });

  it('connections written before their sql_tables still relate the tables', async () => {
    const { result } = await graph('users.id -> orders.user_id\nusers: {\n  shape: sql_table\n  id: int\n}\norders: {\n  shape: sql_table\n  "label": string\n  user_id: int\n}');
    expect(result.dsl).toContain('users -> orders');
    expect(result.dsl).toContain('orders {\n  label string\n  user_id int\n}');
    expect(result.dsl).not.toContain('undefined');
  });

  it('`_` above the diagram, connection references and sequence arrows are named losses', async () => {
    expect(convert('_ -> b\nb -> c').losses).toContain('`_` above the diagram; connection dropped');
    const styled = await graph('a -> b\n(a -> b)[0].style.stroke: red\n(a -> b)[0]: {\n  style.stroke-width: 3\n}');
    expect(styled.nodes).toEqual(['a', 'b']);
    expect(styled.result.losses).toEqual(['connection references dropped']);
    expect(convert('shape: sequence_diagram\nalice <-> bob: both').losses).toContain('sequence <-> drawn as one message');
  });

  it('keeps self-loops', async () => {
    expect((await graph('a -> a: retry\na -> b')).edges).toEqual(['a->a', 'a->b']);
  });

  it('markdown prose is not D2', () => {
    expect(looksLikeD2('# Overview\nThis document describes the system.')).toBe(false);
  });
});

describe('looksLikeD2', () => {
  it('knows D2 by what our DSL never writes', () => {
    expect(looksLikeD2(file('d2-examples/chess_dia.d2'))).toBe(true);
    expect(looksLikeD2('x: { shape: cylinder }\nx -> y')).toBe(true);
    expect(looksLikeD2('db.shape: cylinder\napi -> db: reads')).toBe(true);
  });

  it('never claims our DSL or Mermaid', () => {
    expect(looksLikeD2('flowchart\n  A [cylinder] -> B : reads')).toBe(false);
    expect(looksLikeD2('architecture\nmodel {\n  system Shop\n}')).toBe(false);
    expect(looksLikeD2('%% ofk 1\nflowchart\nA -> B')).toBe(false);
    expect(looksLikeD2('flowchart LR\n  A --> B')).toBe(false);
    expect(looksLikeD2('API [aws/lambda] -> DB [cylinder]')).toBe(false);
  });
});
