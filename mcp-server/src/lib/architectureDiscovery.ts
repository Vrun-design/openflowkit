import { stat as statPath } from 'node:fs/promises';
import path from 'node:path';
import { archModelFromJson, architectureWorkspaceText } from './agent.js';
import {
  LANGUAGE_BY_EXT, SERVICE_RULES, isScannedFileName, walkProjectFiles,
  type ScannedFile,
} from './codebaseScanner.js';

/**
 * Deterministic architecture discovery: walk a repo (the analyzer's skip list),
 * read the manifests a deployable unit leaves behind — compose, Dockerfiles,
 * k8s, terraform, package manifests — plus the datastore/queue/HTTP clients the
 * scanner already knows, and propose a C4 workspace. Every finding carries at
 * most two evidence lines, so a human can check the claim. No network, no
 * dependencies beyond Node.
 */

export interface DiscoveryEvidence {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

export type DiscoveredUnitKind = 'system' | 'container' | 'store' | 'queue' | 'external';

export interface DiscoveredUnit {
  readonly id: string;
  readonly name: string;
  readonly kind: DiscoveredUnitKind;
  readonly tech?: string;
  readonly evidence: readonly DiscoveryEvidence[];
  readonly dir: string;
}

export interface DiscoveredRelation {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly evidence: readonly DiscoveryEvidence[];
}

export interface ArchitectureDiscovery {
  readonly units: readonly DiscoveredUnit[];
  readonly relations: readonly DiscoveredRelation[];
  readonly languages: Readonly<Record<string, number>>;
  readonly evidenceCount: number;
}

export interface DiscoveryOptions {
  readonly maxFiles?: number;
}

/** Findings carry at most this many evidence lines (grammar of the report). */
const MAX_EVIDENCE = 2;

/* ------------------------------------------------------------------ files */

const DOCKERFILE = /^(?:Dockerfile(?:\.[A-Za-z0-9_-]+)?|[A-Za-z0-9_-]+\.dockerfile)$/i;
const COMPOSE = /^(?:docker-compose|compose)\.ya?ml$/i;
const LOOSE_MANIFESTS = new Set(['go.mod', 'requirements.txt', 'pom.xml']);
/** Lock files list every transitive dependency: pure noise for discovery. */
const LOCKFILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'npm-shrinkwrap.json',
  'poetry.lock', 'Pipfile.lock', 'Cargo.lock', 'composer.lock', 'go.sum', 'Gemfile.lock',
]);

/** The analyzer's filter, widened for the files that define a deployable unit. */
export function acceptsArchitectureFile(name: string): boolean {
  if (LOCKFILES.has(name)) return false;
  return isScannedFileName(name) || DOCKERFILE.test(name) || COMPOSE.test(name) || LOOSE_MANIFESTS.has(name);
}

/* ----------------------------------------------------------------- drafts */

interface UnitDraft {
  id: string;
  name: string;
  kind: DiscoveredUnitKind;
  dir: string;
  tech?: string;
  /** Published container image, for k8s/compose matching. */
  image?: string;
  /** Declared package/module name, for import matching. */
  packageName?: string;
  evidence: DiscoveryEvidence[];
  order: number;
}

interface RelationDraft {
  from: string;
  toRef: { id?: string; name?: string; image?: string };
  label?: string;
  evidence: DiscoveryEvidence[];
  order: number;
}

interface TargetRef {
  id?: string;
  name?: string;
  image?: string;
}

const KIND_RANK: Readonly<Record<DiscoveredUnitKind, number>> = {
  system: 0, container: 1, store: 2, queue: 3, external: 4,
};

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function scalar(value: string): string {
  return value.replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '');
}

function pushEvidence(target: { evidence: DiscoveryEvidence[] }, file: string, line: number, text: string): void {
  if (target.evidence.length >= MAX_EVIDENCE) return;
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return;
  if (target.evidence.some((entry) => entry.file === file && entry.line === line)) return;
  target.evidence.push({ file, line, text: trimmed.slice(0, 240) });
}

export function slugDiscoveryId(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unit';
}

function dirPrefix(dir: string): string {
  return dir.split('/').filter(Boolean).map(slugDiscoveryId).join('.');
}

/** Dotted slug path: `services/api` + `api` → `services.api`. */
function unitId(dir: string, name: string): string {
  const prefix = dirPrefix(dir);
  const local = slugDiscoveryId(name);
  if (!prefix) return local;
  if (prefix === local || prefix.endsWith(`.${local}`)) return prefix;
  return `${prefix}.${local}`;
}

function firstSegment(dir: string): string {
  return dir.split('/')[0] ?? '';
}

function imageBase(image: string): string {
  const withoutTag = image.split('@')[0]!.split(':')[0]!;
  return withoutTag.split('/').pop() ?? withoutTag;
}

