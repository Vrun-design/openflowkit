import { describe, expect, it } from 'vitest';
import { MINDMAP_PLUGIN } from './mindmap';

interface FuzzCase {
  name: string;
  input: string;
  expectError?: string;
  expectDiagnosticsIncludes?: string[];
}

const FUZZ_CASES: FuzzCase[] = [
  {
    name: 'mixed directives and wrapped labels',
    input: `
      mindmap
        Root((Roadmap))
          Child A::icon(fa fa-book)
          ::class styleNode
          Child B
    `,
  },
  {
    name: 'indent jump and malformed wrapper diagnostics',
    input: `
      mindmap
        Root
            Jumped
          bad((Unclosed
          Normal
    `,
    expectDiagnosticsIncludes: [
      'Mindmap indentation jump at line',
      'Malformed mindmap wrapper syntax at line',
    ],
  },
  {
    name: 'missing header rejected',
    input: `
      Root
        Child
    `,
    expectError: 'Missing mindmap header.',
  },
];

describe('MINDMAP_PLUGIN fuzz corpus', () => {
  it('handles noisy corpus inputs deterministically', () => {
    for (const fuzzCase of FUZZ_CASES) {
      const result = MINDMAP_PLUGIN.parseMermaid(fuzzCase.input);
      if (fuzzCase.expectError) {
        expect(result.error, fuzzCase.name).toBe(fuzzCase.expectError);
        continue;
      }

      expect(result.error, fuzzCase.name).toBeUndefined();
      expect(result.nodes.length, fuzzCase.name).toBeGreaterThan(0);
      expect(result.nodes.every((node) => node.type === 'mindmap'), fuzzCase.name).toBe(true);

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
