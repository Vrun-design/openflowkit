import { describe, expect, it } from 'vitest';
import { parseMermaidByType } from './parseMermaidByType';
import type { MermaidImportStatus } from './importContracts';
import { MERMAID_COMPAT_FIXTURES } from '../../../scripts/mermaid-compat-fixtures.mjs';

describe('mermaid compat fixture corpus', () => {
  it('measures actual OpenFlowKit import outcomes for the fixture corpus', () => {
    const fixtures = MERMAID_COMPAT_FIXTURES as Array<{
      name: string;
      family: string;
      expectedImportState: MermaidImportStatus;
      expectedOfficial: 'valid' | 'invalid' | 'environment_limited';
      expectedEditableGate: 'supported_family' | 'unsupported_family' | 'invalid_source';
      source: string;
    }>;

    const outcomeCounts = {
      editable_full: 0,
      editable_partial: 0,
      unsupported_construct: 0,
      unsupported_family: 0,
      invalid_source: 0,
    } as Record<string, number>;

    for (const fixture of fixtures) {
      const result = parseMermaidByType(fixture.source);
      outcomeCounts[result.importState ?? 'invalid_source'] += 1;

      expect(result.originalSource?.trim(), fixture.name).toBe(fixture.source.trim());
      expect(Array.isArray(result.structuredDiagnostics), fixture.name).toBe(true);
      expect(result.importState, fixture.name).toBe(fixture.expectedImportState);

      if (fixture.expectedEditableGate === 'unsupported_family') {
        expect(result.importState, fixture.name).toBe('unsupported_family');
        continue;
      }

      if (fixture.expectedEditableGate === 'invalid_source') {
        expect(result.importState, fixture.name).toBe('invalid_source');
        continue;
      }

      expect(result.importState, fixture.name).not.toBe('unsupported_family');

      if (fixture.expectedOfficial === 'valid') {
        expect(result.diagramType, fixture.name).toBeDefined();
      }
    }

    expect(
      outcomeCounts.editable_full
      + outcomeCounts.editable_partial
      + outcomeCounts.unsupported_construct
    ).toBeGreaterThan(0);
    expect(outcomeCounts.unsupported_family).toBeGreaterThan(0);
    expect(outcomeCounts.invalid_source).toBeGreaterThan(0);
  });
});
