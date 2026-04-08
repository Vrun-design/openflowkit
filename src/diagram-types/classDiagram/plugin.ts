import { createId } from '@/lib/id';
import {
  buildClassRelationTokenRegexPattern,
  type ClassRelationToken,
} from '@/lib/relationSemantics';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { DiagramPlugin } from '@/diagram-types/core';

interface ClassRecord {
  id: string;
  label: string;
  stereotype?: string;
  attributes: string[];
  methods: string[];
}

interface RelationRecord {
  source: string;
  target: string;
  relation: ClassRelationToken;
  label?: string;
  sourceCardinality?: string;
  targetCardinality?: string;
}

const CLASS_ID_PATTERN = '[A-Za-z_][\\w.<>~,]*';

function normalizeClassIdentifier(value: string): string {
  return value.trim().replace(/~([^~]+)~/g, '<$1>');
}

function createEmptyClass(id: string): ClassRecord {
  return {
    id,
    label: id,
    attributes: [],
    methods: [],
  };
}

function parseClassBodyLine(line: string, record: ClassRecord): void {
  const trimmed = line.trim();
  if (!trimmed) return;

  if (/^\s*<<.+>>\s*$/i.test(trimmed)) {
    record.stereotype = trimmed.replace(/^<<\s*/, '').replace(/\s*>>$/, '').trim();
    return;
  }

  if (/\(.*\)/.test(trimmed)) {
    record.methods.push(trimmed);
    return;
  }

  record.attributes.push(trimmed);
}

function parseRelation(line: string): RelationRecord | null {
  const relationTokenPattern = buildClassRelationTokenRegexPattern();
  const relationMatch = line.match(
    new RegExp(
      `^(${CLASS_ID_PATTERN})(?:\\s+"([^"]+)")?\\s+(${relationTokenPattern})\\s+(?:"([^"]+)"\\s+)?(${CLASS_ID_PATTERN})(?:\\s*:\\s*(.+))?$`
    )
  );
  if (!relationMatch) return null;

  return {
    source: normalizeClassIdentifier(relationMatch[1]),
    sourceCardinality: relationMatch[2]?.trim(),
    relation: relationMatch[3] as ClassRelationToken,
    targetCardinality: relationMatch[4]?.trim(),
    target: normalizeClassIdentifier(relationMatch[5]),
    label: relationMatch[6]?.trim(),
  };
}

function ensureClassRecord(classes: Map<string, ClassRecord>, id: string): ClassRecord {
  const existing = classes.get(id);
  if (existing) {
    return existing;
  }

  const created = createEmptyClass(id);
  classes.set(id, created);
  return created;
}

