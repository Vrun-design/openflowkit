import type { DslAttribute, DslDiagnostic, DslEdge, DslReference, DslStatement } from '../../ast';
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
  const label = joinTokens(labelTokens, true);
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

/** The operator tokens written without a space around `index`: `||--o{` lexes as three. */
function gluedRun(tokens: readonly DslToken[], index: number): readonly DslToken[] {
  const glued = (left: DslToken | undefined, right: DslToken | undefined) => left?.kind === 'arrow' && right?.kind === 'arrow' && left.line === right.line && left.endCol === right.col;
  let start = index;
  let end = index;
  while (glued(tokens[start - 1], tokens[start])) start -= 1;
  while (glued(tokens[end], tokens[end + 1])) end += 1;
  return tokens.slice(start, end + 1);
}

/** The first operator a graph family has no arrow for (`||--o{`, `..>`), as written. */
export function foreignArrow(tokens: readonly DslToken[]): string | undefined {
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index]!.kind !== 'arrow') continue;
    const run = gluedRun(tokens, index);
    if (run.length > 1 || !GRAPH_ARROWS.has(tokens[index]!.value)) return run.map((token) => token.value).join('');
  }
  return undefined;
}

export function parseEdge(tokens: readonly DslToken[], diagnostics: DslDiagnostic[]): DslEdge[] | undefined {
  const arrowIndexes = tokens.map((token, index) => token.kind === 'arrow' && GRAPH_ARROWS.has(token.value) ? index : -1).filter((index) => index >= 0);
  // `A ||--o{ B` holds a `--`, but the operator is crow-foot: no edge, and no `||` in a name.
  if (arrowIndexes.length === 0 || arrowIndexes.some((index) => gluedRun(tokens, index).length > 1)) return undefined;
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
        label = joinTokens(labelPart.body, true);
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
  // A block that opens and closes on one line: on a plain statement it is nearly always a label with braces in it.
  const oneLineBlocks = new Map<DslSegment, string>();
  const open: Array<{ opener: DslSegment; inner: string[] }> = [];
  for (const segment of segments) {
    if (segment.opens) {
      open.push({ opener: segment, inner: [] });
    } else if (segment.closes) {
      const block = open.pop();
      if (block?.opener.line === segment.line) oneLineBlocks.set(block.opener, block.inner.join(' '));
    } else if (open.length > 0) {
      open.at(-1)!.inner.push(joinTokens(segment.tokens));
    }
  }
  let mermaidSubgraphs = 0;
  for (const segment of segments) {
    const current = stack.at(-1)!.statements;
    if (segment.tokens[0]?.kind === 'comment') continue;
    if (segment.closes) {
      if (stack.length > 1) stack.pop();
      else diagnostics.push(diagnostic({ line: segment.line, col: segment.col, endCol: segment.endCol }, 'W101', 'warning', 'Unexpected block close; line dropped'));
      continue;
    }
    if (segment.tokens.length === 0) continue;
    const firstToken = segment.tokens[0]!;
    const lastToken = segment.tokens.at(-1)!;
    // A quoted first word is a label, never a keyword (grammar §2.4: quoting is the escape).
    const keyword = firstToken.kind === 'word' ? firstToken.value : '';
    // Mermaid's `subgraph X` … `end`, typed into OFK text: say how to write it, and make no box of either line.
    if (keyword === 'subgraph' && !segment.opens && !segment.tokens.some((token) => token.kind === 'arrow')) {
      mermaidSubgraphs += 1;
      diagnostics.push(tokenDiagnostic('W101', 'warning', firstToken,
        "This looks like Mermaid's subgraph — use `group X { … }` or paste the whole text as Mermaid; line dropped",
        `group ${joinTokens(segment.tokens.slice(1), true) || 'X'} { … }`));
      continue;
    }
    if (keyword === 'end' && segment.tokens.length === 1 && mermaidSubgraphs > 0) {
      mermaidSubgraphs -= 1;
      diagnostics.push(tokenDiagnostic('W101', 'warning', firstToken, "Mermaid's `end` closes a subgraph; line dropped", '}'));
      continue;
    }
    const edge = parseEdge(segment.tokens, diagnostics);
    let statement: DslStatement | undefined;
    if (edge) {
      current.push(...edge);
      statement = edge.at(-1);
    } else if (DIRECTIVES.has(keyword)) {
      statement = { kind: 'directive', name: keyword as 'title', value: joinTokens(segment.tokens.slice(segment.tokens[1]?.value === ':' ? 2 : 1), keyword === 'note'), raw: joinTokens(segment.tokens), line: firstToken.line, col: firstToken.col, endCol: lastToken.endCol };
      current.push(statement);
    } else if (keyword === 'group' || segment.opens) {
      const reservedKind = RESERVED_KINDS.has(keyword) || reservedRecords.has(keyword) ? keyword : undefined;
      const strippedTokens = keyword === 'group' || reservedKind ? segment.tokens.slice(1) : segment.tokens;
      const referenceTokens = strippedTokens.length > 0 ? strippedTokens : [firstToken];
      const group = parseReference(referenceTokens, diagnostics);
      const inner = oneLineBlocks.get(segment);
      if (group && inner !== undefined && keyword !== 'group' && !reservedKind) {
        diagnostics.push(tokenDiagnostic('W106', 'warning', firstToken,
          `\`{${inner}}\` closed on this line opens a group around ${group.label}; the braces are not part of the label`,
          `${group.id ? `${group.id} = ` : ''}"${group.label} {${inner}}"`));
      }
      if (group) {
        statement = { kind: 'group', group, ...(reservedKind ? { reservedKind } : {}), statements: [], raw: joinTokens(segment.tokens), line: firstToken.line, col: firstToken.col, endCol: lastToken.endCol };
        current.push(statement);
      }
    } else if (reservedRecords.has(keyword)) {
      statement = { kind: 'reserved', keyword, value: joinTokens(segment.tokens.slice(1)), raw: joinTokens(segment.tokens), line: firstToken.line, col: firstToken.col, endCol: lastToken.endCol };
      current.push(statement);
    } else if (segment.tokens.some((token) => token.kind === 'arrow')) {
      const foreign = foreignArrow(segment.tokens);
      diagnostics.push(foreign
        ? tokenDiagnostic('W111', 'warning', firstToken, `\`${foreign}\` is not an arrow in this family; line dropped`, 'use -> --> <-> -- (quote text that holds it)')
        : tokenDiagnostic('W101', 'warning', firstToken, 'Line has an arrow but no parsable endpoints; dropped'));
      continue;
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

export { splitStatements };
