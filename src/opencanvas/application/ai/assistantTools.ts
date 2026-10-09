// The assistant's tools. Reads go through the agent-op registry (the same ops
// MCP clients call); writes never touch the document — they compile the DSL,
// hand errors back to the model, and queue the rest as blocks for the proposal
// review. Scene ops (move, style, delete, add) run against a working copy so a
// turn's ops compose, and are queued the same way. Pure: the host supplies the
// document, compiler and capabilities.
import type { AnyAgentOp } from '../../../agent/ops';
import { getDiagram, listDiagrams } from '../../../agent/ops/dslOps';
import { findIconsFor, getSyntax } from '../../../agent/ops/iconOps';
import { addShape, deleteShapes, moveNodes, styleNodes } from '../../../agent/ops/sceneOps';
import type { OpCapabilities } from '../../../agent/ops/types';
import { resolveAgentOpCommand } from '../../../agent/runAction';
import { DSL_FAMILIES } from '../../../dsl/ast';
import type { CompileResult } from '../../../dsl/compile';
import { dslFrames } from '../../../dsl/frameScene';
import { applyDocumentCommand } from '../../domain/commands/execute';
import type { SceneDocumentV1, SceneNode, ScenePage } from '../../domain/document/types';
import { SHAPE_KINDS } from '../../domain/nodes/shapeNode';
import { buildNodeStateMap } from '../../domain/scene/nodeState';
import type { AiTool, AiToolCall } from '../../../services/ai/provider';
import { shapeKindOf } from './assistantContext';
import type { AssistantBlock } from './assistantPrompt';

export interface AssistantToolContext {
  readonly document: SceneDocumentV1;
  readonly pageId: string;
  /** Frames on this page the model may replace. */
  readonly inScope: ReadonlySet<string>;
  /** Selection scope: the selected ids (their children count too). Null: the whole page. */
  readonly selection?: ReadonlySet<string> | null;
  readonly capabilities: Pick<OpCapabilities, 'syntax' | 'searchIcons'>;
  /** Validates a write; the proposal compiles again when it lands. */
  readonly compile: (dsl: string) => Promise<CompileResult>;
}

/** What one call did: the text the model reads, and the row the user sees. */
export interface AssistantToolRun {
  readonly content: string;
  readonly isError?: boolean;
  readonly label: string;
  readonly detail?: string;
}

/** A scene op queued for review; the proposal resolves it again on the page as it stands then. */
export interface AssistantOpWrite {
  readonly op: AnyAgentOp;
  readonly input: Readonly<Record<string, unknown>>;
  readonly label: string;
}

export type AssistantWrite = AssistantBlock | AssistantOpWrite;

export interface AssistantToolkit {
  readonly tools: readonly AiTool[];
  run(call: AiToolCall): Promise<AssistantToolRun>;
  /** Writes queued so far, in call order; a later write to a frame replaces the earlier one. */
  blocks(): AssistantWrite[];
}

const DSL_PARAM = { type: 'string', description: 'Complete OpenFlow DSL; the first line is the family.' };
const IDS_PARAM = { type: 'array', items: { type: 'string' }, minItems: 1, description: 'Shape ids from list_shapes or the selection.' };
const HEX = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' };

