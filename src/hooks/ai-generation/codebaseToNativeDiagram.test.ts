import { describe, expect, it } from 'vitest';
import { buildCodebaseNativeDiagram } from './codebaseToNativeDiagram';
import type { CodebaseAnalysis } from './codebaseAnalyzer';

function createAnalysis(): CodebaseAnalysis {
  return {
    files: [
      { path: 'src/api/routes.ts', content: '', language: 'typescript', imports: [] },
      { path: 'src/services/authService.ts', content: '', language: 'typescript', imports: [] },
      { path: 'src/models/user.ts', content: '', language: 'typescript', imports: [] },
      { path: 'src/index.ts', content: '', language: 'typescript', imports: [] },
    ],
    edges: [
      { from: 'src/api/routes.ts', to: 'src/services/authService.ts' },
      { from: 'src/services/authService.ts', to: 'src/models/user.ts' },
      { from: 'src/index.ts', to: 'src/api/routes.ts' },
    ],
    entryPoints: ['src/index.ts'],
    cloudPlatform: 'aws',
    detectedServices: [
      {
        name: 'S3',
        type: 'storage',
        provider: 'aws',
        resourceType: 'service',
        suggestedColor: 'emerald',
        iconPackId: 'aws-official-starter-v1',
        iconShapeId: 'storage-simple-storage-service',
        evidence: ['package.json'],
      },
    ],
    infraFiles: ['infra/main.tf'],
    stats: {
      totalFiles: 4,
      sourceFiles: 4,
      languages: { typescript: 4 },
      directories: 3,
    },
    summary: 'CODEBASE STRUCTURE',
  };
}

describe('buildCodebaseNativeDiagram', () => {
  it('builds a flat native repo structure diagram with cloud services', () => {
    const result = buildCodebaseNativeDiagram(createAnalysis());

    expect(result.dsl).toContain('flow: "Repository Module Structure"');
    expect(result.dsl).toContain('[system] file_src_api_routes_ts: routes');
    expect(result.dsl).toContain('subLabel: "src/api');
    expect(result.dsl).toContain(
      '[architecture] svc_s3: S3 { archProvider: "aws", archResourceType: "service", color: "emerald", archIconPackId: "aws-official-starter-v1", archIconShapeId: "storage-simple-storage-service" }'
    );
    expect(result.nodeCount).toBeGreaterThan(0);
    expect(result.edgeCount).toBe(0);
    expect(result.sectionCount).toBe(4);
    expect(result.platformServiceCount).toBe(1);
  });

  it('groups workspace packages into separate sections for monorepos', () => {
    const result = buildCodebaseNativeDiagram({
      ...createAnalysis(),
      files: [
        { path: 'apps/web/src/app/page.tsx', content: '', language: 'typescript', imports: [] },
        { path: 'apps/api/src/routes/users.ts', content: '', language: 'typescript', imports: [] },
        { path: 'packages/ui/src/button.tsx', content: '', language: 'typescript', imports: [] },
      ],
      edges: [
        { from: 'apps/web/src/app/page.tsx', to: 'apps/api/src/routes/users.ts' },
        { from: 'apps/web/src/app/page.tsx', to: 'packages/ui/src/button.tsx' },
      ],
      entryPoints: ['apps/web/src/app/page.tsx'],
      detectedServices: [],
    });

    expect(result.dsl).toContain('subLabel: "apps/web');
    expect(result.dsl).toContain('subLabel: "apps/api');
    expect(result.dsl).toContain('subLabel: "packages/ui');
  });
});
