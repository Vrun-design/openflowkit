import {
  DSL_FAMILIES, type DslAttribute, type DslDiagram, type DslDiagnostic,
  type DslDirection, type DslEdge, type DslFamily, type DslReference,
  type DslStatement,
} from './ast';
import { tokenize, type DslToken } from './tokenize';

const GRAPH_ARROWS = new Set(['->', '-->', '<->', '<-->', '--', '<-', '<--']);
const DIRECTIONS: Record<string, DslDirection> = {
  down: 'down', right: 'right', left: 'left', up: 'up', TB: 'down', TD: 'down',
  LR: 'right', RL: 'left', BT: 'up', 'top-down': 'down', 'left-right': 'right',
};
const DIRECTIVES = new Set(['title', 'direction', 'autonumber', 'align', 'note', 'legend']);
const RESERVED_KINDS = new Set(['person', 'system', 'container', 'component', 'store', 'queue', 'external', 'node', 'instance']);
const RESERVED_RECORDS = new Set(['model', 'views', 'view', 'deployment', 'flow', 'step', 'goto', 'include', 'exclude', 'extends', 'rank', 'pin', 'alt', 'par']);
const KNOWN_ATTRIBUTE_WORDS = new Set([
  'rect', 'rounded', 'circle', 'ellipse', 'diamond', 'cylinder', 'hexagon', 'cloud',
  'doc', 'note', 'parallelogram', 'person', 'queue', 'component', 'browser', 'mobile',
  'box', 'oval', 'decision', 'database', 'db', 'storage', 'document', 'actor', 'user',
  'io', 'data', 'start', 'end', 'terminator', 'process', 'prep', 'subroutine',
  'blue', 'green', 'red', 'orange', 'violet', 'teal', 'pink', 'yellow', 'gray',
  'grey', 'purple', 'pastel', 'bold', 'outline', 'shadow', 'dashed', 'thick',
  'invisible', 'flow', 'right', 'left', 'up', 'down', 'fork', 'join', 'choice',
]);
const KNOWN_ATTRIBUTE_KEYS = new Set([
  'label', 'link', 'tech', 'desc', 'kind', 'tags', 'pin', 'rank', 'width', 'height',
  'icon', 'color', 'shape', 'fill', 'head', 'tail', 'from', 'to', 'order',
]);

type StatementTokens = { tokens: DslToken[]; opens: boolean; closes: boolean };

function diag(code: DslDiagnostic['code'], severity: DslDiagnostic['severity'], token: DslToken | undefined, message: string, hint?: string): DslDiagnostic {
  return { code, severity, line: token?.line ?? 1, col: token?.col ?? 1, endCol: token?.endCol ?? 1, message, hint, source: 'parse' };
}

function splitStatements(tokens: DslToken[]): StatementTokens[] {
  const result: StatementTokens[] = [];
  let current: DslToken[] = [];
  const flush = (opens = false, closes = false) => {
    if (current.length > 0 || opens || closes) result.push({ tokens: current, opens, closes });
    current = [];
  };
  let line = tokens[0]?.line;
  for (const token of tokens) {
    if (line !== undefined && token.line !== line) flush();
    line = token.line;
    if (token.kind === 'comment') {
      flush();
      result.push({ tokens: [token], opens: false, closes: false });
    } else if (token.value === ';') flush();
    else if (token.value === '{') flush(true);
    else if (token.value === '}') {
      flush();
      flush(false, true);
    }
    else current.push(token);
  }
  flush();
  return result;
}

function text(tokens: DslToken[]): string {
  return tokens.map((token) => token.value).join(' ').replace(/\s+([,\]])/g, '$1').replace(/\[\s+/g, '[').trim();
}

