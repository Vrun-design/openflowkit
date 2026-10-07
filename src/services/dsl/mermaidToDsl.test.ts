import { describe, expect, it } from 'vitest';
import { MERMAID_COMPAT_FIXTURES } from '../../../scripts/mermaid-compat-fixtures.mjs';
import { compile } from '../../dsl/compile';
import { format } from '../../dsl/serialize';
import platform from './fixtures/mermaid/platform.mmd?raw';
import { looksLikeMermaid, mermaidToDsl } from './mermaidToDsl';

const convert = (source: string) => {
  const result = mermaidToDsl(source);
  if ('error' in result) throw new Error(result.error);
  return result;
};

describe('mermaidToDsl', () => {
  it('detects Mermaid headers and leaves DSL alone', () => {
    expect(looksLikeMermaid('flowchart LR\nA --> B')).toBe(true);
    expect(looksLikeMermaid('%% ofk 1\nflowchart\nA -> B')).toBe(false);
    expect(looksLikeMermaid('sequenceDiagram\nA->>B: hi')).toBe(true);
    // `-->` is also our dashed edge: DSL-only signals (word direction, `title:`, `A ->`) win over it.
    expect(looksLikeMermaid('flowchart right\nA -> B\nB --> A : no [red]')).toBe(false);
    expect(looksLikeMermaid('flowchart\ntitle: Checkout\nA --> B')).toBe(false);
    expect(looksLikeMermaid('flowchart down\nA --> B')).toBe(false);
    expect(looksLikeMermaid('flowchart LR\nA[Go -> next] --> B')).toBe(true);
    expect(mermaidToDsl('flowchart LR\nA --> B')).toMatchObject({ losses: [] });
    expect(mermaidToDsl('not a diagram')).toEqual({ error: 'No Mermaid diagram header found' });
  });

  it('leaves our own mindmap, architecture and gitgraph DSL alone unless the text is Mermaid-only', () => {
    expect(looksLikeMermaid('architecture\nmodel {\n  person Customer\n}')).toBe(false);
    expect(looksLikeMermaid('architecture right\n  API [aws/lambda] -> DB')).toBe(false);
    expect(looksLikeMermaid('architecture-beta\n  service api(server)[API]')).toBe(true);
    expect(looksLikeMermaid('architecture\n  service api(server)[API]')).toBe(true);
    expect(looksLikeMermaid('mindmap\ncentral: Product\n- Growth [green]')).toBe(false);
    expect(looksLikeMermaid('mindmap\n  root((Product))\n    Growth')).toBe(true);
    expect(looksLikeMermaid('gitgraph\ncommit Initial')).toBe(false);
    expect(looksLikeMermaid('gitGraph\n  commit id: "a"')).toBe(true);
  });

  it('names what converts when a Mermaid family cannot', () => {
    expect(mermaidToDsl('gantt\n  title Plan')).toEqual({ error: expect.stringMatching(/^Mermaid "gantt" cannot be converted\. Convertible: flowchart/) });
    expect(mermaidToDsl('journey\n  title Trip')).toEqual({ error: expect.stringMatching(/"journey" cannot be converted/) });
  });

  it('carries a front-matter title, reports config, and quotes a label with a line break', () => {
    const result = mermaidToDsl('---\ntitle: "Checkout"\nconfig:\n  theme: dark\n---\nflowchart LR\n  A["line1\n  line2"] --> B');
    if ('error' in result) throw new Error(result.error);
    expect(result.dsl).toMatch(/^flowchart right\ntitle: Checkout\n/);
    expect(result.dsl).toContain('"line1\\nline2"');
    expect(result.losses).toEqual(['Front matter config dropped']);
    expect(looksLikeMermaid('---\ntitle: x\n---\nflowchart LR\n  A-->B')).toBe(true);
  });

  it('puts parser findings on their Mermaid line', () => {
    const result = mermaidToDsl('flowchart TD\n  A --> B\n  A[Start --> C');
    expect('diagnostics' in result && result.diagnostics.map(({ line }) => line)).toEqual([3]);
  });

  it('converts flowcharts with shapes, groups, styles and arrow styles', async () => {
    const { dsl, losses } = convert(`flowchart LR
  A[Start] --> B{Check}
  B -->|yes| C(Go)
  B -.-> D[(Store)]
  subgraph API[API Layer]
    E --> F
  end
  C ==> D
  style A fill:#f66,stroke:#900`);
    expect(dsl).toContain('flowchart right');
    expect(dsl).toContain('b = Check [diamond]');
    expect(dsl).toContain('d = Store [cylinder]');
    expect(dsl).toContain('group api = API Layer {');
    expect(dsl).toContain('b -> c : yes');
    expect(dsl).toContain('b --> d');
    expect(dsl).toContain('c -> d [thick]');
    // `[text]` is Mermaid's square box: rect, the DSL default, so only the colour is written.
    expect(dsl).toContain('a = Start [#f66]');
    expect(dsl).toContain('c = Go [rounded]');
    expect(losses).toEqual([]);
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  });

  // The owner's report, 2026-10-07: a commented, styled 47-node flowchart lost its first edge, merged
  // three stores into one label, kept `<br/>` literally and grew icons Mermaid never draws.
  it('converts a commented, styled 47-node flowchart the way Mermaid draws it', async () => {
    const { dsl, losses } = convert(platform);
    // Mermaid draws no icons from labels.
    expect(dsl).toMatch(/^flowchart down\nicons: off\n/);
    // A `%% ----------` comment must not swallow the statement after it.
    expect(dsl).toContain('user = User Request [rounded]');
    expect(dsl).toContain('cdn = CDN / WAF [hexagon]');
    // linkStyle 0 is the first link in the source.
    expect(dsl).toContain('user -> cdn [#4f46e5, thick]');
    expect(dsl).toMatch(/^cdn -> deny : blocked$/m);
    // `[text]` is a square box: rect is the default and is not written.
    expect(dsl).toMatch(/^ {2}gw = API Gateway$/m);
    expect(dsl).toContain('rl = "Rate limit\\nexceeded?" [diamond, #fef9c3]');
    // `~~~` links shape the layout but are not drawn; all three stores stay in their group.
    expect(dsl).toMatch(/group obs = Observability \{\n {2}log = Logs \[cylinder, #e0e7ff\]\n {2}met = Metrics \[cylinder, #e0e7ff\]\n {2}trace = Traces \[cylinder, #e0e7ff\]\n\}/);
    expect(dsl).toContain('log -- met [invisible]');
    // Both LR subgraphs link outside themselves, so Mermaid ignores their direction.
    expect(dsl).toContain('group edge = Edge Layer {');
    expect(dsl).toContain('group async = Async Pipeline {');
    expect(losses).toEqual([]);
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    expect(compiled.nodes).toHaveLength(47);
    expect(compiled.connectors).toHaveLength(63);
  });

  it('keeps a subgraph direction only when no link leaves the subgraph, as Mermaid does', () => {
    const { dsl } = convert('flowchart TD\n  subgraph S\n    direction LR\n    a --> b\n  end\n  subgraph T\n    direction LR\n    c --> d\n  end\n  d --> e');
    expect(dsl).toContain('group S [right] {');
    expect(dsl).toContain('group T {');
  });

  it('edges to a subgraph end on its group, by the subgraph id or its title', async () => {
    const { dsl, losses } = convert('flowchart LR\n  subgraph one [Group One]\n    a1 --> a2\n  end\n  subgraph two\n    b1\n  end\n  c --> one\n  one --> two\n  a1 --> two');
    expect(dsl).toContain('group one = Group One {');
    expect(losses).toEqual([]);
    const compiled = await compile(dsl);
    expect(compiled.nodes.map((node) => node.id).sort()).toEqual(['a1', 'a2', 'b1', 'c']);
    expect(compiled.connectors.map((connector) => `${connector.source.nodeId}->${connector.target.nodeId}`))
      .toEqual(['a1->a2', 'c->one', 'one->two', 'a1->two']);
  });

  it('ids that differ only in case stay separate nodes, groups and participants', async () => {
    const flow = convert('flowchart LR\n  A[Upper] --> a[Lower]\n  subgraph B [Box]\n    x\n  end\n  subgraph b [Box]\n    y\n  end\n  c --> B\n  c --> b');
    const compiled = await compile(flow.dsl);
    expect(compiled.nodes.map((node) => node.content.label).sort()).toEqual(['Lower', 'Upper', 'c', 'x', 'y']);
    expect(compiled.groups).toHaveLength(2);
    const ends = compiled.connectors.map((connector) => `${connector.source.nodeId}->${connector.target.nodeId}`);
    expect(new Set(ends).size).toBe(3);
    expect(ends.filter((end) => end.startsWith('c->')).map((end) => end.slice(3)).sort()).toEqual(compiled.groups.map((group) => group.id).sort());

    const sequence = convert('sequenceDiagram\n  participant A\n  participant a\n  A->>a: hi\n  Note over a: lower');
    const messages = await compile(sequence.dsl);
    expect(messages.nodes.filter((node) => node.kind !== 'sticky' && /^(A|a)$/.test(String(node.content.label)))).toHaveLength(2);
    // Saved and reopened, the message still goes A → a and the note stays on a.
    const reopened = await compile(await format(sequence.dsl));
    expect(reopened.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    expect(await format(await format(sequence.dsl))).toBe(await format(sequence.dsl));
    expect(await format(sequence.dsl)).toMatch(/A -> a-2 = a : hi[\s\S]*note over a-2 = a : lower/);

    for (const source of ['classDiagram\n  class A\n  class a\n  A <|-- a', 'erDiagram\n  A ||--o{ a : has']) {
      const relations = await compile(convert(source).dsl);
      expect(relations.nodes, source).toHaveLength(2);
      expect(new Set(relations.connectors.flatMap((connector) => [connector.source.nodeId, connector.target.nodeId])).size, source).toBe(2);
    }
    const state = convert('stateDiagram-v2\n  [*] --> A\n  A --> a\n  note right of a : lower');
    expect(state.dsl).toContain('note a-2 : lower');
    expect(convert('stateDiagram-v2\n  [*] --> A\n  note right of Nope : x').losses).toContain('Note on unknown state Nope dropped');
  });

  it('opens a new fragment after a closed one and interleaves activations and notes', async () => {
    const { dsl, losses } = convert(`sequenceDiagram
  autonumber
  A->>B: one
  loop retry
    A->>B: again
    loop inner
      B->>A: nested
    end
  end
  par x
    A->>B: p1
  and y
    A->>B: p2
  end
  note over A: after
  A->>B: last`);
    expect(dsl).toContain('autonumber');
    expect(dsl).toContain('loop retry {');
    expect(dsl).not.toContain('} else');
    expect(dsl).toContain('par x {');
    expect(dsl).toContain('} and y {');
    expect(dsl.indexOf('note over A : after')).toBeLessThan(dsl.indexOf('A -> B : last'));
    expect(losses.some((loss) => loss.includes('flattened'))).toBe(true);
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
  });

  it('converts state composites with their members and one-line notes', async () => {
    const { dsl } = convert(`stateDiagram-v2
  [*] --> Still
  Still --> Moving : go
  state Moving {
    [*] --> Slow
    Slow --> Fast
  }
  Moving --> [*]
  note right of Still : idle`);
    expect(dsl).toContain('state Moving {');
    expect(dsl).toMatch(/state Moving \{\n {2}Slow\n {2}Fast\n {2}\[\*\] -> Slow\n {2}Slow -> Fast\n\}/);
    expect(dsl).toContain('note Still : idle');
    expect(dsl).not.toContain('moving-1');
    const compiled = await compile(dsl);
    expect(compiled.groups).toHaveLength(1);
    expect(compiled.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
  });

  it('converts every crow-foot cardinality, hyphenated entities and class annotations', async () => {
    const erd = convert(`erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE-ITEM : contains
  CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
  PERSON |o--o| PASSPORT : holds`);
    expect(erd.losses).toEqual([]);
    expect(erd.dsl).toContain('|o--o|');
    const compiledErd = await compile(erd.dsl);
    expect(compiledErd.connectors).toHaveLength(4);
    expect(compiledErd.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    const cls = convert(`classDiagram
  class Shape
  <<interface>> Shape
  Square ..|> Shape
  Animal "1" *-- "many" Leg : has`);
    expect(cls.dsl).toContain('Shape [interface]');
    expect(cls.dsl).toContain('..|>');
    const compiledCls = await compile(cls.dsl);
    expect(compiledCls.connectors).toHaveLength(2);
    expect(compiledCls.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
  });

  it('converts sequence diagrams into participants, messages and flat fragments', async () => {
    const { dsl, losses } = convert(`sequenceDiagram
  participant A as Alice
  actor B
  A->>B: Hello
  B-->>A: Hi
  activate B
  alt ok
    A->B: yes
  else no
    A->B: no
  end
  note over A,B: shared`);
    expect(dsl).toContain('participant a = Alice');
    expect(dsl).toContain('[actor]');
    expect(dsl).toContain('a -> B : Hello');
    expect(dsl).toContain('B --> a : Hi');
    expect(dsl).toContain('alt ok {');
    expect(dsl).toContain('} else no {');
    expect(dsl).toContain('note over a, B : shared');
    expect(dsl).toContain('activate B');
    expect(dsl.indexOf('activate B')).toBeLessThan(dsl.indexOf('alt ok {'));
    expect(losses).toEqual([]);
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  });

  it('maps state pseudo-states and control kinds', async () => {
    const { dsl } = convert(`stateDiagram-v2
  [*] --> Idle
  Idle --> Running : go
  state Running {
    A --> B
  }
  Running --> [*]
  state Fork <<fork>>
  Idle --> Fork`);
    expect(dsl).toContain('[*] -> Idle');
    expect(dsl).toContain('state Running {');
    expect(dsl).toContain('[fork]');
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  });

  it('converts ER diagrams with fields and crow-foot relations', async () => {
    const { dsl } = convert(`erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  CUSTOMER {
    string name
    string id PK
  }`);
    expect(dsl).toContain('CUSTOMER {');
    expect(dsl).toContain('id string pk');
    expect(dsl).toContain('||--o{');
    expect(dsl).toContain('ORDER : places');
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  });

  it('converts class diagrams with members and relation tokens', async () => {
    const { dsl } = convert(`classDiagram
  class Animal {
    +String name
    +makeSound() void
  }
  class Dog {
    +fetch() void
  }
  Animal <|-- Dog
  Dog --> Toy : plays`);
    expect(dsl).toContain('Animal {');
    expect(dsl).toContain('---');
    expect(dsl).toContain('<|--');
    expect(dsl).toContain('Dog --> Toy : plays');
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  });

  it('converts mindmaps by indentation', async () => {
    const { dsl } = convert('mindmap\n  root((Product))\n    Growth\n      SEO\n    Retention');
    expect(dsl).toBe('mindmap\ncentral: Product\n- Growth\n  - SEO\n- Retention\n');
    const compiled = await compile(dsl);
    expect(compiled.nodes).toHaveLength(4);
  });

  it('converts gitGraph commits, branches, merges and tags', async () => {
    const { dsl } = convert(`gitGraph
  commit id: "Initial"
  branch develop
  commit id: "Feature" tag: "v1.0"
  checkout main
  commit id: "Hotfix" type: HIGHLIGHT
  merge develop id: "Release"`);
    expect(dsl).toContain('commit Initial');
    expect(dsl).toContain('branch develop');
    expect(dsl).toContain('commit Feature [tag: v1.0]');
    expect(dsl).toContain('checkout main');
    expect(dsl).toContain('commit Hotfix [highlight]');
    expect(dsl).toContain('merge develop [label: Release]');
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  });

  it('converts architecture groups, icons, junctions and pinned edge sides', async () => {
    const { dsl } = convert(`architecture-beta
  group api(cloud)[API]
  service db(database)[Database] in api
  service disk1(disk)[Storage] in api
  junction junctionCenter in api
  db:L -- R:disk1
  service gateway(internet)[Gateway]
  gateway:B --> T:db`);
    expect(dsl).toContain('architecture');
    expect(dsl).toContain('group API [icon: cloud] {');
    expect(dsl).toContain('db = Database [icon: database]');
    expect(dsl).toContain('[circle]');
    expect(dsl).toMatch(/db -- disk1 \[from: left, to: right\]/);
    expect(dsl).toMatch(/Gateway -> db \[from: bottom, to: top\]/);
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    expect(compiled.nodes.length).toBeGreaterThanOrEqual(4);
  });

  it('emits every architecture node once, even when two groups claim each other', async () => {
    const { dsl } = convert(`architecture-beta
  group a(cloud)[Alpha] in b
  group b(cloud)[Beta] in a
  service api(server)[API] in a`);
    expect(dsl.match(/Alpha/g)).toHaveLength(1);
    expect(dsl.match(/Beta/g)).toHaveLength(1);
    expect(dsl).toContain('API');
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  });

  it('converts every supported corpus fixture into compiling DSL', async () => {
    const convertible = new Set(['flowchart', 'sequence', 'stateDiagram', 'erDiagram', 'classDiagram', 'mindmap', 'gitGraph', 'architecture']);
    const fixtures = (MERMAID_COMPAT_FIXTURES as Array<{ name: string; source: string; family?: string; bucket?: string }>)
      .filter((fixture) => (fixture.bucket === 'editable_full' || fixture.bucket === 'editable_partial')
        && convertible.has(fixture.family ?? ''));
    expect(fixtures.length).toBeGreaterThan(30);
    const failures: string[] = [];
    for (const fixture of fixtures) {
      const result = mermaidToDsl(fixture.source);
      if ('error' in result) {
        failures.push(`${fixture.name}: ${result.error}`);
        continue;
      }
      const compiled = await compile(result.dsl);
      const fatal = compiled.diagnostics.filter((item) => item.severity === 'error');
      if (fatal.length > 0) failures.push(`${fixture.name}: ${fatal.map((item) => item.code).join(',')}`);
      if (compiled.nodes.length === 0) failures.push(`${fixture.name}: no nodes`);
    }
    expect(failures).toEqual([]);
  });

  it('reports reserved families as errors instead of guessing', () => {
    for (const source of ['journey\n  title: Trip']) {
      const result = mermaidToDsl(source);
      if (!('error' in result)) throw new Error(`expected an error for ${source}`);
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});
