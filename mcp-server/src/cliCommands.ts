// The op registry as commands. `op <name>` runs any agent op against a
// .openflow.json file, so every MCP op is a CLI command too and a new op needs
// no CLI code. render / convert / validate are friendly verbs over the same
// ops. Output is plain text or `--json`, never colour, so agents can pipe it.
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, type ParseArgsConfig } from 'node:util';
import {
  AGENT_OPS, CAPABILITY_MANIFEST, createAgentDocument, deterministicLayout, findAgentOp, lintDsl, opInputShape, runAgentOp,
  type AgentOp, type DslLintReport, type SceneDocumentV1,
} from './lib/agent.js';
import { DocumentStore } from './lib/documentStore.js';
import { loadFileCapabilities } from './lib/fileCapabilities.js';
import type { CliIo } from './cli.js';

export const OP_USAGE = `  openflowkit op <name> [--doc file.openflow.json] [--args '{…}' | --args -] [--page <id>]
  openflowkit op <name> --help
  openflowkit ops [--json]
  openflowkit render <file|-> [-o out.svg] [--theme light|dark] [--strict] [--json]
  openflowkit convert <file|-> [-o out.openflow.json] [--strict] [--json]
  openflowkit validate <file|-> [--strict] [--json]`;

export const OP_COMMANDS = `  op        run one agent op (the same ops as the MCP server) on a document file
  ops       list the ops
  render    Mermaid, D2, Structurizr or OpenFlow DSL → SVG
  convert   the same → an editable .openflow.json
  validate  per-line diagnostics; exit 1 on an error`;

/** Thrown for a usage mistake: exit 2 and the usage text, not exit 1. */
class UsageError extends Error {}

function parse(args: readonly string[], options: NonNullable<ParseArgsConfig['options']>) {
  try {
    return parseArgs({ args: [...args], options, allowPositionals: true });
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }
}

/** A file path, or `-` for stdin. Never stdin implicitly: an open, silent pipe would wait forever. */
async function readInput(input: string | undefined, io: CliIo): Promise<string> {
  if (!input) throw new UsageError('missing input: pass a file, or - to read piped text');
  if (input !== '-') return readFile(input, 'utf8');
  if (!io.stdin) throw new UsageError('- reads piped text, and nothing is piped');
  return io.stdin();
}

/** A zod error lists every bad field with its path, so a model can fix its own input. */
function describeError(error: unknown): string {
  const issues = (error as { issues?: readonly { path: readonly (string | number)[]; message: string }[] }).issues;
  if (issues?.length) return issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ');
  return error instanceof Error ? error.message : String(error);
}

function opHelp(op: AgentOp): string {
  const fields = Object.entries(opInputShape(op)).map(([name, field]) =>
    `  ${name}${field.isOptional() ? ' (optional)' : ''}${field.description ? ` — ${field.description}` : ''}`);
  return [`${op.name} — ${op.title}`, op.description, '', 'Arguments (--args JSON):', ...(fields.length ? fields : ['  none'])].join('\n');
}

const opList = () => AGENT_OPS.map((op) => op.name).join(', ');

async function runOp(args: readonly string[], io: CliIo): Promise<number> {
  const { values, positionals } = parse(args, {
    doc: { type: 'string' }, args: { type: 'string' }, page: { type: 'string' }, json: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
  });
  const name = positionals[0];
  if (!name && values.help) { io.out(`${OP_USAGE}\n\nOps: ${opList()}`); return 0; }
  if (!name) throw new UsageError(`missing op name. Ops: ${opList()}`);
  const op = findAgentOp(name);
  if (!op) throw new UsageError(`unknown op "${name}". Ops: ${opList()}`);
  if (values.help) { io.out(opHelp(op)); return 0; }

  const rawArgs = values.args === '-' ? await readInput('-', io) : (values.args as string | undefined) ?? '{}';
  let input: unknown;
  try {
    input = JSON.parse(rawArgs);
  } catch {
    throw new UsageError(`--args must be a JSON object, got: ${rawArgs.slice(0, 80)}`);
  }
  const docPath = values.doc as string | undefined;
  const exists = Boolean(docPath && existsSync(docPath));
  // A read of a file that isn't there is a typo, not an empty diagram; a write may start one.
  if (docPath && !exists && !CAPABILITY_MANIFEST.find((row) => row.action === op.name)?.mutates) throw new Error(`no such file: ${docPath}`);
  const store = new DocumentStore();
  const document = exists ? await store.open(docPath!) : store.create(docPath ? path.basename(docPath).replace(/\.openflow\.json$|\.json$/, '') : 'Untitled diagram');
  const pageId = (values.page as string | undefined) ?? document.pages[0]!.id;
  const result = await runAgentOp(op, input, { document, pageId, capabilities: await loadFileCapabilities() });
  const errors = ((result.output as { diagnostics?: readonly Diagnostic[] } | null)?.diagnostics ?? []).filter(({ severity }) => severity === 'error');
  if (errors.length) {
    io.out(JSON.stringify({ changed: false, output: result.output }, null, 2));
    io.err(`openflowkit op ${name}: ${errors.map((issue) => `line ${issue.line}: ${issue.message}`).join('; ')}; nothing saved`);
    return 1;
  }
  if (result.changed && docPath) {
    store.set(result.document);
    await mkdir(path.dirname(path.resolve(docPath)), { recursive: true });
    await store.save(result.document.id, docPath);
  } else if (result.changed) {
    io.err(`openflowkit op ${name}: no --doc, so the change was not saved`);
  }
  io.out(JSON.stringify({ changed: result.changed, ...(result.changed && docPath ? { saved: docPath } : {}), output: result.output }, null, 2));
  return 0;
}

