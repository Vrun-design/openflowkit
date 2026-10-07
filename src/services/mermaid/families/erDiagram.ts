import { createId } from '@/lib/id';
import {
  buildERRelationTokenRegexPattern,
  type ERRelationToken,
} from '@/lib/relationSemantics';
import { createDefaultErField } from '@/lib/entityFields';
import type { ErField } from '@/lib/types';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { DiagramPlugin } from './plugin';

interface EntityRecord {
  id: string;
  label: string;
  fields: ErField[];
}

interface RelationRecord {
  left: string;
  relation: ERRelationToken;
  right: string;
  label?: string;
}

const ENTITY_ID_PATTERN = '[A-Za-z_][\\w.-]*';
/** An entity reference: `NAME`, `"Quoted name"`, or Mermaid 11's `id[Alias]` / `id["Alias"]`. */
const ENTITY_REF_PATTERN = `(?:"[^"]+"|${ENTITY_ID_PATTERN}(?:\\[[^\\]]*\\])?)`;

function readEntityRef(reference: string): { id: string; label?: string } {
  const quoted = reference.match(/^"([^"]+)"$/);
  if (quoted) return { id: quoted[1] };
  const alias = reference.match(/^([A-Za-z_][\w.-]*)\[\s*"?([^"\]]*?)"?\s*\]$/);
  return alias ? { id: alias[1], ...(alias[2] ? { label: alias[2] } : {}) } : { id: reference };
}

// Mermaid's word cardinalities, as the left-hand symbol; the right-hand one mirrors it.
const CARDINALITY_WORDS: Readonly<Record<string, string>> = {
  'only one': '||', '1': '||', '||': '||',
  'zero or one': '|o', 'one or zero': '|o', '|o': '|o', 'o|': '|o',
  'one or more': '}|', 'one or many': '}|', 'many(1)': '}|', '1+': '}|', '}|': '}|', '|{': '}|',
  'zero or more': '}o', 'zero or many': '}o', 'many(0)': '}o', '0+': '}o', '}o': '}o', 'o{': '}o',
};
const MIRRORED: Readonly<Record<string, string>> = { '||': '||', '|o': 'o|', '}|': '|{', '}o': 'o{' };
const CARDINALITY_PATTERN = Object.keys(CARDINALITY_WORDS).sort((a, b) => b.length - a.length)
  .map((word) => word.replace(/[|{}()+]/g, '\\$&')).join('|');

function parseReferenceTarget(reference: string): {
  referencesTable?: string;
  referencesField?: string;
} {
  const trimmed = reference.trim();
  if (!trimmed) {
    return {};
  }

  const lastDotIndex = trimmed.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === trimmed.length - 1) {
    return { referencesTable: trimmed };
  }

  return {
    referencesTable: trimmed.slice(0, lastDotIndex),
    referencesField: trimmed.slice(lastDotIndex + 1),
  };
}

function createEmptyEntity(id: string): EntityRecord {
  return {
    id,
    label: id,
    fields: [],
  };
}

function parseMermaidErField(line: string): ErField {
  const trimmed = line.trim();
  if (!trimmed) {
    return createDefaultErField();
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return {
      ...createDefaultErField(),
      name: trimmed,
    };
  }

  const [dataType, name, ...rawConstraints] = tokens;
  const field: ErField = {
    ...createDefaultErField(),
    name,
    dataType,
  };

  for (let index = 0; index < rawConstraints.length; index += 1) {
    const token = rawConstraints[index].toUpperCase();
    if (token === 'PK' || token === 'PRIMARY') {
      field.isPrimaryKey = true;
      continue;
    }
    if (token === 'FK' || token === 'FOREIGN') {
      field.isForeignKey = true;
      continue;
    }
    if (token === 'UK' || token === 'UNIQUE' || token === 'UQ') {
      field.isUnique = true;
      continue;
    }
    if (token === 'NN' || token === 'NOTNULL' || token === 'NOT') {
      field.isNotNull = true;
      continue;
    }
    if (token === 'REFERENCES' && rawConstraints[index + 1]) {
      const reference = parseReferenceTarget(rawConstraints[index + 1]);
      field.referencesTable = reference.referencesTable;
      field.referencesField = reference.referencesField;
      index += 1;
    }
  }

  return field;
}

