import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseRepoPath } from './agent.js';

const run = promisify(execFile);

/**
 * Every git call goes through here. A checkout we are asked to read may be someone else's: its .git/config can name a
 * command for `core.fsmonitor`, which git runs on many read-only commands. Turning it off first keeps `map` read-only.
 */
async function git(dir: string, ...args: string[]): Promise<string | null> {
  try {
    return (await run('git', ['-c', 'core.fsmonitor=false', ...args], { cwd: dir, maxBuffer: 512 * 1024 * 1024 })).stdout;
  } catch {
    return null;
  }
}

/** The files git tracks under `dir` (paths relative to `dir`), or null when `dir` is not inside a git work tree. */
export async function trackedFiles(dir: string): Promise<string[] | null> {
  if ((await git(dir, 'rev-parse', '--is-inside-work-tree'))?.trim() !== 'true') return null;
  const listed = await git(dir, 'ls-files', '-z', '--cached');
  return listed === null ? null : listed.split('\0').filter(Boolean);
}

export interface GithubRepo {
  readonly owner: string;
  readonly repo: string;
  readonly ref: string;
}

/** `owner/repo` of a github.com https or ssh remote, by the app's own rules for repo addresses; else null. */
export function parseGithubRemote(url: string): { owner: string; repo: string } | null {
  const match = /^(?:https:\/\/(?:[^@/]+@)?github\.com\/|ssh:\/\/git@github\.com\/|git@github\.com:)([^/]+\/[^/]+?)\/?$/.exec(url.trim());
  const parsed = match ? parseRepoPath(match[1]!) : null;
  return parsed ? { owner: parsed.owner, repo: parsed.repo } : null;
}

export interface Origin {
  /** The remote's `owner/repo` when it is a github.com one. */
  readonly remote: { owner: string; repo: string } | null;
  /** Set only when evidence links are right: `dir` is the repository root and HEAD is a commit. */
  readonly github: GithubRepo | null;
}

export async function originOf(dir: string): Promise<Origin> {
  const url = (await git(dir, 'remote', 'get-url', 'origin'))?.trim();
  const remote = url ? parseGithubRemote(url) : null;
  const atRoot = (await git(dir, 'rev-parse', '--show-prefix'))?.trim() === '';
  const sha = (await git(dir, 'rev-parse', 'HEAD'))?.trim();
  return { remote, github: remote && atRoot && sha && /^[0-9a-f]{40}$/.test(sha) ? { ...remote, ref: sha } : null };
}