function parseAttributes(tokens: DslToken[], diagnostics: DslDiagnostic[]): { body: DslToken[]; attributes: DslAttribute[] } {
  const start = tokens.findIndex((token) => token.value === '[');
  if (start < 0) return { body: tokens, attributes: [] };
  const end = tokens.findIndex((token, index) => index > start && token.value === ']');
  if (end < 0) {
    diagnostics.push(diag('W101', 'warning', tokens[start], 'Unclosed attribute list; statement dropped', 'Add ]'));
    return { body: [], attributes: [] };
  }
  const attributes: DslAttribute[] = [];
  let part: DslToken[] = [];
  const commit = () => {
    if (part.length === 0) return;
    const colon = part.findIndex((token) => token.value === ':');
    const first = part[0]!;
    const last = part.at(-1)!;
    // `[pin: 240,80]` splits on the comma; rejoin the coordinate pair.
    if (colon < 0 && /^-?\d+(?:\.\d+)?$/.test(part[0]!.value) && part.length === 1) {
      const previous = attributes.at(-1);
      if (previous?.key === 'pin' && !previous.value.includes(',')) {
        previous.value = `${previous.value},${part[0]!.value}`;
        previous.endCol = last.endCol;
        part = [];
        return;
      }
    }
    attributes.push({
      ...(colon >= 0 ? { key: text(part.slice(0, colon)) } : {}),
      value: text(colon >= 0 ? part.slice(colon + 1) : part),
      line: first.line, col: first.col, endCol: last.endCol,
    });
    const key = colon >= 0 ? text(part.slice(0, colon)) : undefined;
    const value = text(colon >= 0 ? part.slice(colon + 1) : part);
    const knownWord = KNOWN_ATTRIBUTE_WORDS.has(value) || /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value) || value.includes('/') || /^(?:aws|azure|gcp|cncf)-/.test(value);
    if ((key && !KNOWN_ATTRIBUTE_KEYS.has(key)) || (!key && !knownWord)) {
      diagnostics.push(diag('W131', 'warning', first, `Unknown attribute ${key ?? value}; kept verbatim`));
    }
    part = [];
  };
  for (const token of tokens.slice(start + 1, end)) {
    if (token.value === ',') commit();
    else part.push(token);
  }
  commit();
  return { body: [...tokens.slice(0, start), ...tokens.slice(end + 1)], attributes };
}

function parseReference(tokens: DslToken[], diagnostics: DslDiagnostic[]): DslReference | undefined {
  const openAttributes = tokens.filter((token) => token.value === '[').length;
  const closeAttributes = tokens.filter((token) => token.value === ']').length;
  if (openAttributes !== closeAttributes || tokens.some((token) => token.value === '{' || token.value === '}')) return undefined;
  const parsed = parseAttributes(tokens, diagnostics);
  if (parsed.body.length === 0) return undefined;
  const equals = parsed.body.findIndex((token) => token.value === '=');
  const labelTokens = equals >= 0 ? parsed.body.slice(equals + 1) : parsed.body;
  const label = text(labelTokens);
  if (!label) return undefined;
  const first = parsed.body[0]!;
  const last = parsed.body.at(-1)!;
  let id = equals >= 0 ? text(parsed.body.slice(0, equals)) : undefined;
  if (id && !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(id)) {
    const original = id;
    id = id.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'n';
    diagnostics.push(diag('W120', 'warning', parsed.body[0], `Invalid explicit id ${original}; slugified as ${id}`));
  }
  return {
    ...(id ? { id } : {}), label,
    attributes: parsed.attributes, line: first.line, col: first.col, endCol: last.endCol,
  };
}

function splitReferences(tokens: DslToken[]): DslToken[][] {
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

function parseEdge(tokens: DslToken[], diagnostics: DslDiagnostic[]): DslEdge[] | undefined {
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
        const labelPart = parseAttributes(rightTokens.slice(colon + 1), diagnostics);
        label = text(labelPart.body);
        edgeAttributes = labelPart.attributes;
        rightTokens = rightTokens.slice(0, colon);
      } else if (rightTokens.at(-1)?.value === ']') {
        // Trailing `[…]` with no label: edge flags stay on the edge, node
        // vocabulary (shape, colour, icon, keys) lands on the target.
        const open = rightTokens.findLastIndex((token, position) => position < rightTokens.length - 1 && token.value === '[');
        if (open >= 0) {
          const trailing = parseAttributes(rightTokens.slice(open), diagnostics);
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
        edges.push({ kind: 'edge', from, to, arrow: arrow as DslEdge['arrow'], ...(label ? { label } : {}), attributes: edgeAttributes, raw: text(tokens), line: first.line, col: first.col, endCol: last.endCol });
      }
    }
  }
  return edges;
}

