// The editor's capability host: everything the op registry needs that only
// the live app can answer (worker layout, camera, raster, real export).
import { useMemo } from 'react';
import { grammarSection } from '../../../agent/host';
import type { OpCapabilities } from '../../../agent/ops/types';
import type { CompileOptions } from '../../../dsl/compile';
import { compile, compileWorkspace } from '../../../dsl/compile';
import { elkDslLayoutPort } from '../../../services/dsl/elkLayoutPort';
import { resolveDslIcon } from '../../../services/dsl/iconResolver';
import { SVG_SOURCES } from '../../../services/shapeLibrary/providerCatalog';
import { buildV2Export, bytesToBase64 } from './v2Export';

export interface V2AgentHostOptions {
  readonly fitView: (ids?: readonly string[]) => void;
}

const searchIcons = async (query: string, limit: number) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const scored = SVG_SOURCES
    .map((source) => {
      const haystack = `${source.provider}/${source.shapeId} ${source.label} ${source.category}`.toLowerCase();
      const exact = source.shapeId.toLowerCase() === needle || source.label.toLowerCase() === needle ? 100 : 0;
      const prefix = source.shapeId.toLowerCase().startsWith(needle) ? 80 : 0;
      const contains = haystack.includes(needle) ? 60 : 0;
      return { source, score: exact + prefix + contains };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.source.shapeId.localeCompare(b.source.shapeId))
    .slice(0, limit);
  return scored.map(({ source }) => ({ provider: source.provider, slug: source.shapeId, label: source.label, category: source.category }));
};

let grammarPromise: Promise<string> | null = null;
const loadGrammar = (): Promise<string> => {
  grammarPromise ??= import('../../../../docs/plan/grammar.md?raw').then((module) => module.default);
  return grammarPromise;
};

export function useV2AgentHost(options: V2AgentHostOptions): OpCapabilities {
  return useMemo<OpCapabilities>(() => ({
    compile: (text: string, compileOptions?: CompileOptions) =>
      compile(text, { ...compileOptions, layout: compileOptions?.layout ?? elkDslLayoutPort, resolveIcon: compileOptions?.resolveIcon ?? resolveDslIcon }),
    compileWorkspace: (text: string, compileOptions?: CompileOptions) =>
      compileWorkspace(text, { ...compileOptions, layout: compileOptions?.layout ?? elkDslLayoutPort, resolveIcon: compileOptions?.resolveIcon ?? resolveDslIcon }),
    syntax: (family?: string) => loadGrammar().then((grammar) => grammarSection(grammar, family)),
    searchIcons,
    exportFiles: async (request) => {
      const files = await buildV2Export(request);
      return files.map(({ filename, mime, text, bytes }) =>
        bytes ? { filename, mime, base64: bytesToBase64(bytes) } : { filename, mime, text: text ?? '' });
    },
    fitView: options.fitView,
  }), [options.fitView]);
}
