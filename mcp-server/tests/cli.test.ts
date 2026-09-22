import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { compileWorkspace } from '../../src/dsl/compile';
import { main, type CliIo } from '../src/cli.js';

// The shipped CLI: discover → drift → build, exercised through `main` so exit
// codes are asserted exactly as CI sees them.

const tempDirs: string[] = [];
afterAll(async () => { await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true }))); });

function capture(): { io: CliIo; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (message) => out.push(message), err: (message) => err.push(message) }, out, err };
}

async function write(root: string, relative: string, content: string): Promise<void> {
  const full = join(root, relative);
  await mkdir(join(full, '..'), { recursive: true });
  await writeFile(full, content, 'utf8');
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'openflowkit-cli-'));
  tempDirs.push(root);
  await write(root, 'docker-compose.yml', 'services:\n  api:\n    image: fixture/api:1\n  db:\n    image: postgres:16\n');
  await write(root, 'api/package.json', JSON.stringify({ name: 'fixture-api', dependencies: { express: '^4' } }, null, 2));
  await write(root, 'api/src/server.ts', "import express from 'express';\nexport const app = express();\n");
  await write(root, 'adr/0001-use-postgres.md', '# Use Postgres\n');
  return root;
}

describe('openflowkit CLI', () => {
  it('discovers, writes a compiling model, and reports clean drift', async () => {
    const root = await fixture();
    const discover = capture();
    expect(await main(['discover', root], discover.io)).toBe(0);
    const dsl = discover.out.join('\n');
    const workspace = await compileWorkspace(dsl);
    expect(workspace.views.flatMap((view) => view.result.diagnostics)).toEqual([]);

    const modelPath = join(root, 'architecture.ofk');
    const writeOut = capture();
    expect(await main(['discover', root, '--out', modelPath], writeOut.io)).toBe(0);
    expect(writeOut.out.join('\n')).toContain('wrote');
    const written = await readFile(modelPath, 'utf8');
    expect(written).toContain('view landscape');

    // --out creates missing folders instead of failing.
    const nested = join(root, 'docs', 'architecture', 'workspace.ofk');
    expect(await main(['discover', root, '--out', nested], capture().io)).toBe(0);
    expect(await readFile(nested, 'utf8')).toContain('architecture');

    const clean = capture();
    expect(await main(['drift', root], clean.io)).toBe(0);
    expect(clean.out.join('\n')).toContain('No drift');
  });

  it('exits 1 on drift and 2 on usage or IO errors', async () => {
    const root = await fixture();
    const modelPath = join(root, 'architecture.ofk');
    await main(['discover', root, '--out', modelPath], capture().io);

    await write(root, 'docker-compose.yml', 'services:\n  api:\n    image: fixture/api:1\n  cache:\n    image: redis:7\n');
    const drifted = capture();
    expect(await main(['drift', root, '--json'], drifted.io)).toBe(1);
    const report = JSON.parse(drifted.out.join('\n')) as { drift: boolean; missing: { name: string }[] };
    expect(report.drift).toBe(true);
    expect(report.missing.map((finding) => finding.name)).toContain('cache');

    expect(await main(['drift', root, '--model', join(root, 'missing.ofk')], capture().io)).toBe(2);
    expect(await main(['build', join(root, 'nowhere')], capture().io)).toBe(2);

    const unknown = capture();
    expect(await main(['frobnicate'], unknown.io)).toBe(2);
    expect(unknown.err.join('\n')).toContain('Usage:');
    const help = capture();
    expect(await main(['--help'], help.io)).toBe(2);
    expect(help.err.join('\n')).toContain('Usage:');
    expect(help.out).toEqual([]);
    expect(await main([], capture().io)).toBe(2);
  });

  it('builds a self-contained site with views, model and flows', async () => {
    const root = await fixture();
    const modelPath = join(root, 'architecture.ofk');
    await main(['discover', root, '--out', modelPath], capture().io);
    const model = await readFile(modelPath, 'utf8');
    await writeFile(modelPath, `${model}\nflow "Checkout" {\n  step api -> db : write\n}\n`, 'utf8');

    const outDir = join(root, 'site');
    const built = capture();
    expect(await main(['build', root, '--out', outDir], built.io)).toBe(0);

    const html = await readFile(join(outDir, 'index.html'), 'utf8');
    expect(html).toContain('id="player"');
    expect(html).toContain('id="breadcrumb"');
    expect(html).toContain('data-view=');

    const siteModel = JSON.parse(await readFile(join(outDir, 'model.json'), 'utf8')) as { elements: { id: string }[] };
    expect(siteModel.elements.length).toBeGreaterThan(0);
    for (const element of siteModel.elements) {
      expect(html).toContain(`data-node-id="${element.id}"`);
    }

    const flows = JSON.parse(await readFile(join(outDir, 'flows.json'), 'utf8')) as { flows: { name: string; steps: unknown[] }[] };
    expect(flows.flows[0]?.name).toBe('Checkout');
    expect(flows.flows[0]?.steps).toHaveLength(1);

    const views = await readFile(join(outDir, 'views', 'view-landscape.svg'), 'utf8');
    expect(views).toContain('<svg');
    expect(views).toContain('data-node-id=');
  });
});