/** Parses flowchart/architecture core syntax and preserves future model statements. */
export function parse(input: string): DslDiagram {
  const tokenized = tokenize(input);
  const diagnostics = [...tokenized.diagnostics];
  const comments: DslDiagram['comments'] = [];
  let tokens = tokenized.tokens;
  let version = 1;
  let family: DslFamily = 'architecture';
  let direction: DslDirection | undefined;

  const lineGroups = new Map<number, DslToken[]>();
  for (const token of tokens) lineGroups.set(token.line, [...(lineGroups.get(token.line) ?? []), token]);
  const meaningful = [...lineGroups.entries()].filter(([, lineTokens]) => lineTokens.some((token) => token.kind !== 'comment'));
  let consumedThrough = 0;
  const first = meaningful[0];
  if (first && text(first[1]).startsWith('%% ofk ')) {
    const parsedVersion = Number(text(first[1]).slice(7));
    if (Number.isFinite(parsedVersion)) version = parsedVersion;
    if (version > 1) diagnostics.push(diag('W001', 'warning', first[1][0], 'Version is newer than parser; parsed as version 1'));
    consumedThrough = first[0];
  } else if (meaningful.length > 0) diagnostics.push(diag('I002', 'info', meaningful[0]?.[1][0], 'No version pragma; version 1 assumed'));

  const header = meaningful.find(([line]) => line > consumedThrough);
  const headerWords = header ? header[1].filter((token) => token.kind !== 'comment').map((token) => token.value) : [];
  if (header && DSL_FAMILIES.includes(headerWords[0] as DslFamily)) {
    family = headerWords[0] as DslFamily;
    direction = DIRECTIONS[headerWords[1] ?? ''];
    consumedThrough = header[0];
    if (['bpmn', 'org', 'gantt', 'wireframe', 'chart', 'sankey', 'journey', 'timeline'].includes(family)) diagnostics.push(diag('W105', 'warning', header[1][0], `Family ${family} is reserved; parsed as graph syntax`));
  } else if (header) {
    diagnostics.push(diag('I003', 'info', header[1][0], 'No family line; architecture assumed'));
    const candidate = headerWords[0]?.toLowerCase();
    if (candidate && candidate !== headerWords[0] && DSL_FAMILIES.includes(candidate as DslFamily)) diagnostics.push(diag('W110', 'warning', header[1][0], 'First statement looks like a family header with wrong case', candidate));
  }
  tokens = tokens.filter((token) => token.line > consumedThrough);

  const statements: DslStatement[] = [];
  const stack: Array<{ statements: DslStatement[]; opener?: DslStatement }> = [{ statements }];
  for (const segment of splitStatements(tokens)) {
    const current = stack.at(-1)!.statements;
    if (segment.tokens[0]?.kind === 'comment') {
      comments.push({ text: segment.tokens[0].value, line: segment.tokens[0].line });
      continue;
    }
    if (segment.closes) {
      if (stack.length > 1) stack.pop();
      else diagnostics.push(diag('W101', 'warning', segment.tokens[0], 'Unexpected block close; line dropped'));
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
      statement = { kind: 'directive', name: keyword as 'title', value: text(segment.tokens.slice(segment.tokens[1]?.value === ':' ? 2 : 1)), raw: text(segment.tokens), line: firstToken.line, col: firstToken.col, endCol: lastToken.endCol };
      current.push(statement);
    } else if (keyword === 'group' || segment.opens) {
      const reservedKind = RESERVED_KINDS.has(keyword) || RESERVED_RECORDS.has(keyword) ? keyword : undefined;
      const strippedTokens = keyword === 'group' || reservedKind ? segment.tokens.slice(1) : segment.tokens;
      const referenceTokens = strippedTokens.length > 0 ? strippedTokens : [firstToken];
      const group = parseReference(referenceTokens, diagnostics);
      if (group) {
        statement = { kind: 'group', group, ...(reservedKind ? { reservedKind } : {}), statements: [], raw: text(segment.tokens), line: firstToken.line, col: firstToken.col, endCol: lastToken.endCol };
        current.push(statement);
      }
    } else if (RESERVED_RECORDS.has(keyword)) {
      statement = { kind: 'reserved', keyword, value: text(segment.tokens.slice(1)), raw: text(segment.tokens), line: firstToken.line, col: firstToken.col, endCol: lastToken.endCol };
      current.push(statement);
    } else {
      const reservedKind = RESERVED_KINDS.has(keyword) ? keyword : undefined;
      const node = parseReference(reservedKind ? segment.tokens.slice(1) : segment.tokens, diagnostics);
      if (node) {
        statement = { kind: 'node', node, ...(reservedKind ? { reservedKind } : {}), raw: text(segment.tokens), line: firstToken.line, col: firstToken.col, endCol: lastToken.endCol };
        current.push(statement);
      }
    }
    if (!statement) diagnostics.push(diag('W101', 'warning', firstToken, 'Line could not be parsed; dropped'));
    if (segment.opens) {
      if (statement?.kind === 'group') stack.push({ statements: statement.statements, opener: statement });
      else if (statement?.kind === 'reserved') {
        statement.statements = [];
        stack.push({ statements: statement.statements, opener: statement });
      } else diagnostics.push(diag('W101', 'warning', firstToken, 'Block opener requires a group or reserved statement'));
    }
  }
  while (stack.length > 1) {
    const frame = stack.pop();
    const opener = frame?.opener;
    diagnostics.push({ code: 'W103', severity: 'warning', line: opener?.line ?? 1, col: opener?.col ?? 1, endCol: opener?.endCol ?? 1, message: 'Unclosed block at end of input', hint: '} inserted', source: 'parse' });
  }
  if (meaningful.length === 0) diagnostics.push({ code: 'E001', severity: 'error', line: 1, col: 1, endCol: 1, message: 'Document is empty', source: 'parse' });
  return { version, family, ...(direction ? { direction } : {}), statements, comments, diagnostics };
}
