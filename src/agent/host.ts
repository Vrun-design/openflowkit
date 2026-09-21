// A file (headless) host for the ops: what an MCP server can honour without a
// browser. It compiles with the deterministic layout, reads the grammar text
// the caller ships, searches the icon manifest it was given, and exports the
// text formats directly. PNG is absent by construction — that is the live
// editor's job.
import { exportCanonicalSvg } from '../opencanvas/infrastructure/export/canonicalSvg';
import { serializeCanonicalJson } from '../opencanvas/infrastructure/export/canonicalJson';
import { buildPrintDocument } from '../opencanvas/infrastructure/export/print';
import { compile, type CompileOptions } from '../dsl/compile';
import { grammarSection } from '../dsl/grammar';
import { deterministicLayout } from '../dsl/layout';
import type { IconMatch, OpCapabilities } from './ops/types';

export { grammarSection } from '../dsl/grammar';

export interface FileHostOptions {
  /** The grammar reference `get_syntax` serves (the MCP server reads it from disk). */
  readonly grammar: string;
  /** Icon manifest entries; search is a scored substring match over provider/slug/label. */
  readonly icons?: readonly IconMatch[];
  /** Icon id → pack/shape, when the host ships the packs. */
  readonly resolveIcon?: CompileOptions['resolveIcon'];
}

function score(icon: IconMatch, query: string): number {
  const haystack = `${icon.provider}/${icon.slug} ${icon.label} ${icon.category ?? ''}`.toLowerCase();
  const needle = query.toLowerCase();
  if (icon.slug.toLowerCase() === needle || icon.label.toLowerCase() === needle) return 100;
  if (icon.slug.toLowerCase().startsWith(needle)) return 80;
  if (haystack.includes(needle)) return 60;
  const tokens = needle.split(/[^a-z0-9]+/).filter(Boolean);
  const hits = tokens.filter((token) => haystack.includes(token)).length;
  return hits > 0 ? 20 + hits * 10 : 0;
}

export function createFileCapabilities(options: FileHostOptions): OpCapabilities {
  const icons = options.icons ?? [];
  return {
    compile: (text, compileOptions) => compile(text, { ...compileOptions, layout: compileOptions?.layout ?? deterministicLayout }),
    syntax: (family) => grammarSection(options.grammar, family),
    searchIcons: async (query, limit) => icons
      .map((icon) => ({ icon, score: score(icon, query) }))
      .filter(({ score: value }) => value > 0)
      .sort((a, b) => b.score - a.score || a.icon.slug.localeCompare(b.icon.slug))
      .slice(0, limit)
      .map(({ icon }) => icon),
    exportFiles: async (request) => {
      if (request.format === 'png') {
        throw new Error('PNG export needs a live editor: open the app and click "Connect agent".');
      }
      const pages = request.scope === 'document'
        ? request.document.pages
        : [request.document.pages.find(({ id }) => id === request.pageId) ?? request.document.pages[0]!];
      return pages.flatMap((page, index) => {
        const suffix = pages.length > 1 ? `-${index + 1}` : '';
        if (request.format === 'json') {
          return [{ filename: `${request.document.id}${suffix}.json`, mime: 'application/json', text: serializeCanonicalJson(request.document) }];
        }
        const svg = exportCanonicalSvg(request.document, {
          pageId: page.id,
          theme: request.theme ?? 'light',
          pixelRatio: request.scale ?? 1,
          ...(request.selectedNodeIds?.length ? { selectedNodeIds: request.selectedNodeIds } : {}),
        });
        return request.format === 'pdf'
          ? [{ filename: `${request.document.id}${suffix}.html`, mime: 'text/html', text: buildPrintDocument(svg, request.document.name) }]
          : [{ filename: `${request.document.id}${suffix}.svg`, mime: 'image/svg+xml', text: svg }];
      });
    },
  };
}
