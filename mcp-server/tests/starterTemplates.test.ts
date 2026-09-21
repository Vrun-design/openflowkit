import { describe, expect, it } from 'vitest';
import { lintDsl } from '../src/lib/agent.js';
import { findStarterTemplate, STARTER_TEMPLATES } from '../src/lib/starterTemplates.js';
import { compileTemplate } from './helpers/compileTemplate.js';

describe('starter templates', () => {
  it('exposes a stable set of uniquely named templates', () => {
    expect(STARTER_TEMPLATES.length).toBeGreaterThan(0);
    const names = STARTER_TEMPLATES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const template of STARTER_TEMPLATES) expect(template.family).toBeTruthy();
  });

  for (const template of STARTER_TEMPLATES) {
    it(`template "${template.name}" lints clean and compiles to nodes`, async () => {
      const lint = lintDsl(template.dsl);
      expect(lint.diagnostics.filter((d) => d.severity === 'error'), template.name).toEqual([]);
      expect(lint.ok).toBe(true);
      expect(lint.family).toBe(template.family);

      const compiled = await compileTemplate(template.dsl);
      expect(compiled.nodes + compiled.groups, `${template.name} draws something`).toBeGreaterThan(0);
      expect(compiled.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    });
  }

  it('findStarterTemplate returns undefined for unknown names', () => {
    expect(findStarterTemplate('does-not-exist')).toBeUndefined();
  });
});
