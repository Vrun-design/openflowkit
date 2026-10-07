import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, ErrorState, Spinner } from '../design-system';
import { loadSharedDocument, type SharedProblem } from '../../../services/share/shareClient';
import { createV2Repository } from '../../../services/storage/v2/v2Repository';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { mintV2Id } from './v2Document';
import { V2StateHero } from './V2StateHero';
import './v2EditorPage.css';

const Editor = lazy(async () => ({ default: (await import('./V2EditorPage')).V2EditorPage }));

/** `#/s/:id/:key`: fetch the ciphertext, decrypt in the browser, open it read-only in the editor. */
export function V2SharedPage(): React.JSX.Element {
  const { id = '', key } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  // The result carries the request it answers, so a new link or a retry reads as loading without a reset.
  const request = `${id}/${key ?? ''}/${attempt}`;
  const [answer, setAnswer] = useState<{ request: string; result: { document: SceneDocumentV1 } | { problem: SharedProblem } } | null>(null);
  useEffect(() => {
    let live = true;
    loadSharedDocument(id, key).then((result) => { if (live) setAnswer({ request, result }); });
    return () => { live = false; };
  }, [id, key, request]);
  const state = answer?.request === request ? answer.result : null;

  const document = state && 'document' in state ? state.document : null;
  const edit = useCallback(async () => {
    if (!document) return;
    const copy = { ...document, id: mintV2Id('doc'), updatedAt: new Date().toISOString() };
    const saved = await createV2Repository(window.indexedDB).saveDocument(copy.id, copy, 0);
    if (saved.status !== 'saved') throw new Error('Could not save a copy of this diagram.');
    navigate(`/d/${copy.id}`);
  }, [document, navigate]);
  const shared = useMemo(() => document ? { document, onEdit: edit } : undefined, [document, edit]);

  if (shared) return <Suspense fallback={null}><Editor shared={shared} /></Suspense>;
  return (
    <div className="ofk-v2-center" role="status" data-testid="v2-shared-state">
      {state === null ? <Spinner label="Opening shared diagram" /> : 'problem' in state ? (
        <ErrorState
          hero={<V2StateHero kind="lost-link" />}
          title={state.problem.title}
          description={state.problem.detail}
          {...(state.problem.retry ? { onRetry: () => setAttempt((count) => count + 1) } : {})}
          secondary={<Button variant="quiet" onClick={() => navigate('/home')}>Back to home</Button>}
        />
      ) : null}
    </div>
  );
}
