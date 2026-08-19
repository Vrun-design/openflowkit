import { applyDocumentCommand } from '../../domain/commands/execute';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { DocumentHistoryEntry, DocumentHistoryState } from './types';

const DEFAULT_HISTORY_LIMIT = 100;

function requireHistoryLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('Document history limit must be a positive integer.');
  }
  return limit;
}

function appendBounded<T>(values: readonly T[], value: T, limit: number): readonly T[] {
  const appended = [...values, value];
  return appended.length > limit ? appended.slice(appended.length - limit) : appended;
}

export function createDocumentHistory(
  document: SceneDocumentV1,
  limit = DEFAULT_HISTORY_LIMIT
): DocumentHistoryState {
  return { present: document, past: [], future: [], limit: requireHistoryLimit(limit) };
}

export function commitDocumentCommand(
  history: DocumentHistoryState,
  command: DocumentCommand
): DocumentHistoryState {
  const applied = applyDocumentCommand(history.present, command);
  const entry: DocumentHistoryEntry = { command, inverse: applied.inverse };
  return {
    ...history,
    present: applied.document,
    past: appendBounded(history.past, entry, history.limit),
    future: [],
  };
}

export function undoDocumentCommand(history: DocumentHistoryState): DocumentHistoryState {
  const entry = history.past[history.past.length - 1];
  if (!entry) return history;
  const applied = applyDocumentCommand(history.present, entry.inverse);
  return {
    ...history,
    present: applied.document,
    past: history.past.slice(0, -1),
    future: [entry, ...history.future].slice(0, history.limit),
  };
}

export function redoDocumentCommand(history: DocumentHistoryState): DocumentHistoryState {
  const entry = history.future[0];
  if (!entry) return history;
  const applied = applyDocumentCommand(history.present, entry.command);
  return {
    ...history,
    present: applied.document,
    past: appendBounded(history.past, entry, history.limit),
    future: history.future.slice(1),
  };
}

export function canUndoDocument(history: DocumentHistoryState): boolean {
  return history.past.length > 0;
}

export function canRedoDocument(history: DocumentHistoryState): boolean {
  return history.future.length > 0;
}
