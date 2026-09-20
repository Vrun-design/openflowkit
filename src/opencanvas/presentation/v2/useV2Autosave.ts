import { useCallback, useEffect, useRef, useState } from 'react';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { V2DocumentRepository } from '../../../services/storage/v2/v2Repository';
import {
  V2StorageQuotaError,
  V2StorageUnavailableError,
} from '../../../services/storage/v2/v2Errors';

export type V2SaveStatus =
  | { readonly state: 'clean' }
  | { readonly state: 'pending' }
  | { readonly state: 'saved' }
  | { readonly state: 'conflict'; readonly storedRevision: number }
  | { readonly state: 'failed'; readonly reason: 'quota' | 'unavailable' | 'other' };

const AUTOSAVE_DELAY_MS = 800;

interface V2AutosaveOptions {
  readonly repository: V2DocumentRepository | null;
  readonly documentId: string | null;
  readonly document: SceneDocumentV1 | null;
  readonly revision: number;
  /** Stored revision the session loaded from (0 for a new document). */
  readonly baseRevision: number;
  readonly onConflict: () => void;
}

type V2SaveOutcome =
  | { readonly state: 'saved' }
  | { readonly state: 'conflict'; readonly storedRevision: number }
  | { readonly state: 'failed'; readonly reason: 'quota' | 'unavailable' | 'other' };

// Debounced ordered autosave. Saves chain strictly in revision order, and
// `saved` only resolves after the durable commit — never before. A stale
// result means a second tab wrote first: surface the conflict, never overwrite.
export function useV2Autosave(options: V2AutosaveOptions) {
  const { repository, documentId, document, revision, baseRevision, onConflict } = options;
  const [retryCount, setRetryCount] = useState(0);
  const [outcome, setOutcome] = useState<V2SaveOutcome | null>(null);
  const [savedRevision, setSavedRevision] = useState(-1);
  const [openedKey, setOpenedKey] = useState(`${documentId}:${baseRevision}`);
  const chainRef = useRef(Promise.resolve());
  const conflictRef = useRef(onConflict);
  useEffect(() => {
    conflictRef.current = onConflict;
  }, [onConflict]);

  const openKey = `${documentId}:${baseRevision}`;
  if (openedKey !== openKey) {
    setOpenedKey(openKey);
    setOutcome(null);
    setSavedRevision(baseRevision);
  }

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  const saveRevision = baseRevision + revision;
  const dirty = documentId !== null && document !== null && saveRevision > savedRevision;

  useEffect(() => {
    if (!repository || !documentId || !document || !dirty) return;
    const timer = window.setTimeout(() => {
      const task = chainRef.current.then(async () => {
        try {
          const result = await repository.saveDocument(documentId, document, saveRevision);
          if (result.status === 'saved') {
            setSavedRevision(saveRevision);
            setOutcome({ state: 'saved' });
          } else {
            setSavedRevision(result.storedRevision);
            setOutcome({ state: 'conflict', storedRevision: result.storedRevision });
            conflictRef.current();
          }
        } catch (error) {
          setOutcome({
            state: 'failed',
            reason:
              error instanceof V2StorageQuotaError
                ? 'quota'
                : error instanceof V2StorageUnavailableError
                  ? 'unavailable'
                  : 'other',
          });
        }
      });
      chainRef.current = task.catch(() => undefined);
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [repository, documentId, document, saveRevision, dirty, retryCount]);

  const status: V2SaveStatus =
    outcome?.state === 'conflict'
      ? outcome
      : dirty
        ? { state: 'pending' }
        : outcome?.state === 'failed'
          ? outcome
          : outcome?.state === 'saved'
            ? outcome
            : { state: 'clean' };
  return { status, retry };
}
