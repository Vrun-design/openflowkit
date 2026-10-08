// @vitest-environment node
// Real git repo + the real built CLI (mcp-server/dist/cli.js; needs `npm run build:agent` and the MCP build). No stubs.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MARKER } from './prDiagrams.lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(here, '../mcp-server/dist/cli.js');
const SCRIPT = path.join(here, 'pr-diagrams.mjs');
const built = existsSync(CLI);

const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' }).trim();
const ofk = (cwd, ...args) => execFileSync('node', [CLI, ...args], { cwd, encoding: 'utf8' });

function prRepo(prefix, { headRepo = 'o/r' } = {}) {
  const repo = mkdtempSync(path.join(tmpdir(), prefix));
  git(repo, 'init', '-q', '-b', 'main');
  const event = (baseSha) => {
    const file = path.join(repo, '..', `event-${path.basename(repo)}.json`);
    writeFileSync(file, JSON.stringify({ pull_request: { number: 7, base: { sha: baseSha, repo: { full_name: 'o/r' } }, head: { sha: git(repo, 'rev-parse', 'HEAD'), ref: 'feat', repo: { full_name: headRepo } } } }));
    return file;
  };
  return { repo, event };
}
const runDry = (repo, event, extra = {}) => spawnSync('node', [SCRIPT, '--dry-run'], {
  cwd: repo, encoding: 'utf8', env: { ...process.env, GITHUB_EVENT_PATH: event, GITHUB_REPOSITORY: 'o/r', OFK_CLI: `node ${CLI}`, ...extra },
});

