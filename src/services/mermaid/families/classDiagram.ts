import { createId } from '@/lib/id';
import {
  buildClassRelationTokenRegexPattern,
  type ClassRelationToken,
} from '@/lib/relationSemantics';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { DiagramPlugin } from './plugin';

interface ClassRecord {
  id: string;
  label: string;
  stereotype?: string;
  attributes: string[];
  methods: string[];
  /** `style X fill:…` wins over a `:::css` / `cssClass` class's fill. */
  fill?: string;
  cssClasses?: string[];
}

/** `class X["Shown label"]`, then an optional `:::css` class. */
const CLASS_LABEL_PATTERN = '(?:\\s*\\["([^"]*)"\\])?(?:\\s*:::\\s*([\\w-]+))?';

interface RelationRecord {
  source: string;
  target: string;
  relation: ClassRelationToken;
  label?: string;
  sourceCardinality?: string;
  targetCardinality?: string;
}

const CLASS_ID_START_PATTERN = '[A-Za-z_]';
const CLASS_ID_SEGMENT_PATTERN = '(?:[\\w.]|<[^>]+>|~[^~]+~|,)';
const CLASS_ID_PATTERN = `${CLASS_ID_START_PATTERN}${CLASS_ID_SEGMENT_PATTERN}*`;

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
  let namespaceDepth = 0;
  let noteDropped = false;
  const classDefs = new Map<string, string>();
  const declare = (rawId: string, label?: string, css?: string): ClassRecord => {
    const record = ensureClassRecord(classes, normalizeClassIdentifier(rawId));
    if (label) record.label = label;
    if (css) record.cssClasses = [...(record.cssClasses ?? []), css];
    return record;
  };

  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('%%')) continue;

    if (/^classDiagram\b/i.test(line)) {
      hasHeader = true;
      continue;
    }

    if (!hasHeader) continue;
    if (/^(title|direction|accTitle|accDescr)\b/i.test(line)) continue;

    if (activeClass) {
      if (line === '}') {
        activeClass = null;
        activeClassLine = -1;
        continue;
      }
      parseClassBodyLine(line, activeClass);
      continue;
    }

    const namespace = line.match(/^namespace\s+(\S+)\s*\{\s*$/i);
    if (namespace) {
      namespaceDepth += 1;
      diagnostics.push(`Namespace ${namespace[1]} is drawn without its box at line ${lineNumber}: "${line}"`);
      continue;
    }
    if (line === '}' && namespaceDepth > 0) {
      namespaceDepth -= 1;
      continue;
    }
    if (/^note\b/i.test(line)) {
      if (!noteDropped) diagnostics.push(`\`note for\` is dropped at line ${lineNumber}: "${line}"`);
      noteDropped = true;
      continue;
    }
    const style = line.match(new RegExp(`^style\\s+(${CLASS_ID_PATTERN})\\s+(.+)$`));
    if (style) {
      const fill = style[2].match(/(?:^|[,;])\s*fill\s*:\s*(#[0-9a-f]{3,8})\b/i)?.[1];
      if (fill) declare(style[1]).fill = fill;
      continue;
    }
    const classDef = line.match(/^classDef\s+([\w-]+(?:\s*,\s*[\w-]+)*)\s+(.+)$/i);
    if (classDef) {
      const fill = classDef[2].match(/(?:^|[,;])\s*fill\s*:\s*(#[0-9a-f]{3,8})\b/i)?.[1];
      if (fill) for (const name of classDef[1].split(/\s*,\s*/)) classDefs.set(name, fill);
      continue;
    }
    const cssClass = line.match(/^cssClass\s+"([^"]+)"\s+([\w-]+)\s*;?$/i);
    if (cssClass) {
      for (const id of cssClass[1].split(/\s*,\s*/)) declare(id, undefined, cssClass[2]);
      continue;
    }

    // Not Mermaid, but models write it: `interface X {`, `abstract class X {`, `enum X`.
    const typed = line.match(new RegExp(`^(abstract(?:\\s+class)?|interface|enum)\\s+(${CLASS_ID_PATTERN})\\s*(\\{)?\\s*$`, 'i'));
    if (typed) {
      const word = typed[1].toLowerCase().split(/\s+/)[0];
      const id = normalizeClassIdentifier(typed[2]);
      const record = ensureClassRecord(classes, id);
      record.stereotype = word === 'enum' ? 'enumeration' : word;
      diagnostics.push(`Line ${lineNumber}: \`${line.replace(/\s*\{$/, '')}\` is not Mermaid; read as \`class ${id} <<${record.stereotype}>>\`.`);
      if (typed[3]) {
        activeClass = record;
        activeClassLine = lineNumber;
      }
      continue;
    }

    const inlineBlock = line.match(new RegExp(`^class\\s+(${CLASS_ID_PATTERN})${CLASS_LABEL_PATTERN}\\s*\\{\\s*(.*?)\\s*\\}$`));
    if (inlineBlock) {
      const existing = declare(inlineBlock[1], inlineBlock[2], inlineBlock[3]);
      const members = inlineBlock[4]
        .split(';')
        .map((member) => member.trim())
        .filter(Boolean);
      members.forEach((member) => parseClassBodyLine(member, existing));
      continue;
    }

    const blockStart = line.match(new RegExp(`^class\\s+(${CLASS_ID_PATTERN})${CLASS_LABEL_PATTERN}\\s*\\{\\s*$`));
    if (blockStart) {
      activeClass = declare(blockStart[1], blockStart[2], blockStart[3]);
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

    // `<<interface>> Shape` annotates an existing (or new) class from outside its body.
    const annotation = line.match(new RegExp(`^<<\\s*(.+?)\\s*>>\\s+(${CLASS_ID_PATTERN})\\s*$`));
    if (annotation) {
      ensureClassRecord(classes, normalizeClassIdentifier(annotation[2])).stereotype = annotation[1];
      continue;
    }

    const standaloneClass = line.match(new RegExp(`^class\\s+(${CLASS_ID_PATTERN})${CLASS_LABEL_PATTERN}\\s*;?$`));
    if (standaloneClass) {
      declare(standaloneClass[1], standaloneClass[2], standaloneClass[3]);
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
  const fillOf = (record: ClassRecord) => record.fill ?? record.cssClasses?.map((name) => classDefs.get(name)).find(Boolean);
  const nodes: FlowNode[] = classList.map((record, index) => ({
    id: record.id,
    type: 'class',
    position: { x: (index % 3) * 300, y: Math.floor(index / 3) * 220 },
    data: {
      label: record.label,
      color: 'slate',
      shape: 'rectangle',
      classStereotype: record.stereotype,
      ...(fillOf(record) ? { classFill: fillOf(record) } : {}),
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
