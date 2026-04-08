import { describe, expect, it } from 'vitest';
import {
  detectMermaidWithOfficialParser,
  getOfficialMermaidDiagnostics,
  isOfficialMermaidValidationBlocking,
  validateMermaidWithOfficialParser,
} from './officialMermaidValidation';

describe('officialMermaidValidation', () => {
  it('uses official Mermaid type detection for supported families', () => {
    const result = detectMermaidWithOfficialParser('flowchart TD\nA-->B');

    expect(result.isAvailable).toBe(true);
    expect(result.rawType).toBe('flowchart');
    expect(result.detectedType).toBe('flowchart');
    expect(result.validationMode).toBe('detection_only');
  });

  it('detects unsupported official Mermaid families without pretending they are missing headers', () => {
    const result = detectMermaidWithOfficialParser('gitGraph\ncommit id: "A"');

    expect(result.isValid).toBe(true);
    expect(result.rawType).toBe('gitGraph');
    expect(result.detectedType).toBeUndefined();
  });

  it('returns official parse diagnostics for invalid Mermaid syntax', async () => {
    const result = await validateMermaidWithOfficialParser('flowchart TD\nA -->');

    if (result.validationMode === 'full') {
      expect(result.isValid).toBe(false);
      expect(result.diagnostics[0]?.code).toBe('MERMAID_OFFICIAL_PARSE');
      expect(result.diagnostics[0]?.message).toContain('Parse error');
      return;
    }

    expect(result.validationMode).toBe('detection_only');
    expect(result.diagnostics[0]?.message).toContain('browser-like DOM runtime');
  });

  it('maps official architecture syntax detection to the architecture family', () => {
    const result = detectMermaidWithOfficialParser(
      'architecture-beta\nservice api(server)[API]\nservice db(database)[Database]\napi:R --> L:db'
    );

    expect(result.rawType).toBe('architecture-beta');
    expect(result.detectedType).toBe('architecture');
  });

  it('treats detection-only official validation warnings as non-blocking diagnostics', async () => {
    const result = await validateMermaidWithOfficialParser('flowchart TD\nA[Start] --> B[End]');

    if (result.validationMode === 'full') {
      expect(isOfficialMermaidValidationBlocking(result)).toBe(false);
      expect(getOfficialMermaidDiagnostics(result)).toEqual([]);
      return;
    }

    expect(isOfficialMermaidValidationBlocking(result)).toBe(false);
    expect(getOfficialMermaidDiagnostics(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining('browser-like DOM runtime'),
        }),
      ])
    );
  });
});
