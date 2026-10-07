import { describe, expect, it } from 'vitest';
import { MERMAID_COMPAT_FIXTURES } from '../../../scripts/mermaid-compat-fixtures.mjs';
import { compile } from '../../dsl/compile';
import { format } from '../../dsl/serialize';
import { FLOWCHART_SYNTAX } from './fixtures/mermaid/flowchartSyntax';
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

  it.each(FLOWCHART_SYNTAX.map((item) => [item.n, item] as const))('flowchart syntax: %s', async (_, item) => {
    const { dsl } = convert(item.s);
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
    expect({ nodes: compiled.nodes.length, edges: compiled.connectors.length }).toEqual({ nodes: item.nodes, edges: item.edges });
    if (item.groups !== undefined) expect(compiled.groups).toHaveLength(item.groups);
    const labels = [...compiled.nodes, ...compiled.groups].map((node) => node.content.label);
    for (const label of item.labels ?? []) expect(labels).toContain(label);
    const edgeLabels = compiled.connectors.flatMap((connector) => connector.labels.map((label) => label.text));
    for (const label of item.edgeLabels ?? []) expect(edgeLabels).toContain(label);
    for (const line of item.dsl ?? []) expect(dsl.split('\n')).toContain(line);
  });

  it('converts real-world sequence syntax: activation shorthand, sides, critical, rect, create, typed participants', async () => {
    const { dsl } = convert(`sequenceDiagram
  title Checkout
  actor U as User
  participant W as Web App
  participant DB@{ "type" : "database" }
  U->>+W: Open<br/>checkout
  W-xDB: drop
  Note right of W: retries
  critical connect
    W->>DB: connect
  option timeout
    W->>W: retry
  end
  rect rgb(191, 223, 255)
    W->>U: highlighted
  end
  break when down
    W->>U: sorry
  end
  W-->>-U: bye
  create participant L as Logger
  W->>L: hello
  destroy L`);
    const lines = dsl.split('\n').map((line) => line.trim());
    expect(lines[1]).toBe('title: Checkout');
    for (const line of ['participant u = User [actor]', 'participant w = Web App', 'participant DB [db]', 'participant l = Logger',
      'activate w', 'u -> w : "Open\\ncheckout"', 'w -> DB : drop [head: cross]', 'note right of w : retries',
      'alt connect {', '} else timeout {', 'break when down {', 'w --> u : bye', 'deactivate w', 'w -> l : hello']) {
      expect(lines).toContain(line);
    }
    // `+W` / `-U` are activation marks, not participants; the rect's `end` closes the rect, not `break`.
    expect(dsl).not.toMatch(/[+-][WU]\b/);
    expect(lines.indexOf('w -> u : highlighted')).toBeLessThan(lines.indexOf('break when down {'));
    expect(lines.indexOf('activate w')).toBeLessThan(lines.indexOf('u -> w : "Open\\ncheckout"'));
    expect(lines.indexOf('deactivate w')).toBeGreaterThan(lines.indexOf('w --> u : bye'));
    // A block ends where its `end` is: the message after it is outside (each block used to swallow one).
    expect(lines[lines.indexOf('w --> u : bye') - 1]).toBe('}');
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
  });

  // https://mermaid.js.org/syntax/sequenceDiagram.html#messages — all eight arrows in one block.
  it('keeps the cross end of -x and --x, and the other six arrows as they were', async () => {
    const { dsl, losses } = convert(`sequenceDiagram
  Alice->John: Hello John, how are you?
  Alice-->John: Hello John, how are you?
  Alice->>John: Hello John, how are you?
  Alice-->>John: Hello John, how are you?
  Alice-xJohn: I am lost
  Alice--xJohn: I am lost too
  Alice-)John: See you later!
  Alice--)John: See you later!`);
    const lines = dsl.split('\n');
    expect(lines).toContain('Alice -> John : "Hello John, how are you?"');
    expect(lines).toContain('Alice --> John : "Hello John, how are you?"');
    expect(lines).toContain('Alice -> John : I am lost [head: cross]');
    expect(lines).toContain('Alice --> John : I am lost too [head: cross]');
    expect(losses).toEqual([]);
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    const crossed = compiled.connectors.filter((connector) => connector.appearance.markerEnd === 'cross');
    expect(crossed.map((connector) => connector.semantics.seqMessageKind)).toEqual(['sync', 'return']);
    expect(await format(dsl)).toContain('[head: cross]');
  });

  // https://mermaid.js.org/syntax/classDiagram.html#namespace — plus a class outside and a namespace in a namespace.
  it('boxes a class namespace as a group, with the classes outside it left outside', async () => {
    const { dsl, losses, diagnostics } = convert(`classDiagram
  class Loose
  namespace BaseShapes {
    class Triangle
    class Rectangle {
      double width
      double height
    }
  }
  namespace Outer {
    namespace Inner {
      class Deep
    }
    class Shallow
  }
  Triangle --|> Rectangle
  Loose --> Deep`);
    expect(losses).toEqual([]);
    expect(diagnostics?.map((item) => item.message).join('\n') ?? '').not.toMatch(/without its box/);
    const lines = dsl.split('\n');
    const at = (text: string) => lines.indexOf(text);
    expect(lines).toContain('group BaseShapes {');
    expect(lines.slice(at('group BaseShapes {'), at('group Outer {'))).toEqual([
      'group BaseShapes {', '  Triangle {', '  }', '  Rectangle {', '    double width', '    double height', '  }', '}',
    ]);
    expect(lines.slice(at('group Outer {'), at('Triangle --|> Rectangle'))).toEqual([
      'group Outer {', '  group Inner {', '    Deep {', '    }', '  }', '  Shallow {', '  }', '}',
    ]);
    expect(at('Loose {')).toBeLessThan(at('group BaseShapes {'));
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    expect(compiled.groups.map((group) => group.id)).toEqual(['baseshapes', 'outer', 'inner']);
    const parent = (id: string) => compiled.nodes.find((node) => node.id === id)!.parentId;
    expect(parent('triangle')).toBe('baseshapes');
    expect(parent('deep')).toBe('inner');
    expect(parent('shallow')).toBe('outer');
    expect(parent('loose')).toBe(compiled.frame.id);
    expect(await format(dsl)).toBe(await format(await format(dsl)));
  });

  it('converts real-world class syntax: unlabelled relations, labels, namespaces, styles, title', async () => {
    const { dsl, losses } = convert(`classDiagram
    title Shop
    class Animal["Animal 🐾"]{
        <<abstract>>
        +String name
        +mate()$ void
    }
    class Duck:::highlight
    Animal <|-- Duck
    Animal o-- Owner
    Duck ..> Bread
    Customer "1" --> "*" Ticket
    Duck --> Pond : swims
    namespace Zoo {
      class Cage
      class Keeper
    }
    Cage --> Keeper
    note for Duck "can fly"
    style Animal fill:#f9f
    classDef highlight fill:#ffd`);
    const lines = dsl.split('\n');
    expect(lines[1]).toBe('title: Shop');
    for (const line of ['Animal 🐾 [abstract, #f9f] {', 'Duck [#ffd] {', 'group Zoo {', '  Cage {', '  Keeper {',
      'Animal 🐾 <|-- Duck', 'Animal 🐾 o-- Owner', 'Duck ..> Bread', 'Customer "1" --> "*" Ticket', 'Duck --> Pond : swims', 'Cage --> Keeper']) {
      expect(lines).toContain(line);
    }
    // Only what was really dropped is reported.
    expect(losses).toEqual(['`note for` is dropped']);
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
  });

  it('converts real-world state syntax: :::class, choice, named states with descriptions', async () => {
    const { dsl } = convert(`stateDiagram-v2
    [*] --> Still
    Still --> Moving : push
    state "Long name state" as LNS
    LNS : description here
    Moving --> LNS
    state if_state <<choice>>
    Moving --> if_state
    if_state --> Still : n < 0
    if_state --> LNS : n >= 0
    classDef bad fill:#f00
    Still:::bad
    Moving --> Crash:::bad`);
    const lines = dsl.split('\n').map((line) => line.trim());
    expect(dsl).not.toContain(':::');
    expect(dsl).not.toContain('::bad');
    expect(lines).toContain('Still [#f00]');
    expect(lines).toContain('Crash [#f00]');
    expect(lines.some((line) => /^if-state\b.*\[choice\]/.test(line) || /^if_state\b.*\[choice\]/.test(line))).toBe(true);
    expect(lines).toContain('lns = Long name state [desc: description here]');
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
  });

  it('converts real-world ER syntax: quoted names, aliases, word cardinalities, title', async () => {
    const { dsl, losses } = convert(`erDiagram
    title Store
    CUSTOMER ||--o{ ORDER : places
    "LINE-ITEM" {
        int qty
    }
    ORDER ||--|{ "LINE-ITEM" : contains
    p[Person] {
        string firstName
    }
    p only one to zero or more ORDER : owns
    PRODUCT one or more optionally to 1+ "LINE-ITEM" : "listed in"`);
    const lines = dsl.split('\n').map((line) => line.trim());
    expect(lines[1]).toBe('title: Store');
    for (const line of ['p = Person {', 'firstName string', 'qty int', 'ORDER ||--|{ LINE-ITEM : contains',
      'p ||--o{ ORDER : owns', 'PRODUCT }|..|{ LINE-ITEM : listed in']) {
      expect(lines).toContain(line);
    }
    expect(losses).toEqual([]);
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    expect(compiled.connectors).toHaveLength(4);
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

  // https://mermaid.js.org/syntax/stateDiagram.html#notes
  it('keeps multi-line state notes, one-line notes and notes on a composite, with their line breaks', async () => {
    const { dsl, losses } = convert(`stateDiagram-v2
  [*] --> Idle
  state Moving {
    Walking --> Running
  }
  Idle --> Moving
  note right of Idle
    Waits for a job.

    Retries twice.
  end note
  note left of Moving : one line only
  note right of Moving
    Whole box
    spans two lines
  end note`);
    expect(losses).toEqual([]);
    const lines = dsl.split('\n');
    expect(lines).toContain('note Idle : "Waits for a job.\\n\\nRetries twice."');
    expect(lines).toContain('note Moving : one line only');
    expect(lines).toContain('note Moving : "Whole box\\nspans two lines"');
    const compiled = await compile(dsl);
    expect(compiled.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    const stickies = compiled.nodes.filter((node) => node.kind === 'sticky').map((node) => node.content.label);
    expect(stickies).toEqual(['Waits for a job.\n\nRetries twice.', 'one line only', 'Whole box\nspans two lines']);
    expect(await format(dsl)).toContain('note Idle : "Waits for a job.\\n\\nRetries twice."');
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
