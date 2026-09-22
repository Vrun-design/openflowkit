// Test-only capability host: a deterministic in-process stand-in for the two
// real hosts (live editor, MCP file server). Not imported by production code.
import { compile, compileWorkspace } from '../../dsl/compile';
import { deterministicLayout } from '../../dsl/layout';
import type { OpCapabilities } from './types';

export interface TestHostRecording {
  readonly exported: Array<Record<string, unknown>>;
  readonly fitted: Array<readonly string[] | undefined>;
  readonly syntaxCalls: string[];
}

export function createTestCapabilities(icons: readonly { provider: string; slug: string; label: string }[] = [
  { provider: 'aws', slug: 'elasticache', label: 'ElastiCache' },
  { provider: 'aws', slug: 'lambda', label: 'Lambda' },
  { provider: 'azure', slug: 'cache-for-redis', label: 'Cache for Redis' },
]): OpCapabilities & { readonly recording: TestHostRecording } {
  const recording: TestHostRecording = { exported: [], fitted: [], syntaxCalls: [] };
  return {
    recording,
    compile: (text, options) => compile(text, { ...options, layout: options?.layout ?? deterministicLayout }),
    compileWorkspace: (text, options) => compileWorkspace(text, { ...options, layout: options?.layout ?? deterministicLayout }),
    syntax: (family) => {
      recording.syntaxCalls.push(family ?? 'all');
      return family ? `## family ${family}` : '## grammar';
    },
    searchIcons: async (query, limit) => icons
      .filter(({ slug, label }) => `${slug} ${label}`.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit)
      .map((icon) => ({ ...icon, category: 'test' })),
    exportFiles: async (request) => {
      recording.exported.push({ ...request });
      return request.format === 'png'
        ? [{ filename: 'diagram.png', mime: 'image/png', base64: 'UE5H' }]
        : [{ filename: `diagram.${request.format === 'json' ? 'json' : request.format}`, mime: 'text/plain', text: `<${request.format}/>` }];
    },
    fitView: (ids) => { recording.fitted.push(ids); },
  };
}
