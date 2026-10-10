import { describe, expect, it } from 'vitest';
import { lintDsl } from './lint';

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
