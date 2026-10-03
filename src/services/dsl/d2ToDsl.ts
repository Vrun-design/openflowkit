import type { DslDiagnostic } from '../../dsl/ast';
import type { CanonicalAttribute } from '../../dsl/sceneMeta';
import { attributeText, quote, slugifyDslId } from '../../dsl/text';
import { canonicalColorWord, isHexColor, sortAttributes } from '../../dsl/vocabulary';

// D2 → OFK DSL (plan 13.5). D2 is a tree of `key: value { block }` statements and
// `a -> b: label` connections. The subset the public corpus uses converts: shapes,
// containers, labels, colours, dashes, links, cloud icons, `shape: sequence_diagram`
// and `sql_table`. Everything else is a W180 loss, never a throw (mermaidToDsl
// conventions). ponytail: globs, vars, layers, grids and `near` are reported, not
// emulated — add them when a real file needs one.

export interface D2Conversion {
  dsl: string;
  losses: string[];
  diagnostics: DslDiagnostic[];
}

export interface D2ConversionError {
  error: string;
}

// ---------- reading ----------

type Op = '->' | '<-' | '<->' | '--';

interface Item {
  /** One or more key paths; several when the statement is a connection chain. */
  readonly paths: readonly (readonly string[])[];
  readonly ops: readonly Op[];
  readonly value?: string;
  readonly block?: readonly Item[];
  readonly line: number;
}

/** Marks a quoted key segment: `"label"` is a name, never the `label` keyword. */
const QUOTED = '\uE001';
const plain = (segment: string) => segment.replace(QUOTED, '');

class Reader {
  private index = 0;
  line = 1;
  /** What the reader had to guess at, reported as losses. */
  readonly problems: { line: number; message: string }[] = [];

  constructor(private readonly text: string) {}

  private peek(offset = 0): string {
    return this.text[this.index + offset] ?? '';
  }

