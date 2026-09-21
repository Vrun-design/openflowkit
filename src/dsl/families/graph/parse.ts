import {
  DSL_FAMILIES, type DslAttribute, type DslDiagnostic, type DslEdge, type DslFamily,
  type DslReference, type DslStatement,
} from '../../ast';
import { diagnostic, tokenDiagnostic } from '../../diagnostics';
import { readAttributes } from '../../attributes';
import { joinTokens, splitStatements, type DslSegment } from '../../segments';
import type { DslToken } from '../../tokenize';

const GRAPH_ARROWS = new Set(['->', '-->', '<->', '<-->', '--', '<-', '<--']);
const DIRECTIVES = new Set(['title', 'direction', 'autonumber', 'align', 'note', 'legend']);
const RESERVED_KINDS = new Set(['person', 'system', 'container', 'component', 'store', 'queue', 'external', 'node', 'instance']);
const RESERVED_RECORDS = new Set(['model', 'views', 'view', 'deployment', 'flow', 'step', 'goto', 'include', 'exclude', 'extends', 'rank', 'pin', 'alt', 'par']);

function parseReference(tokens: readonly DslToken[], diagnostics: DslDiagnostic[]): DslReference | undefined {
  const openAttributes = tokens.filter((token) => token.value === '[').length;
  const closeAttributes = tokens.filter((token) => token.value === ']').length;
  if (openAttributes !== closeAttributes || tokens.some((token) => token.value === '{' || token.value === '}')) return undefined;
  const parsed = readAttributes(tokens, diagnostics);
  if (parsed.body.length === 0) return undefined;
  const equals = parsed.body.findIndex((token) => token.value === '=');
  const labelTokens = equals >= 0 ? parsed.body.slice(equals + 1) : parsed.body;
  const label = joinTokens(labelTokens);
  if (!label) return undefined;
  const first = parsed.body[0]!;
  const last = parsed.body.at(-1)!;
  let id = equals >= 0 ? joinTokens(parsed.body.slice(0, equals)) : undefined;
  if (id && !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(id)) {
    const original = id;
    id = id.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'n';
    diagnostics.push(tokenDiagnostic('W120', 'warning', parsed.body[0], `Invalid explicit id ${original}; slugified as ${id}`));
  }
  return {
    ...(id ? { id } : {}), label,
    attributes: parsed.attributes, line: first.line, col: first.col, endCol: last.endCol,
  };
}

function splitReferences(tokens: readonly DslToken[]): DslToken[][] {
  const result: DslToken[][] = [];
  let current: DslToken[] = [];
  let attributeDepth = 0;
  for (const token of tokens) {
    if (token.value === '[') attributeDepth += 1;
    if (token.value === ']') attributeDepth -= 1;
    if (token.value === ',' && attributeDepth === 0) {
      result.push(current);
      current = [];
    } else current.push(token);
  }
  result.push(current);
  return result;
}

const EDGE_ONLY_WORDS = new Set(['dashed', 'thick', 'invisible', 'flow']);
const EDGE_ONLY_KEYS = new Set(['head', 'tail', 'from', 'to', 'label']);

function isEdgeOnlyAttribute(attribute: DslAttribute): boolean {
  if (attribute.key) return EDGE_ONLY_KEYS.has(attribute.key.toLowerCase());
  return EDGE_ONLY_WORDS.has(attribute.value.toLowerCase());
}

export function parseEdge(tokens: readonly DslToken[], diagnostics: DslDiagnostic[]): DslEdge[] | undefined {
  const arrowIndexes = tokens.map((token, index) => token.kind === 'arrow' && GRAPH_ARROWS.has(token.value) ? index : -1).filter((index) => index >= 0);
  if (arrowIndexes.length === 0) return undefined;
  const pieces: DslToken[][] = [];
  const arrows: DslToken[] = [];
  let start = 0;
  for (const index of arrowIndexes) {
    pieces.push(tokens.slice(start, index));
    arrows.push(tokens[index]!);
    start = index + 1;
  }
  pieces.push(tokens.slice(start));
  const edges: DslEdge[] = [];
  for (let index = 0; index < arrows.length; index += 1) {
    const leftReferences = splitReferences(pieces[index] ?? []).map((piece) => parseReference(piece, diagnostics));
    let rightTokens = pieces[index + 1] ?? [];
    let label: string | undefined;
    let edgeAttributes: DslAttribute[] = [];
    let nodeAttributes: DslAttribute[] = [];
    if (index === arrows.length - 1) {
      // A `:` inside `[…]` is a key separator, not the edge label separator.
      let colon = -1;
      let depth = 0;
      for (let position = 0; position < rightTokens.length; position += 1) {
        const token = rightTokens[position]!;
        if (token.value === '[') depth += 1;
        else if (token.value === ']') depth -= 1;
        else if (token.value === ':' && depth === 0) {
          colon = position;
          break;
        }
      }
      if (colon >= 0) {
        const labelPart = readAttributes(rightTokens.slice(colon + 1), diagnostics);
        label = joinTokens(labelPart.body);
        edgeAttributes = labelPart.attributes;
        rightTokens = rightTokens.slice(0, colon);
      } else if (rightTokens.at(-1)?.value === ']') {
        // Trailing `[…]` with no label: edge flags stay on the edge, node
        // vocabulary (shape, colour, icon, keys) lands on the target.
        const open = rightTokens.findLastIndex((token, position) => position < rightTokens.length - 1 && token.value === '[');
        if (open >= 0) {
          const trailing = readAttributes(rightTokens.slice(open), diagnostics);
          edgeAttributes = trailing.attributes.filter(isEdgeOnlyAttribute);
          nodeAttributes = trailing.attributes.filter((attribute) => !isEdgeOnlyAttribute(attribute));
          rightTokens = rightTokens.slice(0, open);
        }
      }
    }
    const rightReferences = splitReferences(rightTokens).map((piece) => parseReference(piece, diagnostics));
    if (leftReferences.some((reference) => !reference) || rightReferences.some((reference) => !reference)) return undefined;
    for (const reference of rightReferences) reference?.attributes.push(...nodeAttributes);
    for (const left of leftReferences as DslReference[]) {
      for (const right of rightReferences as DslReference[]) {
        let from = left;
        let to = right;
        let arrow = arrows[index]!.value;
        if (arrow === '<-' || arrow === '<--') {
          [from, to] = [to, from];
          arrow = arrow === '<-' ? '->' : '-->';
        }
        const first = tokens[0]!;
        const last = tokens.at(-1)!;
        edges.push({ kind: 'edge', from, to, arrow: arrow as DslEdge['arrow'], ...(label ? { label } : {}), attributes: edgeAttributes, raw: joinTokens(tokens), line: first.line, col: first.col, endCol: last.endCol });
      }
    }
  }
  return edges;
}

