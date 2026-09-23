// DSL ops: an agent talks the language first. create/update compile through
// the host's layout port and land as ONE reversible page command; get/list
// read the frames back, honest about drift and losses.
import { z } from 'zod';
import { buildDslPageCommand, nextDslFrameOrigin } from '../../opencanvas/application/dsl/dslPageCommand';
import { buildWorkspacePagesCommand } from '../../opencanvas/application/dsl/architectureCommands';
import { frameEdited, frameScene, dslFrames } from '../../dsl/frameScene';
import { serializeLosses } from '../../dsl/losses';
import { serialize } from '../../dsl/serialize';
import { dslFrameMeta } from '../../dsl/sceneMeta';
import type { CompileResult, CompileWorkspaceResult } from '../../dsl/compile';
import type { Point2d } from '../../opencanvas/domain/geometry/types';
import type { SceneDocumentV1 } from '../../opencanvas/domain/document/types';
import { defineOp, pointOf, pointSchema, requireFrame, requirePage } from './types';

const DSL_HELP = 'OpenFlow DSL source. Call get_syntax when unsure. A node whose label or tech: names a technology '
  + '(Postgres, React, S3) gets its icon automatically; `icon: none` opts one node out, `icons: off` the diagram.';

function diagramOutput(pageId: string, frameId: string, compiled: CompileResult) {
  return {
    pageId,
    frameId,
    family: compiled.meta.family,
    title: compiled.meta.title ?? null,
    nodes: compiled.nodes.length + compiled.groups.length,
    connectors: compiled.connectors.length,
    // What icons from labels added, so an agent can see it and correct a wrong guess.
    inferredIcons: compiled.nodes.flatMap((node) => {
      const inferred = (node.metadata.dsl as { autoIcon?: unknown } | undefined)?.autoIcon;
      return typeof inferred === 'string' && node.content.icon === inferred
        ? [{ label: String(node.content.label ?? node.id), icon: inferred }] : [];
    }),
    diagnostics: compiled.diagnostics,
  };
}

const mintPageId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

/**
 * A C4 workspace with several views lands as one page per view, like ⌘↵ does.
 * The output describes the first view like a single diagram and lists the rest.
 */
function workspaceOutcome(document: SceneDocumentV1, workspace: CompileWorkspaceResult, replaceFrameId?: string) {
  const command = buildWorkspacePagesCommand(document, workspace, { mintId: mintPageId, ...(replaceFrameId ? { replaceFrameId } : {}) });
  const pageIds = (command?.kind === 'batch' ? command.commands : command ? [command] : []).flatMap((entry) =>
    entry.kind === 'insert-page' ? [entry.page.id] : entry.kind === 'set-page' ? [entry.pageId] : []);
  const first = workspace.views[0]!.result;
  return {
    command,
    output: {
      ...diagramOutput(pageIds[0] ?? '', first.frame.id, first),
      views: workspace.views.map((view, index) => ({ viewId: view.viewId, name: view.name, frameId: view.result.frame.id, pageId: pageIds[index] ?? null })),
    },
  };
}

export const createDiagram = defineOp({
  name: 'create_diagram',
  title: 'Create diagram',
  description: `Compile ${DSL_HELP} into a new diagram frame on a page. One undo step.`,
  schema: z.object({
    dsl: z.string().min(1).describe(DSL_HELP),
    pageId: z.string().min(1).optional().describe('Target page; defaults to the first.'),
    at: pointSchema.optional(),
    palette: z.enum(['pastel', 'paper', 'builder', 'mono']).optional().describe('Diagram palette; defaults to the one authored in the DSL.'),
  }),
  async run({ dsl, pageId, at, palette }, context) {
    const page = requirePage(context.document, pageId ?? context.pageId);
    const origin: Point2d = at ? pointOf(at) : nextDslFrameOrigin(page);
    const workspace = await context.capabilities.compileWorkspace(dsl, {
      origin,
      ...(palette ? { appearance: { palette } } : {}),
    });
    if (workspace.views.length > 1) return workspaceOutcome(context.document, workspace);
    const compiled = workspace.views[0]!.result;
    return {
      command: buildDslPageCommand(page, compiled),
      output: { ...diagramOutput(page.id, compiled.frame.id, compiled), views: [] },
    };
  },
});

export const updateDiagram = defineOp({
  name: 'update_diagram',
  title: 'Update diagram',
  description: 'Replace a diagram frame with freshly compiled DSL, keeping its position. One undo step.',
  schema: z.object({
    frameId: z.string().min(1),
    dsl: z.string().min(1).describe(DSL_HELP),
    palette: z.enum(['pastel', 'paper', 'builder', 'mono']).optional(),
  }),
  async run({ frameId, dsl, palette }, context) {
    const page = requirePage(context.document, context.pageId);
    const frame = requireFrame(page, frameId);
    const workspace = await context.capabilities.compileWorkspace(dsl, {
      origin: frame.transform.translation,
      ...(palette ? { appearance: { palette } } : {}),
    });
    if (workspace.views.length > 1) return workspaceOutcome(context.document, workspace, frameId);
    const compiled = workspace.views[0]!.result;
    return {
      command: buildDslPageCommand(page, compiled, frameId),
      output: { ...diagramOutput(page.id, frameId, compiled), views: [] },
    };
  },
});

export const getDiagram = defineOp({
  name: 'get_diagram',
  title: 'Read diagram',
  description: 'The DSL for one diagram frame (authored text when untouched, regenerated text otherwise), plus drift and loss notes.',
  schema: z.object({
    frameId: z.string().min(1).optional().describe('Defaults to the first diagram on the page.'),
    pageId: z.string().min(1).optional(),
  }),
  async run({ frameId, pageId }, context) {
    const page = requirePage(context.document, pageId ?? context.pageId);
    const first = frameId ? null : dslFrames(page)[0];
    if (!frameId && !first) throw new RangeError('This page has no diagram frames. Use list_diagrams.');
    const frame = frameId ? requireFrame(page, frameId) : first!;
    const scene = frameScene(page, frame.id);
    if (!scene) throw new RangeError(`Diagram frame "${frame.id}" was not found.`);
    const meta = dslFrameMeta(frame);
    const edited = frameEdited(scene);
    const losses = serializeLosses(scene);
    return {
      command: null,
      output: {
        frameId: frame.id,
        pageId: page.id,
        family: meta.family,
        title: typeof frame.content.label === 'string' && frame.content.label ? frame.content.label : null,
        edited,
        losses,
        dsl: edited || typeof meta.source !== 'string' ? serialize(scene) : meta.source,
      },
    };
  },
});

export const listDiagrams = defineOp({
  name: 'list_diagrams',
  title: 'List diagrams',
  description: 'Every diagram frame in the document, with its page and whether the canvas drifted from the text.',
  schema: z.object({}),
  async run(_input, context) {
    const diagrams = context.document.pages.flatMap((page) =>
      dslFrames(page).map((frame) => {
        const scene = frameScene(page, frame.id);
        const meta = dslFrameMeta(frame);
        return {
          frameId: frame.id,
          pageId: page.id,
          pageName: page.name,
          family: meta.family,
          title: typeof frame.content.label === 'string' && frame.content.label ? frame.content.label : null,
          edited: scene ? frameEdited(scene) : false,
        };
      }));
    return { command: null, output: { diagrams } };
  },
});
