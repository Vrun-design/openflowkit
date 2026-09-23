// The assistant's turn: what the model is told, what it sees of the canvas, and
// how its Markdown reply splits into prose and diagram blocks. The model decides
// whether to talk or draw; a ```openflow block is the only way it changes the
// canvas — or, when the provider takes tools, the write tools (assistantTools).
// Pure, so the exact prompt and parse are testable.
import { DSL_FAMILIES } from '../../../dsl/ast';
import { grammarAppendix } from '../../../dsl/grammar';

export interface AssistantFrame {
  readonly id: string;
  readonly title: string | null;
  readonly family: string;
  readonly dsl: string;
}

export interface AssistantContext {
  readonly pageName: string;
  /** Diagrams the model may change. */
  readonly frames: readonly AssistantFrame[];
  readonly scope: 'selection' | 'page';
  /** Labels of the selected shapes, when the selection is inside a diagram. */
  readonly focus: readonly string[];
  /** Diagrams on the page left out of scope. */
  readonly outOfScope: number;
}

export interface AssistantTurn {
  readonly role: 'user' | 'assistant';
  readonly text: string;
  /** Attached images, base64 without the `data:` prefix. */
  readonly images?: readonly { readonly mediaType: string; readonly data: string }[];
}

export interface AssistantBlock {
  /** A frame id to replace, or null for a new diagram. */
  readonly frameId: string | null;
  readonly dsl: string;
}

export interface AssistantReply {
  readonly prose: string;
  readonly blocks: readonly AssistantBlock[];
  /** An openflow fence is open: the model is still writing a diagram. */
  readonly drafting: boolean;
}

const RULES = [
  'You are the assistant inside OpenFlowKit, a diagramming editor. You talk with the user and, when they want it, change their diagrams.',
  'First decide what the user wants:',
  '- Greetings, questions, explanations, feedback or critique: answer in concise Markdown. Do not draw.',
  '- A new diagram, or a change to one: make the change (below), then say in one or two sentences what you did.',
  '- A drawing request too vague to act on: ask one short clarifying question instead of guessing.',
  '- Images the user attaches (a whiteboard photo, a screenshot, a sketch) are material: describe or redraw them as asked.',
];

const BLOCK_RULES = [
  'Diagram blocks are the only way you change the canvas:',
  '- Replace a diagram: a fenced block opened with ```openflow frame=<id> holding the COMPLETE new text of that diagram, not a diff. Keep the names and labels the user did not ask to change.',
  '- Add a diagram: a fenced block opened with ```openflow new.',
  '- Only change diagrams listed in scope. At most one block per diagram. Never write diagram text outside a block.',
];

const TOOL_RULES = [
  'You change the canvas only through tools, and every change is queued for the user to review:',
  '- update_diagram replaces an in-scope diagram with its COMPLETE new DSL, not a diff. Keep the names and labels the user did not ask to change.',
  '- add_diagram adds a new diagram.',
  '- Look things up before acting when it helps: read_diagram for a diagram not shown in full, get_syntax when unsure of a family, find_icons for icon ids.',
  '- A write that returns compile errors queued nothing: fix the DSL and call it again.',
  '- Once done, reply briefly with what you changed. Never paste DSL in the reply. Answer questions without tools when the canvas shown is enough.',
];

const DSL_RULES = [
  'OpenFlow DSL: the first non-blank line is the family (flowchart, architecture, sequence, state, erd, class, gitgraph, mindmap, chart).',
  'For data asks (revenue, metrics, comparison) use the chart family, e.g. `chart bar` then `Revenue: Jan 12, Feb 19`.',
  'Every name is an id; edges are `A -> B` and auto-declare their nodes. Prefer the smallest diagram that answers the request. Never invent icon ids.',
];

/** `tools`: the model has the assistant tools; otherwise it writes ```openflow blocks. */
export function assistantSystemPrompt(grammar: string, options: { readonly tools?: boolean } = {}): string {
  const appendix = grammarAppendix(grammar);
  return [...RULES, ...(options.tools ? TOOL_RULES : BLOCK_RULES), ...DSL_RULES,
    appendix ? `\nLanguage cheat-sheet:\n${appendix}` : ''].join('\n').trim();
}

