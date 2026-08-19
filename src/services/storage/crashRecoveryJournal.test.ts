import { describe, expect, it } from 'vitest';
import { acknowledgeCrashJournal, appendCrashJournal, clearCrashJournal, readCrashJournal,
  resolveRecoverableJournal } from './crashRecoveryJournal';
import { createInitialFlowState } from '@/store/persistence';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key), clear: () => values.clear(), key: () => null,
    get length() { return values.size; } } as Storage;
}

describe('crash recovery journal', () => {
  it('appends bounded workspace snapshots and resolves only newer valid recovery', () => {
    const storage = memoryStorage(); const state = createInitialFlowState();
    const tab = { id: 'doc-1', name: 'Recovered', nodes: [], edges: [],
      history: { past: [], future: [] } };
    state.tabs = [tab]; state.activeTabId = tab.id; state.activeDocumentId = tab.id;
    state.documents = [{ id: tab.id, name: tab.name,
      createdAt: '2026-08-13T08:00:00Z', updatedAt: '2026-08-13T08:00:00Z',
      activePageId: tab.id, pages: [tab] }];
    const entry = appendCrashJournal(state, storage, new Date('2026-08-13T10:00:00Z'));
    expect(entry).not.toBeNull(); expect(readCrashJournal(storage)).toHaveLength(1);
    expect(resolveRecoverableJournal(storage, '2026-08-13T09:00:00Z')?.id).toBe(entry?.id);
    expect(resolveRecoverableJournal(storage, '2026-08-13T11:00:00Z')).toBeNull();
  });

  it('ignores malformed entries and clears explicitly', () => {
    const storage = memoryStorage(); storage.setItem('openflowkit:crash-journal:v1', '[{"bad":true}]');
    expect(resolveRecoverableJournal(storage, null)).toBeNull();
    clearCrashJournal(storage); expect(readCrashJournal(storage)).toEqual([]);
  });

  it('acknowledges only entries included in a durable save checkpoint', () => {
    const storage = memoryStorage(); const state = createInitialFlowState();
    const tab = { id: 'doc-1', name: 'Recovered', nodes: [], edges: [],
      history: { past: [], future: [] } };
    state.tabs = [tab]; state.activeTabId = tab.id; state.activeDocumentId = tab.id;
    state.documents = [{ id: tab.id, name: tab.name, createdAt: '2026-08-13T08:00:00Z',
      updatedAt: '2026-08-13T08:00:00Z', activePageId: tab.id, pages: [tab] }];
    const first = appendCrashJournal(state, storage, new Date('2026-08-13T10:00:00Z'))!;
    const second = appendCrashJournal(state, storage, new Date('2026-08-13T10:00:01Z'))!;
    acknowledgeCrashJournal(storage, first.id);
    expect(readCrashJournal(storage).map(({ id }) => id)).toEqual([second.id]);
  });
});
