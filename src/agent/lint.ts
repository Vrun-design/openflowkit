// DSL lint for tools that only have text: the real parser's diagnostics, not a
// second grammar. Compilation (layout, icons) is the caller's next step.
import { isReservedFamily, parseDocument, type DslDocument } from '../dsl/document';
import { DSL_FAMILIES, type DslDiagnostic } from '../dsl/ast';
import { DIRECTIONS } from '../dsl/vocabulary';
import { d2ToDsl, looksLikeD2 } from '../services/dsl/d2ToDsl';
import { looksLikeMermaid, mermaidToDsl } from '../services/dsl/mermaidToDsl';
import { looksLikeStructurizr, structurizrToDsl } from '../services/dsl/structurizrToDsl';

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
  /** Set when the input was Mermaid, Structurizr or D2: the DSL it became, and what did not carry over. */
  readonly converted?: { readonly from: ForeignFormat; readonly dsl: string; readonly losses: readonly ConversionLoss[] };
}

export type ForeignFormat = 'mermaid' | 'structurizr' | 'd2';

/** A construct the DSL cannot express; `line` counts lines of the text the agent sent. */
export interface ConversionLoss {
  readonly line: number;
  readonly message: string;
}

export interface AgentSource {
  /** OpenFlow DSL, ready to compile. */
  readonly dsl: string;
  /** Present when the input was another language; lines refer to the text the agent sent. */
  readonly converted?: { readonly from: ForeignFormat; readonly losses: readonly ConversionLoss[] };
}

/** Detector and converter per language, tried in this order; DSL is what is left. */
const FOREIGN: readonly {
  readonly from: ForeignFormat;
  readonly label: string;
  readonly detect: (text: string) => boolean;
  readonly convert: (text: string) => { dsl: string; losses: readonly string[]; diagnostics: readonly DslDiagnostic[] } | { error: string };
}[] = [
  { from: 'mermaid', label: 'Mermaid', detect: looksLikeMermaid, convert: mermaidToDsl },
  { from: 'structurizr', label: 'Structurizr DSL', detect: looksLikeStructurizr, convert: structurizrToDsl },
  { from: 'd2', label: 'D2', detect: looksLikeD2, convert: d2ToDsl },
];

/** The language `text` is written in when it is one we convert; null for DSL (or anything else). */
export function detectForeign(text: string): (typeof FOREIGN)[number] | null {
  return FOREIGN.find(({ detect }) => detect(text)) ?? null;
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
 * Whatever an agent wrote → DSL. Mermaid, Structurizr DSL and D2 convert through
 * the editor's own importers; anything else is taken as DSL. Throws a RangeError
 * saying why when a recognised language cannot be converted.
 */
export function readAgentSource(text: string): AgentSource {
  const source = unfenced(text);
  const foreign = detectForeign(source);
  // DSL is stored as written inside the fence; only lint keeps the padded line numbers.
  if (!foreign) return { dsl: FENCED.exec(text)?.[1] ?? text };
  const conversion = foreign.convert(source);
  if ('error' in conversion) throw new RangeError(conversion.error.startsWith(foreign.label) ? conversion.error : `${foreign.label}: ${conversion.error}`);
  // As in the code panel: a line the importer could not read stops the conversion, rather than drawing around it.
  const errors = conversion.diagnostics.filter(({ severity }) => severity === 'error');
  if (errors.length) {
    throw Object.assign(new RangeError(`${foreign.label} not converted:\n${errors.map(({ message }) => message).join('\n')}`), { diagnostics: errors });
  }
  return {
    dsl: conversion.dsl,
    converted: { from: foreign.from, losses: conversion.diagnostics.map(({ line, message }) => ({ line, message })) },
  };
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length]!;
}

/**
 * `flowchrt` on the first line parses as an architecture node, which is valid and wrong.
 * Kept narrow so a real first node never warns: implemented families only (`Pipeline` is not
 * `timeline`), one edit under 10 letters (`Airframe` is not `wireframe`), no family-plus-suffix
 * (`Sequencer`, `mindmaps`), and a second word only when it is a direction (`Journal Service`).
 */
function misspelledFamily(document: DslDocument, text: string): DslLintReport['diagnostics'][number] | null {
  const assumed = document.diagnostics.find(({ code }) => code === 'I003');
  const [, first, second] = (assumed && /^([A-Za-z]+)(?:\s+(\S+))?$/.exec(text.split('\n')[assumed.line - 1]?.trim() ?? '')) || [];
  const word = first?.toLowerCase();
  if (!assumed || !word || (second !== undefined && !DIRECTIONS[second.toLowerCase()])) return null;
  const family = DSL_FAMILIES.find((name) => name.length >= 6 && !isReservedFamily(name) && !word.startsWith(name)
    && editDistance(word, name) <= (name.length < 10 ? 1 : 2));
  return family ? {
    code: 'W110', severity: 'warning', line: assumed.line, col: assumed.col,
    message: `First line looks like a misspelled family header; did you mean \`${family}\`? Parsed as architecture.`,
  } : null;
}

export function lintDsl(text: string): DslLintReport {
  let source: AgentSource;
  try {
    source = readAgentSource(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const marked = (error as { diagnostics?: readonly DslDiagnostic[] }).diagnostics?.map(({ code, severity, line, col, message: text }) => ({ code, severity, line, col, message: text }));
    return { ok: false, family: 'unknown', reserved: false, statements: 0, lines: text.split('\n').length, diagnostics: marked ?? [{ code: 'E003', severity: 'error', line: 1, col: 1, message }] };
  }
  const parsed = source.converted ? source.dsl : unfenced(text);
  const document = parseDocument(parsed);
  const typo = misspelledFamily(document, parsed);
  return {
    ok: !document.diagnostics.some(({ severity }) => severity === 'error'),
    family: document.family,
    reserved: isReservedFamily(document.family),
    statements: document.segments.length,
    lines: document.lineCount,
    diagnostics: [
      ...document.diagnostics.map(({ code, severity, line, col, message }) => ({ code, severity, line, col, message })),
      ...(typo ? [typo] : []),
    ],
    ...(source.converted ? { converted: { ...source.converted, dsl: source.dsl } } : {}),
  };
}
