import { describe, expect, it } from 'vitest';
import { ER_DIAGRAM_PLUGIN } from './erDiagram';

interface FuzzCase {
  name: string;
  input: string;
  expectError?: string;
  expectDiagnosticsIncludes?: string[];
}

const FUZZ_CASES: FuzzCase[] = [
  {
    name: 'dotted entities and strict cardinality relation',
    input: `
      erDiagram
      billing.Customer {
        uuid id PK
      }
      billing.Invoice {
        uuid id PK
      }
      billing.Customer ||--|{ billing.Invoice : owns
    `,
  },
  {
    name: 'malformed relation and declaration diagnostics',
    input: `
      erDiagram
      CUSTOMER {
        string id PK
      }
      entity ORDER {
      CUSTOMER -> ORDER
      random noise
    `,
    expectDiagnosticsIncludes: [
      'Invalid entity declaration at line',
      'Invalid erDiagram relation syntax at line',
      'Unrecognized erDiagram line at line',
    ],
  },
  {
    name: 'missing header rejected',
    input: `
      CUSTOMER ||--o{ ORDER : places
    `,
    expectError: 'Missing erDiagram header.',
  },
];

describe('ER_DIAGRAM_PLUGIN fuzz corpus', () => {
  it('handles noisy corpus inputs deterministically', () => {
    for (const fuzzCase of FUZZ_CASES) {
      const result = ER_DIAGRAM_PLUGIN.parseMermaid(fuzzCase.input);
      if (fuzzCase.expectError) {
        expect(result.error, fuzzCase.name).toBe(fuzzCase.expectError);
        continue;
      }

      expect(result.error, fuzzCase.name).toBeUndefined();
      expect(result.nodes.length, fuzzCase.name).toBeGreaterThan(0);
      expect(result.nodes.every((node) => node.type === 'er_entity'), fuzzCase.name).toBe(true);

      if (fuzzCase.expectDiagnosticsIncludes) {
        const diagnostics = result.diagnostics ?? [];
        fuzzCase.expectDiagnosticsIncludes.forEach((expectedMessage) => {
          expect(
            diagnostics.some((diagnostic) => diagnostic.includes(expectedMessage)),
            `${fuzzCase.name} should include diagnostic containing "${expectedMessage}"`
          ).toBe(true);
        });
      }
    }
  });
});
