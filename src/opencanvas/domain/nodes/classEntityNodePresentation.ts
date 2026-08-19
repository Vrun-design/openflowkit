import type { JsonObject } from '../document/json';
import type { SceneNode } from '../document/types';
import { optionalPresentationString, presentationString } from './nodePresentationValues';

export type StructuredDataNodeKind = 'class' | 'er_entity';
export type ClassMemberVisibility = 'public' | 'private' | 'protected' | 'package';

export interface ClassMemberPresentation {
  readonly visibility: ClassMemberVisibility;
  readonly symbol: '+' | '-' | '#' | '~';
  readonly signature: string;
}

export interface EntityFieldPresentation {
  readonly name: string;
  readonly dataType: string;
  readonly isPrimaryKey: boolean;
  readonly isForeignKey: boolean;
  readonly isNotNull: boolean;
  readonly isUnique: boolean;
  readonly reference?: string;
}

interface SharedStructuredDataPresentation {
  readonly label: string;
  readonly colorKey: string;
  readonly colorMode: 'subtle' | 'filled';
  readonly customColor?: string;
}

export interface ClassNodePresentation extends SharedStructuredDataPresentation {
  readonly kind: 'class';
  readonly stereotype?: string;
  readonly attributes: readonly ClassMemberPresentation[];
  readonly methods: readonly ClassMemberPresentation[];
}

export interface EntityNodePresentation extends SharedStructuredDataPresentation {
  readonly kind: 'er_entity';
  readonly fields: readonly EntityFieldPresentation[];
}

export type ClassEntityNodePresentation = ClassNodePresentation | EntityNodePresentation;

const VISIBILITY_BY_SYMBOL: Record<ClassMemberPresentation['symbol'], ClassMemberVisibility> = {
  '+': 'public',
  '-': 'private',
  '#': 'protected',
  '~': 'package',
};
const PRIMARY_KEY_TOKENS = new Set(['PK', 'PRIMARY']);
const FOREIGN_KEY_TOKENS = new Set(['FK', 'FOREIGN']);
const NOT_NULL_TOKENS = new Set(['NN', 'NOTNULL']);
const UNIQUE_TOKENS = new Set(['UNIQUE', 'UQ']);

export function isClassEntityNodeKind(kind: string): kind is StructuredDataNodeKind {
  return kind === 'class' || kind === 'er_entity';
}

function stringList(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function parseClassMember(value: string): ClassMemberPresentation {
  const trimmed = value.trim();
  const candidate = trimmed.charAt(0) as ClassMemberPresentation['symbol'];
  const visibility = VISIBILITY_BY_SYMBOL[candidate];
  return visibility
    ? { visibility, symbol: candidate, signature: trimmed.slice(1).trim() }
    : { visibility: 'public', symbol: '+', signature: trimmed };
}

function parseLegacyEntityField(value: string): EntityFieldPresentation {
  const normalizedInput = value.trim();
  if (!normalizedInput) return emptyEntityField();
  const [namePart, remainder = ''] = normalizedInput.split(':', 2);
  const dataTypeTokens: string[] = [];
  let isPrimaryKey = false;
  let isForeignKey = false;
  let isNotNull = false;
  let isUnique = false;
  for (const token of remainder.trim().split(/\s+/).filter(Boolean)) {
    const normalizedToken = token.toUpperCase();
    if (PRIMARY_KEY_TOKENS.has(normalizedToken)) isPrimaryKey = true;
    else if (FOREIGN_KEY_TOKENS.has(normalizedToken)) isForeignKey = true;
    else if (NOT_NULL_TOKENS.has(normalizedToken)) isNotNull = true;
    else if (UNIQUE_TOKENS.has(normalizedToken)) isUnique = true;
    else dataTypeTokens.push(token);
  }
  return {
    name: namePart.trim(),
    dataType: dataTypeTokens.join(' '),
    isPrimaryKey,
    isForeignKey,
    isNotNull,
    isUnique,
  };
}

function emptyEntityField(): EntityFieldPresentation {
  return {
    name: '',
    dataType: '',
    isPrimaryKey: false,
    isForeignKey: false,
    isNotNull: false,
    isUnique: false,
  };
}

function objectString(value: JsonObject, key: string): string {
  return typeof value[key] === 'string' ? value[key].trim() : '';
}

function objectBoolean(value: JsonObject, key: string): boolean {
  return value[key] === true;
}

function parseStructuredEntityField(value: JsonObject): EntityFieldPresentation {
  const referencesTable = objectString(value, 'referencesTable');
  const referencesField = objectString(value, 'referencesField');
  const reference = referencesTable
    ? `${referencesTable}${referencesField ? `.${referencesField}` : ''}`
    : undefined;
  return {
    name: objectString(value, 'name'),
    dataType: objectString(value, 'dataType'),
    isPrimaryKey: objectBoolean(value, 'isPrimaryKey'),
    isForeignKey: objectBoolean(value, 'isForeignKey'),
    isNotNull: objectBoolean(value, 'isNotNull'),
    isUnique: objectBoolean(value, 'isUnique'),
    ...(reference ? { reference } : {}),
  };
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function entityFields(value: unknown): readonly EntityFieldPresentation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((field) => {
    if (typeof field === 'string') return [parseLegacyEntityField(field)];
    if (isJsonObject(field)) return [parseStructuredEntityField(field)];
    return [];
  });
}

function sharedPresentation(node: SceneNode): SharedStructuredDataPresentation {
  const customColor = optionalPresentationString(node.content.customColor);
  return {
    label: presentationString(node.content.label, node.kind === 'class' ? 'Class' : 'Entity'),
    colorKey: presentationString(node.content.color, 'slate'),
    colorMode: node.content.colorMode === 'filled' ? 'filled' : 'subtle',
    ...(customColor ? { customColor } : {}),
  };
}

export function resolveClassEntityNodePresentation(
  node: SceneNode
): ClassEntityNodePresentation | null {
  if (!isClassEntityNodeKind(node.kind)) return null;
  const shared = sharedPresentation(node);
  if (node.kind === 'class') {
    const stereotype = optionalPresentationString(node.content.classStereotype);
    return {
      ...shared,
      kind: 'class',
      ...(stereotype ? { stereotype } : {}),
      attributes: stringList(node.content.classAttributes).map(parseClassMember),
      methods: stringList(node.content.classMethods).map(parseClassMember),
    };
  }
  return {
    ...shared,
    kind: 'er_entity',
    fields: entityFields(node.content.erFields),
  };
}
