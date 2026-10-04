import { describe, expect, it } from 'vitest';
import { compile } from '../dsl/compile';
import { STARTER_TEMPLATES, findStarterTemplate } from './starterTemplates';

describe('starter templates', () => {
  it('each compiles to a real diagram of its family, without errors or warnings', async () => {
    for (const template of STARTER_TEMPLATES) {
      const compiled = await compile(template.dsl);
      expect(compiled.meta.family, template.name).toBe(template.family);
      expect(compiled.diagnostics.filter(({ severity }) => severity !== 'info'), template.name).toEqual([]);
      expect(compiled.nodes.length, template.name).toBeGreaterThan(2);
    }
    expect(findStarterTemplate('auth-flow')?.title).toBe('User authentication');
  });
});
