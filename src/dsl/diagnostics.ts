import type { DslDiagnostic, SourceLocation } from './ast';
import type { DslToken } from './tokenize';

/** One diagnostic with a source range; every parser layer reports through this. */
export function diagnostic(
  at: SourceLocation,
  code: DslDiagnostic['code'],
  severity: DslDiagnostic['severity'],
  message: string,
  hint?: string,
): DslDiagnostic {
  return { code, severity, line: at.line, col: at.col, endCol: at.endCol, message, hint, source: 'parse' };
}

export function tokenDiagnostic(code: DslDiagnostic['code'], severity: DslDiagnostic['severity'], token: DslToken | undefined, message: string, hint?: string): DslDiagnostic {
  return diagnostic({ line: token?.line ?? 1, col: token?.col ?? 1, endCol: token?.endCol ?? 1 }, code, severity, message, hint);
}

/** Same, for a whole line when no precise range is known. */
export function lineDiagnostic(
  line: number,
  code: DslDiagnostic['code'],
  severity: DslDiagnostic['severity'],
  message: string,
  hint?: string,
): DslDiagnostic {
  return diagnostic({ line, col: 1, endCol: 1 }, code, severity, message, hint);
}
