import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyV2Document } from './v2Document';
import { buildCanonicalFixtureDocument } from './v2Export.testFixtures';
import { buildV2Thumbnail, scheduleV2Thumbnail } from './v2Thumbnail';
import type { V2DocumentRepository } from '../../../services/storage/v2/v2Repository';

afterEach(() => vi.useRealTimers());

describe('buildV2Thumbnail', () => {
  it('draws the first page in both themes, without a background, from the export renderer', async () => {
    const thumbnail = await buildV2Thumbnail(await buildCanonicalFixtureDocument());
    expect(thumbnail).not.toBeNull();
    expect(thumbnail!.light).toMatch(/^<svg/);
    expect(thumbnail!.dark).toMatch(/^<svg/);
    expect(thumbnail!.light).not.toBe(thumbnail!.dark);
    expect(thumbnail!.light).toContain('Client');
  });

  it('has nothing to draw for an empty first page', async () => {
    expect(await buildV2Thumbnail(createEmptyV2Document('empty'))).toBeNull();
  });
});

describe('scheduleV2Thumbnail', () => {
  it('waits for a quiet moment, keeps only the latest document, and never throws into the editor', async () => {
    vi.useFakeTimers();
    const saveThumbnail = vi.fn<V2DocumentRepository['saveThumbnail']>().mockRejectedValue(new Error('disk gone'));
    const repository = { saveThumbnail } as unknown as V2DocumentRepository;
    const first = await buildCanonicalFixtureDocument('First');
    const second = await buildCanonicalFixtureDocument('Second');
    scheduleV2Thumbnail(repository, 'doc-1', first);
    scheduleV2Thumbnail(repository, 'doc-1', second);
    expect(saveThumbnail).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(saveThumbnail).toHaveBeenCalledTimes(1);
    expect(saveThumbnail.mock.calls[0]![0]).toBe('doc-1');
  });
});
