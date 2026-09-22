import type { DslDiagnostic, DslDirection } from '../../dsl/ast';
import type { ElementKind } from '../../dsl/model/types';
import type { CanonicalAttribute } from '../../dsl/sceneMeta';
import { attributeText, quote, slugifyDslId } from '../../dsl/text';
import { canonicalColorWord, DIRECTIONS, isHexColor, sortAttributes } from '../../dsl/vocabulary';

// Structurizr DSL → OFK text (grammar §11.2). Structurizr files are line-oriented
// with `{}` blocks; every construct the DSL cannot express is reported as a W180
// `source: 'import'` diagnostic and never throws (mermaidToDsl conventions).

export interface StructurizrConversion {
  dsl: string;
  /** One line per construct the DSL cannot express. */
  losses: string[];
  diagnostics: DslDiagnostic[];
}

export interface StructurizrConversionError {
  error: string;
}

interface StToken {
  readonly kind: 'word' | 'string';
  readonly value: string;
  readonly line: number;
}

interface StStatement {
  readonly tokens: readonly StToken[];
  readonly children: StStatement[];
  readonly line: number;
}

/** Structurizr keywords that do not exist in OFK; used by the detector. */
const STRUCTURIZR_KEYWORDS = /\b(?:person|softwareSystem|container|component|deploymentEnvironment|containerInstance|infrastructureNode|systemLandscape|systemContext)\b|\bdynamic\s|!identifiers|!include|!impliedRelationships/;
const OFK_FAMILY_HEADER = /^\s*(architecture|flowchart|sequence|state|erd|class|mindmap|gitgraph)\b/m;

const KIND_BY_WORD: Readonly<Record<string, ElementKind>> = {
  person: 'person',
  softwaresystem: 'system',
  container: 'container',
  component: 'component',
  deploymentnode: 'node',
  infrastructurenode: 'node',
  containerinstance: 'instance',
  softwaresysteminstance: 'instance',
};

const VIEW_BY_WORD: Readonly<Record<string, DraftView['kind']>> = {
  systemlandscape: 'landscape',
  systemcontext: 'context',
  container: 'container',
  component: 'component',
  deployment: 'deployment',
};

const STRUCTURIZR_TYPES: Readonly<Record<string, string>> = {
  person: 'person',
  softwaresystem: 'system',
  container: 'container',
  component: 'component',
  deploymentnode: 'node',
  infrastructurenode: 'node',
  containerinstance: 'instance',
  softwaresysteminstance: 'instance',
};

/** Structurizr default tags, which `styles` may target even though we never emit them. */
const DEFAULT_TAGS: Readonly<Record<string, string>> = {
  person: 'Person',
  softwaresystem: 'Software System',
  container: 'Container',
  component: 'Component',
  deploymentnode: 'Deployment Node',
  infrastructurenode: 'Infrastructure Node',
  containerinstance: 'Container Instance',
  softwaresysteminstance: 'Software System Instance',
};

/** Structurizr shape names → OFK shape vocabulary (grammar §5.1). */
const SHAPE_WORDS: Readonly<Record<string, string>> = {
  box: 'rect',
  roundedbox: 'rounded',
  circle: 'circle',
  ellipse: 'ellipse',
  cylinder: 'cylinder',
  pipe: 'cylinder',
  bucket: 'cylinder',
  database: 'cylinder',
  folder: 'doc',
  person: 'person',
  webbrowser: 'browser',
  mobiledevicebrowser: 'mobile',
  mobiledeviceportrait: 'mobile',
  mobiledevicelandscape: 'mobile',
  component: 'component',
  cloud: 'cloud',
  hexagon: 'hexagon',
};

const DROP_STATEMENTS = new Set(['theme', 'themes', 'branding', 'terminology', 'configuration']);

interface DraftElement {
  sid: string;
  explicitSid: boolean;
  structurizrKind: string;
  name: string;
  kind: ElementKind;
  parent: DraftElement | null;
  children: DraftElement[];
  desc?: string;
  tech?: string;
  tags: string[];
  shape?: string;
  color?: string;
  icon?: string;
  env?: string;
  ofkId: string;
  dropped?: boolean;
}

interface DraftRelation {
  readonly from: string | null;
  readonly to: string;
  readonly scope: DraftElement | null;
  readonly label?: string;
  readonly tech?: string;
  readonly tags: readonly string[];
  readonly env: string | null;
  readonly line: number;
}

interface ResolvedRelation {
  readonly from: DraftElement;
  readonly to: DraftElement;
  readonly label?: string;
  readonly tech?: string;
  readonly tags: readonly string[];
  readonly env: string | null;
}

interface DraftInstance {
  readonly element: DraftElement;
  readonly ref: string;
  readonly scope: DraftElement | null;
  readonly line: number;
}

type RulePart =
  | { readonly kind: 'all' }
  | { readonly kind: 'ref'; readonly ref: string }
  | { readonly kind: 'successors'; readonly ref: string }
  | { readonly kind: 'predecessors'; readonly ref: string }
  | { readonly kind: 'pair'; readonly from: string; readonly to: string }
  | { readonly kind: 'where-kind'; readonly value: string }
  | { readonly kind: 'where-tag'; readonly value: string };

interface DraftRule {
  readonly op: 'include' | 'exclude';
  readonly parts?: readonly RulePart[];
  /** Source line kept verbatim when the expression has no OFK equivalent. */
  readonly raw?: string;
}

interface DraftView {
  readonly kind: 'landscape' | 'context' | 'container' | 'component' | 'deployment';
  readonly scopeRef?: string;
  scope?: DraftElement;
  readonly env?: string;
  readonly key?: string;
  direction?: DslDirection;
  readonly rules: DraftRule[];
  readonly line: number;
  dropped?: boolean;
}

