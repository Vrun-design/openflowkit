import type { DslDiagnostic } from './ast';

export type DslTokenKind = 'word' | 'string' | 'arrow' | 'punctuation' | 'comment';

export interface DslToken {
  kind: DslTokenKind;
  value: string;
  line: number;
  col: number;
  endCol: number;
}

export interface TokenizeResult {
  tokens: DslToken[];
  diagnostics: DslDiagnostic[];
  lineCount: number;
  truncated: boolean;
}

export const MAX_DSL_LINES = 20_000;

const OPERATORS = [
  '<-->', '-->>', '--|>', '..|>', '<->', '-->', '<--', '->>', '*--', 'o--',
  '..>', '->', '<-', '--', '||', '|o', 'o|', '}|', '|{', '}o', 'o{', '..',
] as const;
const PUNCTUATION = new Set([':', '=', ',', '[', ']', '{', '}', ';', '@']);

function diagnostic(
  code: DslDiagnostic['code'], severity: DslDiagnostic['severity'], line: number,
  col: number, endCol: number, message: string, hint?: string,
): DslDiagnostic {
  return { code, severity, line, col, endCol, message, hint, source: 'parse' };
}

/** Tokenizes DSL without assigning family-specific meaning. Never throws. */
export function tokenize(input: string): TokenizeResult {
  const source = typeof input === 'string' ? input : String(input ?? '');
  const allLines = source.replace(/\r\n?/g, '\n').split('\n');
  const truncated = allLines.length > MAX_DSL_LINES;
  const lines = allLines.slice(0, MAX_DSL_LINES);
  const tokens: DslToken[] = [];
  const diagnostics: DslDiagnostic[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? '';
    let offset = 0;
    while (offset < line.length) {
      if (/\s/u.test(line[offset] ?? '')) {
        offset += 1;
        continue;
      }
      const col = offset + 1;
      if (line.startsWith('//', offset)) {
        tokens.push({ kind: 'comment', value: line.slice(offset + 2).trim(), line: lineIndex + 1, col, endCol: line.length + 1 });
        break;
      }
      if (line[offset] === '"') {
        let value = '';
        let closed = false;
        offset += 1;
        while (offset < line.length) {
          const char = line[offset] ?? '';
          if (char === '"') {
            offset += 1;
            closed = true;
            break;
          }
          if (char === '\\' && offset + 1 < line.length) {
            const escaped = line[offset + 1];
            if (escaped === '"' || escaped === '\\' || escaped === 'n') {
              value += escaped === 'n' ? '\n' : escaped;
              offset += 2;
              continue;
            }
          }
          value += char;
          offset += 1;
        }
        if (!closed) {
          diagnostics.push(diagnostic('W102', 'warning', lineIndex + 1, col, line.length + 1, 'Unterminated quote; line dropped', 'Close the quote'));
          while (tokens.at(-1)?.line === lineIndex + 1) tokens.pop();
          break;
        }
        tokens.push({ kind: 'string', value, line: lineIndex + 1, col, endCol: offset + 1 });
        continue;
      }
      const operator = OPERATORS.find((candidate) => line.startsWith(candidate, offset));
      if (operator) {
        offset += operator.length;
        tokens.push({ kind: 'arrow', value: operator, line: lineIndex + 1, col, endCol: offset + 1 });
        continue;
      }
      const char = line[offset] ?? '';
      if (PUNCTUATION.has(char)) {
        offset += 1;
        tokens.push({ kind: 'punctuation', value: char, line: lineIndex + 1, col, endCol: offset + 1 });
        continue;
      }
      let end = offset + 1;
      while (end < line.length) {
        if (/\s/u.test(line[end] ?? '') || PUNCTUATION.has(line[end] ?? '') || line.startsWith('//', end) || OPERATORS.some((candidate) => line.startsWith(candidate, end))) break;
        end += 1;
      }
      tokens.push({ kind: 'word', value: line.slice(offset, end), line: lineIndex + 1, col, endCol: end + 1 });
      offset = end;
    }
  }

  if (truncated) diagnostics.push(diagnostic('E002', 'error', MAX_DSL_LINES + 1, 1, 1, `Input exceeds ${MAX_DSL_LINES} lines; rest ignored`));
  return { tokens, diagnostics, lineCount: Math.min(allLines.length, MAX_DSL_LINES), truncated };
}