  private skipSpace(newlines: boolean): void {
    for (;;) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r') this.index++;
      else if (char === '\\' && this.peek(1) === '\n') { this.index += 2; this.line++; }
      else if (newlines && (char === '\n' || char === ';')) { if (char === '\n') this.line++; this.index++; }
      else if (char === '#') { while (this.peek() && this.peek() !== '\n') this.index++; }
      else return;
    }
  }

  private arrowAt(): Op | null {
    const rest = this.text.slice(this.index, this.index + 3);
    if (rest.startsWith('<->')) return '<->';
    if (rest.startsWith('->')) return '->';
    if (rest.startsWith('<-')) return '<-';
    if (rest.startsWith('--')) return '--';
    return null;
  }

  private quoted(): string {
    const close = this.peek();
    this.index++;
    let value = '';
    while (this.peek() && this.peek() !== close) {
      if (this.peek() === '\\' && this.peek(1)) {
        value += this.peek(1) === 'n' ? '\n' : this.peek(1);
        this.index += 2;
        continue;
      }
      if (this.peek() === '\n') {
        // An unclosed quote ends with its line; the rest of the file stays readable.
        this.problems.push({ line: this.line, message: 'unclosed quote ended at the end of its line' });
        return value;
      }
      value += this.peek();
      this.index++;
    }
    this.index++;
    return value;
  }

  /** A key path: dot-separated segments, unquoted ones may hold spaces (`im a parent.child`). */
  private path(): string[] {
    const segments: string[] = [];
    let current = '';
    for (;;) {
      this.skipSpace(false);
      const char = this.peek();
      // A quote opens a string only at the start of a segment: `Bob's laptop` is a name.
      if ((char === '"' || char === "'") && current.trim() === '') { current = QUOTED + this.quoted(); continue; }
      if (!char || ':{};\n#}'.includes(char) || this.arrowAt()) break;
      if (char === '.') { segments.push(current.trim()); current = ''; this.index++; continue; }
      current += char;
      this.index++;
      // Keep inner spaces, drop the trailing ones before a delimiter.
      while (this.peek() === ' ' || this.peek() === '\t') {
        const after = this.text.slice(this.index).match(/^[ \t]+(.)/)?.[1] ?? '';
        if (!after || ':{};\n#.'.includes(after) || this.text.slice(this.index).trimStart().match(/^(<->|->|<-|--)/)) break;
        current += this.peek();
        this.index++;
      }
    }
    if (current.trim() || segments.length) segments.push(current.trim());
    return segments;
  }

  /** A value: quoted, a `|md … |` block string, or the rest of the statement. */
  private value(): string {
    this.skipSpace(false);
    const char = this.peek();
    if (char === '"' || char === "'") return this.quoted();
    if (char === '|') {
      const pipes = /^\|+/.exec(this.text.slice(this.index))![0];
      const open = /^\|+[^\s|]*/.exec(this.text.slice(this.index))![0];
      this.index += open.length;
      const end = this.text.indexOf(pipes, this.index);
      const body = end === -1 ? this.text.slice(this.index) : this.text.slice(this.index, end);
      this.line += (body.match(/\n/g) ?? []).length;
      this.index = end === -1 ? this.text.length : end + pipes.length;
      // A private-use mark tags block strings (`|md … |`) so the converter can flatten them.
      return `\uE000${body}`;
    }
    let value = '';
    while (this.peek() && !'{};\n'.includes(this.peek()) && !(this.peek() === '#' && /\s$/.test(value))) {
      if (this.peek() === '\\' && this.peek(1) === 'n') { value += '\n'; this.index += 2; continue; }
      value += this.peek();
      this.index++;
    }
    return value.trim();
  }

  private skipBlock(): void {
    for (let depth = 1; this.peek() && depth > 0; this.index++) {
      if (this.peek() === '{') depth++;
      else if (this.peek() === '}') depth--;
      else if (this.peek() === '\n') this.line++;
    }
  }

  items(): Item[] {
    const items: Item[] = [];
    for (;;) {
      this.skipSpace(true);
      const char = this.peek();
      if (!char) return items;
      if (char === '}') { this.index++; return items; }
      const line = this.line;
      if (char === '(') {
        // `(a -> b)[0].style.stroke: red` styles an existing connection; read it whole, report it.
        const end = this.text.indexOf('\n', this.index);
        const raw = this.text.slice(this.index, end === -1 ? this.text.length : end);
        this.index = end === -1 ? this.text.length : end;
        if (raw.trimEnd().endsWith('{')) this.skipBlock();
        items.push({ paths: [[raw]], ops: [], line });
        continue;
      }
      const paths = [this.path()];
      const ops: Op[] = [];
      for (;;) {
        this.skipSpace(false);
        const op = this.arrowAt();
        if (!op) break;
        this.index += op.length;
        ops.push(op);
        paths.push(this.path());
      }
      let value: string | undefined;
      this.skipSpace(false);
      if (this.peek() === ':') {
        this.index++;
        value = this.value();
        this.skipSpace(false);
      }
      let block: Item[] | undefined;
      if (this.peek() === '{') {
        this.index++;
        block = this.items();
      }
      if (paths[0]!.length === 0 && !value && !block) {
        // Not a statement we can read; skip the rest of the line.
        while (this.peek() && this.peek() !== '\n') this.index++;
        continue;
      }
      items.push({ paths, ops, line, ...(value !== undefined ? { value } : {}), ...(block ? { block } : {}) });
    }
  }
}

// ---------- model ----------

interface D2Node {
  readonly path: string;
  readonly key: string;
  readonly parent: string | null;
  label?: string;
  shape?: string;
  color?: string;
  icon?: string;
  link?: string;
  width?: string;
  height?: string;
  shadow?: boolean;
  rows: { name: string; type: string; constraints: string[] }[];
  readonly line: number;
}

interface D2Edge {
  from: string;
  to: string;
  readonly op: Op;
  label?: string;
  dashed?: boolean;
  thick?: boolean;
  flow?: boolean;
  head?: string;
  tail?: string;
  readonly line: number;
}

