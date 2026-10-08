import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { main, type CliIo } from '../src/cli.js';
import { CAPABILITY_MANIFEST } from '../src/lib/agent.js';

// The op registry as commands, exercised through `main` so exit codes are what
// a shell or an agent sees.

const tempDirs: string[] = [];
afterAll(async () => { await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true }))); });

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'openflowkit-cli-ops-'));
  tempDirs.push(dir);
  return dir;
}

function capture(stdin?: string): { io: CliIo; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    io: { out: (message) => out.push(message), err: (message) => err.push(message), ...(stdin === undefined ? {} : { stdin: async () => stdin }) },
    out, err,
  };
}

const MERMAID: Record<string, string> = {
  flowchart: 'flowchart LR\n  A[Client] -->|HTTPS| B(API)\n  B --> C[(Postgres)]\n',
  sequence: 'sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi\n',
  class: 'classDiagram\n  class Animal {\n    +String name\n    +eat()\n  }\n  Animal <|-- Dog\n',
  state: 'stateDiagram-v2\n  [*] --> Idle\n  Idle --> Busy: start\n  Busy --> [*]\n',
  erd: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains\n',
};

describe('openflowkit op', () => {
  it('has a subcommand, with help, for every op in the manifest', async () => {
    const missing: string[] = [];
    for (const row of CAPABILITY_MANIFEST) {
      const run = capture();
      const code = await main(['op', row.action, '--help'], run.io);
      if (code !== 0 || !run.out.join('\n').startsWith(`${row.action} — `)) missing.push(row.action);
    }
    expect(missing).toEqual([]);
  });

  it('names the ops when one is unknown, with exit 2', async () => {
    const run = capture();
    expect(await main(['op', 'draw_unicorn'], run.io)).toBe(2);
    expect(run.err.join('\n')).toContain('Ops: create_diagram');
  });

  it('creates, saves and reads back a document file, with args from stdin', async () => {
    const doc = join(await tempDir(), 'nested', 'flow.openflow.json');
    const create = capture(JSON.stringify({ dsl: 'flowchart\nStart -> Ship' }));
    expect(await main(['op', 'create_diagram', '--doc', doc, '--args', '-'], create.io)).toBe(0);
    expect(JSON.parse(create.out[0]!)).toMatchObject({ changed: true, saved: doc, output: { nodes: 2, connectors: 1 } });

    const list = capture();
    expect(await main(['op', 'list_diagrams', '--doc', doc], list.io)).toBe(0);
    expect(JSON.parse(list.out[0]!)).toMatchObject({ changed: false });
    expect(JSON.parse(await readFile(doc, 'utf8')).pages[0].nodes.length).toBeGreaterThan(0);
  });

  it('reports bad op input field by field, with exit 1', async () => {
    const run = capture();
    expect(await main(['op', 'move', '--args', '{"ids":[]}'], run.io)).toBe(1);
    expect(run.err.join('\n')).toMatch(/openflowkit op: /);
    const notJson = capture();
    expect(await main(['op', 'move', '--args', '{ids'], notJson.io)).toBe(2);
  });

  it('refuses to read a document file that is not there, but a write may start one', async () => {
    const run = capture();
    expect(await main(['op', 'get_document', '--doc', join(await tempDir(), 'typo.openflow.json')], run.io)).toBe(1);
    expect(run.err.join('\n')).toContain('no such file');
  });

  it('exits 1 and saves nothing when the diagram has an error', async () => {
    const doc = join(await tempDir(), 'broken.openflow.json');
    const run = capture();
    expect(await main(['op', 'create_diagram', '--doc', doc, '--args', '{"dsl":"  "}'], run.io)).toBe(1);
    expect(run.err.join('\n')).toMatch(/nothing saved/);
    await expect(readFile(doc, 'utf8')).rejects.toThrow();
  });

  it('prints op usage for op --help with no name', async () => {
    const run = capture();
    expect(await main(['op', '--help'], run.io)).toBe(0);
    expect(run.out[0]).toContain('openflowkit op <name>');
  });

  it('lists every op', async () => {
    const run = capture();
    expect(await main(['ops', '--json'], run.io)).toBe(0);
    expect((JSON.parse(run.out[0]!) as { name: string }[]).map(({ name }) => name)).toEqual(CAPABILITY_MANIFEST.map(({ action }) => action));
  });
});

