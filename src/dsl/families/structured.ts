import type { SceneConnector, SceneNode } from '../../opencanvas/domain/document/types';
import type { Size2d } from '../../opencanvas/domain/geometry/types';
import type { JsonObject } from '../../opencanvas/domain/document/json';
import { isErRelationToken } from '../../opencanvas/domain/connectors/presentation';
import { measurePortableText } from '../../opencanvas/domain/text/measurement';
import type { DslDiagnostic } from '../ast';
import { nonVisualAttributes, readAttributes, typedFrom } from '../attributes';
import { tokenDiagnostic } from '../diagnostics';
import { attrsToJson, dslConnectorMeta, dslFrameRaw, dslNodeMeta, type CanonicalAttribute, type DslFrameScene } from '../sceneMeta';
import { joinTokens, type DslSegment } from '../segments';
import { attributeText, commentLines, nodeName, quote, slugifyDslId } from '../text';
import { COLOR_WORDS, isHexColor, sortAttributes } from '../vocabulary';
import type { Family, FamilyContext, FamilyScene } from './types';
import type { DslToken } from '../tokenize';

// ERD and UML class diagrams share one engine: a graph of structured entities
// (blocks of member rows) with typed relations. Only the row grammar, the
// relation vocabulary and the scene content differ (grammar §8.5, §8.6).

export type StructuredKind = 'erd' | 'class';

const CLASS_TOKENS = ['<|--', '--|>', '<|..', '..|>', '*--', '--*', 'o--', '--o', '..>', '<..', '<--', '-->', '<-->', '..', '--'] as const;
const ER_ALIASES: Readonly<Record<string, string>> = Object.fromEntries(Object.entries({
  '1:1': '||--||', '1:1..': '||..||', '1:n': '||--o{', 'n:1': '}o--||', 'n:m': '}o--o{', '1:n..': '||..o{', 'n:m..': '}o..o{',
  'one or one': '||--||', 'one or many': '||--o{', 'many or one': '}o--||', 'many or many': '}o--o{',
  'one to one': '||--||', 'one to many': '||--o{', 'many to one': '}o--||', 'many to many': '}o--o{',
}).map(([key, value]) => [key.replace(/\s+/g, ''), value]));
/** `customer 1:N invoice : owns` and `A one or many B` — cardinality words instead of glyphs. */
function findCardinalityAlias(tokens: readonly DslToken[]): { before: DslToken[]; after: DslToken[]; token: string; label?: string } | null {
  for (let start = 1; start < tokens.length; start += 1) {
    for (let take = 1; take <= 4 && start + take <= tokens.length; take += 1) {
      const key = tokens.slice(start, start + take).map((token) => token.value).join('').toLowerCase();
      const token = ER_ALIASES[key];
      if (!token) continue;
      const before = tokens.slice(0, start);
      const rest = tokens.slice(start + take);
      const colon = rest.findIndex((entry) => entry.value === ':');
      const after = colon >= 0 ? rest.slice(0, colon) : rest;
      if (before.length === 0 || after.length === 0) return null;
      return { before, after, token, ...(colon >= 0 ? { label: joinTokens(rest.slice(colon + 1)) } : {}) };
    }
  }
  return null;
}
const ER_FLAGS: Readonly<Record<string, keyof ErFlags>> = {
  pk: 'isPrimaryKey', primary: 'isPrimaryKey', key: 'isPrimaryKey',
  fk: 'isForeignKey', foreign: 'isForeignKey',
  unique: 'isUnique', uq: 'isUnique',
  nullable: 'isNullable', nn: 'isNotNull', 'not-null': 'isNotNull',
};
const CLASS_STEREOTYPES = new Set(['interface', 'abstract', 'enum', 'class', 'entity']);

interface ErFlags { isPrimaryKey?: boolean; isForeignKey?: boolean; isUnique?: boolean; isNullable?: boolean; isNotNull?: boolean }

interface MemberDraft {
  /** Canonical row text, exactly as re-emitted. */
  text: string;
  /** ERD: structured field for the renderer. */
  field?: { name: string; dataType: string } & ErFlags;
  /** Class: `true` when the member holds a `(` (rendered in the methods compartment). */
  isMethod?: boolean;
  line: number;
}

interface EntityDraft {
  id: string;
  label: string;
  line: number;
  members: MemberDraft[];
  attrs: CanonicalAttribute[];
  comments: string[];
  stereotype?: string;
  /** Class only: the source carried a `---` divider. */
  divider?: boolean;
}

