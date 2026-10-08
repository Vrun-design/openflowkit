import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';

// discover's model is generated and always compiles, so a failing compile is forced here.
vi.mock('../src/cliCommands.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/cliCommands.js')>(),
  documentOfDsl: async () => null,
}));

const tempDirs: string[] = [];
afterAll(async () => { await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true }))); });

describe('discover --out when the model does not compile', () => {
  it('keeps the model, writes no SVG, and says an older SVG is stale', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openflowkit-discover-svg-'));
    tempDirs.push(root);
    await writeFile(join(root, 'docker-compose.yml'), 'services:\n  api:\n    image: fixture/api:1\n', 'utf8');
    const out = join(root, 'architecture.ofk');
    const first: string[] = [];
    expect(await main(['discover', root, '--out', out], { out: () => undefined, err: (m) => first.push(m) })).toBe(0);
    expect(first.join('\n')).toContain('does not compile; no svg written');
    expect(first.join('\n')).not.toContain('stale');
    expect(existsSync(join(root, 'architecture.svg'))).toBe(false);

    await writeFile(join(root, 'architecture.svg'), '<svg old/>', 'utf8');
    const second: string[] = [];
    expect(await main(['discover', root, '--out', out], { out: () => undefined, err: (m) => second.push(m) })).toBe(0);
    expect(second.join('\n')).toContain('architecture.svg is now stale');
    expect(await readFile(join(root, 'architecture.svg'), 'utf8')).toBe('<svg old/>');
  });
});
