import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DSL_FAMILIES } from './ast';
import { grammarAppendix, grammarSection } from './grammar';

const GRAMMAR = readFileSync('src/dsl/grammar.md', 'utf8');

describe('grammarSection on the real grammar', () => {
  // §4's heading lists "all graph families: flowchart, architecture, state, erd, class", so a
  // substring match served that one generic section for five families and never their own rules.
  const RESERVED = new Set(['bpmn', 'org', 'gantt', 'sankey', 'journey', 'timeline']);
  it.each(DSL_FAMILIES)('serves %s its own section, with the cheat-sheet that makes it writable', (family) => {
    const served = grammarSection(GRAMMAR, family);
    expect(served).toMatch(RESERVED.has(family) ? /^### 8\.\d+ Later families/m : new RegExp(`^### 8\\.\\d+ ${family}\\b`, 'm'));
    expect(served).toContain(grammarAppendix(GRAMMAR));
    expect(served).not.toContain('## 4. Core statements');
    expect(served.length).toBeLessThan(GRAMMAR.length / 5);
  });

  it('does not let one family name match inside another (chart vs flowchart)', () => {
    expect(grammarSection(GRAMMAR, 'chart')).not.toMatch(/^### 8\.1 flowchart/m);
    expect(grammarSection(GRAMMAR, 'flowchart')).not.toMatch(/^### 8\.9 chart/m);
  });
});