interface RelationDraft {
  id: string;
  from: string;
  to: string;
  token: string;
  label?: string;
  sourceCardinality?: string;
  targetCardinality?: string;
  line: number;
  attrs: CanonicalAttribute[];
  comments: string[];
}

interface StructuredModel {
  entities: EntityDraft[];
  relations: RelationDraft[];
  reserved: string[];
  dividers: Array<{ entity: string; line: number }>;
}

// Relation pieces start with structural punctuation; a bare `*` or `o` is a
// multiplicity marker, not part of the arrow.
const isRelationPiece = (token: DslToken): boolean => token.kind === 'arrow' || /^[-<>|{}]/.test(token.value);
/** `"1"`, `*`, `0..*` — UML multiplicity beside a relation arrow. */
const isCardinalityToken = (token: DslToken | undefined): boolean =>
  Boolean(token) && (token!.kind === 'string' || /^[0-9*.]+$/.test(token!.value));
const isDivider = (tokens: readonly DslToken[]): boolean => tokens.length > 0 && tokens.every((token) => /^-+$/.test(token.value));

function parseErRow(tokens: readonly DslToken[], at: { line: number }): MemberDraft | undefined {
  const words = tokens.filter((token) => token.kind !== 'comment');
  if (words.length === 0) return undefined;
  const name = joinTokens([words[0]!]);
  const dataType = words[1] ? joinTokens([words[1]!]) : 'text';
  const flags: ErFlags = {};
  for (const token of words.slice(2)) {
    const flag = ER_FLAGS[token.value.toLowerCase()];
    if (flag) flags[flag] = true;
  }
  const text = erRowText(name, dataType, flags);
  return { text, field: { name, dataType, ...flags }, line: at.line };
}

function erFieldName(name: string): string {
  return /[\s,;[\]]/.test(name) ? `"${name.replace(/"/g, '\\"')}"` : name;
}

function erRowText(name: string, dataType: string, flags: ErFlags): string {
  return `${erFieldName(name)} ${dataType}${
    ['isPrimaryKey', 'isForeignKey', 'isUnique', 'isNotNull', 'isNullable']
      .map((key) => flags[key as keyof ErFlags] ? ` ${ER_FLAG_WORDS[key as keyof ErFlags]}` : '').join('')}`;
}

const ER_FLAG_WORDS: Readonly<Record<keyof ErFlags, string>> = {
  isPrimaryKey: 'pk', isForeignKey: 'fk', isUnique: 'unique', isNotNull: 'not-null', isNullable: 'nullable',
};

function parseClassMember(tokens: readonly DslToken[], at: { line: number }): MemberDraft | undefined {
  const text = classMemberText(joinTokens(tokens.filter((token) => token.kind !== 'comment')));
  if (!text) return undefined;
  return { text, isMethod: text.includes('('), line: at.line };
}

