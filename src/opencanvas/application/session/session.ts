import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1 } from '../../domain/document/types';
import {
  commitDocumentCommand,
  createDocumentHistory,
  redoDocumentCommand,
  undoDocumentCommand,
} from '../history/history';
import type { DocumentHistoryState } from '../history/types';
import type { DocumentSession } from './types';

export class StaleSessionRevisionError extends Error {
  readonly expectedRevision: number;
  readonly actualRevision: number;

  constructor(expectedRevision: number, actualRevision: number) {
    super(
      `Stale session revision: expected ${expectedRevision}, session is at ${actualRevision}.`
    );
    this.name = 'StaleSessionRevisionError';
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

function requireCurrentRevision(session: DocumentSession, expectedRevision: number): void {
  if (expectedRevision !== session.revision) {
    throw new StaleSessionRevisionError(expectedRevision, session.revision);
  }
}

function advance(
  session: DocumentSession,
  history: DocumentHistoryState
): DocumentSession {
  if (history === session.history) return session;
  return { document: history.present, revision: session.revision + 1, history };
}

export function createDocumentSession(
  document: SceneDocumentV1,
  limit?: number
): DocumentSession {
  const history = createDocumentHistory(document, limit);
  return { document: history.present, revision: 0, history };
}

export function commitSessionCommand(
  session: DocumentSession,
  command: DocumentCommand,
  expectedRevision: number
): DocumentSession {
  requireCurrentRevision(session, expectedRevision);
  return advance(session, commitDocumentCommand(session.history, command));
}

export function undoSessionCommand(
  session: DocumentSession,
  expectedRevision: number
): DocumentSession {
  requireCurrentRevision(session, expectedRevision);
  // Revision counts commits, so undo/redo move it forward like any other
  // commit instead of rewinding it; history holds the inverse, not the counter.
  return advance(session, undoDocumentCommand(session.history));
}

export function redoSessionCommand(
  session: DocumentSession,
  expectedRevision: number
): DocumentSession {
  requireCurrentRevision(session, expectedRevision);
  return advance(session, redoDocumentCommand(session.history));
}
