// The assistant's tools. Reads go through the agent-op registry (the same ops
// MCP clients call); writes never touch the document — they compile the DSL,
// hand errors back to the model, and queue the rest as blocks for the proposal
// review. Pure: the host supplies the document, compiler and capabilities.
import { getDiagram, listDiagrams } from '../../../agent/ops/dslOps';
import { findIconsFor, getSyntax } from '../../../agent/ops/iconOps';
import type { OpCapabilities } from '../../../agent/ops/types';
import { resolveAgentOpCommand } from '../../../agent/runAction';
import { DSL_FAMILIES } from '../../../dsl/ast';
import type { CompileResult } from '../../../dsl/compile';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { AiTool, AiToolCall } from '../../../services/ai/provider';
import type { AssistantBlock } from './assistantPrompt';

export interface AssistantToolContext {
  readonly document: SceneDocumentV1;
  readonly pageId: string;
  /** Frames on this page the model may replace. */
  readonly inScope: ReadonlySet<string>;
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

export interface AssistantToolkit {
  readonly tools: readonly AiTool[];
  run(call: AiToolCall): Promise<AssistantToolRun>;
  /** Writes queued so far, in call order; a later write to a frame replaces the earlier one. */
  blocks(): AssistantBlock[];
}

const DSL_PARAM = { type: 'string', description: 'Complete OpenFlow DSL; the first line is the family.' };

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
];

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

export function assistantToolkit(context: AssistantToolContext): AssistantToolkit {
  const { document, pageId } = context;
  const opContext = { document, pageId, capabilities: context.capabilities as OpCapabilities };
  const queued = new Map<string, AssistantBlock>();
  let added = 0;
  const pageOf = (frameId: string) => document.pages.find((page) => page.nodes.some((node) => node.id === frameId && node.kind === 'frame'));
  const titleOf = (frameId: string): string => {
    const label = pageOf(frameId)?.nodes.find((node) => node.id === frameId)?.content.label;
    return typeof label === 'string' && label.trim() ? `“${label.trim()}”` : 'the diagram';
  };

  const write = async (frameId: string | null, dsl: string): Promise<AssistantToolRun> => {
    const target = frameId ? titleOf(frameId) : null;
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
    queued.set(frameId ?? `new:${added++}`, block);
    const shapes = compiled.nodes.length + compiled.groups.length;
    return {
      content: `Queued for the user's review (${plural(shapes, 'shape')}).${warnings.length ? ` Some lines were skipped — fix them if they matter:\n${lines(warnings)}` : ''} Nothing changes until the user applies it; do not paste the DSL in your reply.`,
      label: target ? `Drafted changes to ${target}` : `Drafted a new ${compiled.meta.family}`,
      detail: plural(shapes, 'shape'),
    };
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