export const ASSISTANT_TOOLS: readonly AiTool[] = [
  {
    name: 'list_diagrams',
    description: 'Every diagram in the document: frame id, page, family, title, and whether it is in scope for changes.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'read_diagram',
    description: 'The full DSL of one diagram. Call it for any diagram not shown in full before changing or explaining it.',
    parameters: { type: 'object', properties: { frame_id: { type: 'string' } }, required: ['frame_id'] },
  },
  {
    name: 'get_syntax',
    description: 'The grammar section for one diagram family. Call it when unsure how to write something in that family.',
    parameters: { type: 'object', properties: { family: { type: 'string', enum: [...DSL_FAMILIES] } }, required: ['family'] },
  },
  {
    name: 'find_icons',
    description: 'Icon ids for a concept or product ("database", "queue", "lambda"). Use the returned ids in `icon:` attributes; never invent one.',
    parameters: { type: 'object', properties: { concept: { type: 'string' } }, required: ['concept'] },
  },
  {
    name: 'update_diagram',
    description: 'Replace an in-scope diagram with its complete new DSL (not a diff). Queued for the user to review; returns compile errors to fix.',
    parameters: { type: 'object', properties: { frame_id: { type: 'string' }, dsl: DSL_PARAM }, required: ['frame_id', 'dsl'] },
  },
  {
    name: 'add_diagram',
    description: 'Add a new diagram to the page. Queued for the user to review; returns compile errors to fix.',
    parameters: { type: 'object', properties: { dsl: DSL_PARAM }, required: ['dsl'] },
  },
  {
    name: 'list_shapes',
    description: 'Hand-drawn shapes in scope (not part of a diagram): id, kind, label, position, size, locked.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'move_shapes',
    description: 'Move shapes, or whole diagrams by frame id, by dx/dy pixels (+x right, +y down). Queued for review.',
    parameters: { type: 'object', properties: { ids: IDS_PARAM, dx: { type: 'number' }, dy: { type: 'number' } }, required: ['ids', 'dx', 'dy'] },
  },
  {
    name: 'style_shapes',
    description: 'Colour shapes. Pass only what changes. Queued for review.',
    parameters: {
      type: 'object',
      properties: {
        ids: IDS_PARAM, fill: HEX, stroke: HEX, text_color: HEX,
        stroke_style: { type: 'string', enum: ['solid', 'dashed', 'dotted'] },
      },
      required: ['ids'],
    },
  },
  {
    name: 'delete_shapes',
    description: 'Delete shapes, connectors, or whole diagrams by frame id. Queued for review.',
    parameters: { type: 'object', properties: { ids: IDS_PARAM }, required: ['ids'] },
  },
  {
    name: 'add_shape',
    description: 'Add one hand-drawn shape (not a diagram: use add_diagram for those). Returns its id.',
    parameters: {
      type: 'object',
      properties: { kind: { type: 'string', enum: [...SHAPE_KINDS] }, label: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' } },
      required: ['kind', 'x', 'y'],
    },
  },
];

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;
const shapeName = (node: SceneNode): string =>
  (typeof node.content.label === 'string' && node.content.label.trim() ? `“${node.content.label.trim()}”` : shapeKindOf(node));

/** The generated diagram a node sits inside (the frame itself is not inside it). */
function diagramOf(page: ScenePage, nodeId: string): string | null {
  const frames = new Set(dslFrames(page).map(({ id }) => id));
  const byId = new Map(page.nodes.map((node) => [node.id, node]));
  for (let parent = byId.get(nodeId)?.parentId; parent; parent = byId.get(parent)?.parentId) {
    if (frames.has(parent)) return parent;
  }
  return null;
}

export function assistantToolkit(context: AssistantToolContext): AssistantToolkit {
  const { document, pageId } = context;
  const opContext = { document, pageId, capabilities: context.capabilities as OpCapabilities };
  const queued = new Map<string, AssistantWrite>();
  let added = 0;
  // The document with this turn's scene ops applied, so a later op sees an earlier one.
  let working = document;
  const madeThisTurn = new Set<string>();
  const workingPage = (): ScenePage | undefined => working.pages.find((page) => page.id === pageId);
  const pageOf = (frameId: string) => document.pages.find((page) => page.nodes.some((node) => node.id === frameId && node.kind === 'frame'));
  const titleOf = (frameId: string): string => {
    const label = pageOf(frameId)?.nodes.find((node) => node.id === frameId)?.content.label;
    return typeof label === 'string' && label.trim() ? `“${label.trim()}”` : 'the diagram';
  };

  const write = async (frameId: string | null, dsl: string): Promise<AssistantToolRun> => {
    const target = frameId ? titleOf(frameId) : null;
    if (frameId && !workingPage()?.nodes.some((node) => node.id === frameId)) {
      return { content: `You deleted diagram ${frameId} this turn; it cannot also be rewritten.`, isError: true, label: 'Skipped a deleted diagram' };
    }
    if (!dsl.trim()) return { content: 'The dsl argument is empty.', isError: true, label: 'Empty draft' };
    const compiled = await context.compile(dsl);
    const errors = compiled.diagnostics.filter(({ severity }) => severity === 'error');
    const warnings = compiled.diagnostics.filter(({ severity }) => severity === 'warning');
    const lines = (list: typeof errors) => list.slice(0, 6).map(({ line, message }) => `line ${line}: ${message}`).join('\n');
    if (errors.length) {
      return {
        content: `Did not compile, nothing queued. Fix these and call again:\n${lines(errors)}`,
        isError: true, label: target ? `Draft for ${target} did not compile` : 'Draft did not compile',
        detail: plural(errors.length, 'error'),
      };
    }
    const block: AssistantBlock = { frameId, dsl: dsl.trim() };
    // A model cannot edit a draft it queued, so a second add with the same title is its redo: replace, never stack two.
    const title = compiled.meta.title?.trim();
    const key = frameId ?? (title ? `new:${title}` : `new:${added++}`);
    const replaced = !frameId && queued.has(key);
    queued.set(key, block);
    const shapes = compiled.nodes.length + compiled.groups.length;
    // A C4 model without views draws its landscape only: the containers the user asked for stay hidden.
    const landscapeOnly = compiled.meta.family === 'architecture' && /^\s*model\s*\{/m.test(dsl) && !/^\s*views\s*\{/m.test(dsl);
    return {
      content: [
        `${replaced ? `Replaced your earlier draft titled “${title}”` : 'Queued for the user\'s review'} (${plural(shapes, 'shape')}).`,
        warnings.length ? `Some lines were skipped — to fix them, call ${frameId ? 'update_diagram' : 'add_diagram'} again with the same title and the whole corrected text:\n${lines(warnings)}` : '',
        landscapeOnly ? 'Only the landscape view is drawn (people and top-level systems); containers inside a system are hidden. For a container diagram, add `views {\n  view container of <System>\n}` and call again with the same title.' : '',
        'Nothing changes until the user applies it; do not paste the DSL in your reply.',
      ].filter(Boolean).join(' '),
      label: target ? `Drafted changes to ${target}` : `Drafted a new ${compiled.meta.family}`,
      detail: plural(shapes, 'shape'),
    };
  };

  const inScope = (page: ScenePage, id: string): boolean => {
    if (!context.selection || context.inScope.has(id) || madeThisTurn.has(id)) return true;
    const byId = new Map(page.nodes.map((node) => [node.id, node]));
    for (let at: string | null | undefined = id; at; at = byId.get(at)?.parentId) if (context.selection.has(at)) return true;
    const connector = page.connectors.find((candidate) => candidate.id === id);
    return !!connector && [connector.source.nodeId, connector.target.nodeId].every((end) => end !== null && inScope(page, end));
  };

  /** Why these ids cannot be touched, or null. */
  const refuse = (page: ScenePage, ids: readonly string[]): string | null => {
    if (ids.length === 0) return 'Pass at least one id.';
    const states = buildNodeStateMap(page);
    for (const id of ids) {
      const connector = page.connectors.find((candidate) => candidate.id === id);
      const node = page.nodes.find((candidate) => candidate.id === id);
      if (!node && !connector) return `No shape has id "${id}". Call list_shapes for the ids.`;
      const owner = node ? diagramOf(page, id) : [connector!.source.nodeId, connector!.target.nodeId].map((end) => end && diagramOf(page, end)).find(Boolean);
      if (owner) return `"${id}" is part of diagram ${owner}; change it with update_diagram.`;
      if (!inScope(page, id)) return `"${id}" is outside the user's scope; leave it alone, or ask the user to widen the scope.`;
      if (node && states.get(id)?.locked) return `"${id}" is locked; ask the user to unlock it.`;
    }
    return null;
  };

  const queueOp = async (op: AnyAgentOp, input: Record<string, unknown>, label: string): Promise<AssistantToolRun> => {
    const page = workingPage();
    if (!page) return { content: 'The page is gone.', isError: true, label };
    const ids = Array.isArray(input.ids) ? input.ids.map(text) : [];
    const why = op === addShape ? null : refuse(page, ids);
    if (why) return { content: `${why} Nothing queued.`, isError: true, label: `Could not ${label.toLowerCase()}` };
    const named = ids.map((id) => page.nodes.find((node) => node.id === id)).filter((node): node is SceneNode => !!node).map(shapeName);
    const title = named.length ? `${label} ${named.slice(0, 2).join(', ')}${named.length > 2 ? ` +${named.length - 2}` : ''}` : label;
    const { command } = await resolveAgentOpCommand(op, input, { ...opContext, document: working });
    if (!command) return { content: 'Nothing to change: the shapes are already like that. Nothing queued.', label: 'No change' };
    working = applyDocumentCommand(working, command).document;
    queued.set(`op:${added++}`, { op, input, label: title });
    return { content: `Queued for the user's review: ${title}.`, label: title };
  };

  const run = async (call: AiToolCall): Promise<AssistantToolRun> => {
    const input = call.input;
    switch (call.name) {
      case 'list_diagrams': {
        const { output } = await resolveAgentOpCommand(listDiagrams, {}, opContext);
        const diagrams = output.diagrams.map((diagram) => ({ ...diagram, inScope: context.inScope.has(diagram.frameId) }));
        return { content: JSON.stringify(diagrams), label: 'Listed the diagrams', detail: `${diagrams.length} found` };
      }
      case 'read_diagram': {
        const frameId = text(input.frame_id);
        const page = pageOf(frameId);
        if (!page) return { content: `No diagram has frame id "${frameId}". Call list_diagrams.`, isError: true, label: 'Diagram not found' };
        const { output } = await resolveAgentOpCommand(getDiagram, { frameId, pageId: page.id }, opContext);
        const scope = context.inScope.has(frameId) ? 'in scope' : 'read-only: out of scope';
        return {
          content: `frame=${frameId} family=${output.family} (${scope})\n\`\`\`openflow\n${output.dsl.trim()}\n\`\`\``,
          label: `Read ${titleOf(frameId)}`,
        };
      }
      case 'get_syntax': {
        const family = text(input.family) || undefined;
        const { output } = await resolveAgentOpCommand(getSyntax, family ? { family } : {}, opContext);
        return { content: output.syntax, label: `Checked the ${family ?? 'DSL'} syntax` };
      }
      case 'find_icons': {
        const concept = text(input.concept).trim();
        if (!concept) return { content: 'The concept argument is empty.', isError: true, label: 'Icon search' };
        const { output } = await resolveAgentOpCommand(findIconsFor, { concept, limit: 8 }, opContext);
        const matches = output.matches.map(({ provider, slug, label }) => `${provider}/${slug} — ${label}`);
        return {
          content: matches.length ? matches.join('\n') : `No icons match "${concept}". Leave the icon off.`,
          label: `Searched icons for “${concept}”`, detail: `${matches.length} found`,
        };
      }
      case 'update_diagram': {
        const frameId = text(input.frame_id);
        if (!context.inScope.has(frameId)) {
          return {
            content: pageOf(frameId)
              ? `Diagram ${frameId} is outside the user's scope; leave it alone, or ask the user to widen the scope.`
              : `No diagram has frame id "${frameId}". Use add_diagram for a new one.`,
            isError: true, label: 'Skipped a diagram outside the scope',
          };
        }
        return write(frameId, text(input.dsl));
      }
      case 'add_diagram':
        return write(null, text(input.dsl));
      case 'list_shapes': {
        const page = workingPage();
        if (!page) return { content: 'The page is gone.', isError: true, label: 'Listed the shapes' };
        const frames = new Set(dslFrames(page).map(({ id }) => id));
        const states = buildNodeStateMap(page);
        const shapes = page.nodes
          .filter((node) => !frames.has(node.id) && !diagramOf(page, node.id) && inScope(page, node.id))
          .slice(0, 200)
          .map((node) => ({
            id: node.id, kind: shapeKindOf(node), label: typeof node.content.label === 'string' ? node.content.label : '',
            x: Math.round(node.transform.translation.x), y: Math.round(node.transform.translation.y),
            width: Math.round(node.size.width), height: Math.round(node.size.height), locked: states.get(node.id)?.locked === true,
          }));
        return { content: JSON.stringify(shapes), label: 'Listed the shapes', detail: `${shapes.length} found` };
      }
      case 'move_shapes':
        return queueOp(moveNodes, { ids: input.ids, delta: { x: Number(input.dx) || 0, y: Number(input.dy) || 0 } }, 'Move');
      case 'style_shapes': {
        const patch = { fill: input.fill, stroke: input.stroke, textColor: input.text_color, strokeStyle: input.stroke_style };
        return queueOp(styleNodes, { ids: input.ids, ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) }, 'Style');
      }
      case 'delete_shapes':
        return queueOp(deleteShapes, { ids: input.ids }, 'Delete');
      case 'add_shape': {
        // The id is fixed here so the proposal, which runs the op again, makes the same shape.
        const id = `node-${crypto.randomUUID()}`;
        const kind = text(input.kind);
        const result = await queueOp(addShape, {
          kind, id, x: Number(input.x) || 0, y: Number(input.y) || 0, ...(typeof input.label === 'string' ? { label: input.label } : {}),
        }, `Add ${kind}`);
        if (result.isError) return result;
        madeThisTurn.add(id);
        return { ...result, content: `${result.content} It has id ${id}.` };
      }
      default:
        return { content: `Unknown tool "${call.name}".`, isError: true, label: `Unknown tool ${call.name}` };
    }
  };

  return {
    tools: ASSISTANT_TOOLS,
    async run(call) {
      try {
        return await run(call);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        return { content: message, isError: true, label: `${call.name} failed`, detail: message };
      }
    },
    blocks: () => [...queued.values()],
  };
}