/** `+id : int` → `+id: int`, `+go( ) : void` → `+go(): void` (grammar §8.6). */
function classMemberText(value: string): string {
  return value
    .replace(/^([+\-#~])\s+/, '$1')
    .replace(/\s*:\s*/g, ': ')
    .replace(/\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .replace(/\s*\[\s*/g, '[')
    .replace(/\s*\]/g, ']')
    .trim();
}

/** Reversed relation forms: canonical token + whether the endpoints swap (grammar §8.6). */
const REVERSED_RELATIONS: Readonly<Record<string, string>> = {
  '<|--': '--|>', '<|..': '..|>', '<..': '..>', '<--': '-->', '--*': '*--', '--o': 'o--',
};

function canonicalRelationToken(kind: StructuredKind, raw: string): string | undefined {
  const compact = raw.replace(/\s+/g, '').toLowerCase();
  if (kind === 'erd') {
    // ERD has no arrow vocabulary: any plain arrow is an uncarded relation line.
    if (compact === '->' || compact === '-->' || compact === '<-' || compact === '<--') return '--';
  } else if (compact === '->') {
    return '-->';
  }
  if (kind === 'erd') {
    const candidate = ER_ALIASES[compact] ?? compact;
    return candidate === '--' || isErRelationToken(candidate) ? candidate : undefined;
  }
  // Reversed forms are canonicalized by swapping endpoints, not kept verbatim.
  const reversed = REVERSED_RELATIONS[compact];
  if (reversed) return `reverse:${reversed}`;
  return (CLASS_TOKENS as readonly string[]).includes(compact) ? compact : undefined;
}

function parseStructured(kind: StructuredKind, segments: readonly DslSegment[], context: FamilyContext): StructuredModel {
  const entities: EntityDraft[] = [];
  const relations: RelationDraft[] = [];
  const reserved: string[] = [];
  const dividers: Array<{ entity: string; line: number }> = [];
  const byId = new Map<string, EntityDraft>();
  const byLabel = new Map<string, EntityDraft>();
  const used = new Set<string>();
  let current: EntityDraft | null = null;

  const fail = (segment: DslSegment, code: DslDiagnostic['code'], message: string, hint?: string): void => {
    context.diagnostics.push(tokenDiagnostic(code, 'warning', segment.tokens[0], message, hint));
  };
  const declareEntity = (reference: { id?: string; label: string }, line: number) => {
    const existing = (reference.id ? byId.get(reference.id) : undefined) ?? byLabel.get(reference.label);
    if (existing) return existing;
    let id = reference.id ?? slugifyDslId(reference.label);
    const base = id;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    const entity: EntityDraft = { id, label: reference.label, line, members: [], attrs: [], comments: [] };
    entities.push(entity);
    byId.set(id, entity);
    byLabel.set(reference.label, entity);
    return entity;
  };
  const resolve = (name: string): EntityDraft | undefined => byId.get(name) ?? byLabel.get(name) ?? byId.get(slugifyDslId(name));

  for (const segment of segments) {
    const claimed = context.comments.claim(segment.line);
    if (segment.closes) {
      if (!current) fail(segment, 'W101', 'Unexpected block close; line dropped');
      current = null;
      continue;
    }
    if (segment.tokens[0]?.kind === 'comment' || segment.tokens.length === 0) continue;

    if (segment.opens) {
      // `Order [interface] {` / `class Order {` / `users [blue] {`
      const tokens = segment.tokens[0]?.value === 'class' ? segment.tokens.slice(1) : segment.tokens;
      const parsed = readAttributes(tokens, context.diagnostics);
      const body = parsed.body.filter((token) => token.kind !== 'comment');
      if (body.length === 0) {
        fail(segment, 'W101', 'A block needs a name', kind === 'erd' ? 'users {' : 'Order {');
        continue;
      }
      const equal = body.findIndex((token) => token.value === '=');
      const label = joinTokens(equal >= 0 ? body.slice(equal + 1) : body);
      const id = equal >= 0 ? joinTokens(body.slice(0, equal)) : undefined;
      if (!label) {
        fail(segment, 'W101', 'A block needs a name', kind === 'erd' ? 'users {' : 'Order {');
        continue;
      }
      const entity = declareEntity({ ...(id ? { id } : {}), label }, segment.line);
      entity.attrs = parsed.attributes;
      entity.comments.push(...claimed);
      const stereotype = parsed.attributes.find((attribute) => !attribute.key && CLASS_STEREOTYPES.has(attribute.value.toLowerCase()))?.value.toLowerCase();
      if (stereotype) entity.stereotype = stereotype;
      current = entity;
      continue;
    }

    if (kind === 'class' && isDivider(segment.tokens)) {
      if (!current) {
        fail(segment, 'W101', 'Member divider outside a class; ignored');
        continue;
      }
      current.divider = true;
      dividers.push({ entity: current.id, line: segment.line });
      continue;
    }

    const tokens = segment.tokens.filter((token) => token.kind !== 'comment');
    const alias = kind === 'erd' ? findCardinalityAlias(tokens) : null;
    if (alias) {
      const from = resolve(joinTokens(alias.before)) ?? declareEntity({ label: joinTokens(alias.before) }, segment.line);
      const to = resolve(joinTokens(alias.after)) ?? declareEntity({ label: joinTokens(alias.after) }, segment.line);
      relations.push({
        id: `${from.id}->${to.id}`,
        from: from.id, to: to.id, token: alias.token,
        ...(alias.label ? { label: alias.label } : {}),
        line: segment.line, attrs: [], comments: claimed,
      });
      continue;
    }
    const relationStart = tokens.findIndex(isRelationPiece);
    if (relationStart > 0 && tokens.some((token) => token.kind === 'arrow')) {
      const runStart = relationStart;
      let runEnd = relationStart;
      while (runEnd + 1 < tokens.length && isRelationPiece(tokens[runEnd + 1]!)) runEnd += 1;
      const run = joinTokens(tokens.slice(runStart, runEnd + 1)).replace(/\s+/g, '');
      const canonical = canonicalRelationToken(kind, run);
      if (!canonical) {
        fail(segment, 'W101', `Unknown ${kind === 'erd' ? 'cardinality' : 'relation'} ${run}`, kind === 'erd' ? '||--o{' : '--|>');
        continue;
      }
      const leftTokens = tokens.slice(0, runStart);
      let rightTokens = tokens.slice(runEnd + 1);
      const colon = rightTokens.findIndex((token) => token.value === ':');
      const label = colon >= 0 ? joinTokens(rightTokens.slice(colon + 1)) : undefined;
      if (colon >= 0) rightTokens = rightTokens.slice(0, colon);
      // Multiplicity sits in quotes beside the arrow: `Order "1" --> "*" Item`.
      const sourceCardinality = isCardinalityToken(leftTokens.at(-1)) ? leftTokens.at(-1)!.value : undefined;
      const leftName = joinTokens((sourceCardinality ? leftTokens.slice(0, -1) : leftTokens));
      const targetCardinality = isCardinalityToken(rightTokens[0]) ? rightTokens[0]!.value : undefined;
      const rightName = joinTokens(targetCardinality ? rightTokens.slice(1) : rightTokens);
      // Relations auto-declare their endpoints, exactly like graph edges; a later
      // block fills in the members.
      const from = resolve(leftName) ?? declareEntity({ label: leftName }, segment.line);
      const to = resolve(rightName) ?? declareEntity({ label: rightName }, segment.line);
      const reversed = canonical.startsWith('reverse:');
      const token = reversed ? canonical.slice(8) : canonical;
      relations.push({
        id: `${reversed ? to.id : from.id}->${reversed ? from.id : to.id}`,
        from: reversed ? to.id : from.id,
        to: reversed ? from.id : to.id,
        token,
        ...(label ? { label } : {}),
        ...(sourceCardinality && !reversed ? { sourceCardinality } : {}),
        ...(targetCardinality && !reversed ? { targetCardinality } : {}),
        line: segment.line,
        attrs: [],
        comments: claimed,
      });
      continue;
    }

    if (current) {
      const member = kind === 'erd' ? parseErRow(tokens, segment) : parseClassMember(tokens, segment);
      if (member) current.members.push(member);
      continue;
    }
    if (isDivider(segment.tokens)) {
      reserved.push(segment.raw);
      continue;
    }
    fail(segment, 'W101', `Statement outside a ${kind === 'erd' ? 'entity' : 'class'} block; dropped`, kind === 'erd' ? 'wrap rows in users { … }' : 'wrap members in Order { … }');
  }
  return { entities, relations, reserved, dividers };
}

function entitySize(kind: StructuredKind, entity: EntityDraft): Size2d {
  const header = measurePortableText(entity.label, { fontSize: 13, fontWeight: 700, overflow: 'visible' }).width;
  const rowWidths = entity.members.map((member) => measurePortableText(member.text, { fontSize: 11, fontWeight: 500, overflow: 'visible' }).width);
  const width = Math.max(240, header + 64, ...rowWidths.map((value) => value + (kind === 'erd' ? 110 : 40)));
  // 44 header + 10 padding top/bottom + one 18px row per member (and the divider
  // row when both compartments exist). A class splits its rows between
  // attributes and methods, so each compartment needs its own budget.
  if (kind === 'class') {
    const attributes = entity.members.filter((member) => !member.isMethod).length;
    const methods = entity.members.filter((member) => member.isMethod).length;
    const rows = Math.max(attributes + methods, 2 * attributes - 1, 2 * methods, 1);
    const extraRow = entity.divider ? 18 : 0;
    return { width: Math.round(width), height: 44 + 20 + rows * 18 + extraRow };
  }
  return { width: Math.round(width), height: 44 + 20 + Math.max(1, entity.members.length) * 18 };
}

function entityContent(kind: StructuredKind, entity: EntityDraft): JsonObject {
  const typed = typedFrom(entity.attrs);
  const palette = typed.color && !isHexColor(typed.color) ? COLOR_WORDS[typed.color]?.key : undefined;
  const custom = typed.color && isHexColor(typed.color) ? typed.color : undefined;
  const attrs = nonVisualAttributes(typed, 'node');
  const base: JsonObject = {
    label: entity.label,
    ...(custom ? { color: 'custom', customColor: custom } : palette ? { color: palette } : {}),
    ...(typed.fill === 'bold' ? { colorMode: 'filled' } : {}),
    ...(attrs.length ? { attrs: attrsToJson(attrs) } : {}),
  } as JsonObject;
  if (kind === 'erd') {
    return {
      ...base,
      erFields: entity.members.map((member) => ({
        name: member.field!.name,
        dataType: member.field!.dataType,
        ...(member.field!.isPrimaryKey ? { isPrimaryKey: true } : {}),
        ...(member.field!.isForeignKey ? { isForeignKey: true } : {}),
        ...(member.field!.isUnique ? { isUnique: true } : {}),
        ...(member.field!.isNotNull ? { isNotNull: true } : {}),
      })),
    };
  }
  const attributes = entity.members.filter((member) => !member.isMethod).map((member) => member.text);
  const methods = entity.members.filter((member) => member.isMethod).map((member) => member.text);
  return {
    ...base,
    ...(entity.stereotype ? { classStereotype: entity.stereotype } : {}),
    ...(attributes.length ? { classAttributes: attributes } : {}),
    ...(methods.length ? { classMethods: methods } : {}),
  };
}

async function materialize(kind: StructuredKind, model: StructuredModel, context: FamilyContext): Promise<FamilyScene> {
  const nodes: SceneNode[] = [];
  const connectors: SceneConnector[] = [];
  const sizes = new Map(model.entities.map((entity) => [entity.id, entitySize(kind, entity)]));

  for (const entity of model.entities) {
    nodes.push({
      id: entity.id, kind: kind === 'erd' ? 'er_entity' : 'class', parentId: null, layerId: 'default', zIndex: 1,
      transform: { translation: { ...context.origin }, rotationRadians: 0, scale: { x: 1, y: 1 } },
      size: sizes.get(entity.id)!,
      content: entityContent(kind, entity),
      appearance: {}, ports: [],
      metadata: {
        dsl: {
          id: entity.id, line: entity.line,
          ...(entity.comments.length ? { comments: entity.comments } : {}),
          ...(entity.divider ? { structuredDivider: true } : {}),
        },
      },
      extensions: {},
    });
  }

  model.relations.forEach((relation, relationIndex) => {
    connectors.push({
      id: `rel:${relation.from}->${relation.to}:${relationIndex + 1}`,
      source: { nodeId: relation.from, portId: null, anchor: null, point: null },
      target: { nodeId: relation.to, portId: null, anchor: null, point: null },
      route: { kind: 'orthogonal', ownership: 'automatic' }, waypoints: [],
      labels: relation.label ? [{ id: `rel-label-${relationIndex + 1}`, text: relation.label, pathRatio: 0.5, offset: { x: 0, y: 0 }, metadata: {} }] : [],
      appearance: {},
      semantics: kind === 'erd' ? { erRelation: relation.token } : { classRelation: relation.token },
      metadata: {
        dsl: {
          line: relation.line,
          structuredRelation: relation.token,
          ...(relation.sourceCardinality ? { sourceCardinality: relation.sourceCardinality } : {}),
          ...(relation.targetCardinality ? { targetCardinality: relation.targetCardinality } : {}),
          ...(relation.comments.length ? { comments: relation.comments } : {}),
        },
      },
      extensions: {},
    });
  });

  const laid = await context.layout({
    nodes: nodes.map((node) => ({ id: node.id, parentId: null, size: node.size })),
    edges: connectors.map((connector) => ({ id: connector.id, sourceId: connector.source.nodeId!, targetId: connector.target.nodeId! })),
    direction: context.direction,
    rootPadding: { top: context.title ? 72 : 28, right: 28, bottom: 28, left: 28 },
    groupPadding: { top: 54, right: 22, bottom: 22, left: 22 },
  }, context.signal);
  const positioned = nodes.map((node) => ({
    ...node,
    transform: { ...node.transform, translation: laid.positions[node.id] ?? { x: 0, y: 0 } },
  }));
  return {
    nodes: positioned,
    connectors,
    size: laid.root.width > 0 ? laid.root : { width: 480, height: 360 },
    meta: model.reserved.length ? { reserved: model.reserved } : {},
  };
}

function structuredText(kind: StructuredKind, scene: DslFrameScene): string[] {
  const raw = dslFrameRaw(scene.frame);
  const entities = scene.nodes.filter((node) => node.kind === (kind === 'erd' ? 'er_entity' : 'class'));
  const byId = new Map(entities.map((node) => [node.id, node]));
  const ordered = [...entities].sort((a, b) => dslNodeMeta(a).line - dslNodeMeta(b).line);
  const lines: string[] = [];
  for (const entity of ordered) {
    const meta = dslNodeMeta(entity);
    const attrs: CanonicalAttribute[] = [];
    const stereotype = entity.content.classStereotype;
    if (typeof stereotype === 'string' && stereotype) attrs.push({ value: stereotype });
    const typed = typedFrom(meta.attrs ?? []);
    const kept = nonVisualAttributes(typed, 'node');
    attrs.push(...kept);
    const word = colorWordOf(entity);
    if (word) attrs.push({ value: word });
    if (entity.content.colorMode === 'filled') attrs.push({ value: 'bold' });
    lines.push(...commentLines(meta.comments, ''), `${nodeName(entity)}${attributeText(sortAttributes(attrs))} {`);
    const members = kind === 'erd'
      ? (Array.isArray(entity.content.erFields) ? entity.content.erFields as Array<Record<string, unknown>> : []).map(erFieldText)
      : classMemberTexts(entity);
    for (const member of members) lines.push(`  ${member}`);
    lines.push('}');
  }
  for (const connector of scene.connectors) {
    const meta = dslConnectorMeta(connector);
    const from = connector.source.nodeId ? byId.get(connector.source.nodeId) : undefined;
    const to = connector.target.nodeId ? byId.get(connector.target.nodeId) : undefined;
    if (!from || !to) continue;
    const token = typeof (connector.metadata.dsl as { structuredRelation?: string }).structuredRelation === 'string'
      ? (connector.metadata.dsl as { structuredRelation: string }).structuredRelation
      : typeof connector.semantics.erRelation === 'string' ? connector.semantics.erRelation
        : typeof connector.semantics.classRelation === 'string' ? connector.semantics.classRelation : '--';
    const sourceCardinality = (connector.metadata.dsl as { sourceCardinality?: string }).sourceCardinality;
    const targetCardinality = (connector.metadata.dsl as { targetCardinality?: string }).targetCardinality;
    const label = connector.labels[0]?.text;
    lines.push(
      ...commentLines(meta.comments, ''),
      `${nodeName(from)} ${sourceCardinality ? `${JSON.stringify(sourceCardinality)} ` : ''}${token} ${targetCardinality ? `${JSON.stringify(targetCardinality)} ` : ''}${nodeName(to)}${label ? ` : ${quote(label)}` : ''}`,
    );
  }
  const reserved = Array.isArray(raw.reserved) ? raw.reserved.filter((item): item is string => typeof item === 'string') : [];
  lines.push(...reserved);
  return lines;
}

function erFieldText(field: Record<string, unknown>): string {
  return erRowText(
    typeof field.name === 'string' ? field.name : '',
    typeof field.dataType === 'string' ? field.dataType : 'text',
    {
      ...(field.isPrimaryKey === true ? { isPrimaryKey: true } : {}),
      ...(field.isForeignKey === true ? { isForeignKey: true } : {}),
      ...(field.isUnique === true ? { isUnique: true } : {}),
      ...(field.isNotNull === true ? { isNotNull: true } : {}),
      ...(field.isNullable === true ? { isNullable: true } : {}),
    },
  );
}

function classMemberTexts(entity: SceneNode): string[] {
  const attributes = Array.isArray(entity.content.classAttributes) ? entity.content.classAttributes as string[] : [];
  const methods = Array.isArray(entity.content.classMethods) ? entity.content.classMethods as string[] : [];
  const both = attributes.length > 0 && methods.length > 0;
  return [...attributes, ...(both ? ['---'] : []), ...methods];
}

function colorWordOf(node: SceneNode): string | undefined {
  const color = node.content.color;
  if (typeof color !== 'string' || color === 'slate') return undefined;
  return Object.keys(COLOR_WORDS).find((candidate) => COLOR_WORDS[candidate]!.key === color);
}

function familyFor(kind: StructuredKind): Family {
  return {
    name: kind === 'erd' ? 'erd' : 'class',
    async compile(segments, context) {
      return materialize(kind, parseStructured(kind, segments, context), context);
    },
    serialize: (scene) => structuredText(kind, scene),
  };
}

export const erdFamily = familyFor('erd');
export const classFamily = familyFor('class');
