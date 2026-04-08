import { describe, expect, it } from 'vitest';
import { ER_DIAGRAM_PLUGIN } from './plugin';

describe('ER_DIAGRAM_PLUGIN', () => {
  it('parses entities and relationships', () => {
    const input = `
      erDiagram
      CUSTOMER {
        string id PK
        string name
      }
      ORDER {
        string id PK
        string customer_id FK
      }
      CUSTOMER ||--o{ ORDER : places
    `;

    const result = ER_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes.find((node) => node.id === 'CUSTOMER')?.data.erFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'id',
          dataType: 'string',
          isPrimaryKey: true,
        }),
      ])
    );
  });

  it('returns error when header is missing', () => {
    const result = ER_DIAGRAM_PLUGIN.parseMermaid('CUSTOMER ||--o{ ORDER : places');
    expect(result.error).toContain('Missing erDiagram header');
  });

  it('parses dotted entities and complex cardinality tokens', () => {
    const input = `
      erDiagram
      billing.Customer {
        uuid id PK
      }
      billing.Invoice {
        uuid id PK
      }
      billing.Customer ||--|{ billing.Invoice : owns
    `;

    const result = ER_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes.find((node) => node.id === 'billing.Customer')).toBeDefined();
    expect(result.edges[0].source).toBe('billing.Customer');
    expect(result.edges[0].target).toBe('billing.Invoice');
  });

  it('emits diagnostics for malformed entity and relation lines', () => {
    const input = `
      erDiagram
      CUSTOMER {
        string id PK
      }
      entity ORDER {
      CUSTOMER -> ORDER
      random text
    `;

    const result = ER_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.diagnostics?.some((message) => message.includes('Invalid entity declaration at line'))).toBe(true);
    expect(result.diagnostics?.some((message) => message.includes('Invalid erDiagram relation syntax at line'))).toBe(true);
    expect(result.diagnostics?.some((message) => message.includes('Unrecognized erDiagram line at line'))).toBe(true);
  });

  it('emits diagnostics when entity blocks are left unclosed', () => {
    const input = `
      erDiagram
      CUSTOMER {
        string id PK
    `;

    const result = ER_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.diagnostics?.some((message) => message.includes('Unclosed entity block started at line'))).toBe(true);
  });

  it('parses ER field uniqueness and references metadata', () => {
    const input = `
      erDiagram
      ORDER {
        uuid id PK
        uuid customer_id FK REFERENCES CUSTOMER.id
        string external_id UK
      }
    `;

    const result = ER_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes).toHaveLength(1);

    const fields = result.nodes[0].data.erFields ?? [];
    expect(fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'customer_id',
          isForeignKey: true,
          referencesTable: 'CUSTOMER',
          referencesField: 'id',
        }),
        expect.objectContaining({
          name: 'external_id',
          isUnique: true,
        }),
      ])
    );
  });

  it('parses table-only REFERENCES syntax used by Mermaid-compatible export', () => {
    const input = `
      erDiagram
      ORDER {
        uuid customer_id FK REFERENCES CUSTOMER
      }
    `;

    const result = ER_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    const fields = result.nodes[0].data.erFields ?? [];
    expect(fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'customer_id',
          isForeignKey: true,
          referencesTable: 'CUSTOMER',
          referencesField: undefined,
        }),
      ])
    );
  });
});
