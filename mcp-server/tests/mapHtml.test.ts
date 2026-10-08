import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { main } from '../src/cli.js';
import { parseGithubRemote } from '../src/lib/mapGit.js';
import { safeJson } from '../src/lib/mapHtml.js';

const tempDirs: string[] = [];
afterAll(async () => { await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true }))); });

describe('map --html helpers', () => {
  it('reads github.com https and ssh remotes, and nothing else', () => {
    expect(parseGithubRemote('https://github.com/o/r.git')).toEqual({ owner: 'o', repo: 'r' });
    expect(parseGithubRemote('https://github.com/o/r')).toEqual({ owner: 'o', repo: 'r' });
    expect(parseGithubRemote('git@github.com:o/r.git')).toEqual({ owner: 'o', repo: 'r' });
    expect(parseGithubRemote('ssh://git@github.com/o/r.git')).toEqual({ owner: 'o', repo: 'r' });
    expect(parseGithubRemote('https://gitlab.com/o/r.git')).toBeNull();
    expect(parseGithubRemote('https://github.com.evil.io/o/r')).toBeNull();
    expect(parseGithubRemote('/srv/git/r.git')).toBeNull();
    expect(parseGithubRemote('https://github.com/o/..')).toBeNull();
    expect(parseGithubRemote('https://github.com/o/.git')).toBeNull();
    expect(parseGithubRemote('https://github.com/o/r/tree/x')).toBeNull();
  });
  it('escapes what could end the script element', () => {
    const json = safeJson({ a: '</script><!-- & \u2028' });
    expect(json).not.toMatch(/[<>&\u2028]/);
    expect(JSON.parse(json)).toEqual({ a: '</script><!-- & \u2028' });
  });
});

describe('openflowkit map --html', () => {
  it('writes one offline page with a CSP, the model inlined, and no links outside a github checkout', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openflowkit-maphtml-'));
    tempDirs.push(root);
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'a.ts'), "import { b } from './b';\nexport const a = b;\n", 'utf8');
    await writeFile(join(root, 'src', 'b.ts'), 'export const b = 1;\n', 'utf8');
    const out = join(root, 'out', 'map.html');
    const lines: string[] = [];
    expect(await main(['map', root, '--html', out], { out: (m) => lines.push(m), err: () => undefined })).toBe(0);
    expect(lines.join('\n')).toMatch(/wrote .*map\.html \(\d+\.\d MB\) — no evidence links/);
    const html = await readFile(out, 'utf8');
    expect(html).toMatch(/content="default-src 'none'; script-src 'sha256-[A-Za-z0-9+/]+={0,2}'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"/);
    expect(html.match(/<script[ >]/g)!.length).toBeGreaterThanOrEqual(2);
    const data = /<script type="application\/json" id="ofk-map-data">([^<]*)<\/script>/.exec(html);
    expect(data).not.toBeNull();
    const parsed = JSON.parse(data![1]!) as { repo: unknown; depth: string; model: { stats: { files: number } } };
    expect(parsed).toMatchObject({ repo: null, depth: 'overview', model: { stats: { files: 2 } } });
    expect(html).not.toMatch(/<(?:link|img|iframe)\s|<script[^>]*\ssrc=/i);
  });
});

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' }).trim();

async function gitRepo(origin?: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'openflowkit-maphtml-git-'));
  tempDirs.push(root);
  git(root, 'init', '-q');
  if (origin) git(root, 'remote', 'add', 'origin', origin);
  return root;
}