describe('openflowkit render / convert / validate', () => {
  it.each(Object.entries(MERMAID))('renders Mermaid %s to SVG from stdin', async (_, source) => {
    const run = capture(source);
    expect(await main(['render', '-'], run.io)).toBe(0);
    expect(run.out[0]).toMatch(/^<svg /);
    expect(run.err).toEqual([]);
  });

  it('writes the file it is asked for, and converts to an editable document', async () => {
    const dir = await tempDir();
    const input = join(dir, 'flow.mmd');
    await writeFile(input, MERMAID.flowchart!, 'utf8');
    expect(await main(['render', input, '-o', join(dir, 'out', 'flow.svg'), '--theme', 'dark'], capture().io)).toBe(0);
    expect(await readFile(join(dir, 'out', 'flow.svg'), 'utf8')).toContain('data-theme="dark"');
    const run = capture();
    expect(await main(['convert', input, '-o', join(dir, 'flow.openflow.json'), '--json'], run.io)).toBe(0);
    expect(JSON.parse(run.out[0]!)).toMatchObject({ ok: true, saved: join(dir, 'flow.openflow.json'), losses: [] });
    expect(JSON.parse(await readFile(join(dir, 'flow.openflow.json'), 'utf8')).pages[0].nodes.length).toBeGreaterThan(0);
  });

  it('writes the SVG beside the JSON only with --svg', async () => {
    const dir = await tempDir();
    const input = join(dir, 'flow.mmd');
    await writeFile(input, MERMAID.flowchart!, 'utf8');
    expect(await main(['convert', input, '-o', join(dir, 'plain.openflow.json')], capture().io)).toBe(0);
    expect(existsSync(join(dir, 'plain.openflow.json'))).toBe(true);
    expect(existsSync(join(dir, 'plain.svg'))).toBe(false);
    expect(await main(['convert', input, '-o', join(dir, 'pic.openflow.json'), '--svg'], capture().io)).toBe(0);
    expect(existsSync(join(dir, 'pic.openflow.json'))).toBe(true);
    expect(await readFile(join(dir, 'pic.svg'), 'utf8')).toMatch(/^<svg /);
  });

  it('op --svg writes the SVG beside the document, and nothing without it', async () => {
    const dir = await tempDir();
    const args = JSON.stringify({ dsl: 'flowchart\n  A -> B' });
    expect(await main(['op', 'create_diagram', '--doc', join(dir, 'a.openflow.json'), '--args', args], capture().io)).toBe(0);
    expect(existsSync(join(dir, 'a.svg'))).toBe(false);
    expect(await main(['op', 'create_diagram', '--doc', join(dir, 'b.openflow.json'), '--args', args, '--svg'], capture().io)).toBe(0);
    expect(await readFile(join(dir, 'b.svg'), 'utf8')).toMatch(/^<svg /);
  });

  it('keeps the saved JSON and exits 1 naming it when the SVG cannot be written', async () => {
    const dir = await tempDir();
    const input = join(dir, 'flow.mmd');
    await writeFile(input, MERMAID.flowchart!, 'utf8');
    await mkdir(join(dir, 'pic.svg'));
    const run = capture();
    expect(await main(['convert', input, '-o', join(dir, 'pic.openflow.json'), '--svg', '--json'], run.io)).toBe(1);
    expect(existsSync(join(dir, 'pic.openflow.json'))).toBe(true);
    expect(run.err.join('\n')).toContain(`saved ${join(dir, 'pic.openflow.json')}; svg failed:`);
    expect(JSON.parse(run.out[0]!)).toMatchObject({ saved: join(dir, 'pic.openflow.json') });
    expect(JSON.parse(run.out[0]!).svgError).toBeTruthy();

    const op = capture();
    const args = JSON.stringify({ dsl: 'flowchart\n  A -> B' });
    expect(await main(['op', 'create_diagram', '--doc', join(dir, 'pic.openflow.json'), '--args', args, '--svg'], op.io)).toBe(1);
    expect(op.err.join('\n')).toContain(`saved ${join(dir, 'pic.openflow.json')}; svg failed:`);
  });

  it('refuses --svg without a file to sit beside, and never overwrites the input', async () => {
    const dir = await tempDir();
    const input = join(dir, 'flow.mmd');
    await writeFile(input, MERMAID.flowchart!, 'utf8');
    expect(await main(['convert', input, '--svg'], capture().io)).toBe(2);
    expect(await main(['op', 'list_diagrams', '--svg'], capture().io)).toBe(2);
    expect(await main(['render', input, '--svg'], capture().io)).toBe(2);
    // flow.json -> flow.svg: converting an .svg input would be clobbered by its own picture.
    const clash = join(dir, 'flow.svg');
    await writeFile(clash, MERMAID.flowchart!, 'utf8');
    expect(await main(['convert', clash, '-o', join(dir, 'flow.json'), '--svg'], capture().io)).toBe(2);
    expect(await readFile(clash, 'utf8')).toBe(MERMAID.flowchart);
    expect(existsSync(join(dir, 'flow.json'))).toBe(false);
  });

  it('says nothing was written when a read-only op is asked for an SVG', async () => {
    const dir = await tempDir();
    const doc = join(dir, 'a.openflow.json');
    await main(['op', 'create_diagram', '--doc', doc, '--args', JSON.stringify({ dsl: 'flowchart\n  A -> B' })], capture().io);
    const run = capture();
    expect(await main(['op', 'list_diagrams', '--doc', doc, '--svg'], run.io)).toBe(0);
    expect(run.err.join('\n')).toContain('no SVG written, nothing was saved');
    expect(existsSync(join(dir, 'a.svg'))).toBe(false);
  });

  it('draws the --svg picture in the --theme asked for, and reports its path in --json', async () => {
    const dir = await tempDir();
    const input = join(dir, 'flow.mmd');
    await writeFile(input, MERMAID.flowchart!, 'utf8');
    const run = capture();
    expect(await main(['convert', input, '-o', join(dir, 'd.openflow.json'), '--svg', '--theme', 'dark', '--json'], run.io)).toBe(0);
    expect(await readFile(join(dir, 'd.svg'), 'utf8')).toContain('data-theme="dark"');
    expect(JSON.parse(run.out[0]!)).toMatchObject({ saved: join(dir, 'd.openflow.json'), svg: join(dir, 'd.svg') });
  });

  it('reports Mermaid it could not convert on stderr, and fails only with --strict', async () => {
    const source = `---\nconfig:\n  theme: forest\n---\n${MERMAID.flowchart}`;
    const loose = capture(source);
    expect(await main(['render', '-'], loose.io)).toBe(0);
    expect(loose.err.join('\n')).toMatch(/mermaid line \d+: not converted — Front matter config dropped/);
    expect(await main(['render', '-', '--strict'], capture(source).io)).toBe(1);
  });

  it('validates with per-line diagnostics: errors exit 1, warnings only with --strict', async () => {
    const broken = 'Flowchart\nGood\nBad [oops\ngroup Open {\nChild';
    const warned = capture(broken);
    expect(await main(['validate', '-', '--json'], warned.io)).toBe(0);
    expect(JSON.parse(warned.out[0]!).diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'W110', line: 1, severity: 'warning' })]));
    expect(await main(['validate', '-', '--strict'], capture(broken).io)).toBe(1);
    const empty = capture('');
    expect(await main(['validate', '-'], empty.io)).toBe(1);
    expect(empty.err.join('\n')).toMatch(/line 1:1 error E001/);
    expect(await main(['validate', '-'], capture(MERMAID.sequence!).io)).toBe(0);
  });

  it('refuses output it cannot write, naming what it can', async () => {
    const run = capture(MERMAID.flowchart);
    expect(await main(['render', '-', '-o', 'flow.png'], run.io)).toBe(2);
    expect(run.err.join('\n')).toContain('render writes SVG (.svg)');
    expect(await main(['render', '-', '--theme', 'neon'], capture(MERMAID.flowchart).io)).toBe(2);
  });

  it('stops a diagram too big to lay out with a message, not a hang', async () => {
    const lines = ['flowchart'];
    for (let index = 1; index <= 1001; index += 1) lines.push(`N${index - 1} -> N${index}`);
    const run = capture(lines.join('\n'));
    expect(await main(['render', '-'], run.io)).toBe(1);
    expect(run.err.join('\n')).toMatch(/1002 shapes and 1001 connections; layout outside the app stops at 1000 shapes or 400 connections/);
    // Connections cost far more than shapes: a dense 250-shape graph would lay out for minutes.
    const dense = ['flowchart'];
    for (let index = 0; index < 250; index += 1) dense.push(`N${index} -> N${(index * 7 + 3) % 250}`, `N${index} -> N${(index * 13 + 5) % 250}`);
    const denseRun = capture(dense.join('\n'));
    expect(await main(['render', '-', '--json'], denseRun.io)).toBe(1);
    expect(JSON.parse(denseRun.out[0]!)).toMatchObject({ ok: false, error: expect.stringMatching(/500 connections/) });
  });

  it('never waits on stdin unless told to with -', async () => {
    const run = capture('flowchart\nA -> B');
    expect(await main(['render'], run.io)).toBe(2);
    expect(run.err.join('\n')).toContain('missing input');
    expect(await main(['render', '-'], capture().io)).toBe(2);
  });

  it('counts compile warnings, not only parse ones, under --strict and in validate', async () => {
    const ghost = 'architecture\nmodel {\n  system Shop\n  Shop -> Ghost : calls\n}\n';
    const run = capture(ghost);
    expect(await main(['validate', '-', '--strict', '--json'], run.io)).toBe(1);
    expect(JSON.parse(run.out[0]!).diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'W122' })]));
    expect(await main(['render', '-'], capture(ghost).io)).toBe(0);
    expect(await main(['render', '-', '--strict'], capture(ghost).io)).toBe(1);
  });

  it('prints the document itself, not a string of it, for convert --json', async () => {
    const run = capture(MERMAID.flowchart);
    expect(await main(['convert', '-', '--json'], run.io)).toBe(0);
    expect(JSON.parse(run.out[0]!).document.pages[0].nodes.length).toBeGreaterThan(0);
  });

  it('keeps UTF-8 whole when a character straddles two stdin chunks', () => {
    // Real process, real pipe: Node hands stdin over in 64 KiB chunks.
    const lines = ['flowchart'];
    for (let index = 0; index < 1200; index += 1) lines.push(`N${index} [label: "日本語のラベル ${index} — café ✓"]`);
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', 'validate', '-', '--json'], {
      cwd: new URL('..', import.meta.url).pathname, input: lines.join('\n'), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    });
    expect(result.stderr).not.toContain('\uFFFD');
    expect(result.stdout).not.toContain('\uFFFD');
    expect(result.status).toBe(0);
  });
});