function parseRelation(line: string): RelationRecord | null {
  const relationTokenPattern = buildERRelationTokenRegexPattern();
  const unquote = (label: string | undefined) => label?.trim().replace(/^"(.*)"$/, '$1');
  const symbolic = line.match(
    new RegExp(`^(${ENTITY_REF_PATTERN})\\s*(${relationTokenPattern})\\s*(${ENTITY_REF_PATTERN})(?:\\s*:\\s*(.+))?$`)
  );
  if (symbolic) {
    return { left: symbolic[1], relation: symbolic[2] as ERRelationToken, right: symbolic[3], label: unquote(symbolic[4]) };
  }
  // `A only one to zero or more B`: `to` identifies (--), `optionally to` does not (..).
  const worded = line.match(new RegExp(
    `^(${ENTITY_REF_PATTERN})\\s+(${CARDINALITY_PATTERN})\\s*(--|\\.\\.|optionally to|to)\\s*(${CARDINALITY_PATTERN})\\s+(${ENTITY_REF_PATTERN})(?:\\s*:\\s*(.+))?$`, 'i'));
  if (!worded) return null;
  const left = CARDINALITY_WORDS[worded[2].toLowerCase()]!;
  const right = MIRRORED[CARDINALITY_WORDS[worded[4].toLowerCase()]!]!;
  const link = worded[3] === '..' || /^optionally/i.test(worded[3]) ? '..' : '--';
  return { left: worded[1], relation: `${left}${link}${right}` as ERRelationToken, right: worded[5], label: unquote(worded[6]) };
}

function parseEntityInline(line: string): string | null {
  const match = line.match(new RegExp(`^(${ENTITY_REF_PATTERN})\\s*\\{\\s*$`));
  return match ? match[1] : null;
}

function parseERDiagram(input: string): { nodes: FlowNode[]; edges: FlowEdge[]; error?: string; diagnostics?: string[] } {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const entities = new Map<string, EntityRecord>();
  const relations: RelationRecord[] = [];
  const diagnostics: string[] = [];

  let hasHeader = false;
  let activeEntity: EntityRecord | null = null;
  let activeEntityLine = -1;
  /** The entity a reference names, made on first sight; an alias sets its label. */
  const entityOf = (reference: string): EntityRecord => {
    const { id, label } = readEntityRef(reference);
    const entity = entities.get(id) ?? createEmptyEntity(id);
    if (label) entity.label = label;
    entities.set(id, entity);
    return entity;
  };

  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('%%')) continue;

    if (/^erDiagram\b/i.test(line)) {
      hasHeader = true;
      continue;
    }

    if (!hasHeader) continue;
    if (/^(title|direction|accTitle|accDescr)\b/i.test(line)) continue;

    if (activeEntity) {
      if (line === '}') {
        activeEntity = null;
        activeEntityLine = -1;
        continue;
      }
      activeEntity.fields.push(parseMermaidErField(line));
      continue;
    }

    const entityRef = parseEntityInline(line);
    if (entityRef) {
      activeEntity = entityOf(entityRef);
      activeEntityLine = lineNumber;
      continue;
    }

    const relation = parseRelation(line);
    if (relation) {
      relations.push({ ...relation, left: entityOf(relation.left).id, right: entityOf(relation.right).id });
      continue;
    }

    if (/^[A-Za-z_][\w.]*\s*\{/.test(line) || /^entity\s+/i.test(line)) {
      diagnostics.push(`Invalid entity declaration at line ${lineNumber}: "${line}"`);
      continue;
    }

    if (/(?:\|\||\|o|o\{|}\|}|}\|)\s*(?:--|\.\.)\s*(?:\|\||\|o|o\{|\|\{|}\|}|}\|)/.test(line) || /->|<->|=>|<=/.test(line)) {
      diagnostics.push(`Invalid erDiagram relation syntax at line ${lineNumber}: "${line}"`);
      continue;
    }

    diagnostics.push(`Unrecognized erDiagram line at line ${lineNumber}: "${line}"`);
  }

  if (activeEntity && activeEntityLine > 0) {
    diagnostics.push(`Unclosed entity block started at line ${activeEntityLine}.`);
  }

  if (!hasHeader) {
    return {
      nodes: [],
      edges: [],
      error: 'Missing erDiagram header.',
    };
  }

  if (entities.size === 0) {
    return {
      nodes: [],
      edges: [],
      error: 'No valid entities found.',
    };
  }

  const entityList = Array.from(entities.values());
  const nodes: FlowNode[] = entityList.map((entity, index) => ({
    id: entity.id,
    type: 'er_entity',
    position: { x: (index % 3) * 300, y: Math.floor(index / 3) * 220 },
    data: {
      label: entity.label,
      color: 'slate',
      shape: 'rectangle',
      erFields: entity.fields,
    },
  }));

  const edges: FlowEdge[] = relations.map((relation, index) => ({
    id: createId(`e-er-${index}`),
    source: relation.left,
    target: relation.right,
    label: relation.label || relation.relation,
    type: 'smoothstep',
    data: {
      erRelation: relation.relation,
      erRelationLabel: relation.label,
    },
  }));

  return diagnostics.length > 0 ? { nodes, edges, diagnostics } : { nodes, edges };
}

export const ER_DIAGRAM_PLUGIN: DiagramPlugin = {
  id: 'erDiagram',
  displayName: 'ER Diagram',
  parseMermaid: parseERDiagram,
};