/**
 * The canvas as the model sees it this turn; sent with the newest message only.
 * With a `budget` (characters of DSL) the frames past it are listed, not shown:
 * a model with tools reads them on demand.
 */
export function describeCanvas(context: AssistantContext, budget = Infinity): string {
  let room = budget;
  const lines = [`Page: ${context.pageName || 'Untitled'}`];
  if (context.frames.length === 0) {
    lines.push(context.scope === 'selection'
      ? 'Scope: the selection, which holds no diagram. A drawing request adds a new one.'
      : 'Scope: the page, which has no diagrams yet.');
  } else {
    lines.push(context.scope === 'selection'
      ? `Scope: the user's selection (${context.frames.length} ${context.frames.length === 1 ? 'diagram' : 'diagrams'}).`
      : 'Scope: the whole page.');
  }
  if (context.focus.length) lines.push(`Selected shapes: ${context.focus.join(', ')}`);
  for (const frame of context.frames) {
    const head = `Diagram frame=${frame.id} family=${frame.family}${frame.title ? ` title="${frame.title}"` : ''}`;
    const dsl = frame.dsl.trim();
    if (dsl.length > room) {
      lines.push('', `${head} — not shown (${dsl.split('\n').length} lines): call read_diagram first.`);
      continue;
    }
    room -= dsl.length;
    lines.push('', head, '```openflow', dsl, '```');
  }
  if (context.outOfScope) lines.push('', `${context.outOfScope} other ${context.outOfScope === 1 ? 'diagram' : 'diagrams'} on this page are out of scope: do not change them.`);
  return lines.join('\n');
}

// ponytail: fixed count; a token estimate per image if long visual threads get expensive.
const HISTORY_IMAGES = 8;

/**
 * History as real turns; the canvas rides on the newest user message. Only the
 * newest images are re-sent; older turns keep a note that one was there.
 */
export function buildAssistantMessages(
  history: readonly AssistantTurn[], message: AssistantTurn, context: AssistantContext, budget = Infinity,
): AssistantTurn[] {
  const turns = [...history.filter(({ text, images }) => text.trim() || images?.length), {
    ...message, text: `<canvas>\n${describeCanvas(context, budget)}\n</canvas>\n\n${message.text.trim()}`,
  }];
  let room = HISTORY_IMAGES;
  return turns.reverse().map((turn) => {
    if (!turn.images?.length) return turn;
    const kept = turn.images.slice(0, Math.max(0, room));
    room -= kept.length;
    if (kept.length === turn.images.length) return turn;
    const dropped = turn.images.length - kept.length;
    const { images: _images, ...rest } = turn;
    return { ...rest, ...(kept.length ? { images: kept } : {}), text: `${turn.text}\n[${dropped} earlier image${dropped === 1 ? '' : 's'} not re-sent]`.trim() };
  }).reverse();
}

// A bare family header line: `flowchart`, `chart bar`, `flowchart LR`.
const FAMILY_LINE = new RegExp(`^(?:${DSL_FAMILIES.join('|')})(?:[ \\t]+[\\w-]+)?[ \\t]*$`);
const BLOCK = /```openflow[ \t]*([^\n]*)\n([\s\S]*?)```/g;

export function parseAssistantReply(text: string): AssistantReply {
  const blocks: AssistantBlock[] = [];
  let prose = text.replace(BLOCK, (_match, info: string, body: string) => {
    const frameId = /frame=["']?([^\s"']+)/.exec(info)?.[1] ?? null;
    if (body.trim()) blocks.push({ frameId, dsl: body.trim() });
    return '';
  });
  const open = prose.indexOf('```openflow');
  const drafting = open >= 0;
  if (drafting) prose = prose.slice(0, open);
  // Weaker models skip the fence and answer with bare DSL.
  if (!blocks.length && !drafting && FAMILY_LINE.test(text.trim().split('\n')[0]!) && text.trim().includes('\n')) {
    return { prose: '', blocks: [{ frameId: null, dsl: text.trim() }], drafting: false };
  }
  return { prose: prose.replace(/\n{3,}/g, '\n\n').trim(), blocks, drafting };
}
