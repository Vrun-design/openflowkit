import { describe, expect, it } from 'vitest';
import { RepoError } from '../../../services/discovery/githubRepo';
import { describeRepoError } from './v2RepoProblem';

describe('describeRepoError', () => {
  it('a pause GitHub asked for says to wait and retry, with no token form (a token would not help)', () => {
    const view = describeRepoError(new RepoError({ kind: 'slow-down', retryAfter: 60 }, 'GitHub asked for a pause between reads. Wait 60 seconds and try again.'), 'map');
    expect(view).toMatchObject({ retry: true, title: 'GitHub asked to wait before more reads.' });
    expect(view.askToken).toBeUndefined();
    expect(view.detail).toContain('Wait 60 seconds');
  });

  it('a private repo points at the CLI and offers no retry that could never work', () => {
    const view = describeRepoError(new RepoError({ kind: 'private' }, 'acme/shop looks private.'), 'discover');
    expect(view).toMatchObject({ retry: false, title: 'This repo is private.' });
    expect(view.askToken).toBeUndefined();
    expect(view.detail).toContain('openflowkit discover .');
  });

  it('the hourly limit still asks for a token', () => {
    expect(describeRepoError(new RepoError({ kind: 'rate-limited', resetAt: null }, 'used up.'), 'map').askToken).toBe(true);
  });
});
