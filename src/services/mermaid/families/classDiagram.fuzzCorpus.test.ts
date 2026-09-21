import { describe, expect, it } from 'vitest';
import { CLASS_DIAGRAM_PLUGIN } from './classDiagram';

interface FuzzCase {
  name: string;
  input: string;
  expectError?: string;
  expectDiagnosticsIncludes?: string[];
}

const FUZZ_CASES: FuzzCase[] = [
  {
    name: 'dotted ids, inline block, and stereotype',
    input: `
      classDiagram
      class Domain.User <<aggregate>>
      class Domain.Account{+id: UUID;+balance(): Money}
      Domain.User --> Domain.Account : owns
    `,
  },
  {
    name: 'malformed lines with partial recovery',
    input: `
      classDiagram
      class User
      class Broken ???
      User -> Account
      random stray text
    `,
    expectDiagnosticsIncludes: [
      'Invalid class declaration at line',
      'Invalid class relation syntax at line',
      'Unrecognized classDiagram line at line',
    ],
  },
  {
    name: 'missing header rejected',
    input: `
      class User
      User --> Account
    `,
    expectError: 'Missing classDiagram header.',
  },
];

describe('CLASS_DIAGRAM_PLUGIN fuzz corpus', () => {
  it('handles noisy corpus inputs deterministically', () => {
    for (const fuzzCase of FUZZ_CASES) {
      const result = CLASS_DIAGRAM_PLUGIN.parseMermaid(fuzzCase.input);
      if (fuzzCase.expectError) {
        expect(result.error, fuzzCase.name).toBe(fuzzCase.expectError);
        continue;
      }

      expect(result.error, fuzzCase.name).toBeUndefined();
      expect(result.nodes.length, fuzzCase.name).toBeGreaterThan(0);
      expect(result.nodes.every((node) => node.type === 'class'), fuzzCase.name).toBe(true);

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
