import { describe, expect, it } from 'vitest';
import { createEmptyV2Document } from '../../presentation/v2/v2Document';
import { isRepoMapAddress, repoMapDocumentId, repoMapPageOf, repoMapSourceOf, withRepoMapSource } from './repoMapSource';

const SHA = 'a'.repeat(40);

describe('repoMapSource', () => {
  const doc = createEmptyV2Document('d1');
  it('is null for a plain document', () => expect(repoMapSourceOf(doc)).toBeNull());
  it('round-trips, dropping empty fields, keeping other metadata, leaving the input alone', () => {
    const base = { ...doc, metadata: { keep: 1 } };
    const out = withRepoMapSource(base, { owner: 'a', repo: 'b', sha: SHA });
    expect(out.metadata).toEqual({ keep: 1, map: { source: { owner: 'a', repo: 'b', sha: SHA }, page: doc.pages[0]!.id } });
    expect(repoMapPageOf(out)).toBe(doc.pages[0]!.id);
    expect(repoMapPageOf(doc)).toBeNull();
    expect(repoMapPageOf({ ...doc, metadata: { map: { page: 5 } } as never })).toBeNull();
    expect(repoMapSourceOf(out)).toEqual({ owner: 'a', repo: 'b', sha: SHA });
    expect(base.metadata).toEqual({ keep: 1 });
    expect(repoMapSourceOf(withRepoMapSource(doc, { owner: 'a', repo: 'b', ref: 'dev' }))).toEqual({ owner: 'a', repo: 'b', ref: 'dev' });
  });
  it('rejects malformed metadata', () => {
    for (const map of [null, 'x', [], {}, { source: null }, { source: { owner: 'a' } }, { source: { owner: 1, repo: 'b' } }]) {
      expect(repoMapSourceOf({ ...doc, metadata: { map } as never })).toBeNull();
    }
  });
  it('rejects path-climbing, odd or oversized addresses, and a sha that is not a commit sha', () => {
    for (const source of [
      { owner: '..', repo: 'x' }, { owner: 'a', repo: '..' }, { owner: 'a', repo: '.' }, { owner: 'a', repo: 'b', ref: '../../../evil/x' },
      { owner: 'a', repo: 'b', ref: '..' }, { owner: 'a/b', repo: 'c' }, { owner: 'a', repo: 'b.git' }, { owner: 'a', repo: 'b', ref: '' },
      { owner: 'a', repo: 'b', ref: 7 }, { owner: 'a'.repeat(40), repo: 'b' }, { owner: 'a', repo: 'b', ref: 'x'.repeat(256) },
    ]) expect(repoMapSourceOf({ ...doc, metadata: { map: { source } } as never }), JSON.stringify(source)).toBeNull();
    expect(repoMapSourceOf({ ...doc, metadata: { map: { source: { owner: 'a', repo: 'b', sha: 'abc' } } } as never })).toEqual({ owner: 'a', repo: 'b' });
    expect(isRepoMapAddress({ owner: 'a', repo: 'b', ref: 'release%2F2' })).toBe(true);
  });
  it('gives one stable id per repo and ref', () => {
    expect(repoMapDocumentId({ owner: 'a', repo: 'b' })).toBe('map-a_b');
    expect(repoMapDocumentId({ owner: 'a', repo: 'b', ref: 'HEAD' })).toBe('map-a_b');
    expect(repoMapDocumentId({ owner: 'a-b', repo: 'c' })).not.toBe(repoMapDocumentId({ owner: 'a', repo: 'b-c' }));
    expect(repoMapDocumentId({ owner: 'a', repo: 'r-xyz' })).not.toBe(repoMapDocumentId({ owner: 'a', repo: 'r', ref: 'xyz' }));
    const dev = repoMapDocumentId({ owner: 'a', repo: 'b', ref: 'dev' });
    expect(dev).toBe(repoMapDocumentId({ owner: 'a', repo: 'b', ref: 'dev' }));
    expect(dev).not.toBe(repoMapDocumentId({ owner: 'a', repo: 'b', ref: 'main' }));
    expect(dev).toMatch(/^map-a_b@[a-z0-9]+$/);
  });
});
