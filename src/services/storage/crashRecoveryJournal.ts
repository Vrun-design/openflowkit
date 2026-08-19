import type { FlowState } from '@/store/types';
import { syncWorkspaceDocuments } from '@/store/documentStateSync';
import { createLoadedFlowWorkspace } from './localFirstRepository';
import { createPersistedDocumentsFromFlowDocuments } from './persistedDocumentAdapters';
import type { LoadedDocument, PersistedDocument, WorkspaceMeta } from './persistenceTypes';

export const CRASH_JOURNAL_KEY = 'openflowkit:crash-journal:v1';
const VERSION = 1;
const MAX_ENTRIES = 8;
const MAX_BYTES = 4_000_000;

export interface CrashJournalEntry {
  readonly version: 1;
  readonly id: string;
  readonly createdAt: string;
  readonly activeDocumentId: string | null;
  readonly documents: PersistedDocument[];
}

type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function parseEntries(raw: string | null): CrashJournalEntry[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is CrashJournalEntry => Boolean(entry)
      && typeof entry === 'object' && entry.version === VERSION
      && typeof entry.id === 'string' && typeof entry.createdAt === 'string'
      && Array.isArray(entry.documents));
  } catch { return []; }
}

export function readCrashJournal(storage: StoragePort): CrashJournalEntry[] {
  return parseEntries(storage.getItem(CRASH_JOURNAL_KEY));
}

export function appendCrashJournal(state: Pick<FlowState,
  'documents' | 'activeDocumentId' | 'tabs' | 'activeTabId' | 'nodes' | 'edges'>,
storage: StoragePort, now = new Date()): CrashJournalEntry | null {
  const documents = syncWorkspaceDocuments(state);
  if (documents.length === 0) return null;
  const entry: CrashJournalEntry = {
    version: VERSION, id: `${now.getTime()}:${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now.toISOString(), activeDocumentId: state.activeDocumentId || null,
    documents: createPersistedDocumentsFromFlowDocuments(documents),
  };
  let entries = [...readCrashJournal(storage), entry].slice(-MAX_ENTRIES);
  while (entries.length > 1 && JSON.stringify(entries).length > MAX_BYTES) entries = entries.slice(1);
  storage.setItem(CRASH_JOURNAL_KEY, JSON.stringify(entries));
  return entry;
}

export function clearCrashJournal(storage: StoragePort): void {
  storage.removeItem(CRASH_JOURNAL_KEY);
}

export function acknowledgeCrashJournal(storage: StoragePort, checkpointId: string | null): void {
  if (!checkpointId) return;
  const entries = readCrashJournal(storage);
  const checkpointIndex = entries.findIndex(({ id }) => id === checkpointId);
  if (checkpointIndex < 0) return;
  const remaining = entries.slice(checkpointIndex + 1);
  if (remaining.length === 0) clearCrashJournal(storage);
  else storage.setItem(CRASH_JOURNAL_KEY, JSON.stringify(remaining));
}

export function resolveRecoverableJournal(storage: StoragePort,
  persistedUpdatedAt: string | null): CrashJournalEntry | null {
  const entries = readCrashJournal(storage);
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (!entry || (persistedUpdatedAt && entry.createdAt <= persistedUpdatedAt)) continue;
    try { createLoadedFlowWorkspace(toLoadedDocument(entry)); return entry; } catch { /* skip corrupt */ }
  }
  return null;
}

export function toLoadedDocument(entry: CrashJournalEntry): LoadedDocument {
  const activeDocumentId = entry.documents.some(({ id }) => id === entry.activeDocumentId)
    ? entry.activeDocumentId : entry.documents[0]?.id ?? null;
  const workspaceMeta: WorkspaceMeta = { id: 'workspace', activeDocumentId,
    documentOrder: entry.documents.map(({ id }) => id), lastOpenedAt: entry.createdAt };
  return { document: entry.documents.find(({ id }) => id === activeDocumentId) ?? null,
    documents: entry.documents, workspaceMeta };
}
