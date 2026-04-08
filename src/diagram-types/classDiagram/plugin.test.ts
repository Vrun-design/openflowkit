import { describe, expect, it } from 'vitest';
import { CLASS_DIAGRAM_PLUGIN } from './plugin';

describe('CLASS_DIAGRAM_PLUGIN', () => {
  it('parses class blocks and relationships', () => {
    const input = `
      classDiagram
      class User {
        +id: UUID
        +name: String
        +create(name: String): User
      }
      class Account
      User --> Account : owns
    `;

    const result = CLASS_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes.find((node) => node.id === 'User')?.data.classAttributes).toContain('+id: UUID');
    expect(result.nodes.find((node) => node.id === 'User')?.data.classMethods).toContain(
      '+create(name: String): User'
    );
  });

  it('returns error when header is missing', () => {
    const result = CLASS_DIAGRAM_PLUGIN.parseMermaid('class User');
    expect(result.error).toContain('Missing classDiagram header');
  });

  it('parses inline class blocks, stereotypes, and dotted identifiers', () => {
    const input = `
      classDiagram
      class Domain.User <<aggregate>>
      class Domain.Account{+id: UUID;+balance(): Money}
      Domain.User --> Domain.Account : owns
    `;

    const result = CLASS_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes.find((node) => node.id === 'Domain.User')?.data.classStereotype).toBe('aggregate');
    expect(result.nodes.find((node) => node.id === 'Domain.Account')?.data.classAttributes).toContain('+id: UUID');
    expect(result.nodes.find((node) => node.id === 'Domain.Account')?.data.classMethods).toContain('+balance(): Money');
  });

  it('normalizes generic class identifiers and preserves relation cardinality metadata', () => {
    const input = `
      classDiagram
      class Repository~T~ {
        +findById(id: UUID): T
      }
      class User
      Repository~T~ "1" --> "*" User : stores
    `;

    const result = CLASS_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes.find((node) => node.id === 'Repository<T>')?.data.label).toBe('Repository<T>');
    expect(result.edges[0].data.classRelationSourceCardinality).toBe('1');
    expect(result.edges[0].data.classRelationTargetCardinality).toBe('*');
  });

  it('emits diagnostics for malformed class lines and relation syntax', () => {
    const input = `
      classDiagram
      class User {
        +id: UUID
      }
      malformed text
      class Broken ??? 
      User -> Account
      random words
    `;

    const result = CLASS_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.diagnostics?.some((message) => message.includes('Invalid class declaration at line'))).toBe(true);
    expect(result.diagnostics?.some((message) => message.includes('Invalid class relation syntax at line'))).toBe(true);
    expect(result.diagnostics?.some((message) => message.includes('Unrecognized classDiagram line at line'))).toBe(true);
  });

  it('emits diagnostics when class blocks are left unclosed', () => {
    const input = `
      classDiagram
      class User {
        +id: UUID
    `;

    const result = CLASS_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.diagnostics?.some((message) => message.includes('Unclosed class block started at line'))).toBe(true);
  });
});
