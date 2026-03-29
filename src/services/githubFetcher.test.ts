import { describe, it, expect } from 'vitest';
import { parseGitHubUrl } from './githubFetcher';

describe('parseGitHubUrl', () => {
  it('parses full GitHub URL', () => {
    const result = parseGitHubUrl('https://github.com/user/repo');
    expect(result).toEqual({ owner: 'user', repo: 'repo', branch: 'main' });
  });

  it('parses GitHub URL with trailing slash', () => {
    const result = parseGitHubUrl('https://github.com/user/repo/');
    expect(result).toEqual({ owner: 'user', repo: 'repo', branch: 'main' });
  });

  it('parses GitHub URL with branch', () => {
    const result = parseGitHubUrl('https://github.com/user/repo/tree/develop');
    expect(result).toEqual({ owner: 'user', repo: 'repo', branch: 'develop' });
  });

  it('parses shorthand owner/repo', () => {
    const result = parseGitHubUrl('user/repo');
    expect(result).toEqual({ owner: 'user', repo: 'repo', branch: 'main' });
  });

  it('strips .git suffix', () => {
    const result = parseGitHubUrl('https://github.com/user/repo.git');
    expect(result).toEqual({ owner: 'user', repo: 'repo', branch: 'main' });
  });

  it('returns null for invalid URLs', () => {
    expect(parseGitHubUrl('https://gitlab.com/user/repo')).toBeNull();
    expect(parseGitHubUrl('not a url')).toBeNull();
    expect(parseGitHubUrl('')).toBeNull();
  });
});