const RESERVED = new Set([
  'shape', 'label', 'icon', 'link', 'tooltip', 'near', 'width', 'height', 'style', 'class', 'classes', 'vars',
  'direction', 'constraint', 'source-arrowhead', 'target-arrowhead', 'layers', 'scenarios', 'steps', 'top',
  'left', 'grid-rows', 'grid-columns', 'grid-gap', 'vertical-gap', 'horizontal-gap', 'filled', 'tall',
]);

const SHAPES: Readonly<Record<string, string | null>> = {
  rectangle: '', square: '', page: 'doc', document: 'doc', parallelogram: 'parallelogram', cylinder: 'cylinder',
  stored_data: 'cylinder', queue: 'queue', package: 'component', person: 'person', 'c4-person': 'person',
  diamond: 'diamond', oval: 'ellipse', circle: 'circle', hexagon: 'hexagon', cloud: 'cloud', callout: 'note',
  image: '', step: null, text: null, code: null, class: null,
};

const ICON_HOSTS = /^https?:\/\/icons\.(?:terrastruct\.com|d2lang\.com)\/(aws|azure|gcp|dev|tech)(?:%2F|\/)(.+)$/i;

const HEADS: Readonly<Record<string, string>> = { arrow: 'arrow', triangle: 'arrow', circle: 'circle', none: 'none' };

class Converter {
  readonly nodes = new Map<string, D2Node>();
  readonly edges: D2Edge[] = [];
  private readonly classes = new Map<string, readonly Item[]>();
  private readonly losses = new Map<string, number>();
  /** Sequence-diagram groups: top-level boxes whose lines name the diagram's actors. */
  readonly groups = new Set<string>();
  direction?: string;
  sequence = false;

  loss(line: number, message: string): void {
    if (!this.losses.has(message)) this.losses.set(message, line);
  }

  lossList(): { message: string; line: number }[] {
    return [...this.losses].map(([message, line]) => ({ message, line }));
  }

  /** `_` climbs out of the scope; everything else is relative to it. */
  /** Null when `_` climbs above the diagram. */
  private resolve(scope: readonly string[], segments: readonly string[]): string[] | null {
    const path = [...scope];
    for (const segment of segments) {
      if (segment !== '_') path.push(plain(segment));
      else if (path.pop() === undefined) return null;
    }
    return path;
  }

  private ensure(path: readonly string[], line: number): D2Node | null {
    if (path.length === 0) return null;
    let parent: string | null = null;
    let node: D2Node | null = null;
    for (let depth = 1; depth <= path.length; depth++) {
      const key = path.slice(0, depth).join('.');
      node = this.nodes.get(key) ?? null;
      if (!node) {
        node = { path: key, key: path[depth - 1]!, parent, rows: [], line };
        this.nodes.set(key, node);
      }
      parent = key;
    }
    return node;
  }

  walk(items: readonly Item[], scope: readonly string[]): void {
    for (const item of items) {
      if (item.ops.length > 0) this.connection(item, scope);
      else this.statement(item, scope);
    }
  }

  private connection(item: Item, scope: readonly string[]): void {
    if (item.paths.some((path) => path.some((segment) => segment.includes('*')))) {
      this.loss(item.line, 'glob connections dropped');
      return;
    }
    const resolved = item.paths.map((path) => this.resolve(scope, path));
    if (resolved.some((end) => !end || end.length === 0)) {
      this.loss(item.line, '`_` above the diagram; connection dropped');
      return;
    }
    const ends = resolved as string[][];
    for (const end of ends) this.ensure(end, item.line);
    for (let index = 0; index < item.ops.length; index++) {
      const edge: D2Edge = { from: ends[index]!.join('.'), to: ends[index + 1]!.join('.'), op: item.ops[index]!, line: item.line };
      if (item.value) edge.label = item.value.startsWith('\uE000') ? markdownLabel(item.value) : item.value.trim();
      if (item.block) this.edgeBlock(edge, item.block);
      this.edges.push(edge);
    }
  }

