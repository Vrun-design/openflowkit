// A file (headless) host for the ops: what an MCP server can honour without a
// browser. It lays out with the port it is given (ELK from the agent entry, as
// the editor does), reads the grammar text
// the caller ships, searches the icon manifest it was given, and exports the
// text formats directly. PNG is absent by construction — that is the live
// editor's job.
import { collectIconArt, exportCanonicalSvg } from '../opencanvas/infrastructure/export/canonicalSvg';
import { exportAnimatedSvg } from '../opencanvas/infrastructure/export/animatedSvg';
import { motionTimelineFor } from '../dsl/animate';
import { serializeCanonicalJson } from '../opencanvas/infrastructure/export/canonicalJson';
import { buildPrintDocument } from '../opencanvas/infrastructure/export/print';
import { compile, compileWorkspace, type CompileOptions } from '../dsl/compile';
import { grammarSection } from '../dsl/grammar';
import { matchIconId, rankIcons } from '../dsl/iconMatch';
import type { LayoutPort } from '../dsl/layout';
import type { IconMatch, OpCapabilities } from './ops/types';

export { grammarSection } from '../dsl/grammar';

export interface FileHostOptions {
  /** The grammar reference `get_syntax` serves (the MCP server reads it from disk). */
  readonly grammar: string;
  /** Node hosts pass `headlessElkLayout`; tests may pass the deterministic layout for speed. */
  readonly layout: LayoutPort;
  /** Icon manifest entries; searched with the editor's ranking (`rankIcons`). */
  readonly icons?: readonly IconMatch[];
  /** Icon id → pack/shape; defaults to matching against `icons`, the way the editor matches its packs. */
  readonly resolveIcon?: CompileOptions['resolveIcon'];
  /** Icons from labels when the DSL has no `icons:` line (the editor's default: on). */
  readonly autoIcons?: boolean;
  /** One icon's art as a data URL, or null; without it, exported icons are plates alone. */
  readonly loadIcon?: (packId: string, shapeId: string) => Promise<string | null>;
}

/** A resolver over a manifest: the same matching the editor runs over its bundled packs. */
export function manifestIconResolver(icons: readonly IconMatch[]): NonNullable<CompileOptions['resolveIcon']> {
  const byProvider = new Map<string, string[]>();
  for (const icon of icons) byProvider.set(icon.provider, [...(byProvider.get(icon.provider) ?? []), icon.slug]);
  return (id) => matchIconId(id, (provider) => byProvider.get(provider) ?? []);
}

export function createFileCapabilities(options: FileHostOptions): OpCapabilities {
  const icons = options.icons ?? [];
  // No manifest, no resolver: ids stay unchecked and no icon is inferred.
  const resolveIcon = options.resolveIcon ?? (icons.length ? manifestIconResolver(icons) : undefined);
  const defaults: CompileOptions = {
    layout: options.layout,
    ...(resolveIcon ? { resolveIcon } : {}),
    autoIcons: options.autoIcons ?? true,
  };
  return {
    compile: (text, compileOptions) => compile(text, { ...defaults, ...compileOptions }),
    compileWorkspace: (text, compileOptions) => compileWorkspace(text, { ...defaults, ...compileOptions }),
    syntax: (family) => grammarSection(options.grammar, family),
    searchIcons: async (query, limit) => query.trim()
      ? rankIcons(icons, query, (icon) => ({ provider: icon.provider, id: icon.slug, label: icon.label, category: icon.category })).slice(0, limit)
      : [],
    exportFiles: async (request) => {
      if (request.format === 'png' || request.format === 'gif' || request.format === 'mp4' || request.format === 'webm') {
        // No canvas, no codecs: this host has no rasterizer by construction.
        throw new Error(`${request.format.toUpperCase()} export needs a live editor: open the app and click "Connect agent". Animated SVG works here.`);
      }
      const iconArt = options.loadIcon && request.format !== 'json' ? await collectIconArt(request.document, options.loadIcon) : {};
      if (request.format === 'svg-animated') {
        const page = request.document.pages.find(({ id }) => id === request.pageId) ?? request.document.pages[0]!;
        const timeline = motionTimelineFor({
          document: request.document, pageId: page.id,
          ...(request.preset ? { preset: request.preset } : {}),
          ...(request.order ? { order: request.order } : {}),
          ...(request.durationMs === undefined ? {} : { durationMs: request.durationMs }),
        });
        return [{
          filename: `${request.document.id}.svg`,
          mime: 'image/svg+xml',
          text: exportAnimatedSvg(request.document, timeline, {
            pageId: page.id,
            ...(request.theme ? { theme: request.theme } : {}),
            ...(request.loop ? { loop: true } : {}),
            iconArt,
          }),
        }];
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
          iconArt,
          ...(request.selectedNodeIds?.length ? { selectedNodeIds: request.selectedNodeIds } : {}),
          ...(request.selectedConnectorIds?.length ? { selectedConnectorIds: request.selectedConnectorIds } : {}),
        });
        return request.format === 'pdf'
          ? [{ filename: `${request.document.id}${suffix}.html`, mime: 'text/html', text: buildPrintDocument([svg], request.document.name, { theme: request.theme ?? 'light' }) }]
          : [{ filename: `${request.document.id}${suffix}.svg`, mime: 'image/svg+xml', text: svg }];
      });
    },
  };
}
