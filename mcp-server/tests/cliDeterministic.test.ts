import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { main } from '../src/cli.js';

const tempDirs: string[] = [];
afterAll(async () => { await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true }))); });
const quiet = { out: () => undefined, err: () => undefined };

describe('headless renders are deterministic (a committed SVG must not churn)', () => {
  it('render of the same DSL twice is byte-identical', async () => {
    const run = async () => { const out: string[] = []; expect(await main(['render', '-'], { out: (m) => out.push(m), err: () => undefined, stdin: async () => 'Shop\nDB\nShop -> DB: reads' })).toBe(0); return out.join('\n'); };
    const first = await run();
    expect(first.startsWith('<svg')).toBe(true);
    expect(await run()).toBe(first);
  });

  it('discover --out twice writes the same .svg', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openflowkit-det-'));
    tempDirs.push(root);
    await writeFile(join(root, 'docker-compose.yml'), 'services:\n  api:\n    image: fixture/api:1\n  db:\n    image: postgres:16\n', 'utf8');
    const out = join(root, 'architecture.ofk');
    expect(await main(['discover', root, '--out', out], quiet)).toBe(0);
    const first = await readFile(join(root, 'architecture.svg'), 'utf8');
    expect(await main(['discover', root, '--out', out], quiet)).toBe(0);
    expect(await readFile(join(root, 'architecture.svg'), 'utf8')).toBe(first);
  });

  it('discover --out x.ofk writes an x.svg byte-equal to `render x.ofk`', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openflowkit-det-'));
    tempDirs.push(root);
    await writeFile(join(root, 'docker-compose.yml'), 'services:\n  api:\n    image: fixture/api:1\n', 'utf8');
    const out = join(root, 'x.ofk');
    expect(await main(['discover', root, '--out', out], quiet)).toBe(0);
    const rendered: string[] = [];
    expect(await main(['render', out], { out: (m) => rendered.push(m), err: () => undefined })).toBe(0);
    expect((await readFile(join(root, 'x.svg'), 'utf8')).trimEnd()).toBe(rendered.join('\n').trimEnd());
  });

  it('convert keeps a random document id (the MCP store keys by id), render stays stable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openflowkit-det-'));
    tempDirs.push(root);
    await writeFile(join(root, 'm.ofk'), 'Shop\nDB\nShop -> DB: reads\n', 'utf8');
    const idOf = async (file: string) => (JSON.parse(await readFile(file, 'utf8')) as { id: string }).id;
    expect(await main(['convert', join(root, 'm.ofk'), '-o', join(root, 'a.openflow.json')], quiet)).toBe(0);
    expect(await main(['convert', join(root, 'm.ofk'), '-o', join(root, 'b.openflow.json')], quiet)).toBe(0);
    expect(await idOf(join(root, 'a.openflow.json'))).not.toBe(await idOf(join(root, 'b.openflow.json')));
    // the picture written beside is stable all the same
    expect(await main(['convert', join(root, 'm.ofk'), '-o', join(root, 'c.openflow.json'), '--svg'], quiet)).toBe(0);
    expect(await main(['convert', join(root, 'm.ofk'), '-o', join(root, 'c.openflow.json'), '--svg'], quiet)).toBe(0);
    const first = await readFile(join(root, 'c.svg'), 'utf8');
    expect(await main(['convert', join(root, 'm.ofk'), '-o', join(root, 'c.openflow.json'), '--svg'], quiet)).toBe(0);
    expect(await readFile(join(root, 'c.svg'), 'utf8')).toBe(first);
  });
});