/**
 * Graph-family statements: nodes, edges, groups and the reserved model records
 * that phase 5 will give semantics. Flowchart, architecture and state share it.
 */
export interface GraphParseOptions {
  /** Extra statement keywords a family treats as block kinds (state's `state`). */
  readonly reservedRecords?: ReadonlySet<string>;
}

export function parseGraphStatements(segments: readonly DslSegment[], diagnostics: DslDiagnostic[], options: GraphParseOptions = {}): DslStatement[] {
  const reservedRecords = options.reservedRecords ?? RESERVED_RECORDS;
  const statements: DslStatement[] = [];
  const stack: Array<{ statements: DslStatement[]; opener?: DslStatement }> = [{ statements }];
  for (const segment of segments) {
    const current = stack.at(-1)!.statements;
    if (segment.tokens[0]?.kind === 'comment') continue;
    if (segment.closes) {
      if (stack.length > 1) stack.pop();
      else diagnostics.push(tokenDiagnostic('W101', 'warning', segment.tokens[0], 'Unexpected block close; line dropped'));
      continue;
    }
    if (segment.tokens.length === 0) continue;
    const firstToken = segment.tokens[0]!;
    const lastToken = segment.tokens.at(-1)!;
    const keyword = firstToken.value;
    const edge = parseEdge(segment.tokens, diagnostics);
    let statement: DslStatement | undefined;
    if (edge) {
      current.push(...edge);
      statement = edge.at(-1);
    } else if (DIRECTIVES.has(keyword)) {
      statement = { kind: 'directive', name: keyword as 'title', value: joinTokens(segment.tokens.slice(segment.tokens[1]?.value === ':' ? 2 : 1)), raw: joinTokens(segment.tokens), line: firstToken.line, col: firstToken.col, endCol: lastToken.endCol };
      current.push(statement);
    } else if (keyword === 'group' || segment.opens) {
      const reservedKind = RESERVED_KINDS.has(keyword) || reservedRecords.has(keyword) ? keyword : undefined;
      const strippedTokens = keyword === 'group' || reservedKind ? segment.tokens.slice(1) : segment.tokens;
      const referenceTokens = strippedTokens.length > 0 ? strippedTokens : [firstToken];
      const group = parseReference(referenceTokens, diagnostics);
      if (group) {
        statement = { kind: 'group', group, ...(reservedKind ? { reservedKind } : {}), statements: [], raw: joinTokens(segment.tokens), line: firstToken.line, col: firstToken.col, endCol: lastToken.endCol };
        current.push(statement);
      }
    } else if (reservedRecords.has(keyword)) {
      statement = { kind: 'reserved', keyword, value: joinTokens(segment.tokens.slice(1)), raw: joinTokens(segment.tokens), line: firstToken.line, col: firstToken.col, endCol: lastToken.endCol };
      current.push(statement);
    } else if (segment.tokens.some((token) => token.kind === 'arrow')) {
      diagnostics.push(tokenDiagnostic('W101', 'warning', firstToken, 'Line has an arrow but no parsable endpoints; dropped'));
    } else {
      const reservedKind = RESERVED_KINDS.has(keyword) ? keyword : undefined;
      const node = parseReference(reservedKind ? segment.tokens.slice(1) : segment.tokens, diagnostics);
      if (node) {
        statement = { kind: 'node', node, ...(reservedKind ? { reservedKind } : {}), raw: joinTokens(segment.tokens), line: firstToken.line, col: firstToken.col, endCol: lastToken.endCol };
        current.push(statement);
      }
    }
    if (!statement) diagnostics.push(tokenDiagnostic('W101', 'warning', firstToken, 'Line could not be parsed; dropped'));
    if (segment.opens) {
      if (statement?.kind === 'group') stack.push({ statements: statement.statements, opener: statement });
      else if (statement?.kind === 'reserved') {
        statement.statements = [];
        stack.push({ statements: statement.statements, opener: statement });
      } else diagnostics.push(tokenDiagnostic('W101', 'warning', firstToken, 'Block opener requires a group or reserved statement'));
    }
  }
  while (stack.length > 1) {
    const frame = stack.pop();
    const opener = frame?.opener;
    diagnostics.push(diagnostic({ line: opener?.line ?? 1, col: opener?.col ?? 1, endCol: opener?.endCol ?? 1 }, 'W103', 'warning', 'Unclosed block at end of input', '} inserted'));
  }
  return statements;
}

/** True when the first word names a known family; used by the compat `parse()`. */
export function isFamilyWord(word: string | undefined): word is DslFamily {
  return Boolean(word) && DSL_FAMILIES.includes(word as DslFamily);
}

export { splitStatements };
