import { DSL_FAMILIES, type DslDiagnostic, type DslDirection, type DslFamily } from './ast';
import { diagnostic, lineDiagnostic, tokenDiagnostic } from './diagnostics';
import { isDiagramPalette, type DiagramPaletteName } from '../opencanvas/domain/nodes/nodePalette';
import { joinTokens, splitStatements, type DslSegment } from './segments';
import { tokenize, type DslToken } from './tokenize';
import { DIRECTIONS } from './vocabulary';

export interface DslComment {
  readonly text: string;
  readonly line: number;
}

export interface CommentTracker {
  /** Comments before `line` that no statement has claimed yet. */
  claim(before: number): string[];
  /** Everything still unclaimed; the orchestrator writes these as trailing comments. */
  remaining(): string[];
}

export function createCommentTracker(comments: readonly DslComment[]): CommentTracker {
  const pending = [...comments].sort((a, b) => a.line - b.line);
  return {
    claim(before) {
      const claimed: string[] = [];
      while (pending.length > 0 && pending[0]!.line < before) claimed.push(pending.shift()!.text);
      return claimed;
    },
    remaining: () => pending.map((comment) => comment.text),
  };
}

/** Families whose header parses today but whose semantics land in phase 3.8. */
export const RESERVED_FAMILIES: readonly DslFamily[] = [
  'bpmn', 'org', 'gantt', 'wireframe', 'sankey', 'journey', 'timeline',
];

/** `icons: auto` puts an icon on every node whose label names one; `off` never does. */
export type DslIconsMode = 'auto' | 'off';

export interface DslDocument {
  readonly version: number;
  readonly family: DslFamily;
  /** Words on the family line after the family (e.g. `bar` in `chart bar`). */
  readonly header: readonly string[];
  readonly direction?: DslDirection;
  readonly title?: string;
  /** `appearance:` palette; absent when the default palette applies. */
  readonly appearance?: DiagramPaletteName;
  /** `icons:` — auto icons from labels on or off; absent when the host decides. */
  readonly icons?: DslIconsMode;
  readonly comments: readonly DslComment[];
  readonly segments: readonly DslSegment[];
  readonly diagnostics: DslDiagnostic[];
  readonly lineCount: number;
}

function lines(tokens: readonly DslToken[]): Map<number, DslToken[]> {
  const grouped = new Map<number, DslToken[]>();
  for (const token of tokens) grouped.set(token.line, [...(grouped.get(token.line) ?? []), token]);
  return grouped;
}

/**
 * The shared front end: version pragma, family line, direction and the flat
 * statement stream. Family parsers consume `segments`; they never re-tokenize.
 */