function parseClassDiagram(input: string): { nodes: FlowNode[]; edges: FlowEdge[]; error?: string; diagnostics?: string[] } {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const classes = new Map<string, ClassRecord>();
  const relations: RelationRecord[] = [];
  const diagnostics: string[] = [];

  let hasHeader = false;
  let activeClass: ClassRecord | null = null;
  let activeClassLine = -1;

  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('%%')) continue;

    if (/^classDiagram\b/i.test(line)) {
      hasHeader = true;
      continue;
    }

    if (!hasHeader) continue;

    if (activeClass) {
      if (line === '}') {
        activeClass = null;
        activeClassLine = -1;
        continue;
      }
      parseClassBodyLine(line, activeClass);
      continue;
    }

    const inlineBlock = line.match(new RegExp(`^class\\s+(${CLASS_ID_PATTERN})\\s*\\{\\s*(.*?)\\s*\\}$`));
    if (inlineBlock) {
      const id = normalizeClassIdentifier(inlineBlock[1]);
      const existing = ensureClassRecord(classes, id);
      const members = inlineBlock[2]
        .split(';')
        .map((member) => member.trim())
        .filter(Boolean);
      members.forEach((member) => parseClassBodyLine(member, existing));
      continue;
    }

    const blockStart = line.match(new RegExp(`^class\\s+(${CLASS_ID_PATTERN})\\s*\\{\\s*$`));
    if (blockStart) {
      const id = normalizeClassIdentifier(blockStart[1]);
      const existing = ensureClassRecord(classes, id);
      activeClass = existing;
      activeClassLine = lineNumber;
      continue;
    }

    const classWithStereotype = line.match(new RegExp(`^class\\s+(${CLASS_ID_PATTERN})\\s*<<\\s*(.+?)\\s*>>\\s*$`));
    if (classWithStereotype) {
      const id = normalizeClassIdentifier(classWithStereotype[1]);
      const existing = ensureClassRecord(classes, id);
      existing.stereotype = classWithStereotype[2];
      continue;
    }

    const standaloneClass = line.match(new RegExp(`^class\\s+(${CLASS_ID_PATTERN})\\s*$`));
    if (standaloneClass) {
      const id = normalizeClassIdentifier(standaloneClass[1]);
      ensureClassRecord(classes, id);
      continue;
    }

    const classMemberInline = line.match(new RegExp(`^(${CLASS_ID_PATTERN})\\s*:\\s*(.+)$`));
    if (classMemberInline) {
      const id = normalizeClassIdentifier(classMemberInline[1]);
      const member = classMemberInline[2].trim();
      const existing = ensureClassRecord(classes, id);
      if (/\(.*\)/.test(member)) {
        existing.methods.push(member);
      } else {
        existing.attributes.push(member);
      }
      continue;
    }

    const relation = parseRelation(line);
    if (relation) {
      relations.push(relation);
      ensureClassRecord(classes, relation.source);
      ensureClassRecord(classes, relation.target);
      continue;
    }

    if (/^class\s+/i.test(line)) {
      diagnostics.push(`Invalid class declaration at line ${lineNumber}: "${line}"`);
      continue;
    }

    if (/(<\|--|--\|>|<-->|<--|-->|--|\.\.|->|<-|<->|=>|<=)/.test(line)) {
      diagnostics.push(`Invalid class relation syntax at line ${lineNumber}: "${line}"`);
      continue;
    }

    diagnostics.push(`Unrecognized classDiagram line at line ${lineNumber}: "${line}"`);
  }

  if (activeClass && activeClassLine > 0) {
    diagnostics.push(`Unclosed class block started at line ${activeClassLine}.`);
  }

  if (!hasHeader) {
    return {
      nodes: [],
      edges: [],
      error: 'Missing classDiagram header.',
    };
  }

  if (classes.size === 0) {
    return {
      nodes: [],
      edges: [],
      error: 'No valid classes found.',
    };
  }

  const classList = Array.from(classes.values());
  const nodes: FlowNode[] = classList.map((record, index) => ({
    id: record.id,
    type: 'class',
    position: { x: (index % 3) * 300, y: Math.floor(index / 3) * 220 },
    data: {
      label: record.label,
      color: 'slate',
      shape: 'rectangle',
      classStereotype: record.stereotype,
      classAttributes: record.attributes,
      classMethods: record.methods,
    },
  }));

  const edges: FlowEdge[] = relations.map((relation, index) => ({
      id: createId(`e-class-${index}`),
      source: relation.source,
      target: relation.target,
      label:
        relation.label
        || [relation.sourceCardinality, relation.targetCardinality].filter(Boolean).join(' ')
        || relation.relation,
      type: 'smoothstep',
      data: {
        classRelation: relation.relation,
        classRelationLabel: relation.label,
        classRelationSourceCardinality: relation.sourceCardinality,
        classRelationTargetCardinality: relation.targetCardinality,
      },
  }));

  return diagnostics.length > 0 ? { nodes, edges, diagnostics } : { nodes, edges };
}

export const CLASS_DIAGRAM_PLUGIN: DiagramPlugin = {
  id: 'classDiagram',
  displayName: 'Class Diagram',
  parseMermaid: parseClassDiagram,
};
