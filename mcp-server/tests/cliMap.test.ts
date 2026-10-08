import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { buildRepoMap, summarizeMap } from '../src/lib/repoMap.js';
import { main, type CliIo } from '../src/cli.js';

const tempDirs: string[] = [];
afterAll(async () => { await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true }))); });

function capture(): { io: CliIo; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (m) => out.push(m), err: (m) => err.push(m) }, out, err };
}

async function write(root: string, relative: string, content: string): Promise<void> {
  const full = join(root, relative);
  await mkdir(join(full, '..'), { recursive: true });
  await writeFile(full, content, 'utf8');
}

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'openflowkit-map-'));
  tempDirs.push(root);
  return root;
}

describe('openflowkit map', () => {
  it('summarises a small TS repo with a Dockerfile', async () => {
    const root = await tempRoot();
    await write(root, 'web/package.json', '{"name":"web"}');
    await write(root, 'api/package.json', '{"name":"api"}');
    for (const n of [1, 2, 3]) {
      await write(root, `web/w${n}.ts`, `import { s } from '../api/s${n}';\nexport const w = s;\n`);
      await write(root, `api/s${n}.ts`, `import { w } from '../web/w${n}';\nexport const s = w;\n`);
    }
    await write(root, 'api/s1.test.ts', 'export {};\n');
    await write(root, 'api/Dockerfile', 'FROM node:22\nEXPOSE 8080\n');
    const { io, out, err } = capture();
    expect(await main(['map', root], io)).toBe(0);
    expect(err).toEqual([]);
    const text = out.join('\n');
    expect(text).toContain('6 files, 12 lines'); // s1.test.ts is not a source
    expect(text).toContain('6 imports resolved, 0 unresolved');
    expect(text).toContain('api <-> web  3 / 3');
    expect(text).toContain('depth overview');
  });

  it('exits 1 with one line for a path that is not a directory', async () => {
    const { io, out, err } = capture();
    expect(await main(['map', join(tmpdir(), 'openflowkit-no-such-dir-xyz')], io)).toBe(1);
    expect(out).toEqual([]);
    expect(err).toHaveLength(1);
    expect(err[0]).toMatch(/^openflowkit map: ".*" is not a directory\.$/);
  });

  it('exits 1 when the directory has no source files', async () => {
    const root = await tempRoot();
    await write(root, 'README.md', '# nothing\n');
    const { io, err } = capture();
    expect(await main(['map', root], io)).toBe(1);
    expect(err).toHaveLength(1);
    expect(err[0]).toContain('no source files');
  });

  it('rejects an unknown depth as a usage error', async () => {
    const { io, err } = capture();
    expect(await main(['map', '.', '--depth', 'deep'], io)).toBe(2);
    expect(err[0]).toContain('--depth');
  });

  it('says so when the file cap or the byte budget cuts the read, and still draws the rest with 0 lines', async () => {
    const root = await tempRoot();
    for (const n of [1, 2, 3]) await write(root, `src/f${n}.ts`, 'export {};\n');
    const byCount = await buildRepoMap(root, { maxFiles: 2 });
    expect(byCount.capped).toEqual({ read: 2, total: 3 });
    expect(summarizeMap(byCount, 'overview')).toContain('note: the map reads 2 of 3 files');
    expect(byCount.model.stats.files).toBe(3);
    const byBytes = await buildRepoMap(root, { maxBytes: 12 });
    expect(byBytes.capped).toEqual({ read: 1, total: 3 });
    const whole = await buildRepoMap(root);
    expect(whole.capped).toBeUndefined();
    expect(summarizeMap(whole, 'overview')).not.toContain('note:');
  });

  it('lists a file over 256 KB with 0 lines instead of dropping it', async () => {
    const root = await tempRoot();
    await write(root, 'src/small.ts', 'export {};\n');
    await write(root, 'src/big.ts', `export const x = [${'1,'.repeat(140_000)}];\n`);
    const map = await buildRepoMap(root);
    expect(map.model.stats.files).toBe(2);
    expect(map.model.nodes['src/big.ts']?.loc).toBe(0);
    expect(map.capped).toBeUndefined();
  });

  it('names the root after the folder', async () => {
    const root = await tempRoot();
    await write(root, 'a.ts', 'export {};\n');
    const map = await buildRepoMap(root);
    expect(map.model.nodes[map.model.root]?.name).toBe(map.name);
  });
});
