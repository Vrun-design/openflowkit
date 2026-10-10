import { useCallback, useEffect, useRef, useState } from 'react';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { V2DocumentRepository } from '../../../services/storage/v2/v2Repository';
import {
  V2DocumentInvalidError,
  V2StorageQuotaError,
  V2StorageUnavailableError,
} from '../../../services/storage/v2/v2Errors';

export type V2SaveStatus =
  | { readonly state: 'clean' }
  | { readonly state: 'pending' }
  | { readonly state: 'saved' }
  | { readonly state: 'conflict'; readonly storedRevision: number }
  | { readonly state: 'failed'; readonly reason: 'quota' | 'unavailable' | 'other' }
  /** Retrying cannot help: the document itself would not open again. */
  | { readonly state: 'failed'; readonly reason: 'invalid'; readonly message: string };

const AUTOSAVE_DELAY_MS = 800;

interface V2AutosaveOptions {
  readonly repository: V2DocumentRepository | null;
  readonly documentId: string | null;
  readonly document: SceneDocumentV1 | null;
  readonly revision: number;
  /** Stored revision the session loaded from (0 for a new document). */
  readonly baseRevision: number;
  readonly onConflict: () => void;
  /** After a durable save: work that may lag behind it (home thumbnail). */
  readonly onSaved?: (document: SceneDocumentV1) => void;
}

type V2SaveOutcome = Exclude<V2SaveStatus, { readonly state: 'clean' | 'pending' }>;

// Debounced ordered autosave. Saves chain strictly in revision order, and
// `saved` only resolves after the durable commit — never before. Each save
// expects the revision this tab last loaded or wrote; a stale result means a
// second tab (or Home's rename) wrote first: surface the conflict and stop
// saving until a reload, never overwrite.
export function useV2Autosave(options: V2AutosaveOptions) {
  const { repository, documentId, document, revision, baseRevision, onConflict, onSaved } = options;
  const [retryCount, setRetryCount] = useState(0);
  const [outcome, setOutcome] = useState<V2SaveOutcome | null>(null);
  // A document nobody touched is not saved: opening `/` or New diagram leaves no empty row behind.
  const [savedRevision, setSavedRevision] = useState(baseRevision);
  const [openedKey, setOpenedKey] = useState(`${documentId}:${baseRevision}`);
  const chainRef = useRef(Promise.resolve());
  /** The stored revision the next save replaces: what this tab loaded, then what it last wrote. */
  const storedRef = useRef(baseRevision);
  /** The debounced save not yet started; leaving the editor or the page runs it at once instead of dropping it. */
  const pendingRef = useRef<(() => void) | null>(null);
  const dirtyRef = useRef(false);
  const conflictRef = useRef(onConflict);
  const savedRef = useRef(onSaved);
  useEffect(() => {
    conflictRef.current = onConflict;
    savedRef.current = onSaved;
  }, [onConflict, onSaved]);

  const openKey = `${documentId}:${baseRevision}`;
  if (openedKey !== openKey) {
    setOpenedKey(openKey);
    setOutcome(null);
    setSavedRevision(baseRevision);
  }
  useEffect(() => { storedRef.current = baseRevision; }, [documentId, baseRevision]);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  const saveRevision = baseRevision + revision;
  const conflicted = outcome?.state === 'conflict';
  const dirty = documentId !== null && document !== null && saveRevision > savedRevision;
  useEffect(() => { dirtyRef.current = dirty; });

  useEffect(() => {
    pendingRef.current = null;
    if (!repository || !documentId || !document || !dirty || conflicted) return;
    const save = () => {
      if (pendingRef.current !== save) return; // already run early (tab hidden, page leaving)
      pendingRef.current = null;
      const task = chainRef.current.then(async () => {
        try {
          const result = await repository.saveDocument(documentId, document, saveRevision, storedRef.current);
          if (result.status === 'saved') {
            storedRef.current = saveRevision;
            setSavedRevision(saveRevision);
            setOutcome({ state: 'saved' });
            savedRef.current?.(document);
          } else {
            setOutcome({ state: 'conflict', storedRevision: result.storedRevision });
            conflictRef.current();
          }
        } catch (error) {
          setOutcome(error instanceof V2DocumentInvalidError
            ? { state: 'failed', reason: 'invalid', message: error.message }
            : {
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
    };
    pendingRef.current = save;
    const timer = window.setTimeout(save, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [repository, documentId, document, saveRevision, dirty, conflicted, retryCount]);
  useEffect(() => () => pendingRef.current?.(), []);

  // Closing or reloading the tab inside the debounce: save now. While anything is unsaved, ask before leaving.
  useEffect(() => {
    const flush = () => pendingRef.current?.();
    const onHidden = () => { if (window.document.visibilityState === 'hidden') flush(); };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      flush();
      if (dirtyRef.current) event.preventDefault();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.document.removeEventListener('visibilitychange', onHidden);
    };
  }, []);

  // A failure stays on screen until a save succeeds, so Retry and its reason are never hidden behind "Saving…".
  const status: V2SaveStatus =
    outcome?.state === 'conflict' || outcome?.state === 'failed'
      ? outcome
      : dirty
        ? { state: 'pending' }
        : outcome?.state === 'saved'
          ? outcome
          : { state: 'clean' };
  return { status, retry };
}