function runOps(args: readonly string[], io: CliIo): number {
  const { values } = parse(args, { json: { type: 'boolean' } });
  if (values.json) {
    io.out(JSON.stringify(AGENT_OPS.map((op) => ({ name: op.name, title: op.title, description: op.description })), null, 2));
  } else {
    const width = Math.max(...AGENT_OPS.map((op) => op.name.length));
    io.out(AGENT_OPS.map((op) => `${op.name.padEnd(width)}  ${op.title}`).join('\n'));
  }
  return 0;
}

type Diagnostic = DslLintReport['diagnostics'][number];

interface Checked {
  readonly lint: DslLintReport;
  /** Parse and compile warnings and errors, once each; info notes ("version 1 assumed") are left out. */
  readonly issues: readonly Diagnostic[];
  readonly document?: SceneDocumentV1;
  readonly views: number;
}

/**
 * Parse, then compile through `create_diagram`: compiling finds what parsing can't
 * (`Shop -> Ghost` names no element), so --strict and validate see both.
 */
async function check(source: string, name: string, layout: 'elk' | 'none' = 'elk'): Promise<Checked> {
  const lint = lintDsl(source);
  const notable = (list: readonly Diagnostic[]) => list.filter(({ severity }) => severity !== 'info');
  if (!lint.ok) return { lint, issues: notable(lint.diagnostics), views: 0 };
  const document = createAgentDocument(name);
  const elk = await loadFileCapabilities();
  // validate keeps no picture, so a grid layout does: any size checks fast.
  const capabilities = layout === 'elk' ? elk : {
    ...elk, compileWorkspace: (text: string, options?: unknown) => elk.compileWorkspace(text, { ...(options as object), layout: deterministicLayout }),
  };
  const result = await runAgentOp(findAgentOp('create_diagram')!, { dsl: source }, { document, pageId: document.pages[0]!.id, capabilities });
  const output = result.output as { views?: readonly unknown[]; diagnostics?: readonly Diagnostic[] };
  const seen = new Set<string>();
  const issues = notable([...lint.diagnostics, ...(output.diagnostics ?? [])]).filter((issue) => {
    const key = `${issue.code}:${issue.line}:${issue.col}`;
    return !seen.has(key) && Boolean(seen.add(key));
  });
  return { lint, issues, document: result.document, views: output.views?.length ?? 0 };
}

function report(checked: Checked, io: CliIo, command: string): void {
  const { converted } = checked.lint;
  for (const loss of converted?.losses ?? []) io.err(`${command}: ${converted!.from} line ${loss.line}: not converted — ${loss.message}`);
  for (const issue of checked.issues) io.err(`${command}: line ${issue.line}:${issue.col} ${issue.severity} ${issue.code} ${issue.message}`);
}

/** Losses and warnings are fine by default; `--strict` turns them into exit 1. */
function failed(checked: Checked, strict: boolean): boolean {
  if (!checked.document || checked.issues.some(({ severity }) => severity === 'error')) return true;
  return strict && ((checked.lint.converted?.losses.length ?? 0) > 0 || checked.issues.length > 0);
}

/** The --json shape every check-based command prints, pass or fail. */
const summary = (checked: Checked, ok: boolean) => ({
  ok, family: checked.lint.family, views: Math.max(checked.views, 1),
  losses: checked.lint.converted?.losses ?? [], diagnostics: checked.issues,
});