  /**
   * After the walk, when every shape is known: `objects.disk` on a `sql_table` names a
   * column, so the connection relates the tables and the column becomes a row.
   */
  finishTables(): void {
    const tableOf = (path: string, line: number): string => {
      const segments = path.split('.');
      for (let depth = 1; depth < segments.length; depth++) {
        const table = segments.slice(0, depth).join('.');
        if (this.nodes.get(table)?.shape === 'sql_table') {
          this.loss(line, 'column-level connections drawn table to table');
          return table;
        }
      }
      return path;
    };
    for (const edge of this.edges) {
      edge.from = tableOf(edge.from, edge.line);
      edge.to = tableOf(edge.to, edge.line);
    }
    for (const node of [...this.nodes.values()]) {
      const table = node.parent ? this.nodes.get(node.parent) : undefined;
      if (table?.shape !== 'sql_table') continue;
      if (!table.rows.some((row) => row.name === node.key)) table.rows.push({ name: node.key, type: '', constraints: [] });
      this.nodes.delete(node.path);
    }
  }

  /** In a sequence diagram, a top-level box holding messages or notes is a group of the same actors. */
  private isSequenceGroup(path: readonly string[], node: D2Node, block: readonly Item[]): boolean {
    return this.sequence && path.length === 1 && node.shape !== 'sequence_diagram'
      && block.some((child) => child.ops.length > 0 || !RESERVED.has((child.paths[0]?.[0] ?? '').toLowerCase()));
  }

  private edgeBlock(edge: D2Edge, block: readonly Item[]): void {
    for (const entry of block) {
      const [first, ...rest] = entry.paths[0] ?? [];
      const key = [first, ...rest].join('.');
      if (key === 'label') edge.label = entry.value ?? edge.label;
      else if (key === 'style.stroke-dash') edge.dashed = Number(entry.value) > 0;
      else if (key === 'style.animated') edge.flow = entry.value === 'true';
      else if (key === 'style.stroke-width') edge.thick = Number(entry.value) >= 3;
      else if (key === 'style' && entry.block) this.edgeBlock(edge, entry.block.map((child) => ({ ...child, paths: [['style', ...child.paths[0]!]] })));
      else if (first === 'source-arrowhead' || first === 'target-arrowhead') {
        const shape = rest[0] === 'shape' ? entry.value : entry.block?.find((child) => child.paths[0]?.[0] === 'shape')?.value;
        const head = shape ? HEADS[shape] : undefined;
        if (shape && head) {
          if (first === 'source-arrowhead') edge.tail = head;
          else edge.head = head;
        } else if (shape) this.loss(entry.line, `arrowhead shape ${shape} dropped`);
        if (entry.value && rest.length === 0) this.loss(entry.line, 'arrowhead labels dropped');
        if (rest[0] === 'label' || entry.block?.some((child) => child.paths[0]?.[0] === 'label')) this.loss(entry.line, 'arrowhead labels dropped');
      } else this.loss(entry.line, `connection ${key} dropped`);
    }
  }

