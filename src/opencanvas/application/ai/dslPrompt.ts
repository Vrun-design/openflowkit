// The prompt that turns a sentence into a diagram: the cheat-sheet appendix,
// the current frame's text, and hard rules about what to return. Pure, so the
// exact prompt is testable and cheap to iterate on.
import { DSL_FAMILIES } from '../../../dsl/ast';
import { grammarAppendix } from '../../../dsl/grammar';

export interface DslPromptInput {
  /** Full grammar text; the appendix is extracted from it. */
  readonly grammar: string;
  readonly intent: string;
  /** Text of the diagram being replaced, when there is one. */
  readonly currentDsl?: string;
  readonly family?: string;
}

export const DSL_SYSTEM_PROMPT = [
  'You write OpenFlow DSL, a line-oriented diagram language.',
  'Return ONLY the DSL text: no prose, no explanations, no markdown fences.',
  'The first non-blank line is the family (flowchart, architecture, sequence, state, erd, class, gitgraph, mindmap).',
  'Every name is an id; edges are `A -> B` and auto-declare their nodes.',
  'Prefer the smallest diagram that answers the request. Never invent icon ids: leave icons out unless the request names them.',
].join(' ');

export function buildDslPrompt(input: DslPromptInput): { system: string; prompt: string } {
  const appendix = grammarAppendix(input.grammar);
  const sections = [
    appendix ? `Language cheat-sheet:\n${appendix}` : '',
    input.currentDsl?.trim() ? `The diagram it replaces:\n${input.currentDsl.trim()}` : '',
    `Request: ${input.intent.trim()}`,
    input.family ? `Use the \`${input.family}\` family.` : '',
  ].filter(Boolean);
  return { system: DSL_SYSTEM_PROMPT, prompt: sections.join('\n\n') };
}

/** The family an existing text declares, when it declares one. */
export function detectFamily(dsl: string | undefined): string | undefined {
  if (!dsl) return undefined;
  const first = dsl.split('\n').map((line) => line.trim())
    .find((line) => line && !line.startsWith('%%') && !line.startsWith('//'));
  const word = first?.split(/\s+/)[0];
  return word && (DSL_FAMILIES as readonly string[]).includes(word) ? word : undefined;
}

/** Models still fence their output; take the body of the first fence when present. */
export function extractDsl(text: string): string {
  const fenced = /```[a-zA-Z]*\n([\s\S]*?)```/.exec(text);
  const body = fenced?.[1] ?? text;
  return body.replace(/^\s*(?:here(?:'s| is)[^\n]*|sure[^\n]*)\n/i, '').trim();
}