interface DraftStep {
  readonly from: string | null;
  readonly to: string;
  readonly label?: string;
  readonly tech?: string;
  readonly tags: readonly string[];
  readonly line: number;
}

interface DraftFlow {
  readonly name?: string;
  scopeRef?: string;
  scope?: DraftElement;
  readonly steps: DraftStep[];
  readonly line: number;
}

interface ElementStyle {
  readonly tag: string;
  shape?: string;
  color?: string;
  icon?: string;
}

interface Loss {
  readonly message: string;
  readonly line: number;
}

interface Declaration {
  readonly sid?: string;
  readonly kind: ElementKind;
  readonly kindWord: string;
  readonly name: string;
  readonly strings: readonly string[];
}

/** Reads `workspace "Name" "Description" { }` / bare `model` / `views` headers. */
function readStatements(text: string): StStatement[] {
  const roots: StStatement[] = [];
  const stack: StStatement[][] = [roots];
  let pending: StToken[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const flush = (opens: boolean): void => {
    if (pending.length === 0) return;
    const statement: StStatement = { tokens: pending, children: [], line: pending[0]!.line };
    stack.at(-1)!.push(statement);
    pending = [];
    if (opens) stack.push(statement.children);
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    let offset = 0;
    while (offset < line.length) {
      const char = line[offset]!;
      if (/\s/.test(char) || char === ',') {
        offset += 1;
        continue;
      }
      if (line.startsWith('//', offset)) break;
      if (char === '#' && !/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/.test(line.slice(offset))) break;
      if (char === '"') {
        let value = '';
        let next = offset + 1;
        while (next < line.length && line[next] !== '"') {
          if (line[next] === '\\' && next + 1 < line.length) {
            value += line[next + 1] === 'n' ? '\n' : line[next + 1]!;
            next += 2;
            continue;
          }
          value += line[next]!;
          next += 1;
        }
        pending.push({ kind: 'string', value, line: index + 1 });
        offset = next + 1;
        continue;
      }
      if (char === '{') {
        if (pending.length > 0) flush(true);
        else {
          const previous = stack.at(-1)!.at(-1);
          if (previous) stack.push(previous.children);
        }
        offset += 1;
        continue;
      }
      if (char === '}') {
        flush(false);
        if (stack.length > 1) stack.pop();
        offset += 1;
        continue;
      }
      if (line.startsWith('->', offset)) {
        pending.push({ kind: 'word', value: '->', line: index + 1 });
        offset += 2;
        continue;
      }
      let end = offset;
      while (end < line.length) {
        const next = line[end]!;
        if (/\s/.test(next) || next === '{' || next === '}' || next === '"' || next === ',') break;
        if (line.startsWith('->', end)) break;
        end += 1;
      }
      if (end === offset) {
        offset += 1;
        continue;
      }
      pending.push({ kind: 'word', value: line.slice(offset, end), line: index + 1 });
      offset = end;
    }
    flush(false);
  }
  return roots;
}

/** Structurizr's own identifier derivation: "Spring PetClinic" → `springPetClinic`. */
function derivedSid(name: string): string {
  return name.split(/[^A-Za-z0-9]+/).filter(Boolean)
    .map((word, index) => (index === 0
      ? word.charAt(0).toLowerCase() + word.slice(1)
      : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('') || 'element';
}

function normalizeName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitTags(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean);
}

function readDeclaration(tokens: readonly StToken[]): Declaration | null {
  let index = 0;
  let sid: string | undefined;
  if (tokens[1]?.value === '=' && tokens[0]?.kind === 'word') {
    sid = tokens[0]!.value;
    index = 2;
  }
  const kindWord = tokens[index]?.value.toLowerCase() ?? '';
  const kind = KIND_BY_WORD[kindWord];
  if (!kind) return null;
  index += 1;
  let name = '';
  if (tokens[index]?.kind === 'string') {
    name = tokens[index]!.value;
    index += 1;
  } else {
    const nameWords: string[] = [];
    while (index < tokens.length && tokens[index]!.kind === 'word') {
      nameWords.push(tokens[index]!.value);
      index += 1;
    }
    name = nameWords.join(' ');
  }
  if (!name) return null;
  const strings: string[] = [];
  for (; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.kind === 'string') strings.push(token.value);
  }
  return { ...(sid ? { sid } : {}), kind, kindWord, name, strings };
}

/** Reads `<[from] -> to> [description] [technology] [tags]`; null when there is no arrow. */
function readRelation(tokens: readonly StToken[]): { from: string | null; to: string; strings: string[] } | null {
  const head = tokens[1]?.value === '=' ? tokens.slice(2) : tokens;
  const arrow = head.findIndex((token) => token.value === '->');
  if (arrow < 0) return null;
  const left = head.slice(0, arrow);
  const from = left.length > 0 ? left.map((token) => token.value).join(' ') : null;
  const right = head.slice(arrow + 1);
  let to = '';
  const strings: string[] = [];
  if (right[0]?.kind === 'string') {
    to = right[0]!.value;
    for (let index = 1; index < right.length; index += 1) if (right[index]!.kind === 'string') strings.push(right[index]!.value);
  } else {
    const toWords: string[] = [];
    for (const token of right) {
      if (token.kind === 'string') {
        strings.push(token.value);
        continue;
      }
      if (strings.length === 0) toWords.push(token.value);
    }
    to = toWords.join(' ');
  }
  return to ? { from, to, strings } : null;
}

/** Person/softwareSystem carry `description, tags`; the rest `description, technology, tags`. */
function positional(strings: readonly string[], kind: ElementKind): { desc?: string; tech?: string; tags: string[] } {
  const [first, second, third] = strings;
  const desc = first ? { desc: first } : {};
  if ((kind === 'person' || kind === 'system') && third === undefined) {
    return { ...desc, tags: splitTags(second) };
  }
  return { ...desc, ...(second ? { tech: second } : {}), tags: splitTags(third) };
}

function isSafeWord(value: string): boolean {
  return /^[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*$/.test(value)
    && !(value.toLowerCase() in DIRECTIONS)
    && value.toLowerCase() !== 'of'
    && value.toLowerCase() !== 'in';
}

function quoted(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

class StructurizrConverter {
  private elements: DraftElement[] = [];
  private modelElements: DraftElement[] = [];
  private readonly deployment = new Map<string, DraftElement[]>();
  private readonly envOrder: string[] = [];
  private readonly bySid = new Map<string, DraftElement>();
  private readonly bySidLower = new Map<string, DraftElement>();
  private readonly byPath = new Map<string, DraftElement>();
  private readonly byNamePath = new Map<string, DraftElement>();
  private readonly nameCounts = new Map<string, number>();
  private readonly relations: DraftRelation[] = [];
  private readonly instances: DraftInstance[] = [];
  private readonly views: DraftView[] = [];
  private readonly flows: DraftFlow[] = [];
  private readonly styles: ElementStyle[] = [];
  private readonly losses: Loss[] = [];
  private name: string | undefined;

  walk(roots: readonly StStatement[]): void {
    for (const statement of roots) {
      const first = statement.tokens[0]?.value ?? '';
      const lower = first.toLowerCase();
      if (lower === 'workspace') {
        const strings = statement.tokens.filter((token) => token.kind === 'string').map((token) => token.value);
        if (strings[0] && !this.name) this.name = normalizeName(strings[0]);
        if (strings[1]) this.loss(statement.line, 'workspace description dropped');
        this.walk(statement.children);
        continue;
      }
      if (lower === 'model') {
        this.walkStatements(statement.children, null, null);
        continue;
      }
      if (lower === 'views') {
        this.readViews(statement.children);
        continue;
      }
      if (lower === 'styles') {
        this.readStyles(statement);
        continue;
      }
      if (first.startsWith('!')) {
        this.readDirective(statement);
        continue;
      }
      this.walkStatements([statement], null, null);
    }
  }

  private walkStatements(statements: readonly StStatement[], parent: DraftElement | null, env: string | null): void {
    for (const statement of statements) {
      const first = statement.tokens[0]?.value ?? '';
      const lower = first.toLowerCase();
      if (first === '') continue;
      if (first.startsWith('!')) {
        this.readDirective(statement);
        continue;
      }
      if (DROP_STATEMENTS.has(lower)) {
        this.loss(statement.line, `${lower} dropped`);
        continue;
      }
      if (lower === 'properties' || lower === 'perspectives') {
        this.loss(statement.line, `${lower} dropped`);
        continue;
      }
      if (lower === 'styles') {
        this.readStyles(statement);
        continue;
      }
      if (lower === 'deploymentenvironment') {
        this.readEnvironment(statement);
        continue;
      }
      if (lower === 'group' || lower === 'deploymentgroup') {
        const name = statement.tokens.find((token) => token.kind === 'string')?.value ?? statement.tokens[1]?.value ?? '';
        this.loss(statement.line, `${lower === 'group' ? 'group' : 'deploymentGroup'} "${name}" flattened`);
        this.walkStatements(statement.children, parent, env);
        continue;
      }
      if ((lower === 'tags' || lower === 'url') && parent) {
        this.readElementStatement(statement, parent);
        continue;
      }
      const declaration = readDeclaration(statement.tokens);
      if (declaration) {
        if (env) {
          if (declaration.kind === 'instance') {
            const instance = this.declareInstance(declaration, parent, env, statement.line);
            this.walkStatements(statement.children, instance, env);
          } else if (declaration.kind === 'node') {
            const element = this.declareElement(declaration, parent, env);
            this.walkStatements(statement.children, element, env);
          } else {
            this.loss(statement.line, `${declaration.kindWord} is not valid in a deployment environment; dropped`);
          }
          continue;
        }
        if (declaration.kind === 'node' || declaration.kind === 'instance') {
          this.loss(statement.line, `${declaration.kindWord} outside a deployment environment dropped`);
          continue;
        }
        const element = this.declareElement(declaration, parent, null);
        this.walkStatements(statement.children, element, null);
        continue;
      }
      const relation = readRelation(statement.tokens);
      if (relation) {
        this.relations.push({
          from: relation.from,
          to: relation.to,
          scope: parent,
          env,
          line: statement.line,
          tags: splitTags(relation.strings[2]),
          ...(relation.strings[0] ? { label: relation.strings[0] } : {}),
          ...(relation.strings[1] ? { tech: relation.strings[1] } : {}),
        });
        if (statement.children.length > 0) {
          this.loss(statement.line, `relationship block ${relation.from ?? '->'} -> ${relation.to} flattened`);
        }
        continue;
      }
      this.loss(statement.line, `statement "${first}" dropped`);
    }
  }

  private readDirective(statement: StStatement): void {
    const keyword = statement.tokens[0]!.value.toLowerCase();
    const value = statement.tokens.slice(1).map((token) => token.value).join(' ');
    if (keyword === '!identifiers') {
      if (value.toLowerCase() === 'flat') this.loss(statement.line, 'identifiers: flat ids rewritten to paths');
      return;
    }
    if (keyword === '!impliedrelationships') {
      if (value.toLowerCase() === 'false') this.loss(statement.line, '!impliedRelationships false: implied relations are always derived');
      return;
    }
    this.loss(statement.line, `${statement.tokens[0]!.value}${value ? ` ${value}` : ''} dropped`);
  }

  private readEnvironment(statement: StStatement): void {
    const env = normalizeName(statement.tokens[1]?.kind === 'string'
      ? statement.tokens[1]!.value
      : statement.tokens.slice(1).filter((token) => token.kind === 'word').map((token) => token.value).join(' '))
      || 'Deployment';
    this.ensureEnv(env);
    this.walkStatements(statement.children, null, env);
  }

  private ensureEnv(env: string): void {
    if (this.deployment.has(env)) return;
    this.deployment.set(env, []);
    this.envOrder.push(env);
  }

  private readElementStatement(statement: StStatement, element: DraftElement): void {
    const first = statement.tokens[0]!.value.toLowerCase();
    if (first === 'tags') {
      for (const token of statement.tokens) if (token.kind === 'string') element.tags.push(...splitTags(token.value));
      return;
    }
    // `url` would map to `[link:]`, but an unquoted `://` survives canonical format as a
    // comment (`//`) and drops the declaration, so the link is reported and dropped.
    const value = statement.tokens.slice(1).map((token) => token.value).join(' ');
    this.loss(statement.line, `url ${value} dropped`);
  }

  private declareElement(declaration: Declaration, parent: DraftElement | null, env: string | null): DraftElement {
    const name = normalizeName(declaration.name) || declaration.sid || 'element';
    const element: DraftElement = {
      sid: declaration.sid ?? derivedSid(name),
      explicitSid: declaration.sid !== undefined,
      structurizrKind: declaration.kindWord,
      name,
      kind: declaration.kind,
      parent,
      children: [],
      tags: [],
      ofkId: '',
      ...(env ? { env } : {}),
    };
    const values = positional(declaration.strings, declaration.kind);
    if (values.desc) element.desc = values.desc;
    if (values.tech) element.tech = values.tech;
    for (const tag of values.tags) if (!element.tags.includes(tag)) element.tags.push(tag);
    parent?.children.push(element);
    this.elements.push(element);
    if (env) this.deployment.get(env)!.push(element);
    else this.modelElements.push(element);
    return element;
  }

  private declareInstance(declaration: Declaration, parent: DraftElement | null, env: string, line: number): DraftElement {
    const element: DraftElement = {
      sid: declaration.sid ?? `instance-${this.instances.length + 1}`,
      explicitSid: false,
      structurizrKind: declaration.kindWord,
      name: declaration.name,
      kind: 'instance',
      parent,
      children: [],
      tags: [],
      ofkId: '',
      env,
    };
    parent?.children.push(element);
    this.elements.push(element);
    this.deployment.get(env)!.push(element);
    this.instances.push({ element, ref: declaration.name, scope: parent, line });
    return element;
  }

  private readStyles(statement: StStatement): void {
    let copied = false;
    for (const child of statement.children) {
      if (child.tokens[0]?.value.toLowerCase() !== 'element') continue;
      const tag = child.tokens.find((token) => token.kind === 'string')?.value ?? child.tokens[1]?.value ?? '';
      if (!tag) continue;
      const style: ElementStyle = { tag };
      for (const property of child.children) {
        const key = property.tokens[0]?.value.toLowerCase() ?? '';
        const value = property.tokens.slice(1).map((token) => token.value).join(' ');
        if (key === 'background' && (isHexColor(value) || canonicalColorWord(value))) style.color = value.toLowerCase();
        else if (key === 'shape' && SHAPE_WORDS[value.toLowerCase()]) style.shape = SHAPE_WORDS[value.toLowerCase()];
        else if (key === 'icon' && /^[A-Za-z][\w-]*[/:][\w./-]+$/.test(value)) style.icon = value.replace(':', '/');
      }
      if (!style.shape && !style.color && !style.icon) continue;
      this.styles.push(style);
      copied = true;
    }
    this.loss(statement.line, copied
      ? 'styles: colour/shape/icon copied onto tagged elements; other style properties dropped'
      : 'styles block dropped');
  }

  private readViews(statements: readonly StStatement[]): void {
    for (const statement of statements) {
      const first = statement.tokens[0]?.value ?? '';
      const lower = first.toLowerCase();
      if (first.startsWith('!')) {
        this.readDirective(statement);
        continue;
      }
      if (lower === 'styles') {
        this.readStyles(statement);
        continue;
      }
      if (DROP_STATEMENTS.has(lower) || lower === 'properties' || lower === 'perspectives') {
        this.loss(statement.line, `${lower} dropped`);
        continue;
      }
      if (lower === 'dynamic') {
        this.readDynamic(statement);
        continue;
      }
      const kind = VIEW_BY_WORD[first] ?? VIEW_BY_WORD[lower];
      if (!kind) {
        this.loss(statement.line, `view "${first}" dropped`);
        continue;
      }
      this.readView(statement, kind);
    }
  }

  private readView(statement: StStatement, kind: DraftView['kind']): void {
    const args = statement.tokens.slice(1);
    const scopeRef = kind === 'landscape' ? undefined : args[0]?.value;
    const env = kind === 'deployment' ? args[1]?.value : undefined;
    const key = kind === 'deployment' ? args[2]?.value : args[1]?.value;
    const view: DraftView = {
      kind,
      rules: [],
      line: statement.line,
      ...(scopeRef ? { scopeRef } : {}),
      ...(env ? { env } : {}),
      ...(key ? { key } : {}),
    };
    if (kind === 'deployment' && !env) {
      this.loss(statement.line, 'deployment view needs an environment; view dropped');
      return;
    }
    if (kind === 'deployment' && env) this.ensureEnv(env);
    for (const child of statement.children) this.readViewStatement(child, view);
    this.views.push(view);
  }

  private readViewStatement(statement: StStatement, view: DraftView): void {
    const head = statement.tokens[0]?.value.toLowerCase() ?? '';
    if (head === 'include' || head === 'exclude') {
      view.rules.push(...this.readRule(head, statement));
      return;
    }
    if (head === 'autolayout') {
      const word = statement.tokens[1]?.value.toLowerCase() ?? '';
      const direction = DIRECTIONS[word];
      if (direction) view.direction = direction;
      else this.loss(statement.line, `autoLayout "${word}" dropped`);
      this.loss(statement.line, 'autoLayout separations dropped');
      return;
    }
    if (head === 'title') {
      const title = statement.tokens.find((token) => token.kind === 'string')?.value ?? '';
      this.loss(statement.line, `title "${title}" inside a view dropped`);
      return;
    }
    if (view.kind === 'deployment' && view.env) {
      const declaration = readDeclaration(statement.tokens);
      if (declaration && (declaration.kind === 'node' || declaration.kind === 'instance')) {
        this.walkStatements([statement], null, view.env);
        return;
      }
      if (head === 'group' || head === 'deploymentgroup') {
        this.walkStatements([statement], null, view.env);
        return;
      }
    }
    this.loss(statement.line, `view statement "${head}" dropped`);
  }

  private readRule(op: 'include' | 'exclude', statement: StStatement): DraftRule[] {
    const raw = statement.tokens.map((token) => token.value).join(' ');
    const body = statement.tokens.slice(1).map((token) => token.value).join(' ')
      .replace(/\s*(==|!=)\s*/g, '$1')
      .replace(/\s*->\s*/g, '->')
      .replace(/\s*&&\s*/g, ' && ')
      .replace(/\s*\|\|\s*/g, ' || ')
      .trim();
    const unsupported = (): DraftRule[] => {
      this.loss(statement.line, `view expression "${body}" has no OFK equivalent; kept verbatim`);
      return [{ op, raw }];
    };
    if (!body) return unsupported();
    const parts: RulePart[] = [];
    for (const alternative of body.split(' || ')) {
      for (const atom of alternative.split(' && ')) {
        const classified = classifyRuleAtom(atom);
        if (!classified) return unsupported();
        parts.push(...classified);
      }
    }
    if (body.includes('&&')) this.loss(statement.line, `view expression "${body}" conjunction flattened to a union`);
    return [{ op, parts }];
  }

  private readDynamic(statement: StStatement): void {
    const args = statement.tokens.slice(1);
    const flow: DraftFlow = {
      steps: [],
      line: statement.line,
      ...(args[0] ? { scopeRef: args[0].value } : {}),
      ...(args[1]?.kind === 'string' ? { name: args[1].value } : {}),
    };
    for (const child of statement.children) this.readDynamicStatement(child, flow);
    this.flows.push(flow);
  }

  private readDynamicStatement(statement: StStatement, flow: DraftFlow): void {
    const head = statement.tokens[0]?.value.toLowerCase() ?? '';
    const tokens = /^\d+\.$/.test(statement.tokens[0]?.value ?? '') ? statement.tokens.slice(1) : statement.tokens;
    const relation = readRelation(tokens);
    if (relation) {
      flow.steps.push({
        from: relation.from,
        to: relation.to,
        line: statement.line,
        tags: splitTags(relation.strings[2]),
        ...(relation.strings[0] ? { label: relation.strings[0] } : {}),
        ...(relation.strings[1] ? { tech: relation.strings[1] } : {}),
      });
      if (statement.children.length > 0) this.loss(statement.line, 'dynamic relationship block flattened');
      return;
    }
    if (statement.children.length > 0) {
      for (const child of statement.children) this.readDynamicStatement(child, flow);
      return;
    }
    this.loss(statement.line, `dynamic view statement "${head}" dropped`);
  }

  private loss(line: number, message: string): void {
    this.losses.push({ message, line });
  }

  finish(): StructurizrConversion {
    this.indexModel();
    this.resolveInstances();
    this.prune();
    this.indexModel();
    this.applyStyles();
    const relations = this.resolveRelations();
    this.resolveViews();
    const flows = this.resolveFlows();
    this.assignIds();
    const dsl = this.emit(relations, flows);
    return {
      dsl,
      losses: this.losses.map((entry) => entry.message),
      diagnostics: this.losses.map((entry): DslDiagnostic => ({
        code: 'W180',
        severity: 'warning',
        line: entry.line,
        col: 1,
        endCol: 1,
        message: entry.message,
        // ast.ts types `source` as 'parse'; importers report 'import' (grammar §10).
        source: 'import',
      } as unknown as DslDiagnostic)),
    };
  }

  private resolveInstances(): void {
    for (const entry of this.instances) {
      const target = this.resolveRef(entry.ref, entry.scope);
      if (!target || target === entry.element || target.kind === 'instance') {
        this.loss(entry.line, `containerInstance ${entry.ref} dropped: unknown element`);
        entry.element.dropped = true;
        continue;
      }
      entry.element.name = this.instanceRef(target);
    }
  }

  /** `containerInstance api` → `instance Shop.API`: one token, so the OFK parser resolves it. */
  private instanceRef(target: DraftElement): string {
    const display = this.displayPath(target);
    return display.split('.').every(isSafeWord) ? display : target.ofkId;
  }

  private prune(): void {
    const dropped = new Set(this.elements.filter((element) => element.dropped));
    if (dropped.size === 0) return;
    for (const element of this.elements) element.children = element.children.filter((child) => !dropped.has(child));
    this.elements = this.elements.filter((element) => !element.dropped);
    this.modelElements = this.modelElements.filter((element) => !element.dropped);
    for (const [env, list] of this.deployment) this.deployment.set(env, list.filter((element) => !element.dropped));
  }

  private indexModel(): void {
    this.bySid.clear();
    this.bySidLower.clear();
    this.byPath.clear();
    this.byNamePath.clear();
    this.nameCounts.clear();
    for (const element of this.elements) {
      if (!this.bySid.has(element.sid)) this.bySid.set(element.sid, element);
      const lower = element.sid.toLowerCase();
      if (!this.bySidLower.has(lower)) this.bySidLower.set(lower, element);
      this.byPath.set(this.sidPath(element), element);
      this.byNamePath.set(this.namePath(element).toLowerCase(), element);
      const name = element.name.toLowerCase();
      this.nameCounts.set(name, (this.nameCounts.get(name) ?? 0) + 1);
    }
  }

  private sidPath(element: DraftElement): string {
    const segments: string[] = [];
    for (let current: DraftElement | null = element; current; current = current.parent) segments.unshift(current.sid);
    return segments.join('.');
  }

  private namePath(element: DraftElement): string {
    const segments: string[] = [];
    for (let current: DraftElement | null = element; current; current = current.parent) segments.unshift(current.name);
    return segments.join('.');
  }

  private displayPath(element: DraftElement): string {
    const segments: string[] = [];
    for (let current: DraftElement | null = element; current; current = current.parent) segments.unshift(current.name);
    return segments.join('.');
  }

  private applyStyles(): void {
    for (const element of this.elements) {
      const builtIn = DEFAULT_TAGS[element.structurizrKind];
      for (const style of this.styles) {
        const tag = style.tag.toLowerCase();
        if (tag !== 'element' && tag !== builtIn?.toLowerCase() && !element.tags.some((entry) => entry === tag)) continue;
        if (style.shape) element.shape = style.shape;
        if (style.color) element.color = style.color;
        if (style.icon) element.icon = style.icon;
      }
    }
  }

  private resolveRef(reference: string, scope: DraftElement | null): DraftElement | null {
    const wanted = reference.trim();
    if (!wanted) return null;
    for (let current: DraftElement | null = scope; current; current = current.parent) {
      const relative = this.byPath.get(`${this.sidPath(current)}.${wanted}`);
      if (relative) return relative;
    }
    const direct = this.byPath.get(wanted) ?? this.bySid.get(wanted) ?? this.bySidLower.get(wanted.toLowerCase());
    if (direct) return direct;
    const lower = wanted.toLowerCase();
    const byNamePath = this.byNamePath.get(lower);
    if (byNamePath) return byNamePath;
    const bySlugPath = this.byPath.get(wanted.split('.').map((segment) => slugifyDslId(segment)).join('.'));
    if (bySlugPath) return bySlugPath;
    const byName = this.elements.filter((element) => element.name.toLowerCase() === lower);
    return byName.length === 1 ? byName[0]! : null;
  }

  private resolveRelations(): ResolvedRelation[] {
    const resolved: ResolvedRelation[] = [];
    for (const draft of this.relations) {
      const from = draft.from === null ? draft.scope : this.resolveRef(draft.from, draft.scope);
      const to = this.resolveRef(draft.to, draft.scope);
      if (!from || !to) {
        this.loss(draft.line, `relation ${draft.from ?? '->'} -> ${draft.to} dropped: unknown element`);
        continue;
      }
      if ((from.env ?? null) !== (to.env ?? null)) {
        this.loss(draft.line, `relation ${draft.from ?? '->'} -> ${draft.to} dropped: endpoints in different environments`);
        continue;
      }
      let tags = draft.tags;
      if (!draft.label && !draft.tech && tags.length > 0) {
        this.loss(draft.line, `relation ${from.name} -> ${to.name} tags dropped: no description to carry them`);
        tags = [];
      }
      if (!draft.label && draft.tech) {
        this.loss(draft.line, `relation ${from.name} -> ${to.name} technology shown as the label: Structurizr had no description`);
      }
      resolved.push({
        from, to, tags, env: draft.env,
        ...(draft.label ? { label: draft.label } : {}),
        ...(draft.tech ? { tech: draft.tech } : {}),
      });
    }
    return resolved;
  }

  private resolveViews(): void {
    for (const view of this.views) {
      if (view.key) this.loss(view.line, `view key "${view.key}" dropped`);
      if (view.kind === 'landscape') continue;
      const scope = view.scopeRef ? this.resolveRef(view.scopeRef, null) : null;
      if (!scope) {
        this.loss(view.line, `${view.kind} view scope ${view.scopeRef ?? '?'} unresolved; view dropped`);
        view.dropped = true;
      } else {
        view.scope = scope;
      }
    }
  }

  private resolveFlows(): Array<{ flow: DraftFlow; steps: Array<{ from: DraftElement; to: DraftElement; label?: string }> }> {
    const resolved: Array<{ flow: DraftFlow; steps: Array<{ from: DraftElement; to: DraftElement; label?: string }> }> = [];
    for (const flow of this.flows) {
      const scope = flow.scopeRef ? this.resolveRef(flow.scopeRef, null) : null;
      if (flow.scopeRef && !scope) this.loss(flow.line, `dynamic view scope ${flow.scopeRef} unresolved; steps kept without a scope`);
      flow.scope = scope ?? undefined;
      const steps: Array<{ from: DraftElement; to: DraftElement; label?: string }> = [];
      let previous: DraftElement | null = null;
      let folded = false;
      for (const step of flow.steps) {
        const from = step.from === null ? previous ?? scope : this.resolveRef(step.from, scope);
        const to = this.resolveRef(step.to, scope);
        if (!from || !to) {
          this.loss(step.line, `flow step ${step.from ?? '->'} -> ${step.to} dropped: unknown element`);
          continue;
        }
        const label = [step.label, step.tech ? `(${step.tech})` : '', step.tags.length ? `[${step.tags.join('/')}]` : '']
          .filter(Boolean).join(' ');
        if (step.tech || step.tags.length > 0) folded = true;
        steps.push({ from, to, ...(label ? { label } : {}) });
        previous = to;
      }
      if (folded) this.loss(flow.line, 'flow step technology/tags folded into the labels');
      resolved.push({ flow, steps });
    }
    return resolved;
  }

  private assignIds(): void {
    const used = new Set<string>();
    const visit = (element: DraftElement): void => {
      element.ofkId = this.uniquePath(element.parent?.ofkId ?? null, this.localId(element), used);
      for (const child of element.children) visit(child);
    };
    for (const root of this.modelElements.filter((element) => !element.parent)) visit(root);
    for (const env of this.envOrder) {
      for (const root of this.deployment.get(env)!.filter((element) => !element.parent)) visit(root);
    }
  }

  /** Structurizr ids are the OFK ids (`webApi` → `webapi`); display names stay labels. */
  private localId(element: DraftElement): string {
    if (element.kind === 'instance') return slugifyDslId(element.name);
    if (element.explicitSid) {
      const slug = slugifyDslId(element.sid);
      if (/^[A-Za-z_]/.test(slug)) return slug;
    }
    return slugifyDslId(element.name);
  }

  private uniquePath(parent: string | null, localId: string, used: Set<string>): string {
    const base = parent ? `${parent}.${localId}` : localId;
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate)) candidate = `${base}-${suffix++}`;
    used.add(candidate);
    return candidate;
  }

  private refOf(element: DraftElement): string {
    return (this.nameCounts.get(element.name.toLowerCase()) ?? 0) === 1 ? quote(element.name) : element.ofkId;
  }

  private scopeRefOf(element: DraftElement): string {
    const segments: string[] = [];
    for (let current: DraftElement | null = element; current; current = current.parent) segments.unshift(current.name);
    return segments.every(isSafeWord) ? segments.join('.') : element.ofkId;
  }

  private elementAttributes(element: DraftElement): CanonicalAttribute[] {
    const entries: CanonicalAttribute[] = [];
    if (element.shape) entries.push({ value: element.shape });
    if (element.color) entries.push({ key: 'color', value: element.color });
    if (element.icon) entries.push({ key: 'icon', value: element.icon });
    if (element.tech) entries.push({ key: 'tech', value: element.tech });
    if (element.desc) entries.push({ key: 'desc', value: element.desc });
    if (element.tags.length > 0) entries.push({ key: 'tags', value: element.tags.join(', ') });
    return sortAttributes(entries);
  }

  /** `id = kind Name`, or `kind Name` when the id is the label slug (grammar §6.2/§9.2). */
  private elementHead(element: DraftElement): string {
    const localId = element.parent ? element.ofkId.slice(element.parent.ofkId.length + 1) : element.ofkId;
    const name = quote(element.name);
    return slugifyDslId(element.name) === localId
      ? `${element.kind} ${name}`
      : `${localId} = ${element.kind} ${name}`;
  }

  private sharedScope(relation: ResolvedRelation): DraftElement | null {
    const from = relation.from.parent;
    return from && from === relation.to.parent ? from : null;
  }

  private relationText(relation: ResolvedRelation): string {
    const entries: CanonicalAttribute[] = [];
    if (relation.tech) entries.push({ key: 'tech', value: relation.tech });
    if (relation.tags.length > 0) entries.push({ key: 'tags', value: relation.tags.join(', ') });
    const label = relation.label ?? relation.tech;
    return `${this.refOf(relation.from)} -> ${this.refOf(relation.to)}${label ? ` : ${quote(label)}` : ''}${attributeText(sortAttributes(entries))}`;
  }

  private emit(relations: readonly ResolvedRelation[], flows: readonly { flow: DraftFlow; steps: Array<{ from: DraftElement; to: DraftElement; label?: string }> }[]): string {
    const lines: string[] = ['%% ofk 1', 'architecture'];
    if (this.name) lines.push(`title: ${quote(this.name)}`);
    const body: string[] = [];
    this.emitModel(body, relations);
    this.emitDeployment(body, relations);
    this.emitViews(body);
    this.emitFlows(body, flows);
    lines.push('', ...body);
    while (lines.length > 0 && lines.at(-1) === '') lines.pop();
    return `${lines.join('\n')}\n`;
  }

  private emitModel(lines: string[], relations: readonly ResolvedRelation[]): void {
    const roots = this.modelElements.filter((element) => !element.parent);
    const top = relations.filter((relation) => relation.env === null && this.sharedScope(relation) === null);
    if (roots.length === 0 && top.length === 0) return;
    lines.push('model {');
    for (const root of roots) this.emitElement(lines, root, '  ', relations);
    for (const relation of top) lines.push(`  ${this.relationText(relation)}`);
    lines.push('}');
  }

  private emitElement(lines: string[], element: DraftElement, indent: string, relations: readonly ResolvedRelation[]): void {
    const head = `${this.elementHead(element)}${attributeText(this.elementAttributes(element))}`;
    const scoped = relations.filter((relation) => this.sharedScope(relation) === element);
    if (element.children.length === 0 && scoped.length === 0) {
      lines.push(`${indent}${head}`);
      return;
    }
    lines.push(`${indent}${head} {`);
    for (const child of element.children) this.emitElement(lines, child, `${indent}  `, relations);
    for (const relation of scoped) lines.push(`${indent}  ${this.relationText(relation)}`);
    lines.push(`${indent}}`);
  }

  private emitDeployment(lines: string[], relations: readonly ResolvedRelation[]): void {
    for (const env of this.envOrder) {
      const elements = this.deployment.get(env) ?? [];
      const roots = elements.filter((element) => !element.parent);
      const top = relations.filter((relation) => relation.env === env && this.sharedScope(relation) === null);
      if (roots.length === 0 && top.length === 0) continue;
      lines.push(`deployment ${quote(env)} {`);
      for (const root of roots) this.emitElement(lines, root, '  ', relations);
      for (const relation of top) lines.push(`  ${this.relationText(relation)}`);
      lines.push('}');
    }
  }

  private emitViews(lines: string[]): void {
    const views = this.views.filter((view) => !view.dropped);
    if (views.length === 0) return;
    lines.push('views {');
    for (const view of views) {
      const head = this.viewHead(view);
      if (view.rules.length === 0) {
        lines.push(`  ${head}`);
        continue;
      }
      lines.push(`  ${head} {`);
      for (const rule of view.rules) for (const line of this.ruleLines(rule)) lines.push(`    ${line}`);
      lines.push('  }');
    }
    lines.push('}');
  }

  private viewHead(view: DraftView): string {
    // ponytail: direction rides the header as a bare trailing word — `[right]` after
    // `of X` corrupts the scope ref in parseView today; move it into brackets once
    // parseView skips bracket tokens when reading `of`.
    const direction = view.direction ? ` ${view.direction}` : '';
    switch (view.kind) {
      case 'landscape':
        return `view landscape${direction}`;
      case 'context':
        return `view context of ${this.scopeRefOf(view.scope!)}${direction}`;
      case 'container':
        return `view container of ${this.scopeRefOf(view.scope!)}${direction}`;
      case 'component':
        return `view component of ${this.scopeRefOf(view.scope!)}${direction}`;
      case 'deployment':
        return `view deployment of ${this.scopeRefOf(view.scope!)} in ${quote(view.env ?? '')}${direction}`;
    }
  }

  private ruleLines(rule: DraftRule): string[] {
    if (rule.raw !== undefined) return [rule.raw];
    return (rule.parts ?? []).flatMap((part): string[] => {
      switch (part.kind) {
        case 'all':
          return [`${rule.op} *`];
        case 'ref':
          return [`${rule.op} ${this.ruleRef(part.ref)}`];
        case 'successors':
          return [`${rule.op} ${this.ruleRef(part.ref)} ->`];
        case 'predecessors':
          return [`${rule.op} -> ${this.ruleRef(part.ref)}`];
        case 'pair':
          return [`${rule.op} ${this.ruleRef(part.from)} -> ${this.ruleRef(part.to)}`];
        case 'where-kind':
          return [`${rule.op} * where kind is ${part.value}`];
        case 'where-tag':
          return [`${rule.op} * where tag is @${part.value}`];
      }
    });
  }

  private ruleRef(reference: string): string {
    const element = this.resolveRef(reference, null);
    return element ? this.refOf(element) : reference;
  }

  private emitFlows(
    lines: string[],
    flows: readonly { flow: DraftFlow; steps: Array<{ from: DraftElement; to: DraftElement; label?: string }> }[],
  ): void {
    for (const { flow, steps } of flows) {
      const name = flow.name ?? (flow.scope ? flow.scope.name : 'Dynamic view');
      if (steps.length === 0) {
        lines.push(`flow ${quoted(name)}`);
        continue;
      }
      lines.push(`flow ${quoted(name)} {`);
      for (const step of steps) {
        lines.push(`  step ${this.refOf(step.from)} -> ${this.refOf(step.to)}${step.label ? ` : ${quote(step.label)}` : ''}`);
      }
      lines.push('}');
    }
  }
}

function classifyRuleAtom(atom: string): RulePart[] | null {
  const text = atom.trim();
  if (!text) return null;
  if (text === '*') return [{ kind: 'all' }];
  const type = /^element\.type==(.+)$/i.exec(text);
  if (type) {
    const kind = STRUCTURIZR_TYPES[type[1]!.trim().toLowerCase()];
    return kind ? [{ kind: 'where-kind', value: kind }] : null;
  }
  const tag = /^element\.tag==(.+)$/i.exec(text);
  if (tag) {
    const value = tag[1]!.trim().replace(/^["']|["']$/g, '').replace(/^@/, '').toLowerCase();
    return value ? [{ kind: 'where-tag', value }] : null;
  }
  const pair = /^->(.+)->$/.exec(text);
  if (pair) return [
    { kind: 'predecessors', ref: pair[1]!.trim() },
    { kind: 'successors', ref: pair[1]!.trim() },
  ];
  const incoming = /^->(.+)$/.exec(text);
  if (incoming) return [{ kind: 'predecessors', ref: incoming[1]!.trim() }];
  const outgoing = /^(.+)->$/.exec(text);
  if (outgoing) return [{ kind: 'successors', ref: outgoing[1]!.trim() }];
  const relation = /^(.+)->(.+)$/.exec(text);
  if (relation && relation[1]!.trim() !== '*' && relation[2]!.trim() !== '*') {
    return [{ kind: 'pair', from: relation[1]!.trim(), to: relation[2]!.trim() }];
  }
  if (/[=!()]/.test(text)) return null;
  const refs = text.split(/\s+/).filter(Boolean);
  return refs.length > 0 ? refs.map((ref) => (ref === '*' ? { kind: 'all' as const } : { kind: 'ref' as const, ref })) : null;
}

/** True when the text starts a Structurizr workspace (used for the paste banner). */
export function looksLikeStructurizr(text: string): boolean {
  if (/^\s*%%\s*ofk\b/m.test(text)) return false;
  const stripped = text.replace(/^\s*#[^\n]*$/gm, '').replace(/\/\/[^\n]*/g, '');
  const first = stripped.split('\n').map((line) => line.trim()).find(Boolean);
  if (first && OFK_FAMILY_HEADER.test(first)) return false;
  if (/^\s*workspace\b[^{\n]*\{/m.test(stripped)) return true;
  if (!/^\s*model\b[^{}\n]*\{/m.test(stripped)) return false;
  return STRUCTURIZR_KEYWORDS.test(stripped);
}

/** Structurizr DSL → OFK DSL, or an error explaining why it cannot be converted. */
export function structurizrToDsl(text: string): StructurizrConversion | StructurizrConversionError {
  const roots = readStatements(text);
  const headed = roots.some((statement) => ['workspace', 'model'].includes(statement.tokens[0]?.value ?? ''));
  if (!headed) return { error: 'No Structurizr workspace or model block found' };
  const converter = new StructurizrConverter();
  converter.walk(roots);
  return converter.finish();
}