  private statement(item: Item, scope: readonly string[]): void {
    const segments = item.paths[0]!;
    if (segments.some((segment) => segment.includes('*'))) {
      this.loss(item.line, 'globs dropped');
      return;
    }
    if (/^\(.*\)\[\d+\]$/.test(segments[0] ?? '') || segments[0]?.startsWith('(')) {
      this.loss(item.line, 'connection references dropped');
      return;
    }
    const field = segments.findIndex((segment) => RESERVED.has(segment.toLowerCase()));
    const resolved = this.resolve(scope, field === -1 ? segments : segments.slice(0, field));
    if (!resolved) {
      this.loss(item.line, '`_` above the diagram; statement dropped');
      return;
    }
    if (field === -1) {
      const path = resolved;
      const node = this.ensure(path, item.line)!;
      const parent = node.parent ? this.nodes.get(node.parent) : undefined;
      if (parent?.shape === 'sql_table') {
        this.nodes.delete(node.path);
        parent.rows.push({ name: node.key, type: item.value ?? '', constraints: this.constraints(item.block) });
        return;
      }
      if (item.value !== undefined) {
        node.label = item.value.startsWith('\uE000') ? markdownLabel(item.value) : item.value;
        if (item.value.startsWith('\uE000')) this.loss(item.line, 'markdown and code labels flattened to their first line');
      }
      if (item.block) {
        // A shape decides how the block reads (rows of a table), so it is read first.
        const shape = item.block.find((child) => child.paths[0]?.length === 1 && child.paths[0][0] === 'shape');
        if (shape) this.field(node, ['shape'], shape, path);
        const rest = item.block.filter((child) => child !== shape);
        if (this.isSequenceGroup(path, node, rest)) {
          this.groups.add(node.path);
          this.loss(item.line, `sequence group "${node.label?.trim() || node.key}" flattened`);
          this.walk(rest, []);
        } else this.walk(rest, path);
      }
      return;
    }
    const target = resolved;
    const node = target.length ? this.ensure(target, item.line) : null;
    this.field(node, segments.slice(field), item, target);
  }

  private constraints(block: readonly Item[] | undefined): string[] {
    const constraint = block?.find((child) => child.paths[0]?.[0] === 'constraint')?.value ?? '';
    return constraint.replace(/[[\]]/g, '').split(/[;,\s]+/).filter(Boolean);
  }

  private field(node: D2Node | null, keyPath: readonly string[], item: Item, scope: readonly string[]): void {
    const key = keyPath.join('.').toLowerCase();
    const value = item.value?.startsWith('\uE000') ? markdownLabel(item.value) : item.value;
    if (item.value?.startsWith('\uE000')) this.loss(item.line, 'markdown and code labels flattened to their first line');
    if (!node) {
      if (key === 'direction' && value) this.direction = value;
      else if (key === 'shape' && value === 'sequence_diagram') this.sequence = true;
      else if (key === 'classes' && item.block) for (const entry of item.block) this.classes.set(entry.paths[0]!.map(plain).join('.'), entry.block ?? []);
      else if (key === 'vars' || key === 'layers' || key === 'scenarios' || key === 'steps') this.loss(item.line, `${key} dropped`);
      else if (key.startsWith('style')) this.loss(item.line, 'diagram style dropped');
      else this.loss(item.line, `${key} dropped`);
      return;
    }
    if (key === 'label') node.label = value ?? node.label;
    else if (key === 'shape' && value) this.shape(node, value, item.line);
    else if (key === 'icon' && value) this.icon(node, value, item.line);
    else if (key === 'link' && value) node.link = value;
    else if (key === 'width' && value) node.width = value;
    else if (key === 'height' && value) node.height = value;
    else if (key === 'class' && value) {
      for (const name of value.replace(/[[\]]/g, '').split(/[;,]/).map((part) => part.trim()).filter(Boolean)) {
        const definition = this.classes.get(name);
        if (definition) this.walk(definition, scope);
        else this.loss(item.line, `class ${name} not defined; dropped`);
      }
    } else if (key === 'style' && item.block) {
      for (const child of item.block) this.field(node, ['style', ...child.paths[0]!], child, scope);
    } else if (key === 'style.fill' && value) {
      const color = isHexColor(value) ? value.toLowerCase() : canonicalColorWord(value);
      if (color) node.color = color;
      else if (value !== 'transparent') this.loss(item.line, `fill ${value} has no palette colour; dropped`);
    } else if (key === 'style.shadow') node.shadow = value === 'true';
    else if (key === 'direction') this.loss(item.line, 'container direction dropped');
    else this.loss(item.line, `${key.startsWith('style.') ? key : keyPath[0]} dropped`);
  }

