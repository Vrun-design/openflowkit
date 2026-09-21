import { describe, expect, it } from 'vitest';
import { ARCHITECTURE_PLUGIN } from './architecture';

interface FuzzCase {
  name: string;
  input: string;
  expectError?: string;
  expectDiagnosticsIncludes?: string[];
}

const FUZZ_CASES: FuzzCase[] = [
  {
    name: 'mixed direction tokens and spacing',
    input: `
      architecture-beta
      service web(server)[Web]
      service api(server)[API]
      service db(database)[DB]
      web :R --> L:api: https:443
      api -- db : tcp:5432
      db <-> web
    `,
  },
  {
    name: 'implicit node recovery from edges',
    input: `
      architecture-beta
      service ingress(server)[Ingress]
      ingress --> worker
      worker --> cache
    `,
  },
  {
    name: 'diagnostics-only malformed lines',
    input: `
      architecture-beta
      service api(server)[API]
      nonsense row that should be diagnostic
      api -> db
    `,
    expectDiagnosticsIncludes: [
      'Unrecognized architecture line',
      'Invalid architecture edge syntax',
    ],
  },
  {
    name: 'duplicate ids + invalid node syntax + implicit recovery',
    input: `
      architecture-beta
      service api(server)[API]
      service api(server)[API Duplicate]
      service broken node syntax
      api --> cache
    `,
    expectDiagnosticsIncludes: [
      'Duplicate architecture node id "api"',
      'Invalid architecture node syntax',
      'Recovered implicit service node "cache"',
    ],
  },
  {
    name: 'crlf tolerance and side-qualified edges',
    input: 'architecture-beta\r\nservice web(server)[Web]\r\nservice api(server)[API]\r\nweb:R --> L:api : https:443\r\n',
  },
  {
    name: 'missing header rejected',
    input: `
      service api(server)[API]
      api --> db
    `,
    expectError: 'Missing architecture header.',
  },
];

describe('ARCHITECTURE_PLUGIN fuzz corpus', () => {
  it('handles corpus inputs without crashing and with deterministic outcomes', () => {
    for (const fuzzCase of FUZZ_CASES) {
      const result = ARCHITECTURE_PLUGIN.parseMermaid(fuzzCase.input);
      if (fuzzCase.expectError) {
        expect(result.error, fuzzCase.name).toBe(fuzzCase.expectError);
        continue;
      }
      expect(result.error, fuzzCase.name).toBeUndefined();
      expect(result.nodes.length, fuzzCase.name).toBeGreaterThan(0);
      expect(result.nodes.every((node) => node.type === 'architecture'), fuzzCase.name).toBe(true);
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
