import { describe, expect, it } from 'vitest';
import { detectMermaidWithOfficialParser } from './officialMermaidValidation';

describe('officialMermaidValidation', () => {
  it('detects supported families from the header', () => {
    const result = detectMermaidWithOfficialParser('flowchart TD\nA-->B');
    expect(result.isValid).toBe(true);
    expect(result.rawType).toBe('flowchart');
    expect(result.detectedType).toBe('flowchart');
  });

  it('detects unsupported families without pretending the header is missing', () => {
    const result = detectMermaidWithOfficialParser('gitGraph\ncommit id: "A"');
    expect(result.isValid).toBe(true);
    expect(result.rawType).toBe('gitGraph');
    expect(result.detectedType).toBeUndefined();
  });

  it('maps architecture-beta to the architecture family', () => {
    expect(detectMermaidWithOfficialParser('architecture-beta\nservice a').detectedType).toBe('architecture');
  });
});
