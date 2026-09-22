// Pipeline ops: files and the camera. These never touch the document, so they
// carry no command — they hand back artefacts or move the viewport.
import { z } from 'zod';
import { isContainerNodeKind } from '../../opencanvas/domain/nodes/containerNodePresentation';
import { defineOp, requireFrame, requirePage, type ExportedFile } from './types';

function subtreeIds(pageNodes: readonly { id: string; parentId: string | null }[], rootId: string): string[] {
  const ids = new Set([rootId]);
  for (let grew = true; grew;) {
    grew = false;
    for (const node of pageNodes) {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) { ids.add(node.id); grew = true; }
    }
  }
  return [...ids];
}

function filesOutput(files: readonly ExportedFile[]) {
  return {
    files: files.map((file) => ({
      filename: file.filename,
      mime: file.mime,
      ...(file.text !== undefined ? { text: file.text } : {}),
      ...(file.base64 !== undefined ? { base64: file.base64 } : {}),
    })),
  };
}

export const exportDiagram = defineOp({
  name: 'export',
  title: 'Export',
  description: 'Export the document, a page, or a selection as SVG, PNG, PDF (print HTML), JSON, or an animation (animated SVG, GIF, MP4, WebM). Returns the file bodies. Raster animation needs a live editor (WebCodecs); a file host serves animated SVG only.',
  schema: z.object({
    format: z.enum(['svg', 'png', 'pdf', 'json', 'svg-animated', 'gif', 'mp4', 'webm']).default('svg'),
    scope: z.enum(['selection', 'page', 'document']).default('document'),
    pageId: z.string().min(1).optional(),
    ids: z.array(z.string().min(1)).optional().describe('Selection scope ids; defaults to everything on the page.'),
    scale: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
    theme: z.enum(['light', 'dark', 'print']).default('light'),
    preset: z.enum(['build', 'walkthrough', 'pulse']).default('build').describe('Animation preset: build reveals in order, walkthrough spotlights each step, pulse shows everything with a moving light.'),
    order: z.string().min(1).optional().describe('Animation order: a phase-5 flow id, or "code" for the animate block in the diagram source. Omit for the connector graph.'),
    durationMs: z.number().int().min(500).max(600_000).optional().describe('Animation clip length in milliseconds; omit for the natural length.'),
    loop: z.boolean().default(false),
    size: z.union([z.literal(720), z.literal(1080), z.literal(1440)]).default(1080).describe('Raster animation width in pixels.'),
    fps: z.union([z.literal(12), z.literal(24), z.literal(30)]).default(24),
  }),
  async run({ format, scope, pageId, ids, scale, theme, preset, order, durationMs, loop, size, fps }, context) {
    if (!context.capabilities.exportFiles) throw new Error('This host cannot export files; connect a live editor or use a host with an export pipeline.');
    const page = requirePage(context.document, pageId ?? context.pageId);
    const files = await context.capabilities.exportFiles({
      document: context.document, format, scope, pageId: page.id, scale, theme,
      preset, ...(order ? { order } : {}), ...(durationMs === undefined ? {} : { durationMs }), loop, size, fps,
      ...(scope === 'selection' ? { selectedNodeIds: ids ?? page.nodes.filter((node) => !isContainerNodeKind(node.kind)).map((node) => node.id) } : {}),
    });
    return { command: null, output: filesOutput(files) };
  },
});

export const screenshotDiagram = defineOp({
  name: 'screenshot',
  title: 'Screenshot a diagram',
  description: 'PNG of one diagram frame, or of the whole page. Requires a live editor (Connect agent).',
  schema: z.object({
    frameId: z.string().min(1).optional(),
    pageId: z.string().min(1).optional(),
    scale: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
    theme: z.enum(['light', 'dark']).default('light'),
  }),
  async run({ frameId, pageId, scale, theme }, context) {
    if (!context.capabilities.exportFiles) throw new Error('screenshot needs a live editor: click "Connect agent" and retry.');
    const page = requirePage(context.document, pageId ?? context.pageId);
    const ids = frameId ? subtreeIds(page.nodes, requireFrame(page, frameId).id) : undefined;
    const files = await context.capabilities.exportFiles({
      document: context.document, format: 'png', scope: ids ? 'selection' : 'page', pageId: page.id, scale, theme,
      ...(ids ? { selectedNodeIds: ids } : {}),
    });
    const [file] = files;
    if (!file?.base64) throw new Error('The live editor did not return a PNG.');
    return { command: null, output: { frameId: frameId ?? null, pageId: page.id, filename: file.filename, mime: file.mime, base64: file.base64 } };
  },
});

export const fitView = defineOp({
  name: 'fit_view',
  title: 'Fit the view',
  description: 'Frame the camera on the page, a selection, or one diagram frame. View only; no undo step.',
  schema: z.object({
    ids: z.array(z.string().min(1)).optional(),
    frameId: z.string().min(1).optional(),
  }),
  async run({ ids, frameId }, context) {
    if (!context.capabilities.fitView) throw new Error('This host has no viewport.');
    const page = requirePage(context.document, context.pageId);
    const target = frameId ? subtreeIds(page.nodes, requireFrame(page, frameId).id) : ids;
    context.capabilities.fitView(target);
    return { command: null, output: { fitted: target ?? 'page' } };
  },
});

export const getDocument = defineOp({
  name: 'get_document',
  title: 'Read the page',
  description: 'Nodes and connectors of one page, with geometry. Use get_diagram for DSL.',
  schema: z.object({ pageId: z.string().min(1).optional() }),
  async run({ pageId }, context) {
    const page = requirePage(context.document, pageId ?? context.pageId);
    return {
      command: null,
      output: {
        documentId: context.document.id,
        name: context.document.name,
        pageId: page.id,
        pageName: page.name,
        nodes: page.nodes.map((node) => ({
          id: node.id, kind: node.kind, parentId: node.parentId,
          label: typeof node.content.label === 'string' ? node.content.label : '',
          x: node.transform.translation.x, y: node.transform.translation.y,
          width: node.size.width, height: node.size.height,
        })),
        connectors: page.connectors.map((connector) => ({
          id: connector.id, source: connector.source.nodeId, target: connector.target.nodeId,
          label: connector.labels[0]?.text ?? '',
        })),
      },
    };
  },
});

export const listPages = defineOp({
  name: 'list_pages',
  title: 'List pages',
  description: 'Every page in the document with its shape counts and diagram kind.',
  schema: z.object({}),
  async run(_input, context) {
    return {
      command: null,
      output: {
        pages: context.document.pages.map((page, index) => ({
          pageId: page.id, index, name: page.name, diagramKind: page.diagramKind,
          nodes: page.nodes.length, connectors: page.connectors.length,
        })),
      },
    };
  },
});