function normalizeName(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/* ------------------------------------------------------------- discovery */

/** Deployables and data units can absorb a same-named unit; externals stay distinct. */
function kindGroup(kind: DiscoveredUnitKind): string {
  if (kind === 'container' || kind === 'system') return 'app';
  if (kind === 'store' || kind === 'queue') return 'data';
  return 'other';
}

class Builder {
  private readonly units = new Map<string, UnitDraft>();
  private readonly relations: RelationDraft[] = [];
  private readonly manifestIds = new Map<string, string>();
  private readonly nameIds = new Map<string, string>();
  private counter = 0;
  private relationCounter = 0;

  /**
   * A manifest is the unit of its directory: `Dockerfile` + `package.json` in
   * one folder describe one deployable, even when their names differ. Package
   * metadata beats a Dockerfile's base image for name and tech.
   */
  manifest(input: {
    id: string; name: string; kind: DiscoveredUnitKind; dir: string;
    tech?: string; image?: string; packageName?: string;
  }): UnitDraft {
    const existingId = this.manifestIds.get(input.dir);
    const existing = existingId ? this.units.get(existingId) : undefined;
    if (!existing) {
      const draft = this.unit(input);
      this.manifestIds.set(input.dir, draft.id);
      return draft;
    }
    if (input.packageName) {
      existing.name = input.name;
      existing.packageName = input.packageName;
      if (input.tech) existing.tech = input.tech;
    } else if (!existing.tech && input.tech) {
      existing.tech = input.tech;
    }
    if (!existing.image && input.image) existing.image = input.image;
    return existing;
  }

  unit(input: {
    id: string; name: string; kind: DiscoveredUnitKind; dir: string;
    tech?: string; image?: string; packageName?: string;
  }): UnitDraft {
    const nameKey = `${kindGroup(input.kind)}:${normalizeName(input.name)}`;
    const nameMatchId = this.nameIds.get(nameKey);
    if (nameMatchId && nameMatchId !== input.id) {
      const match = this.units.get(nameMatchId);
      if (match) {
        // The compose service `api` and the manifest in `services/api` are one
        // deployable: keep the directory with real files for import ownership.
        if (input.dir.length > match.dir.length) match.dir = input.dir;
        if (!match.tech && input.tech) match.tech = input.tech;
        if (!match.image && input.image) match.image = input.image;
        if (!match.packageName && input.packageName) match.packageName = input.packageName;
        if (KIND_RANK[input.kind] < KIND_RANK[match.kind]) match.kind = input.kind;
        return match;
      }
    }
    const existing = this.units.get(input.id);
    if (existing) {
      // A compose service at the repo root and its package in `web/` are one
      // unit: the directory with real files wins, so imports get an owner.
      if (input.dir.length > existing.dir.length) existing.dir = input.dir;
      if (!existing.tech && input.tech) existing.tech = input.tech;
      if (!existing.image && input.image) existing.image = input.image;
      if (!existing.packageName && input.packageName) existing.packageName = input.packageName;
      if (KIND_RANK[input.kind] < KIND_RANK[existing.kind]) existing.kind = input.kind;
      return existing;
    }
    const draft: UnitDraft = { ...input, evidence: [], order: this.counter++ };
    this.units.set(draft.id, draft);
    this.nameIds.set(nameKey, draft.id);
    return draft;
  }

  relation(from: string, to: TargetRef, label: string | undefined, file: string, line: number, text: string): void {
    let draft = this.relations.find((entry) =>
      entry.from === from && entry.label === label
      && entry.toRef.id === to.id && entry.toRef.name === to.name && entry.toRef.image === to.image);
    if (!draft) {
      draft = { from, toRef: to, ...(label ? { label } : {}), evidence: [], order: this.relationCounter++ };
      this.relations.push(draft);
    }
    pushEvidence(draft, file, line, text);
  }

  all(): readonly UnitDraft[] {
    return [...this.units.values()].sort((a, b) => a.order - b.order);
  }

  resolve(ref: TargetRef, excludeId: string): UnitDraft | undefined {
    if (ref.id) {
      const byId = this.units.get(ref.id);
      if (byId) return byId;
    }
    const wanted = ref.name ? normalizeName(ref.name) : '';
    const wantedImage = ref.image ? imageBase(ref.image) : '';
    for (const unit of this.all()) {
      if (unit.id === excludeId) continue;
      if (wanted && normalizeName(unit.name) === wanted) return unit;
      if (wantedImage && unit.image && imageBase(unit.image) === wantedImage) return unit;
      if (wantedImage && normalizeName(unit.name) === normalizeName(wantedImage)) return unit;
    }
    return undefined;
  }

  finish(rootFiles: readonly ScannedFile[]): ArchitectureDiscovery {
    const units = this.all();
    const resolved: DiscoveredRelation[] = [];
    for (const draft of this.relations.sort((a, b) => a.order - b.order)) {
      const target = this.resolve(draft.toRef, draft.from);
      if (!target || target.id === draft.from) continue;
      resolved.push({
        from: draft.from,
        to: target.id,
        ...(draft.label ? { label: draft.label } : {}),
        evidence: draft.evidence,
      });
    }
    const languages: Record<string, number> = {};
    for (const file of rootFiles) {
      const language = LANGUAGE_BY_EXT[path.extname(file.path).toLowerCase()];
      if (language) languages[language] = (languages[language] ?? 0) + 1;
    }
    return {
      units: units.map((unit) => ({
        id: unit.id, name: unit.name, kind: unit.kind, dir: unit.dir,
        ...(unit.tech ? { tech: unit.tech } : {}),
        evidence: unit.evidence,
      })),
      relations: resolved,
      languages,
      evidenceCount: units.reduce((total, unit) => total + unit.evidence.length, 0)
        + resolved.reduce((total, relation) => total + relation.evidence.length, 0),
    };
  }
}

/* ----------------------------------------------------------- compose etc. */

interface ComposeService {
  name: string;
  line: number;
  text: string;
  image?: string;
  dependsOn: Array<{ name: string; line: number; text: string }>;
}

function parseComposeServices(content: string): ComposeService[] {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => /^services:\s*(?:#.*)?$/.test(line));
  if (start === -1) return [];
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) { end = index; break; }
  }
  const block = lines.slice(start + 1, end);
  const keyIndents = block
    .filter((line) => /^\s*[A-Za-z0-9._-]+:/.test(line) && !/^\s*-/.test(line))
    .map((line) => indentOf(line));
  if (keyIndents.length === 0) return [];
  const serviceIndent = Math.min(...keyIndents);

  const services: ComposeService[] = [];
  let current: ComposeService | null = null;
  let dependsIndent = -1;
  block.forEach((raw, index) => {
    const line = start + 2 + index;
    if (raw.trim() === '' || raw.trimStart().startsWith('#')) return;
    const indent = indentOf(raw);
    const text = raw.trim();
    const key = /^([A-Za-z0-9._-]+):(?:\s*(.*))?$/.exec(text);
    if (indent === serviceIndent && key) {
      current = { name: key[1]!, line, text, dependsOn: [] };
      services.push(current);
      dependsIndent = -1;
      return;
    }
    if (!current) return;
    if (dependsIndent !== -1 && indent <= dependsIndent) dependsIndent = -1;
    if (key && indent > serviceIndent) {
      const [, keyName, rawValue] = key;
      if (keyName === 'image') current.image = scalar(rawValue ?? '');
      if (keyName === 'depends_on') dependsIndent = indent;
      else if (dependsIndent !== -1 && indent > dependsIndent && !rawValue) {
        current.dependsOn.push({ name: keyName!, line, text });
      }
      return;
    }
    if (dependsIndent !== -1 && indent > dependsIndent) {
      const item = /^-\s*(.+)$/.exec(text);
      if (item) current.dependsOn.push({ name: scalar(item[1]!), line, text });
    }
  });
  return services;
}