  private shape(node: D2Node, value: string, line: number): void {
    if (value === 'sql_table') { node.shape = 'sql_table'; return; }
    if (value === 'sequence_diagram') {
      node.shape = 'sequence_diagram';
      this.loss(line, 'a nested sequence diagram is drawn as a group');
      return;
    }
    const mapped = SHAPES[value];
    if (mapped === undefined || mapped === null) this.loss(line, `shape ${value} drawn as a box`);
    else node.shape = mapped || undefined;
  }

  private icon(node: D2Node, url: string, line: number): void {
    const match = ICON_HOSTS.exec(url);
    if (!match) {
      this.loss(line, 'icon URLs outside the cloud packs dropped');
      return;
    }
    const provider = match[1]!.toLowerCase() === 'dev' ? 'tech' : match[1]!.toLowerCase();
    const file = decodeURIComponent(match[2]!).split('/').at(-1)!.replace(/\.\w+$/, '')
      .replace(/^(?:AWS|Amazon|Azure|Google|GCP)[-\s]+/i, '');
    node.icon = `${provider}/${slugifyDslId(file)}`;
  }
}

function markdownLabel(raw: string): string {
  const line = raw.slice(1).split('\n').map((text) => text.replace(/^[\s#>*-]+/, '').replace(/[*_`]/g, '').trim()).find(Boolean);
  return line ?? '';
}

// ---------- writing ----------

/** A label that may hold a line break; DSL writes it as `\n` inside quotes (grammar §2.4). */
function labelText(value: string): string {
  return value.includes('\n') ? `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"` : quote(value);
}

function assignIds(nodes: Iterable<D2Node>): Map<string, string> {
  const ids = new Map<string, string>();
  const used = new Set<string>();
  // An explicit id opens with a letter (grammar §2.6): `2007` becomes `n2007`.
  const idOf = (text: string) => { const slug = slugifyDslId(text); return /^\d/.test(slug) ? `n${slug}` : slug; };
  for (const node of nodes) {
    const base = idOf(node.key);
    let id = used.has(base) ? idOf(node.path) : base;
    for (let suffix = 2; used.has(id); suffix++) id = `${idOf(node.path)}-${suffix}`;
    used.add(id);
    ids.set(node.path, id);
  }
  return ids;
}

const labelOf = (node: D2Node) => node.label?.trim() || node.key;

/** Labels that another node also carries, or that name another node's id: those need `id = Label`. */
function ambiguous(nodes: readonly D2Node[], ids: ReadonlyMap<string, string>): Set<string> {
  const counts = new Map<string, number>();
  for (const node of nodes) counts.set(slugifyDslId(labelOf(node)), (counts.get(slugifyDslId(labelOf(node))) ?? 0) + 1);
  const idSet = new Set(ids.values());
  return new Set(nodes.filter((node) => {
    const slug = slugifyDslId(labelOf(node));
    return (counts.get(slug) ?? 0) > 1 || (idSet.has(slug) && ids.get(node.path) !== slug);
  }).map((node) => node.path));
}

function declaration(node: D2Node, id: string, forceId = false): string {
  const label = labelOf(node);
  const entries: CanonicalAttribute[] = [];
  if (node.shape && node.shape !== 'sql_table' && node.shape !== 'sequence_diagram') entries.push({ value: node.shape });
  if (node.color) entries.push({ key: 'color', value: node.color });
  if (node.shadow) entries.push({ value: 'shadow' });
  if (node.icon) entries.push({ key: 'icon', value: node.icon });
  if (node.link) entries.push({ key: 'link', value: node.link });
  if (node.width) entries.push({ key: 'width', value: node.width });
  if (node.height) entries.push({ key: 'height', value: node.height });
  const head = slugifyDslId(label) === id && !forceId ? labelText(label) : `${id} = ${labelText(label)}`;
  return `${head}${attributeText(sortAttributes(entries))}`;
}

function edgeText(edge: D2Edge, ids: ReadonlyMap<string, string>): string {
  const entries: CanonicalAttribute[] = [];
  if (edge.thick) entries.push({ value: 'thick' });
  if (edge.flow) entries.push({ value: 'flow' });
  if (edge.head) entries.push({ key: 'head', value: edge.head });
  if (edge.tail) entries.push({ key: 'tail', value: edge.tail });
  const op = edge.dashed ? ({ '->': '-->', '<-': '<--', '<->': '<-->', '--': '--' } as const)[edge.op] : edge.op;
  const label = edge.label ? ` : ${labelText(edge.label)}` : '';
  return `${ids.get(edge.from)} ${op} ${ids.get(edge.to)}${label}${attributeText(sortAttributes(entries))}`;
}

const DIRECTION_WORDS = new Set(['up', 'down', 'left', 'right']);

function writeGraph(converter: Converter): string {
  const nodes = [...converter.nodes.values()];
  const ids = assignIds(nodes);
  const force = ambiguous(nodes, ids);
  const children = (parent: string | null) => nodes.filter((node) => node.parent === parent);
  const lines = [`flowchart${converter.direction && DIRECTION_WORDS.has(converter.direction) ? ` ${converter.direction}` : ''}`];
  const emit = (node: D2Node, indent: string): void => {
    const kids = children(node.path);
    if (kids.length === 0) {
      lines.push(`${indent}${declaration(node, ids.get(node.path)!, force.has(node.path))}`);
      return;
    }
    lines.push(`${indent}group ${declaration(node, ids.get(node.path)!, force.has(node.path))} {`);
    for (const kid of kids) emit(kid, `${indent}  `);
    lines.push(`${indent}}`);
  };
  for (const root of children(null)) emit(root, '');
  for (const edge of converter.edges) lines.push(edgeText(edge, ids));
  return `${lines.join('\n')}\n`;
}

function writeErd(converter: Converter): string {
  const tables = [...converter.nodes.values()];
  const ids = assignIds(tables);
  const force = ambiguous(tables, ids);
  const flag = (constraint: string) => ({ primary_key: 'pk', pk: 'pk', foreign_key: 'fk', fk: 'fk', unique: 'unique', unq: 'unique' })[constraint.toLowerCase()];
  const lines = [`erd${converter.direction && DIRECTION_WORDS.has(converter.direction) ? ` ${converter.direction}` : ''}`];
  for (const table of tables) {
    lines.push(`${declaration(table, ids.get(table.path)!, force.has(table.path))} {`);
    for (const row of table.rows) {
      const flags = row.constraints.map(flag).filter(Boolean);
      const type = row.type.trim() ? slugifyDslId(row.type).replace(/-/g, '_') : '';
      lines.push(`  ${[quote(row.name), type, ...flags].filter(Boolean).join(' ')}`);
    }
    lines.push('}');
  }
  for (const edge of converter.edges) {
    lines.push(`${ids.get(edge.from)} -> ${ids.get(edge.to)}${edge.label ? ` : ${labelText(edge.label)}` : ''}`);
  }
  return `${lines.join('\n')}\n`;
}

function writeSequence(converter: Converter): string {
  const nodes = [...converter.nodes.values()];
  const actors = nodes.filter((node) => node.parent === null && !converter.groups.has(node.path));
  const ids = assignIds(actors);
  const actorOf = (path: string) => ids.get(path.split('.')[0]!);
  const used = new Set(converter.edges.flatMap((edge) => [edge.from, edge.to]));
  const lines = ['sequence'];
  for (const actor of actors) {
    const id = ids.get(actor.path)!;
    const label = actor.label?.trim() || actor.key;
    const attrs = actor.shape === 'person' ? ' [person]' : actor.shape === 'cylinder' ? ' [db]' : actor.shape === 'queue' ? ' [queue]' : '';
    lines.push(`participant ${slugifyDslId(label) === id ? labelText(label) : `${id} = ${labelText(label)}`}${attrs}`);
  }
  // Notes are children of an actor that no message names; a span (`alice.play`) is its actor.
  // Notes and messages keep their written order: in a sequence, order is meaning.
  const steps: { line: number; text: string }[] = [];
  for (const note of nodes.filter((node) => node.parent && !converter.groups.has(node.parent) && !used.has(node.path) && actorOf(node.path))) {
    steps.push({ line: note.line, text: `note over ${actorOf(note.path)} : ${labelText(note.label?.trim() || note.key)}` });
  }
  if (nodes.some((node) => node.parent && used.has(node.path))) converter.loss(1, 'spans drawn on their actor');
  for (const edge of converter.edges) {
    const from = actorOf(edge.from);
    const to = actorOf(edge.to);
    if (!from || !to) continue;
    const [source, target] = edge.op === '<-' ? [to, from] : [from, to];
    if (edge.op === '<->' || edge.op === '--') converter.loss(edge.line, `sequence ${edge.op} drawn as one message`);
    steps.push({ line: edge.line, text: `${source} ${edge.dashed ? '-->' : '->'} ${target}${edge.label ? ` : ${labelText(edge.label)}` : ''}` });
  }
  lines.push(...steps.sort((a, b) => a.line - b.line).map(({ text }) => text));
  return `${lines.join('\n')}\n`;
}

// ---------- entry points ----------

/** D2-only syntax our DSL never writes: `key.shape:`, `style.` keys, `|md`, `classes: {`. (`#` alone is markdown too.) */
const D2_MARKERS = /(?:^\s*(?:[^\n:[\]]+\.)?|[{;]\s*)(?:shape|icon|style(?:\.[\w-]+)?|near|tooltip)\s*:|\|md\b|^\s*classes\s*:\s*\{|^\s*vars\s*:\s*\{/m;
const OFK_OR_MERMAID_HEADER = /^\s*(?:%%|flowchart|graph|architecture|sequence|state|erd|class|mindmap|gitgraph|gitGraph|chart|wireframe|workspace|model\b|sequenceDiagram|stateDiagram|classDiagram|erDiagram|journey|gantt|pie)\b/;

/** True when the text reads as D2 and as nothing we already speak. */
export function looksLikeD2(text: string): boolean {
  const first = text.split('\n').find((line) => line.trim()) ?? '';
  if (OFK_OR_MERMAID_HEADER.test(first)) return false;
  // Our DSL attributes live in `[…]`; D2 never writes them on a node line.
  if (/^\s*[^\n#"]*\w \[[^\]]*\]\s*$/m.test(text)) return false;
  return D2_MARKERS.test(text) || /^\s*[^\n:#]+\s*(?:->|<-|<->|--)\s*[^\n:#]+:\s*\S/m.test(text) && /^\s*[\w ."'-]+:\s*\{\s*$/m.test(text);
}

export function d2ToDsl(text: string): D2Conversion | D2ConversionError {
  const reader = new Reader(text.replace(/\r\n?/g, '\n'));
  const items = reader.items();
  const converter = new Converter();
  for (const problem of reader.problems) converter.loss(problem.line, problem.message);
  converter.walk(items, []);
  converter.finishTables();
  if (converter.nodes.size === 0) return { error: 'No D2 shapes or connections found' };
  const tables = [...converter.nodes.values()];
  const erd = tables.every((node) => node.shape === 'sql_table');
  if (!erd && tables.some((node) => node.shape === 'sql_table')) converter.loss(1, 'sql_table shapes mixed with other shapes are drawn as boxes');
  const dsl = converter.sequence ? writeSequence(converter) : erd ? writeErd(converter) : writeGraph(converter);
  const losses = converter.lossList();
  return {
    dsl,
    losses: losses.map(({ message }) => message),
    diagnostics: losses.map(({ message, line }) => ({ code: 'W180', severity: 'warning', line, col: 1, endCol: 1, message, source: 'parse' })),
  };
}
