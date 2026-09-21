// DSL lint for tools that only have text: the real parser's diagnostics, not a
// second grammar. Compilation (layout, icons) is the caller's next step.
import { parseDocument } from '../dsl/document';
import { isReservedFamily } from '../dsl/document';

export interface DslLintReport {
  readonly ok: boolean;
  readonly family: string;
  readonly reserved: boolean;
  readonly statements: number;
  readonly lines: number;
  readonly diagnostics: readonly {
    readonly code: string;
    readonly severity: string;
    readonly line: number;
    readonly col: number;
    readonly message: string;
  }[];
}

export function lintDsl(source: string): DslLintReport {
  const document = parseDocument(source);
  return {
    ok: !document.diagnostics.some(({ severity }) => severity === 'error'),
    family: document.family,
    reserved: isReservedFamily(document.family),
    statements: document.segments.length,
    lines: document.lineCount,
    diagnostics: document.diagnostics.map(({ code, severity, line, col, message }) => ({ code, severity, line, col, message })),
  };
}