interface K8sWorkload {
  kind: string;
  name: string;
  images: Array<{ image: string; line: number; text: string }>;
  kindLine: number;
  nameLine: number;
}

function parseK8sWorkloads(content: string): K8sWorkload[] {
  const lines = content.split(/\r?\n/);
  const workloads: K8sWorkload[] = [];
  let current: K8sWorkload | null = null;
  let inMetadata = false;
  const flush = () => {
    if (current?.name) workloads.push(current);
    current = null;
    inMetadata = false;
  };
  lines.forEach((raw, index) => {
    const line = index + 1;
    if (/^---\s*$/.test(raw)) { flush(); return; }
    const kind = /^kind:\s*([A-Za-z]+)\s*$/.exec(raw);
    if (kind) {
      flush();
      if (/^(?:Deployment|StatefulSet|CronJob|DaemonSet)$/.test(kind[1]!)) {
        current = { kind: kind[1]!, name: '', images: [], kindLine: line, nameLine: line };
      }
      return;
    }
    if (!current) return;
    if (/^metadata:\s*$/.test(raw)) { inMetadata = true; return; }
    if (/^spec:\s*$/.test(raw)) { inMetadata = false; return; }
    const name = /^\s+name:\s*(.+)$/.exec(raw);
    if (name && inMetadata && !current.name) {
      current.name = scalar(name[1]!);
      current.nameLine = line;
      return;
    }
    const image = /^\s+image:\s*(.+)$/.exec(raw);
    if (image) current.images.push({ image: scalar(image[1]!), line, text: raw.trim() });
  });
  flush();
  return workloads;
}

const TERRAFORM_RESOURCE = /^\s*resource\s+"(aws_[a-z0-9_]+)"\s+"([A-Za-z0-9_-]+)"/;
const TERRAFORM_STORES = /^(?:aws_db_instance|aws_rds_cluster|aws_dynamodb_table|aws_elasticache_cluster|aws_elasticache_replication_group|aws_redshift_cluster|aws_efs_file_system|aws_s3_bucket)$/;
const TERRAFORM_QUEUES = /^(?:aws_sqs_queue|aws_sns_topic|aws_kinesis_stream)$/;
const TERRAFORM_COMPUTE = /^(?:aws_lambda_function|aws_ecs_service|aws_ecs_cluster|aws_ecs_task_definition|aws_api_gateway_rest_api|aws_apprunner_service)$/;

function terraformKind(type: string): DiscoveredUnitKind {
  if (TERRAFORM_STORES.test(type)) return 'store';
  if (TERRAFORM_QUEUES.test(type)) return 'queue';
  if (TERRAFORM_COMPUTE.test(type)) return 'container';
  return 'external';
}

const NODE_FRAMEWORKS: ReadonlyArray<readonly [string, string]> = [
  ['next', 'Next.js'], ['@nestjs/core', 'NestJS'], ['express', 'Express'],
  ['fastify', 'Fastify'], ['koa', 'Koa'], ['hono', 'Hono'],
  ['react', 'React'], ['vue', 'Vue'], ['svelte', 'Svelte'], ['@angular/core', 'Angular'],
];

const PYTHON_FRAMEWORKS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\s*fastapi\b/m, 'FastAPI'], [/^\s*django\b/m, 'Django'], [/^\s*flask\b/m, 'Flask'],
  [/^\s*celery\b/m, 'Celery'], [/^\s*starlette\b/m, 'Starlette'],
];

const GO_FRAMEWORKS: ReadonlyArray<readonly [RegExp, string]> = [
  [/gin-gonic\/gin/, 'Gin'], [/labstack\/echo/, 'Echo'], [/gofiber\/fiber/, 'Fiber'],
  [/google\.golang\.org\/grpc/, 'gRPC'],
];

function nodeTech(dependencies: Record<string, unknown>, hasBin: boolean): string {
  for (const [dependency, framework] of NODE_FRAMEWORKS) {
    if (dependency in dependencies) return framework;
  }
  return hasBin ? 'Node CLI' : 'Node';
}

function pythonTech(content: string): string {
  for (const [pattern, framework] of PYTHON_FRAMEWORKS) {
    if (pattern.test(content)) return framework;
  }
  return 'Python';
}

