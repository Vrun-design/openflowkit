// The editor's capability host: everything the op registry needs that only
// the live app can answer (worker layout, camera, raster, real export).
import { useMemo } from 'react';
import { grammarSection } from '../../../agent/host';
import type { ExportFormat, ExportRequest, OpCapabilities } from '../../../agent/ops/types';
import type { CompileOptions } from '../../../dsl/compile';
import { compile, compileWorkspace } from '../../../dsl/compile';
import { elkDslLayoutPort } from '../../../services/dsl/elkLayoutPort';
import { resolveDslIcon } from '../../../services/dsl/iconResolver';
import { SVG_SOURCES } from '../../../services/shapeLibrary/providerCatalog';
import { buildV2Export, bytesToBase64 } from './v2Export';
import { animatedSvgFor, buildMotionRasterFile } from './v2Motion';

const MOTION_FORMATS: readonly ExportFormat[] = ['svg-animated', 'gif', 'mp4', 'webm'];

export interface V2AgentHostOptions {
  readonly fitView: (ids?: readonly string[]) => void;
  /** The user's "Icons from labels" setting; a DSL `icons:` line still wins. */
  readonly autoIcons: boolean;
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
  grammarPromise ??= import('../../../dsl/grammar.md?raw').then((module) => module.default);
  return grammarPromise;
};

export function useV2AgentHost(options: V2AgentHostOptions): OpCapabilities {
  return useMemo<OpCapabilities>(() => ({
    compile: (text: string, compileOptions?: CompileOptions) =>
      compile(text, { autoIcons: options.autoIcons, ...compileOptions, layout: compileOptions?.layout ?? elkDslLayoutPort, resolveIcon: compileOptions?.resolveIcon ?? resolveDslIcon }),
    compileWorkspace: (text: string, compileOptions?: CompileOptions) =>
      compileWorkspace(text, { autoIcons: options.autoIcons, ...compileOptions, layout: compileOptions?.layout ?? elkDslLayoutPort, resolveIcon: compileOptions?.resolveIcon ?? resolveDslIcon }),
    syntax: (family?: string) => loadGrammar().then((grammar) => grammarSection(grammar, family)),
    searchIcons,
    exportFiles: async (request: ExportRequest) => {
      if (!MOTION_FORMATS.includes(request.format)) {
        const files = await buildV2Export(request as Parameters<typeof buildV2Export>[0]);
        return files.map(({ filename, mime, text, bytes }) =>
          bytes ? { filename, mime, base64: bytesToBase64(bytes) } : { filename, mime, text: text ?? '' });
      }
      const motion = {
        document: request.document, pageId: request.pageId,
        preset: request.preset, order: request.order, durationMs: request.durationMs,
        loop: request.loop, theme: request.theme,
      };
      if (request.format === 'svg-animated') {
        return [{ filename: `${request.document.id}.svg`, mime: 'image/svg+xml', text: animatedSvgFor(motion) }];
      }
      const file = await buildMotionRasterFile({
        ...motion,
        format: request.format as 'gif' | 'mp4' | 'webm',
        size: request.size ?? 1080,
        fps: request.fps ?? 24,
      });
      return [{ filename: file.filename, mime: file.mime, base64: file.bytes ? bytesToBase64(file.bytes) : '' }];
    },
    fitView: options.fitView,
  }), [options.fitView, options.autoIcons]);
}
