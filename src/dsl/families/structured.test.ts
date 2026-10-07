import { describe, expect, it } from 'vitest';
import { deterministicLayout, type LayoutEdgeInput, type LayoutPort } from '../layout';
import { compile } from '../compile';
import { format, serialize } from '../serialize';

describe('erd family', () => {
  it('renders entities as er_entity nodes with structured fields', async () => {
    const result = await compile('erd\nusers [blue] {\nid uuid pk\nemail text unique\norg_id uuid fk\n}');
    const users = result.nodes[0]!;
    expect(users.kind).toBe('er_entity');
    expect(users.content).toMatchObject({ label: 'users', color: 'blue' });
    expect(users.content.erFields).toEqual([
      { name: 'id', dataType: 'uuid', isPrimaryKey: true },
      { name: 'email', dataType: 'text', isUnique: true },
      { name: 'org_id', dataType: 'uuid', isForeignKey: true },
    ]);
    // 44 header + padding + one 18px row per field.
    expect(users.size.height).toBeGreaterThanOrEqual(44 + 20 + 3 * 18);
  });

  it('decodes crow-foot relations into semantics', async () => {
    const result = await compile('erd\nusers { id uuid pk }\norders { id uuid pk }\nusers ||--o{ orders : places');
    const relation = result.connectors[0]!;
    expect(relation.semantics).toMatchObject({ erRelation: '||--o{' });
    expect(relation.labels[0]?.text).toBe('places');
    expect(serialize(result)).toContain('users ||--o{ orders : places');
  });

  it('accepts cardinality aliases and canonicalises them to glyphs', async () => {
    const result = await compile('erd\na { id int pk }\nb { id int pk }\na 1:N b : owns');
    expect(result.connectors[0]?.semantics).toMatchObject({ erRelation: '||--o{' });
    expect(serialize(result)).toContain('a ||--o{ b : owns');
    expect(await format('erd\na { id int pk }\nb { id int pk }\na one or many b')).toContain('||--o{');
  });

  it('auto-declares entities mentioned only in relations', async () => {
    const result = await compile('erd\nusers ||--o{ orders');
    expect(result.nodes.map((node) => node.id).sort()).toEqual(['orders', 'users']);
  });

  it('quotes field names with spaces', async () => {
    const result = await compile('erd\nusers {\n"full name" text\n}');
    const text = serialize(result);
    expect(text).toContain('"full name" text');
    expect(await format(text)).toBe(text);
  });
});

describe('class family', () => {
  it('splits members into compartments and keeps the divider', async () => {
    const result = await compile('class\nOrder [interface] {\n+id: UUID\n-items: Item[]\n---\n+total(): Money\n}');
    const order = result.nodes[0]!;
    expect(order.kind).toBe('class');
    expect(order.content).toMatchObject({
      label: 'Order', classStereotype: 'interface',
      classAttributes: ['+id: UUID', '-items: Item[]'],
      classMethods: ['+total(): Money'],
    });
    const text = serialize(result);
    expect(text).toContain('Order [interface] {');
    expect(text).toContain('  ---');
    expect(await format(text)).toBe(text);
  });

  it('maps relation tokens onto classRelation semantics', async () => {
    const result = await compile('class\nOrder { +id: int }\nBase { +id: int }\nItem { +sku: string }\nOrder --|> Base\nOrder *-- Item');
    expect(result.connectors.map((connector) => connector.semantics.classRelation)).toEqual(['--|>', '*--']);
  });

  it('normalises reversed relations by swapping endpoints', async () => {
    // `Order <|-- Base` reads as "Base inherits Order": canonical child --|> parent.
    const result = await compile('class\nBase { +id: int }\nOrder { +id: int }\nOrder <|-- Base');
    expect(result.connectors[0]).toMatchObject({ source: { nodeId: 'base' }, target: { nodeId: 'order' } });
    expect(result.connectors[0]?.semantics).toMatchObject({ classRelation: '--|>' });
    expect(serialize(result)).toContain('Base --|> Order');
  });

  it('keeps multiplicity beside the arrow', async () => {
    const result = await compile('class\nOrder { +id: int }\nItem { +sku: string }\nOrder "1" --> "*" Item : has');
    const relation = result.connectors[0]!;
    expect(relation.semantics).toMatchObject({ classRelation: '-->' });
    expect(relation.metadata.dsl).toMatchObject({ sourceCardinality: '1', targetCardinality: '*' });
    const text = serialize(result);
    expect(text).toContain('Order "1" --> "*" Item : has');
    expect(await format(text)).toBe(text);
  });

  it('canonicalises member spacing', async () => {
    const result = await compile('class\nOrder { +total( ) : Money\n+ id : int\n}');
    expect(result.nodes[0]?.content.classMethods).toEqual(['+total(): Money']);
    expect(result.nodes[0]?.content.classAttributes).toEqual(['+id: int']);
  });

  it('reports unknown relations and stray members', async () => {
    const result = await compile('class\nA { +id: int }\nB { }\nA ==> B : nope\nmember outside');
    const codes = result.diagnostics.map((item) => item.code);
    expect(codes).toContain('W101');
    expect(result.connectors).toHaveLength(0);
  });
});