function goTech(content: string): string {
  for (const [pattern, framework] of GO_FRAMEWORKS) {
    if (pattern.test(content)) return framework;
  }
  return 'Go';
}

/* ---------------------------------------------------------------- imports */

const SCRIPT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte']);

interface ImportFact {
  specifier: string;
  line: number;
  text: string;
}

/** `dependencies`/`devDependencies` keys of a package manifest are edges too. */
function manifestDependencyFacts(file: ScannedFile): ImportFact[] {
  const facts: ImportFact[] = [];
  let inDeps = false;
  let depth = 0;
  file.content.split(/\r?\n/).forEach((raw, index) => {
    const marker = /"(?:dev|peer|optional)?[Dd]ependencies"\s*:/.exec(raw);
    if (!inDeps && marker) {
      inDeps = true;
      depth = 0;
      // Single-line manifests carry every dependency on the marker line.
      const tail = raw.slice(marker.index + marker[0].length);
      for (const match of tail.matchAll(/"([^"]+)"\s*:/g)) {
        facts.push({ specifier: match[1]!, line: index + 1, text: raw.trim() });
      }
      depth += (tail.match(/\{/g)?.length ?? 0) - (tail.match(/\}/g)?.length ?? 0);
      if (depth <= 0) inDeps = false;
      return;
    }
    if (!inDeps) return;
    depth += (raw.match(/\{/g)?.length ?? 0) - (raw.match(/\}/g)?.length ?? 0);
    const key = /^\s*"([^"]+)"\s*:/.exec(raw)?.[1];
    if (key) facts.push({ specifier: key, line: index + 1, text: raw.trim() });
    if (depth <= 0 && raw.includes('}') && !key) inDeps = false;
  });
  return facts;
}

function importFacts(file: ScannedFile): ImportFact[] {
  const ext = path.extname(file.path).toLowerCase();
  const facts: ImportFact[] = [];
  if (ext === '.json' && /(^|\/)package\.json$/.test(file.path)) facts.push(...manifestDependencyFacts(file));
  file.content.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    let specifier: string | undefined;
    if (SCRIPT_EXT.has(ext)) {
      specifier = /(?:from\s+|require\(\s*)['"]([^'"]+)['"]/.exec(raw)?.[1]
        ?? /^\s*import\s+['"]([^'"]+)['"]/.exec(raw)?.[1];
    } else if (ext === '.py') {
      specifier = /^\s*(?:from|import)\s+([A-Za-z0-9_.]+)/.exec(raw)?.[1];
    } else if (ext === '.go') {
      specifier = /^\s*(?:[A-Za-z_][A-Za-z0-9_]*\s+)?"([^"]+)"\s*$/.exec(raw)?.[1]
        ?? /^import\s+"([^"]+)"/.exec(raw)?.[1];
    } else if (ext === '.rb') {
      specifier = /^\s*require(?:_relative)?\s+['"]([^'"]+)['"]/.exec(raw)?.[1];
    } else if (ext === '.java' || ext === '.kt' || ext === '.scala') {
      specifier = /^\s*import\s+([A-Za-z0-9_.]+)/.exec(raw)?.[1];
    }
    if (specifier) facts.push({ specifier, line, text: raw.trim() });
  });
  return facts;
}

interface SdkService { pattern: RegExp; name: string }

