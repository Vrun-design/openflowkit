import { afterEach, describe, expect, it } from 'vitest';
import type { FlowSnapshot } from '@/lib/types';
import {
  loadSnapshots,
  saveSnapshots,
  saveSnapshotsWithQuotaRecovery,
} from './snapshotStorage';

const SNAPSHOT_KEY = 'flowmind_snapshots';

function createSnapshot(id: string): FlowSnapshot {
  return {
    id,
    name: `Snapshot ${id}`,
    timestamp: '2026-03-05T00:00:00.000Z',
    nodes: [],
    edges: [],
  };
}

function quotaError(): DOMException {
  return new DOMException('Storage full.', 'QuotaExceededError');
}

describe('snapshotStorage local fallback', () => {
  const originalIndexedDb = globalThis.indexedDB;

  afterEach(() => {
    localStorage.removeItem(SNAPSHOT_KEY);
    if (typeof originalIndexedDb === 'undefined') {
      delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    } else {
      globalThis.indexedDB = originalIndexedDb;
    }
  });

  it('loads snapshots from localStorage when IndexedDB is unavailable', async () => {
    delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    const expected = [createSnapshot('snap-1')];
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(expected));

    const loaded = await loadSnapshots();

    expect(loaded).toEqual(expected);
  });

  it('saves snapshots to localStorage when IndexedDB is unavailable', async () => {
    delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    const expected = [createSnapshot('snap-2')];

    await saveSnapshots(expected);

    expect(localStorage.getItem(SNAPSHOT_KEY)).toBe(JSON.stringify(expected));
  });

  it('drops automatic snapshots before manual snapshots under quota pressure', async () => {
    const snapshots = [
      { ...createSnapshot('auto-new'), kind: 'auto' as const },
      { ...createSnapshot('manual'), kind: 'manual' as const },
      { ...createSnapshot('auto-old'), kind: 'auto' as const },
    ];
    const writes: FlowSnapshot[][] = [];
    const result = await saveSnapshotsWithQuotaRecovery(snapshots, (candidate) => {
      writes.push(candidate);
      if (candidate.length > 1) throw quotaError();
    });

    expect(result).toEqual({ status: 'degraded', retainedCount: 1, droppedAutoCount: 2 });
    expect(writes.at(-1)?.map(({ id }) => id)).toEqual(['manual']);
  });

  it('does not hide unrelated snapshot write failures', async () => {
    await expect(saveSnapshotsWithQuotaRecovery([createSnapshot('one')], () => {
      throw new Error('transaction aborted');
    })).rejects.toThrow('transaction aborted');
  });
});
