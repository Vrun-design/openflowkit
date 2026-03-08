import { describe, expect, it } from 'vitest';
import { PUBLIC_DOCS_GLOB_PATTERNS, PUBLIC_DOCS_SLUGS } from './docsMarkdownLoaders';

describe('docsMarkdownLoaders', () => {
  it('includes only curated public docs slugs', () => {
    expect(PUBLIC_DOCS_SLUGS).toContain('introduction');
    expect(PUBLIC_DOCS_SLUGS).toContain('roadmap');
    expect(PUBLIC_DOCS_SLUGS).not.toContain('ENGINEERING_AUDIT_2026-03-07');
    expect(PUBLIC_DOCS_SLUGS).not.toContain('PAX_ROMANA');
    expect(PUBLIC_DOCS_SLUGS).not.toContain('SAFE_EXECUTION_PLAN_2026-03-05');
  });

  it('builds language-scoped glob patterns for public docs only', () => {
    expect(PUBLIC_DOCS_GLOB_PATTERNS).toEqual([
      expect.stringContaining('/docs/en/{'),
      expect.stringContaining('/docs/tr/{'),
    ]);
    expect(PUBLIC_DOCS_GLOB_PATTERNS.join(' ')).not.toContain('PAX_ROMANA');
    expect(PUBLIC_DOCS_GLOB_PATTERNS.join(' ')).not.toContain('ENGINEERING_AUDIT_2026-03-07');
  });
});