const SDK_SERVICES: ReadonlyArray<SdkService> = [
  { pattern: /^(?:@aws-sdk\/|aws-sdk$|boto3$|botocore$)/, name: 'AWS' },
  { pattern: /^(?:@google-cloud\/|google\.cloud|google-cloud-)/, name: 'Google Cloud' },
  { pattern: /^(?:@azure\/|azure-|msrestazure)/, name: 'Azure' },
  { pattern: /^stripe$/, name: 'Stripe' },
  { pattern: /^@slack\//, name: 'Slack' },
  { pattern: /^openai$/, name: 'OpenAI' },
  { pattern: /^@anthropic-ai\/sdk$/, name: 'Anthropic' },
  { pattern: /^twilio$/, name: 'Twilio' },
  { pattern: /^@sendgrid\//, name: 'SendGrid' },
  { pattern: /^(?:firebase|firebase-admin)$/, name: 'Firebase' },
  { pattern: /^@supabase\//, name: 'Supabase' },
  { pattern: /^@sentry\//, name: 'Sentry' },
  { pattern: /^google\.golang\.org\/grpc$/, name: 'gRPC' },
  { pattern: /^(?:grpc|grpcio)$/, name: 'gRPC' },
];

const CLIENT_CALL = /\b(?:fetch|axios|got|superagent|requests\.|httpx|aiohttp|urllib|http\.Get|http\.NewRequest)\b/;
const URL_LITERAL = /https?:\/\/(?:[^/@\s]*@)?([A-Za-z0-9.-]+)/;

/** Hosts that are never architecture: local dev, docs, schemas. */
const SKIP_HOSTS = new Set([
  'localhost', '127.0.0.1', '0.0.0.0', 'example.com', 'www.example.com',
  'github.com', 'raw.githubusercontent.com', 'schema.org', 'www.w3.org', 'w3.org',
  'json-schema.org', 'opensource.org', 'npmjs.com', 'www.npmjs.com', 'pypi.org',
]);

function skipHost(host: string): boolean {
  const lower = host.toLowerCase().replace(/^www\./, '');
  return SKIP_HOSTS.has(lower) || lower.endsWith('.local') || lower.endsWith('.example')
    || lower === 'example.org' || lower === 'example.net' || lower.startsWith('docs.')
    || lower.endsWith('.readthedocs.io') || /^\d+\.\d+\.\d+\.\d+$/.test(lower);
}

function packageTarget(index: ReadonlyMap<string, UnitDraft>, specifier: string): UnitDraft | undefined {
  if (specifier.startsWith('.')) return undefined;
  const parts = specifier.split('/');
  const candidates = specifier.startsWith('@')
    ? [`${parts[0]}/${parts[1] ?? ''}`, specifier]
    : [parts[0]!, specifier];
  for (const candidate of candidates) {
    const hit = index.get(candidate);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * The unit whose directory owns a file. Deepest directory wins; a root-level
 * unit only owns root files, and only when it is unambiguous (several root
 * manifests — a compose file's services, say — own nothing).
 */
function ownerOf(units: readonly UnitDraft[], file: string): UnitDraft | undefined {
  const dir = path.posix.dirname(file);
  let best: UnitDraft | undefined;
  const roots: UnitDraft[] = [];
  for (const unit of units) {
    if (unit.kind !== 'container' && unit.kind !== 'system') continue;
    if (unit.dir === '') {
      if (!file.includes('/')) roots.push(unit);
      continue;
    }
    if (dir !== unit.dir && !dir.startsWith(`${unit.dir}/`)) continue;
    if (!best || unit.dir.length > best.dir.length) best = unit;
  }
  return best ?? (roots.length === 1 ? roots[0] : undefined);
}

/* --------------------------------------------------------------- scanning */

export async function runArchitectureDiscovery(
  rootPath: string,
  options: DiscoveryOptions = {},
): Promise<ArchitectureDiscovery> {
  const resolved = path.resolve(rootPath);
  const stat = await statPath(resolved).catch(() => null);
  if (!stat?.isDirectory()) throw new Error(`"${rootPath}" is not a directory.`);

  const { files } = await walkProjectFiles(resolved, options.maxFiles ?? 2000, acceptsArchitectureFile);
  // Evidence paths are POSIX in the DSL and in the report, whatever the host.
  const ordered = files
    .map((file) => ({ path: file.path.split(path.sep).join('/'), content: file.content }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const builder = new Builder();

  for (const file of ordered) {
    const base = path.posix.basename(file.path);
    const dir = path.posix.dirname(file.path) === '.' ? '' : path.posix.dirname(file.path);
    const lines = file.content.split(/\r?\n/);

    if (COMPOSE.test(base)) {
      for (const service of parseComposeServices(file.content)) {
        const image = service.image ? imageBase(service.image) : undefined;
        const draft = builder.unit({
          id: unitId(dir, service.name), name: service.name, kind: 'container', dir,
          ...(image ? { image: service.image!, tech: image } : {}),
        });
        pushEvidence(draft, file.path, service.line, service.text);
        for (const dependency of service.dependsOn) {
          builder.relation(draft.id, { id: unitId(dir, dependency.name), name: dependency.name }, 'depends on', file.path, dependency.line, dependency.text);
        }
      }
    }

    if (DOCKERFILE.test(base)) {
      const from = lines.find((line) => /^\s*FROM\s+/i.test(line));
      const name = dir ? path.posix.basename(dir) : path.posix.basename(resolved);
      const baseImage = from ? scalar(from.replace(/^\s*FROM\s+/i, '').split(/\s+/)[0] ?? '') : undefined;
      const draft = builder.manifest({
        id: unitId(dir, name), name, kind: 'container', dir,
        ...(baseImage && baseImage !== 'scratch' ? { tech: imageBase(baseImage) } : {}),
      });
      const fromLine = lines.findIndex((line) => /^\s*FROM\s+/i.test(line));
      if (fromLine >= 0) pushEvidence(draft, file.path, fromLine + 1, lines[fromLine]!);
      const exposeLine = lines.findIndex((line) => /^\s*EXPOSE\s+/i.test(line));
      if (exposeLine >= 0) pushEvidence(draft, file.path, exposeLine + 1, lines[exposeLine]!);
    }

    if ((base.endsWith('.yml') || base.endsWith('.yaml')) && /\bkind:\s*(?:Deployment|StatefulSet|CronJob|DaemonSet)\b/.test(file.content)) {
      for (const workload of parseK8sWorkloads(file.content)) {
        const draft = builder.unit({
          id: unitId(dir, workload.name), name: workload.name, kind: 'container', dir,
        });
        pushEvidence(draft, file.path, workload.kindLine, `kind: ${workload.kind}`);
        pushEvidence(draft, file.path, workload.nameLine, `metadata.name: ${workload.name}`);
        for (const image of workload.images) {
          pushEvidence(draft, file.path, image.line, image.text);
          builder.relation(draft.id, { image: image.image }, 'deploys', file.path, image.line, image.text);
        }
      }
    }

    if (base.endsWith('.tf')) {
      lines.forEach((line, index) => {
        const match = TERRAFORM_RESOURCE.exec(line);
        if (!match) return;
        const [, type, resource] = match;
        const draft = builder.unit({
          id: unitId(dir, resource!), name: resource!, kind: terraformKind(type!), dir, tech: type!,
        });
        pushEvidence(draft, file.path, index + 1, line);
      });
    }

    if (base === 'package.json') {
      const parsed = parseJsonObject(file.content);
      if (parsed) {
        const name = typeof parsed.name === 'string' ? parsed.name.split('/').pop()! : (dir ? path.posix.basename(dir) : path.posix.basename(resolved));
        const dependencies = {
          ...(isRecord(parsed.dependencies) ? parsed.dependencies : {}),
          ...(isRecord(parsed.devDependencies) ? parsed.devDependencies : {}),
        };
        const hasBin = typeof parsed.bin === 'string' || isRecord(parsed.bin);
        const draft = builder.manifest({
          id: unitId(dir, name), name, kind: 'container', dir,
          tech: nodeTech(dependencies, hasBin),
          ...(typeof parsed.name === 'string' ? { packageName: parsed.name } : {}),
        });
        pushEvidence(draft, file.path, 1, `package.json: ${typeof parsed.name === 'string' ? parsed.name : name}`);
      }
    }

    if (base === 'pyproject.toml' || base === 'requirements.txt') {
      const name = base === 'pyproject.toml'
        ? (/^\s*name\s*=\s*"([^"]+)"/m.exec(file.content)?.[1] ?? (dir ? path.posix.basename(dir) : path.posix.basename(resolved)))
        : (dir ? path.posix.basename(dir) : path.posix.basename(resolved));
      const draft = builder.manifest({
        id: unitId(dir, name), name, kind: 'container', dir,
        tech: pythonTech(file.content),
        ...(base === 'pyproject.toml' ? { packageName: name } : {}),
      });
      pushEvidence(draft, file.path, 1, `${base}: ${name}`);
    }

    if (base === 'go.mod') {
      const module = /^module\s+(\S+)/m.exec(file.content)?.[1];
      const name = module?.split('/').pop() ?? (dir ? path.posix.basename(dir) : path.posix.basename(resolved));
      const draft = builder.manifest({
        id: unitId(dir, name), name, kind: 'container', dir,
        tech: goTech(file.content),
        ...(module ? { packageName: module } : {}),
      });
      const moduleLine = lines.findIndex((line) => /^module\s+/.test(line));
      pushEvidence(draft, file.path, moduleLine >= 0 ? moduleLine + 1 : 1, moduleLine >= 0 ? lines[moduleLine]! : `go.mod: ${name}`);
    }
  }

  scanServiceRules(ordered, builder);

  const all = builder.all();
  const packageIndex = new Map<string, UnitDraft>();
  for (const unit of all) {
    if (!unit.packageName) continue;
    packageIndex.set(unit.packageName, unit);
    const short = unit.packageName.split('/').pop();
    if (short && !packageIndex.has(short)) packageIndex.set(short, unit);
  }

  for (const file of ordered) {
    const owner = ownerOf(all, file.path);
    for (const fact of importFacts(file)) {
      const target = packageTarget(packageIndex, fact.specifier);
      if (target && owner && target.id !== owner.id) {
        builder.relation(owner.id, { id: target.id }, 'imports', file.path, fact.line, fact.text);
        continue;
      }
      const sdk = SDK_SERVICES.find((entry) => entry.pattern.test(fact.specifier));
      if (!sdk) continue;
      const external = builder.unit({
        id: slugDiscoveryId(sdk.name), name: sdk.name, kind: 'external', dir: '',
        tech: fact.specifier,
      });
      pushEvidence(external, file.path, fact.line, fact.text);
      if (owner) builder.relation(owner.id, { id: external.id }, 'uses', file.path, fact.line, fact.text);
    }

    file.content.split(/\r?\n/).forEach((line, index) => {
      if (!CLIENT_CALL.test(line)) return;
      const host = URL_LITERAL.exec(line)?.[1];
      if (!host || skipHost(host)) return;
      const name = host.replace(/^www\./, '');
      // `api.stripe.com` is the Stripe the scanner already found: reuse it.
      const known = builder.all().find((unit) => unit.kind === 'external'
        && normalizeName(unit.name).length > 2 && normalizeName(name).includes(normalizeName(unit.name)));
      const external = known ?? builder.unit({
        id: slugDiscoveryId(name), name, kind: 'external', dir: '', tech: 'http',
      });
      pushEvidence(external, file.path, index + 1, line);
      if (owner) builder.relation(owner.id, { id: external.id }, 'calls', file.path, index + 1, line);
    });
  }

  // A datastore/queue is used by the unit whose code mentions it: attach the
  // dependency to its evidence's owner so the diagram is connected. Externals
  // already got a relation from the import/URL pass, so they are skipped.
  for (const unit of builder.all()) {
    if (unit.kind !== 'store' && unit.kind !== 'queue') continue;
    const evidence = unit.evidence[0];
    if (!evidence) continue;
    const owner = ownerOf(builder.all(), evidence.file);
    if (owner && owner.id !== unit.id) {
      builder.relation(owner.id, { id: unit.id }, 'uses', evidence.file, evidence.line, evidence.text);
    }
  }

  return builder.finish(ordered);
}

function scanServiceRules(files: readonly ScannedFile[], builder: Builder): void {
  const drafts = new Map<string, UnitDraft>();
  for (const file of files) {
    file.content.split(/\r?\n/).forEach((line, index) => {
      for (const rule of SERVICE_RULES) {
        if (rule.name === 'Kubernetes' || rule.name === 'Docker Compose') continue;
        const draft = drafts.get(rule.name);
        if (draft && draft.evidence.length >= MAX_EVIDENCE) continue;
        if (!rule.patterns.some((pattern) => pattern.test(line))) continue;
        const target = draft ?? builder.unit({
          id: slugDiscoveryId(rule.name), name: rule.name, kind: serviceKind(rule.type, rule.provider), dir: '',
        });
        drafts.set(rule.name, target);
        pushEvidence(target, file.path, index + 1, line);
      }
    });
  }
}

function serviceKind(type: string, provider: string): DiscoveredUnitKind {
  if (type === 'database' || type === 'cache' || type === 'storage') return 'store';
  if (type === 'queue' || type === 'messaging') return 'queue';
  if (type === 'compute' && (provider === 'aws' || provider === 'azure' || provider === 'gcp')) return 'external';
  if (type === 'api' || type === 'network') return 'external';
  return 'external';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- model view */

export interface ArchElementData {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly parent: string | null;
  readonly tech?: string;
  readonly desc?: string;
  readonly tags: readonly string[];
  readonly links: readonly string[];
  readonly attrs?: readonly { readonly key?: string; readonly value: string }[];
}

export interface ArchRelationData {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly tech?: string;
}

export interface ArchViewData {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly of?: string;
}

export interface ArchFlowStepData {
  readonly id: string;
  readonly kind: string;
  readonly from?: string;
  readonly to?: string;
  readonly label?: string;
  readonly branches?: readonly { readonly label?: string; readonly steps: readonly ArchFlowStepData[] }[];
}

export interface ArchFlowData {
  readonly id: string;
  readonly name: string;
  readonly steps: readonly ArchFlowStepData[];
}

export interface ArchModelData {
  readonly name?: string;
  readonly elements: readonly ArchElementData[];
  readonly relations: readonly ArchRelationData[];
  readonly views: readonly ArchViewData[];
  readonly flows: readonly ArchFlowData[];
}

/** The bundle's reader (`archModelFromJson`): anything malformed is dropped, never thrown. */
export function readArchModel(value: unknown): ArchModelData | null {
  return archModelFromJson(value) as ArchModelData | null;
}

/** `metadata.dsl.arch.model` off a compiled frame or a stored page node. */
export function modelFromNode(node: unknown): ArchModelData | null {
  if (!isRecord(node) || !isRecord(node.metadata)) return null;
  const dsl = node.metadata.dsl;
  if (!isRecord(dsl) || !isRecord(dsl.arch)) return null;
  return readArchModel(dsl.arch.model);
}

/** First page node of a document that carries a model. */
export function modelFromDocument(document: unknown): ArchModelData | null {
  if (!isRecord(document) || !Array.isArray(document.pages)) return null;
  for (const page of document.pages) {
    if (!isRecord(page) || !Array.isArray(page.nodes)) continue;
    for (const node of page.nodes) {
      const model = modelFromNode(node);
      if (model) return model;
    }
  }
  return null;
}

/* --------------------------------------------------------------- emission */

interface EmitGroup {
  id: string;
  name: string;
  units: DiscoveredUnit[];
}

/**
 * Single-token system names: `view container of Docs-Site` resolves, while the
 * parser joins a multi-word reference with dots (`Docs.Site`) and loses it.
 */
function prettify(segment: string): string {
  const words = segment.split(/[-_.\s]+/).filter(Boolean);
  if (words.length === 0) return segment;
  return words.map((word) => word[0]!.toUpperCase() + word.slice(1)).join('-');
}

function systemName(value: string): string {
  const trimmed = value.trim();
  return /\s/.test(trimmed) ? prettify(trimmed) : trimmed;
}

function uniqueId(candidate: string, used: Set<string>): string {
  let id = candidate;
  let suffix = 2;
  while (used.has(id)) id = `${candidate}-${suffix++}`;
  used.add(id);
  return id;
}

/**
 * The discovered units as a compiling OFK architecture workspace: one system per
 * top-level directory (or one named after the repo), `view landscape` plus a
 * container view per system, `tags: discovered` on everything.
 */
export function discoveryToDsl(result: ArchitectureDiscovery, name: string): string {
  const repoName = name.trim() || 'System';
  const containers = result.units.filter((unit) => unit.kind === 'container' || unit.kind === 'system');
  const dependencies = result.units.filter((unit) => unit.kind !== 'container' && unit.kind !== 'system');
  const segments = [...new Set(containers.map((unit) => firstSegment(unit.dir)).filter(Boolean))];
  const grouped = segments.length >= 2;

  const groups: EmitGroup[] = [];
  const byKey = new Map<string, EmitGroup>();
  const groupFor = (key: string, displayName: string): EmitGroup => {
    const existing = byKey.get(key);
    if (existing) return existing;
    const group: EmitGroup = { id: '', name: displayName, units: [] };
    byKey.set(key, group);
    groups.push(group);
    return group;
  };
  for (const unit of containers) {
    const key = grouped ? firstSegment(unit.dir) : '';
    groupFor(key, key ? prettify(key) : systemName(repoName)).units.push(unit);
  }
  for (const unit of dependencies) {
    const evidence = unit.evidence[0];
    const segment = evidence ? firstSegment(path.posix.dirname(evidence.file) === '.' ? '' : path.posix.dirname(evidence.file)) : '';
    const key = segment && byKey.has(segment) ? segment : '';
    groupFor(key, key ? prettify(key) : systemName(repoName)).units.push(unit);
  }

  const usedIds = new Set<string>();
  for (const group of groups) group.id = uniqueId(slugDiscoveryId(group.name), usedIds);
  const elementId = new Map<string, string>();
  for (const group of groups) {
    for (const unit of group.units) {
      // A local id never contains a dot: the serializer writes `x = kind Name`
      // and the parser rejects dots there (W120). A unit named like its group
      // (`api` inside group `api`) nests as `api.api`.
      const local = unit.id.split('.').pop()!;
      const nested = unit.id.startsWith(`${group.id}.`) ? unit.id : `${group.id}.${local}`;
      elementId.set(unit.id, uniqueId(nested, usedIds));
    }
  }

  const elements: Array<Record<string, unknown>> = [];
  for (const group of groups) {
    elements.push({
      id: group.id, kind: 'system', name: group.name, parent: null,
      tags: ['discovered'], links: [],
    });
    for (const unit of group.units) {
      elements.push({
        id: elementId.get(unit.id)!, kind: unit.kind, name: unit.name, parent: group.id,
        ...(unit.tech ? { tech: unit.tech } : {}),
        tags: ['discovered'], links: [],
      });
    }
  }

  const relations = result.relations.flatMap((relation) => {
    const from = elementId.get(relation.from);
    const to = elementId.get(relation.to);
    if (!from || !to || from === to) return [];
    return [{
      id: `rel:${from}->${to}`, from, to,
      ...(relation.label ? { label: relation.label } : {}),
      tags: [],
    }];
  });

  const views: Array<Record<string, unknown>> = [{
    id: 'view:landscape', kind: 'landscape', name: `${repoName} landscape`, rules: [],
  }];
  for (const group of groups) {
    views.push({
      id: `view:container:${group.id}`, kind: 'container', name: `${group.name} containers`,
      of: group.id, rules: [],
    });
  }

  const text = architectureWorkspaceText({
    name: repoName, elements, relations, views, flows: [],
  });
  const header = [
    `// discovered by openflowkit — ${result.units.length} units, ${result.relations.length} relations, ${result.evidenceCount} evidence lines`,
    '// heuristics read manifests, imports and line matches; review names, tech and grouping before committing',
  ];
  const lines = text.split('\n');
  const anchor = lines.findIndex((line) => line === 'model {');
  if (anchor === -1) return `${text.trimEnd()}\n${header.join('\n')}\n`;
  lines.splice(anchor, 0, ...header);
  return lines.join('\n');
}

/* ------------------------------------------------------------------ drift */

export interface DriftFinding {
  readonly id: string;
  readonly name: string;
  readonly evidence: readonly DiscoveryEvidence[];
}

export interface DriftChange {
  readonly id: string;
  readonly field: 'tech' | 'dir';
  readonly model: string;
  readonly repo: string;
}

export interface DriftReportResult {
  readonly missing: readonly DriftFinding[];
  readonly undrawn: readonly DriftFinding[];
  readonly changed: readonly DriftChange[];
}

/**
 * Diff a model (object, or its JSON) against a discovery run. Elements match by
 * normalized display name — ids are authored, names are what a human reviews.
 * `undrawn` carries the element name as its evidence-of-absence, which is what
 * the editor badge shows.
 */
export function driftReport(modelOrJson: ArchModelData | string, result: ArchitectureDiscovery): DriftReportResult {
  const model = typeof modelOrJson === 'string' ? readArchModel(parseJson(modelOrJson)) : modelOrJson;
  if (!model) throw new TypeError('driftReport expects a model object or its JSON.');
  const byName = new Map<string, ArchElementData[]>();
  const parentOf = new Map<string, string | null>();
  for (const element of model.elements) {
    const key = normalizeName(element.name);
    byName.set(key, [...(byName.get(key) ?? []), element]);
    parentOf.set(element.id, element.parent);
  }

  const missing: DriftFinding[] = [];
  const matched = new Set<string>();
  const changed: DriftChange[] = [];
  for (const unit of result.units) {
    const candidates = byName.get(normalizeName(unit.name)) ?? [];
    // Prefer the same kind: a container named `api` must not match the
    // `Api` system that contains it (both normalize to `api`).
    const element = candidates.find((candidate) => !matched.has(candidate.id) && candidate.kind === unit.kind)
      ?? candidates.find((candidate) => !matched.has(candidate.id));
    if (!element) {
      missing.push({ id: unit.id, name: unit.name, evidence: unit.evidence });
      continue;
    }
    matched.add(element.id);
    // A system is evidenced by its children: it is a grouping, not a unit.
    for (let parent = parentOf.get(element.id) ?? null; parent; parent = parentOf.get(parent) ?? null) {
      matched.add(parent);
    }
    if (element.tech && unit.tech && element.tech.trim().toLowerCase() !== unit.tech.trim().toLowerCase()) {
      changed.push({ id: element.id, field: 'tech', model: element.tech, repo: unit.tech });
    }
    const dir = element.attrs?.find((entry) => entry.key === 'dir')?.value;
    if (dir && unit.dir && normalizeName(dir) !== normalizeName(unit.dir)) {
      changed.push({ id: element.id, field: 'dir', model: dir, repo: unit.dir });
    }
  }

  const undrawn: DriftFinding[] = model.elements
    .filter((element) => !matched.has(element.id))
    .map((element) => ({
      id: element.id, name: element.name,
      evidence: [{ file: '', line: 0, text: element.name }],
    }));

  return { missing, undrawn, changed };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------- summary */

export function discoverySummary(result: ArchitectureDiscovery): string {
  const lines: string[] = [];
  lines.push(`Discovered ${result.units.length} units and ${result.relations.length} relations (${result.evidenceCount} evidence lines).`);
  const byKind = new Map<DiscoveredUnitKind, number>();
  for (const unit of result.units) byKind.set(unit.kind, (byKind.get(unit.kind) ?? 0) + 1);
  lines.push(`Kinds: ${[...byKind.entries()].map(([kind, count]) => `${kind} ${count}`).join(', ')}`);
  for (const unit of result.units) {
    const where = unit.dir ? ` (${unit.dir}/)` : '';
    lines.push(`  - ${unit.name}${where}${unit.tech ? ` [${unit.tech}]` : ''} — ${unit.evidence[0]?.file ?? 'no evidence'}`);
  }
  const languages = Object.entries(result.languages).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (languages.length) lines.push(`Languages: ${languages.map(([language, count]) => `${language}:${count}`).join(', ')}`);
  return lines.join('\n');
}
