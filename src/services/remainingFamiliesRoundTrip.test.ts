import { describe, expect, it } from 'vitest';
import { parseMermaidByType } from '@/services/mermaid/parseMermaidByType';
import { toMermaid } from './exportService';

describe('remaining Mermaid family round-trip', () => {
  it('preserves mindmap family through parse/export/parse', () => {
    const source = `
      mindmap
        root((Root))
          feature[[Child A]]
            Grandchild
          (Child B)
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('mindmap');
    expect(first.nodes.length).toBeGreaterThan(0);

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported.startsWith('mindmap')).toBe(true);
    expect(exported).toContain('root((Root))');
    expect(exported).toContain('feature[[Child A]]');
    expect(exported).toContain('((Root))');
    expect(exported).toContain('[[Child A]]');
    expect(exported).toContain('(Child B)');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('mindmap');
    expect(second.nodes).toHaveLength(first.nodes.length);
    expect(second.edges).toHaveLength(first.edges.length);
    expect(second.nodes.find((node) => node.data.label === 'Root')?.data.mindmapAlias).toBe('root');
    expect(second.nodes.find((node) => node.data.label === 'Child A')?.data.mindmapAlias).toBe('feature');
    expect(second.nodes.find((node) => node.data.label === 'Root')?.data.mindmapWrapper).toBe('double-circle');
    expect(second.nodes.find((node) => node.data.label === 'Child A')?.data.mindmapWrapper).toBe('double-square');
    expect(second.nodes.find((node) => node.data.label === 'Child B')?.data.mindmapWrapper).toBe('rounded');
  });

  it('preserves journey family through parse/export/parse', () => {
    const source = `
      journey
      title Checkout
      section Happy Path
      Visit catalog: 5: Buyer
      Add to cart: 4: Buyer
      section Payment
      Pay: 3: Buyer
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('journey');
    expect(first.nodes.length).toBeGreaterThan(0);

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported.startsWith('journey')).toBe(true);
    expect(exported).toContain('title Checkout');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('journey');
    expect(second.nodes).toHaveLength(first.nodes.length);
    expect(second.edges).toHaveLength(first.edges.length);
    expect(second.nodes[0].data.journeyTitle).toBe('Checkout');
  });

  it('preserves classDiagram family relation semantics through parse/export/parse', () => {
    const source = `
      classDiagram
      class User {
        +id: UUID
        +name: String
      }
      class Account
      User "1" o-- "*" Account : owns
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('classDiagram');
    expect(first.nodes.length).toBeGreaterThan(0);
    expect(first.edges.length).toBe(1);

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported.startsWith('classDiagram')).toBe(true);
    expect(exported).toContain('User "1" o-- "*" Account : owns');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('classDiagram');
    expect(second.nodes).toHaveLength(first.nodes.length);
    expect(second.edges).toHaveLength(first.edges.length);
    expect(second.edges[0].data?.classRelation).toBe('o--');
    expect(second.edges[0].data?.classRelationLabel).toBe('owns');
    expect(second.edges[0].data?.classRelationSourceCardinality).toBe('1');
    expect(second.edges[0].data?.classRelationTargetCardinality).toBe('*');
  });

  it('preserves classDiagram generic identifiers through parse/export/parse', () => {
    const source = `
      classDiagram
      class Repository~T~ {
        +findById(id: UUID): T
      }
      class User
      Repository~T~ "1" --> "*" User : stores
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('classDiagram');
    expect(first.nodes.find((node) => node.id === 'Repository<T>')).toBeDefined();

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported).toContain('class Repository~T~ {');
    expect(exported).toContain('Repository~T~ "1" --> "*" User : stores');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('classDiagram');
    expect(second.nodes.find((node) => node.id === 'Repository<T>')).toBeDefined();
    expect(second.edges[0].data?.classRelationSourceCardinality).toBe('1');
    expect(second.edges[0].data?.classRelationTargetCardinality).toBe('*');
  });

  it('preserves erDiagram family relation semantics through parse/export/parse', () => {
    const source = `
      erDiagram
      CUSTOMER {
        string id PK
      }
      ORDER {
        string id PK
      }
      CUSTOMER ||--o{ ORDER : places
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('erDiagram');
    expect(first.nodes.length).toBeGreaterThan(0);
    expect(first.edges.length).toBe(1);

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported.startsWith('erDiagram')).toBe(true);
    expect(exported).toContain('CUSTOMER ||--o{ ORDER : places');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('erDiagram');
    expect(second.nodes).toHaveLength(first.nodes.length);
    expect(second.edges).toHaveLength(first.edges.length);
    expect(second.edges[0].data?.erRelation).toBe('||--o{');
    expect(second.edges[0].data?.erRelationLabel).toBe('places');
  });

  it('preserves erDiagram field metadata through parse/export/parse', () => {
    const source = `
      erDiagram
      ORDER {
        uuid id PK
        uuid customer_id FK REFERENCES CUSTOMER.id
        string external_id UNIQUE
        timestamp created_at NN
      }
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('erDiagram');

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported).toContain('uuid id PK');
    expect(exported).toContain('uuid customer_id FK REFERENCES CUSTOMER');
    expect(exported).toContain('string external_id UK');
    expect(exported).toContain('timestamp created_at NN');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('erDiagram');

    const fields = second.nodes[0].data.erFields ?? [];
    expect(fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'id',
          dataType: 'uuid',
          isPrimaryKey: true,
        }),
        expect.objectContaining({
          name: 'customer_id',
          dataType: 'uuid',
          isForeignKey: true,
          referencesTable: 'CUSTOMER',
        }),
        expect.objectContaining({
          name: 'external_id',
          dataType: 'string',
          isUnique: true,
        }),
        expect.objectContaining({
          name: 'created_at',
          dataType: 'timestamp',
          isNotNull: true,
        }),
      ])
    );
  });

  it('preserves sequence notes and aliases through parse/export/parse', () => {
    const source = `
      sequenceDiagram
      actor U as User
      participant API as Backend API
      note over U, API: warm path
      U->>API: Request
      API-->>U: Response
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('sequence');
    expect(first.nodes.some((node) => node.type === 'sequence_note')).toBe(true);

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported.startsWith('sequenceDiagram')).toBe(true);
    expect(exported).toContain('actor U as User');
    expect(exported).toContain('participant API as Backend API');
    expect(exported).toContain('note over U, API: warm path');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('sequence');
    const noteNode = second.nodes.find((node) => node.type === 'sequence_note');
    expect(noteNode?.data.seqNoteTargets).toEqual(['U', 'API']);
    expect(second.edges).toHaveLength(first.edges.length);
  });

  it('preserves sequence activation commands through parse/export/parse', () => {
    const source = `
      sequenceDiagram
      participant A
      participant B
      A->>B: Request
      activate B
      B-->>A: Response
      deactivate B
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('sequence');

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported).toContain('activate B');
    expect(exported).toContain('deactivate B');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('sequence');
    expect(second.nodes.find((node) => node.id === 'B')?.data.seqActivations).toEqual([
      { order: 1, activate: true },
      { order: 2, activate: false },
    ]);
  });

  it('preserves sequence alt/else branches through parse/export/parse', () => {
    const source = `
      sequenceDiagram
      participant A
      participant B
      alt success
        A->>B: Request
      else failure
        B-->>A: Error
      end
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('sequence');

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported).toContain('alt success');
    expect(exported).toContain('else failure');
    expect(exported).not.toContain('alt failure');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('sequence');
    expect(second.edges[0].data?.seqFragment).toMatchObject({
      type: 'alt',
      condition: 'success',
      branchKind: 'start',
    });
    expect(second.edges[1].data?.seqFragment).toMatchObject({
      type: 'alt',
      condition: 'failure',
      branchKind: 'else',
    });
  });

  it('preserves sequence par/and branches through parse/export/parse', () => {
    const source = `
      sequenceDiagram
      participant A
      participant B
      participant C
      par fast lane
        A->>B: Request
      and slow lane
        A->>C: Request
      end
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('sequence');

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported).toContain('par fast lane');
    expect(exported).toContain('and slow lane');
    expect(exported).not.toContain('par slow lane');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('sequence');
    expect(second.edges[0].data?.seqFragment).toMatchObject({
      type: 'par',
      condition: 'fast lane',
      branchKind: 'start',
    });
    expect(second.edges[1].data?.seqFragment).toMatchObject({
      type: 'par',
      condition: 'slow lane',
      branchKind: 'and',
    });
  });

  it('preserves sequence notes inside fragment blocks through parse/export/parse', () => {
    const source = `
      sequenceDiagram
      participant A
      participant B
      alt success
        note over A, B: Shared context
        A->>B: Request
      else failure
        B-->>A: Error
      end
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('sequence');
    expect(first.nodes.find((node) => node.type === 'sequence_note')?.data.seqFragment).toMatchObject({
      type: 'alt',
      condition: 'success',
      branchKind: 'start',
    });

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported).toContain('alt success');
    expect(exported).toContain('note over A, B: Shared context');
    expect(exported).toContain('else failure');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('sequence');
    expect(second.nodes.find((node) => node.type === 'sequence_note')?.data.seqFragment).toMatchObject({
      type: 'alt',
      condition: 'success',
      branchKind: 'start',
    });
  });
});
