import { describe, expect, it } from 'vitest';
import { JOURNEY_PLUGIN } from './plugin';

interface FuzzCase {
  name: string;
  input: string;
  expectError?: string;
  expectDiagnosticsIncludes?: string[];
}

const FUZZ_CASES: FuzzCase[] = [
  {
    name: 'mixed valid sections, title, and score+actor syntax',
    input: `
      journey
      title Signup
      section Discovery
        Visit landing page: 4: User
        Click sign up: 3: User
      section Activation
        Confirm email: 2: User
    `,
  },
  {
    name: 'invalid section and malformed step diagnostics',
    input: `
      journey
      section
      Open ticket: User
      Wait for response: 2: User
    `,
    expectDiagnosticsIncludes: [
      'Invalid journey section syntax at line',
      'Invalid journey score at line',
    ],
  },
  {
    name: 'invalid score with recovery on later valid steps',
    input: `
      journey
      section Support
        Open ticket: high: User
        Resolve issue: 5: Agent
    `,
    expectDiagnosticsIncludes: ['Invalid journey score at line'],
  },
  {
    name: 'missing header rejected',
    input: `
      section Signup
        Start: 5: User
    `,
    expectError: 'Missing journey header.',
  },
];

describe('JOURNEY_PLUGIN fuzz corpus', () => {
  it('handles noisy corpus inputs deterministically', () => {
    for (const fuzzCase of FUZZ_CASES) {
      const result = JOURNEY_PLUGIN.parseMermaid(fuzzCase.input);
      if (fuzzCase.expectError) {
        expect(result.error, fuzzCase.name).toBe(fuzzCase.expectError);
        continue;
      }

      expect(result.error, fuzzCase.name).toBeUndefined();
      expect(result.nodes.length, fuzzCase.name).toBeGreaterThan(0);
      expect(result.nodes.every((node) => node.type === 'journey'), fuzzCase.name).toBe(true);

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