// Outside CI an unbuilt CLI skips these; in CI it is a failure, not a silent pass.
describe.skipIf(!built && !process.env.CI)('pr-diagrams --dry-run', () => {
  it('the MCP CLI is built', () => { expect(built, 'run npm run build:agent && npm --prefix mcp-server run build').toBe(true); });

  it('rendering is stable: documents and DSL text are both byte-identical', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ofk-det-'));
    writeFileSync(path.join(dir, 'm.ofk'), 'Shop\nDB\nShop -> DB: reads\n');
    ofk(dir, 'convert', 'm.ofk', '-o', 'm.openflow.json');
    const exp = () => ofk(dir, 'op', 'export', '--doc', 'm.openflow.json', '--args', JSON.stringify({ format: 'svg', scope: 'page' }));
    expect(exp()).toBe(exp());
    const a = ofk(dir, 'render', 'm.ofk'), b = ofk(dir, 'render', 'm.ofk');
    expect(a.startsWith('<svg')).toBe(true);
    expect(a).toBe(b);
  }, 60000);

  it('posts the marker, the DSL diff and the stale note, and commits nothing', () => {
    const repo = mkdtempSync(path.join(tmpdir(), 'ofk-pr-'));
    git(repo, 'init', '-q', '-b', 'main');
    ofk(repo, 'op', 'create_diagram', '--doc', 'd.openflow.json', '--svg', '--args', JSON.stringify({ dsl: 'Shop\nDB\nShop -> DB: reads' }));
    expect(existsSync(path.join(repo, 'd.svg'))).toBe(true);
    git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'base');
    const baseSha = git(repo, 'rev-parse', 'HEAD');

    const frame = JSON.parse(ofk(repo, 'op', 'get_diagram', '--doc', 'd.openflow.json')).output.frameId;
    ofk(repo, 'op', 'update_diagram', '--doc', 'd.openflow.json', '--args', JSON.stringify({ frameId: frame, dsl: 'Shop\nDB\nCache\nShop -> DB: reads\nShop -> Cache: hits' })); // no --svg: d.svg goes stale
    git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'head');
    const headSha = git(repo, 'rev-parse', 'HEAD');

    const event = path.join(repo, '..', `event-${path.basename(repo)}.json`);
    writeFileSync(event, JSON.stringify({ pull_request: { number: 7, base: { sha: baseSha, repo: { full_name: 'o/r' } }, head: { sha: headSha, ref: 'feat', repo: { full_name: 'o/r' } } } }));
    const r = spawnSync('node', [SCRIPT, '--dry-run'], {
      cwd: repo, encoding: 'utf8',
      env: { ...process.env, GITHUB_EVENT_PATH: event, GITHUB_REPOSITORY: 'o/r', OFK_CLI: `node ${CLI}`, OFK_PATHS: '.openflow.json,.ofk', OFK_REFRESH_SVG: 'true' },
    });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain(MARKER);
    expect(r.stdout).toContain('```diff');
    expect(r.stdout).toContain('+Cache');
    expect(r.stdout).toContain('2 nodes, 1 connectors -> 3 nodes, 2 connectors');
    expect(r.stdout).toContain('` d.svg ` differs from a fresh render');
    expect(git(repo, 'rev-parse', 'HEAD')).toBe(headSha);
    expect(git(repo, 'status', '--porcelain')).toBe('');
  }, 120000);

  it('does not flag an unchanged diagram whose fresh svg discover --out wrote', () => {
    const { repo, event } = prRepo('ofk-pr-fresh-');
    writeFileSync(path.join(repo, 'docker-compose.yml'), 'services:\n  api:\n    image: fixture/api:1\n  db:\n    image: postgres:16\n');
    ofk(repo, 'discover', '.', '--out', 'architecture.ofk');
    git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'base');
    const baseSha = git(repo, 'rev-parse', 'HEAD');
    git(repo, 'mv', 'architecture.ofk', 'arch.ofk'); git(repo, 'mv', 'architecture.svg', 'arch.svg'); git(repo, 'commit', '-qm', 'rename');
    const r = runDry(repo, event(baseSha));
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain('renamed from');
    expect(r.stdout).not.toContain('Stale SVGs');
  }, 120000);

  it('a fork PR writes the body to the job summary and never calls gh', () => {
    const { repo, event } = prRepo('ofk-pr-fork-', { headRepo: 'fork/r' });
    writeFileSync(path.join(repo, 'a.ofk'), 'A -> B\n'); git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'base');
    const baseSha = git(repo, 'rev-parse', 'HEAD');
    writeFileSync(path.join(repo, 'a.ofk'), 'A -> B\nB -> C\n'); git(repo, 'commit', '-qam', 'head');
    const summary = path.join(repo, '..', `summary-${path.basename(repo)}.md`);
    const bin = mkdtempSync(path.join(tmpdir(), 'ofk-fakegh-'));
    writeFileSync(path.join(bin, 'gh'), '#!/bin/sh\necho called > "$GH_CALLED"\nexit 1\n', { mode: 0o755 });
    const called = path.join(bin, 'called');
    const r = runDry(repo, event(baseSha), { GITHUB_STEP_SUMMARY: summary, PATH: `${bin}:${process.env.PATH}`, GH_CALLED: called });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toBe('');
    expect(readFileSync(summary, 'utf8')).toContain(MARKER);
    expect(readFileSync(summary, 'utf8')).toContain('+B -> C');
    expect(existsSync(called)).toBe(false);
  }, 60000);

  it('posts nothing when no diagram changed', () => {
    const repo = mkdtempSync(path.join(tmpdir(), 'ofk-pr-none-'));
    git(repo, 'init', '-q', '-b', 'main');
    writeFileSync(path.join(repo, 'a.txt'), '1'); git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'base');
    const baseSha = git(repo, 'rev-parse', 'HEAD');
    writeFileSync(path.join(repo, 'a.txt'), '2'); git(repo, 'commit', '-qam', 'head');
    const event = path.join(repo, '..', `event-${path.basename(repo)}.json`);
    writeFileSync(event, JSON.stringify({ pull_request: { number: 7, base: { sha: baseSha, repo: { full_name: 'o/r' } }, head: { sha: git(repo, 'rev-parse', 'HEAD'), ref: 'f', repo: { full_name: 'o/r' } } } }));
    const r = spawnSync('node', [SCRIPT, '--dry-run'], { cwd: repo, encoding: 'utf8', env: { ...process.env, GITHUB_EVENT_PATH: event, OFK_CLI: `node ${CLI}` } });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  }, 60000);
});