describe('class layout', () => {
  // Found 2026-10-07: `Animal <|-- Duck` drew Duck above Animal. UML puts the parent on top,
  // however the arrow was written; a whole still sits above its parts.
  it('lays a parent above its children and a whole above its parts', async () => {
    let edges: readonly LayoutEdgeInput[] = [];
    const capture: LayoutPort = { run: async (graph, signal) => { edges = graph.edges; return deterministicLayout.run(graph, signal); } };
    await compile('class\nAnimal <|-- Duck\nBird --|> Animal\nFlyer <|.. Bird\nAnimal *-- Leg\nDuck --> Pond', { layout: capture });
    expect(edges.map((edge) => `${edge.sourceId}>${edge.targetId}`)).toEqual(['animal>duck', 'animal>bird', 'flyer>bird', 'animal>leg', 'duck>pond']);
  });
});

describe('groups in class and erd diagrams', () => {
  const CLASSES = `%% ofk 1
class

Loose {
}
group Zoo {
  Cage {
    +int size
  }
  Keeper {
  }
}
Cage --> Keeper : locks
Loose --> Cage
`;

  it('boxes the classes declared inside a group and leaves the others outside', async () => {
    const result = await compile(CLASSES);
    expect(result.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    const [zoo] = result.groups;
    expect(zoo).toMatchObject({ id: 'zoo', kind: 'frame', content: { label: 'Zoo' } });
    const parent = (id: string) => result.nodes.find((node) => node.id === id)!.parentId;
    expect(parent('cage')).toBe('zoo');
    expect(parent('keeper')).toBe('zoo');
    expect(parent('loose')).toBe(result.frame.id);
    // The box has room for what it holds: the members sit inside it.
    const cage = result.nodes.find((node) => node.id === 'cage')!;
    expect(zoo!.size.width).toBeGreaterThanOrEqual(cage.size.width);
    expect(zoo!.size.height).toBeGreaterThanOrEqual(cage.size.height);
  });

  it('writes the same text back, groups where they were declared', async () => {
    const result = await compile(CLASSES);
    expect(serialize(result)).toBe(CLASSES);
    expect(await format(CLASSES)).toBe(CLASSES);
  });

  it('nests a group in a group, and closes each with its own brace', async () => {
    const text = '%% ofk 1\nclass\n\ngroup Outer {\n  group Inner {\n    A {\n    }\n  }\n  B {\n  }\n}\nA --> B\n';
    const result = await compile(text);
    expect(result.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    expect(result.groups.map((group) => `${group.id}<${group.parentId === result.frame.id ? 'frame' : group.parentId}`)).toEqual(['outer<frame', 'inner<outer']);
    expect(result.nodes.find((node) => node.id === 'a')!.parentId).toBe('inner');
    expect(result.nodes.find((node) => node.id === 'b')!.parentId).toBe('outer');
    expect(serialize(result)).toBe(text);
  });

  it('boxes entities in an erd the same way, and warns about a stray close', async () => {
    const result = await compile('erd\ngroup Billing {\n  invoices {\n    id uuid pk\n  }\n}\nusers {\n  id uuid pk\n}\nusers ||--o{ invoices');
    expect(result.nodes.find((node) => node.id === 'invoices')!.parentId).toBe('billing');
    expect(result.nodes.find((node) => node.id === 'users')!.parentId).toBe(result.frame.id);
    const stray = await compile('class\nA {\n}\n}\n');
    expect(stray.diagnostics.map((item) => item.code)).toContain('W101');
  });
});
