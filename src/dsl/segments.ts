import type { SourceLocation } from './ast';
import type { DslToken } from './tokenize';

/**
 * One statement: a line, or a `;`-separated run on a line. `opens`/`closes`
 * carry block braces; nesting is the family parser's business (the graph
 * families use groups, erd/class use entity blocks, gitgraph has none).
 */
export interface DslSegment extends SourceLocation {
  readonly tokens: readonly DslToken[];
  readonly opens: boolean;
  readonly closes: boolean;
  readonly raw: string;
}

/** Tokens joined back into text: single spaces, tight before `,` and `]`, collapsed runs (grammar §2.4). */
export function joinTokens(tokens: readonly DslToken[]): string {
  return tokens.map((token) => token.value).join(' ').replace(/\s+([,\]])/g, '$1').replace(/\[\s+/g, '[').replace(/\s+/g, ' ').trim();
}

/** Splits a token stream into statements; never throws. */
export function splitStatements(tokens: readonly DslToken[]): DslSegment[] {
  const result: DslSegment[] = [];
  let current: DslToken[] = [];
  const flush = (opens = false, closes = false, marker?: DslToken) => {
    if (current.length === 0 && !opens && !closes) return;
    const first = current[0] ?? marker;
    const last = current.at(-1) ?? marker;
    result.push({
      tokens: current,
      opens,
      closes,
      line: first?.line ?? 1,
      col: first?.col ?? 1,
      endCol: last?.endCol ?? first?.col ?? 1,
      raw: joinTokens(current),
    });
    current = [];
  };
  let line = tokens[0]?.line;
  for (const token of tokens) {
    if (line !== undefined && token.line !== line) flush();
    line = token.line;
    if (token.kind === 'comment') {
      flush();
      result.push({ tokens: [token], opens: false, closes: false, line: token.line, col: token.col, endCol: token.endCol, raw: token.value });
    } else if (token.value === ';') flush();
    else if (token.value === '{') flush(true);
    else if (token.value === '}') {
      flush();
      flush(false, true);
    } else current.push(token);
  }
  flush();
  return result;
}

/** Splits statement tokens on a top-level comma (`A, B -> C` fans). */
export function splitOnCommas(tokens: readonly DslToken[], depthTokens: readonly string[] = ['[', ']']): DslToken[][] {
  const result: DslToken[][] = [];
  let current: DslToken[] = [];
  let depth = 0;
  for (const token of tokens) {
    if (token.value === depthTokens[0]) depth += 1;
    if (token.value === depthTokens[1]) depth -= 1;
    if (token.value === ',' && depth === 0) {
      result.push(current);
      current = [];
    } else current.push(token);
  }
  result.push(current);
  return result;
}