/** `render` and `convert`: one parse, one compile, one export through the registry. */
async function runCompile(command: 'render' | 'convert', args: readonly string[], io: CliIo): Promise<number> {
  const { values, positionals } = parse(args, {
    out: { type: 'string', short: 'o' }, theme: { type: 'string' }, strict: { type: 'boolean' }, json: { type: 'boolean' },
  });
  const out = values.out as string | undefined;
  const extensions = command === 'render' ? ['.svg'] : ['.json'];
  if (out && !extensions.includes(path.extname(out).toLowerCase())) {
    throw new UsageError(command === 'render'
      ? `render writes SVG (.svg), not "${path.extname(out) || out}". For an editable file use convert -o x.openflow.json; PNG needs the app.`
      : `convert writes .openflow.json, not "${path.extname(out) || out}". For a picture use render -o x.svg.`);
  }
  const theme = (values.theme as string | undefined) ?? 'light';
  if (!['light', 'dark'].includes(theme)) throw new UsageError(`--theme is light or dark, not "${theme}"`);

  const source = await readInput(positionals[0], io);
  const name = positionals[0] && positionals[0] !== '-' ? path.basename(positionals[0]).replace(/\.[^.]+$/, '') : 'diagram';
  const checked = await check(source, name);
  if (!values.json) report(checked, io, command);
  if (failed(checked, Boolean(values.strict))) {
    if (values.json) io.out(JSON.stringify(summary(checked, false), null, 2));
    return 1;
  }
  const { document, views } = checked as Checked & { document: SceneDocumentV1 };
  let text: string;
  if (command === 'render') {
    const exported = await runAgentOp(findAgentOp('export')!, { format: 'svg', scope: 'page', theme }, {
      document, pageId: document.pages[0]!.id, capabilities: await loadFileCapabilities(),
    });
    text = (exported.output as { files: readonly { text?: string }[] }).files[0]!.text!;
    // ponytail: one page per render; a workspace's other views stay in `convert`'s file.
    if (views > 1 && !values.json) io.err(`render: ${views} views; drew the first. convert keeps them all.`);
  } else {
    text = `${JSON.stringify(document, null, 2)}\n`;
  }
  if (out) {
    await mkdir(path.dirname(path.resolve(out)), { recursive: true });
    await writeFile(out, text, 'utf8');
  }
  if (values.json) {
    const result = out ? { saved: out } : command === 'render' ? { svg: text } : { document };
    io.out(JSON.stringify({ ...summary(checked, true), ...result }, null, 2));
  } else if (!out) {
    io.out(text.trimEnd());
  } else {
    io.err(`${command}: wrote ${out}`);
  }
  return 0;
}

async function runValidate(args: readonly string[], io: CliIo): Promise<number> {
  const { values, positionals } = parse(args, { strict: { type: 'boolean' }, json: { type: 'boolean' } });
  const checked = await check(await readInput(positionals[0], io), 'validate', 'none');
  const bad = failed(checked, Boolean(values.strict));
  const { lint } = checked;
  if (values.json) io.out(JSON.stringify(summary(checked, !bad), null, 2));
  else {
    report(checked, io, 'validate');
    io.out(bad ? 'invalid' : `ok — ${lint.family}, ${lint.statements} statement(s)${lint.converted ? `, converted from ${lint.converted.from}` : ''}`);
  }
  return bad ? 1 : 0;
}

const COMMANDS = new Map<string, (args: readonly string[], io: CliIo) => number | Promise<number>>([
  ['op', runOp], ['ops', runOps], ['validate', runValidate],
  ['render', (args, io) => runCompile('render', args, io)], ['convert', (args, io) => runCompile('convert', args, io)],
]);

/** Runs one of the registry commands, or returns null when `command` isn't one. */
export async function runRegistryCommand(command: string, args: readonly string[], io: CliIo, usage: string): Promise<number | null> {
  const run = COMMANDS.get(command);
  if (!run) return null;
  try {
    return await run(args, io);
  } catch (error) {
    const usageError = error instanceof UsageError;
    // --json callers get one JSON document on stdout whatever happened.
    if (args.includes('--json')) io.out(JSON.stringify({ ok: false, error: usageError ? (error as Error).message : describeError(error) }, null, 2));
    if (usageError) { io.err(`openflowkit ${command}: ${(error as Error).message}\n\n${usage}`); return 2; }
    io.err(`openflowkit ${command}: ${describeError(error)}`);
    return 1;
  }
}
