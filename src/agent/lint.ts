// DSL lint for tools that only have text: the real parser's diagnostics, not a
// second grammar. Compilation (layout, icons) is the caller's next step.
import { parseDocument } from '../dsl/document';
import { isReservedFamily } from '../dsl/document';
import { looksLikeMermaid, mermaidToDsl } from '../services/dsl/mermaidToDsl';

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
  /** Set when the input was Mermaid: the DSL it became, and what did not carry over (Mermaid lines). */
  readonly mermaid?: { readonly dsl: string; readonly losses: readonly MermaidLoss[] };
}

export interface MermaidLoss {
  readonly line: number;
  readonly message: string;
}

export interface AgentSource {
  /** OpenFlow DSL, ready to compile. */
  readonly dsl: string;
  /** Present when the input was Mermaid; lines refer to the Mermaid text. */
  readonly mermaidLosses?: readonly MermaidLoss[];
}

/** The first ```fenced``` block in an agent's markdown, prose around it included. */
const FENCED = /```[\w-]*[ \t]*\r?\n([\s\S]*?)\r?\n?[ \t]*```/;

/** Everything outside the fence as blank lines, so diagnostics count lines the way the agent sent them. */
function unfenced(text: string): string {
  const match = FENCED.exec(text);
  if (!match) return text;
  const blank = (part: string) => part.replace(/[^\n]/g, '');
  const bodyStart = match.index + match[0].indexOf('\n') + 1;
  return blank(text.slice(0, bodyStart)) + match[1] + blank(text.slice(bodyStart + match[1]!.length));
}

/**
 * Whatever an agent wrote → DSL. Mermaid converts through the editor's own
 * transpiler; anything else is taken as DSL. Throws a RangeError naming the
 * convertible families when Mermaid cannot be converted.
 */
export function readAgentSource(text: string): AgentSource {
  const source = unfenced(text);
  // DSL is stored as written inside the fence; only lint keeps the padded line numbers.
  if (!looksLikeMermaid(source)) return { dsl: FENCED.exec(text)?.[1] ?? text };
  const conversion = mermaidToDsl(source);
  if ('error' in conversion) throw new RangeError(conversion.error);
  return {
    dsl: conversion.dsl,
    mermaidLosses: conversion.diagnostics.map(({ line, message }) => ({ line, message })),
  };
}

export function lintDsl(text: string): DslLintReport {
  let source: AgentSource;
  try {
    source = readAgentSource(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, family: 'mermaid', reserved: false, statements: 0, lines: text.split('\n').length, diagnostics: [{ code: 'E003', severity: 'error', line: 1, col: 1, message }] };
  }
  const document = parseDocument(source.mermaidLosses ? source.dsl : unfenced(text));
  return {
    ok: !document.diagnostics.some(({ severity }) => severity === 'error'),
    family: document.family,
    reserved: isReservedFamily(document.family),
    statements: document.segments.length,
    lines: document.lineCount,
    diagnostics: document.diagnostics.map(({ code, severity, line, col, message }) => ({ code, severity, line, col, message })),
    ...(source.mermaidLosses ? { mermaid: { dsl: source.dsl, losses: source.mermaidLosses } } : {}),
  };
}