describe('map in a git checkout', () => {
  it('maps tracked files only and links to the commit on github.com', async () => {
    const root = await gitRepo('git@github.com:acme/widgets.git');
    await writeFile(join(root, '.gitignore'), 'secret/\n', 'utf8');
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'secret'), { recursive: true });
    await writeFile(join(root, 'src', 'a.ts'), "import { b } from './b';\nexport const a = b;\n", 'utf8');
    await writeFile(join(root, 'src', 'b.ts'), 'export const b = 1;\n', 'utf8');
    await writeFile(join(root, 'secret', 'plans.ts'), 'export const p = 1;\n', 'utf8');
    await writeFile(join(root, 'src', 'untracked.ts'), 'export const u = 1;\n', 'utf8');
    await symlink('/etc/hosts', join(root, 'src', 'link.ts'));
    git(root, 'add', '.gitignore', 'src/a.ts', 'src/b.ts');
    git(root, 'add', '-f', 'src/link.ts');
    git(root, 'commit', '-q', '-m', 'init');
    const sha = git(root, 'rev-parse', 'HEAD');
    const out = join(root, '..', `${root.split('/').pop()}.html`);
    tempDirs.push(out);
    const lines: string[] = [];
    expect(await main(['map', root, '--html', out], { out: (m) => lines.push(m), err: () => undefined })).toBe(0);
    expect(lines.join('\n')).toContain('2 files');
    expect(lines.join('\n')).toContain('acme/widgets');
    const html = await readFile(out, 'utf8');
    const data = JSON.parse(/id="ofk-map-data">([^<]*)</.exec(html)![1]!) as { repo: unknown; name: string; model: { nodes: Record<string, unknown> } };
    expect(data.repo).toEqual({ owner: 'acme', repo: 'widgets', ref: sha });
    expect(data.name).toBe('widgets');
    expect(Object.keys(data.model.nodes).filter((id) => /plans|untracked|link/.test(id))).toEqual([]);
  });

  it('gives no links without a github.com origin, or from a subfolder', async () => {
    const lab = await gitRepo('https://gitlab.com/acme/widgets.git');
    await writeFile(join(lab, 'a.ts'), 'export {};\n', 'utf8');
    await mkdir(join(lab, 'pkg'), { recursive: true });
    await writeFile(join(lab, 'pkg', 'b.ts'), 'export {};\n', 'utf8');
    git(lab, 'add', '.');
    git(lab, 'commit', '-q', '-m', 'init');
    const out = join(lab, '..', `${lab.split('/').pop()}.html`);
    tempDirs.push(out);
    for (const dir of [lab, join(lab, 'pkg')]) {
      expect(await main(['map', dir, '--html', out], { out: () => undefined, err: () => undefined })).toBe(0);
      expect(/id="ofk-map-data">([^<]*)</.exec(await readFile(out, 'utf8'))![1]).toContain('"repo":null');
    }
    const hub = await gitRepo('https://github.com/acme/widgets.git');
    await mkdir(join(hub, 'pkg'), { recursive: true });
    await writeFile(join(hub, 'pkg', 'b.ts'), 'export {};\n', 'utf8');
    git(hub, 'add', '.');
    git(hub, 'commit', '-q', '-m', 'init');
    expect(await main(['map', join(hub, 'pkg'), '--html', out], { out: () => undefined, err: () => undefined })).toBe(0);
    expect(/id="ofk-map-data">([^<]*)</.exec(await readFile(out, 'utf8'))![1]).toContain('"repo":null');
  });

  it('never runs a command named by the checkout\'s own git config', async () => {
    const root = await gitRepo();
    const marker = join(root, '..', `${root.split('/').pop()}.fsmonitor-ran`);
    tempDirs.push(marker);
    await writeFile(join(root, 'a.ts'), 'export {};\n', 'utf8');
    git(root, 'add', '.');
    git(root, 'commit', '-q', '-m', 'init');
    await writeFile(join(root, '.git', 'config'), `${await readFile(join(root, '.git', 'config'), 'utf8')}[core]\n\tfsmonitor = "touch ${marker}; echo"\n`, 'utf8');
    expect(await main(['map', root], { out: () => undefined, err: () => undefined })).toBe(0);
    expect(existsSync(marker)).toBe(false);
  });
});

describe('hostile file names', () => {
  it('cannot add a script, a comment or a line break to the page', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openflowkit-maphtml-evil-'));
    tempDirs.push(root);
    const names = ['<!--<script>.ts', 'a\u2028b.ts', '<SCRIPT>x.ts', '"><img src=x onerror=alert(1)>.ts'];
    for (const name of names) await writeFile(join(root, name), 'export {};\n', 'utf8');
    const out = join(root, 'out.html');
    expect(await main(['map', root, '--html', out], { out: () => undefined, err: () => undefined })).toBe(0);
    const html = await readFile(out, 'utf8');
    expect(html.match(/<\/script/gi)).toHaveLength(2); // the data and the viewer, nothing more
    expect(html.match(/<script[ >]/gi)!.length).toBeLessThanOrEqual(3); // the viewer's own code mentions the tag once
    expect(html).not.toMatch(/<!--/);
    expect(html).not.toMatch(/<img\s/i);
    const json = /id="ofk-map-data">([^<]*)</.exec(html)![1]!;
    expect(json).not.toMatch(/[\u2028\u2029]/);
    const nodes = Object.keys((JSON.parse(json) as { model: { nodes: Record<string, unknown> } }).model.nodes);
    for (const name of names) expect(nodes).toContain(name);
  });
});
