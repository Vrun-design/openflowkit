import { describe, expect, it } from 'vitest';
import { lintDsl, readAgentSource } from './lint';

describe('lintDsl', () => {
  it('names a misspelled family header instead of silently assuming architecture', () => {
    for (const [text, family] of [['flowchrt\nA -> B', 'flowchart'], ['sequnce right\nA -> B', 'sequence'], ['Flowchrt LR\nA -> B', 'flowchart'], ['architecure\nA -> B', 'architecture']] as const) {
      expect(lintDsl(text).diagnostics, text).toContainEqual(expect.objectContaining({
        code: 'W110', severity: 'warning', line: 1, message: expect.stringContaining(`\`${family}\``),
      }));
    }
  });

  it('leaves a header-less architecture document that starts with a node alone', () => {
    const nodes = ['Pipeline', 'Banker', 'Journal Service', 'Sequencer', 'Wireframes', 'mindmaps', 'Airframe', 'flowchrt Service']
      .map((first) => `${first}\n${first.split(' ')[0]} -> DB`);
    for (const text of ['api -> db', 'web\nweb -> api', 'stage\nstage -> prod', 'flowchart\nA -> B', ...nodes]) {
      expect(lintDsl(text).diagnostics.filter(({ code }) => code === 'W110'), text).toEqual([]);
    }
  });
});

describe('foreign source an agent sends', () => {
  // The code panel refuses to convert around a Mermaid line it cannot read; agents got a partial
  // diagram, ok: true and "Valid." instead, with the problem buried in converted.losses.
  const BROKEN = 'graph TD\n  A[Start --> B\n  B --> C';
  it('is not converted around a line the importer could not read', () => {
    expect(() => readAgentSource(BROKEN)).toThrow(/Mermaid line 2: .*fix it, then convert/);
    const report = lintDsl(BROKEN);
    expect(report.ok).toBe(false);
    expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: 'E004', severity: 'error', line: 2 }));
  });
  it('still converts with losses when every line was read', () => {
    expect(readAgentSource('graph TD\n  A --> B\n  style A stroke:#f00').converted?.losses.length).toBeGreaterThan(0);
  });
});
