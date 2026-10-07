import { useCallback, useEffect, useState } from 'react';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { DocumentValidationIssue } from '../../domain/document/validation';
import type { V2DocumentRepository } from '../../../services/storage/v2/v2Repository';
import { describeStorageFailure } from '../../../services/storage/v2/v2Errors';
import { createEmptyV2Document } from './v2Document';

interface V2DocumentLoadOptions {
  readonly documentId: string | undefined;
  readonly repository: V2DocumentRepository | null;
  readonly openDocument: (document: SceneDocumentV1) => void;
  readonly onRecovered: () => void;
  /** A document that is not stored (a shared link): opened as is, read-only, never saved. */
  readonly fixed?: SceneDocumentV1 | undefined;
}

export type V2LoadPhase = 'loading' | 'ready' | 'corrupt' | 'failed';

// Load on mount: missing → new empty document; ok/recovered → open;
// read-only → open with editing disabled; corrupt → notice + export-raw.
export function useV2DocumentLoad(options: V2DocumentLoadOptions) {
  const [phase, setPhase] = useState<V2LoadPhase>('loading');
  const [readOnly, setReadOnly] = useState(false);
  const [baseRevision, setBaseRevision] = useState(0);
  const [corruptIssues, setCorruptIssues] = useState<readonly DocumentValidationIssue[]>([]);
  const [loadError, setLoadError] = useState<ReturnType<typeof describeStorageFailure> | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  useEffect(() => {
    if (options.fixed) {
      options.openDocument(options.fixed);
      setBaseRevision(0);
      setReadOnly(true);
      setPhase('ready');
      return;
    }
    if (!options.documentId || !options.repository) return;
    let cancelled = false;
    setPhase('loading');
    setReadOnly(false);
    setLoadError(null);
    options.repository
      .loadDocument(options.documentId)
      .then((result) => {
        if (cancelled) return;
        switch (result.status) {
          case 'missing':
            options.openDocument(createEmptyV2Document(options.documentId!));
            setBaseRevision(0);
            setPhase('ready');
            break;
          case 'ok':
            options.openDocument(result.record.document);
            setBaseRevision(result.record.revision);
            setPhase('ready');
            break;
          case 'recovered':
            options.openDocument(result.record.document);
            setBaseRevision(result.record.revision);
            setPhase('ready');
            options.onRecovered();
            break;
          case 'read-only':
            options.openDocument(result.record.document);
            setBaseRevision(result.record.revision);
            setReadOnly(true);
            setPhase('ready');
            break;
          case 'corrupt':
            setCorruptIssues(result.issues);
            setPhase('corrupt');
            break;
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(describeStorageFailure(error));
        setPhase('failed');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.documentId, options.repository, options.fixed, reloadCount]);

  return { phase, readOnly, baseRevision, corruptIssues, loadError, reload };
}