export function parseDocument(input: string): DslDocument {
  const tokenized = tokenize(input);
  const diagnostics = [...tokenized.diagnostics];
  const grouped = [...lines(tokenized.tokens).entries()]
    .filter(([, lineTokens]) => lineTokens.some((token) => token.kind !== 'comment'));
  let version = 1;
  let family: DslFamily = 'architecture';
  let direction: DslDirection | undefined;
  let directiveDirection: DslDirection | undefined;
  let title: string | undefined;
  let appearance: DiagramPaletteName | undefined;
  let icons: DslIconsMode | undefined;
  let consumedThrough = 0;

  const first = grouped[0];
  if (first && tokenized.tokens.length > 0 && lineText(first[1]).startsWith('%% ofk ')) {
    const parsed = Number(lineText(first[1]).slice(7));
    if (Number.isFinite(parsed)) version = parsed;
    if (version > 1) diagnostics.push(tokenDiagnostic('W001', 'warning', first[1][0], 'Version is newer than parser; parsed as version 1'));
    consumedThrough = first[0];
  } else if (grouped.length > 0) {
    diagnostics.push(tokenDiagnostic('I002', 'info', grouped[0]?.[1][0], 'No version pragma; version 1 assumed'));
  }

  const header = grouped.find(([line]) => line > consumedThrough);
  const headerWords = header ? header[1].filter((token) => token.kind !== 'comment').map((token) => token.value) : [];
  if (header && DSL_FAMILIES.includes(headerWords[0] as DslFamily)) {
    family = headerWords[0] as DslFamily;
    direction = DIRECTIONS[(headerWords[1] ?? '').toLowerCase()];
    consumedThrough = header[0];
    if (isReservedFamily(family)) {
      diagnostics.push(tokenDiagnostic('W105', 'warning', header[1][0], `Family ${family} is reserved; parsed as graph syntax`));
    }
  } else if (header) {
    diagnostics.push(tokenDiagnostic('I003', 'info', header[1][0], 'No family line; architecture assumed'));
    const candidate = headerWords[0]?.toLowerCase();
    if (candidate && candidate !== headerWords[0] && DSL_FAMILIES.includes(candidate as DslFamily)) {
      diagnostics.push(tokenDiagnostic('W110', 'warning', header[1][0], 'First statement looks like a family header with wrong case', candidate));
    }
  }

  const comments: DslComment[] = tokenized.tokens
    .filter((token) => token.kind === 'comment' && token.line > consumedThrough)
    .map((token) => ({ text: token.value, line: token.line }));

  // `title:`, `direction:`, `appearance:` and `icons:` are shared directives: their
  // values are hoisted into the document (grammar §3.3) and their lines are
  // consumed here so no family parser has to know about them.
  const segments: DslSegment[] = [];
  for (const segment of splitStatements(tokenized.tokens.filter((token) => token.line > consumedThrough))) {
    const keyword = segment.tokens[0]?.kind === 'comment' ? undefined : segment.tokens[0]?.value;
    // `icons` is a common word, so only `icons:` is the directive.
    const directive = keyword === 'icons' ? segment.tokens[1]?.value === ':' : keyword === 'title' || keyword === 'direction' || keyword === 'appearance';
    if (!directive) {
      segments.push(segment);
      continue;
    }
    const value = joinTokens(segment.tokens.slice(segment.tokens[1]?.value === ':' ? 2 : 1));
    if (keyword === 'title') {
      if (title !== undefined) diagnostics.push(diagnostic(segment, 'W104', 'warning', 'Duplicate title; first wins'));
      else title = value;
    } else if (keyword === 'appearance') {
      if (!isDiagramPalette(value.toLowerCase())) {
        diagnostics.push(diagnostic(segment, 'W102', 'warning', `Unknown appearance ${value}; default palette used`));
      } else if (appearance) diagnostics.push(diagnostic(segment, 'W104', 'warning', 'Duplicate appearance; first wins'));
      else appearance = value.toLowerCase() as DiagramPaletteName;
    } else if (keyword === 'icons') {
      const mode = value.toLowerCase();
      if (mode !== 'auto' && mode !== 'off') {
        diagnostics.push(diagnostic(segment, 'W102', 'warning', `Unknown icons ${value}; expected auto or off`));
      } else if (icons) diagnostics.push(diagnostic(segment, 'W104', 'warning', 'Duplicate icons; first wins'));
      else icons = mode;
    } else {
      const parsed = DIRECTIONS[value.toLowerCase()];
      if (!parsed) diagnostics.push(diagnostic(segment, 'W101', 'warning', `Unknown direction ${value}; ignored`));
      else if (directiveDirection) diagnostics.push(diagnostic(segment, 'W104', 'warning', 'Duplicate direction; first wins'));
      else directiveDirection = parsed;
    }
  }

  if (grouped.length === 0) diagnostics.push(lineDiagnostic(1, 'E001', 'error', 'Document is empty'));
  return {
    version, family,
    header: headerWords.slice(1),
    direction: direction ?? directiveDirection,
    ...(title ? { title } : {}),
    ...(appearance ? { appearance } : {}),
    ...(icons ? { icons } : {}),
    comments, segments, diagnostics, lineCount: tokenized.lineCount,
  };
}

function lineText(tokens: readonly DslToken[]): string {
  return tokens.map((token) => token.value).join(' ');
}

/** Family-name check used before dispatch (keeps the registry free of parse concerns). */
export function isReservedFamily(family: string): boolean {
  return (RESERVED_FAMILIES as readonly string[]).includes(family);
}
