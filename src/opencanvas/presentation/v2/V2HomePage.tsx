import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconFile, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { HomeNotice } from './V2LegacyRoutes';
import { Button, Dialog, Icon, IconButton, SystemRoot, Tooltip } from '../design-system';
import { createV2Repository, type V2DocumentSummary } from '../../../services/storage/v2/v2Repository';
import { readV1ImportMarker, runV1Import } from '../../../services/storage/v2/v1Import';
import { forgetLastDocument, mintV2Id } from './v2Document';
import { useV2Appearance } from './useV2Appearance';
import { useV2Preferences } from './useV2Preferences';
import './v2EditorPage.css';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Every diagram in this browser: open, rename, delete. v1 imports carry a tag. */
export function V2HomePage(): React.JSX.Element {
  const { preferences } = useV2Preferences();
  const appearance = useV2Appearance(preferences.theme);
  const navigate = useNavigate();
  const repository = useMemo(() => createV2Repository(window.indexedDB), []);
  const [documents, setDocuments] = useState<readonly V2DocumentSummary[] | null>(null);
  // An old link that found nothing arrives with a notice in router state; clear it so a reload
  // or Back does not show it again.
  const location = useLocation();
  const [problem, setProblem] = useState<string | null>((location.state as HomeNotice | null)?.notice ?? null);
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);
  const [renaming, setRenaming] = useState<{ id: string; draft: string } | null>(null);
  const [deleting, setDeleting] = useState<V2DocumentSummary | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const renameCancelled = useRef(false);
  const failed = Object.entries(readV1ImportMarker()?.docs ?? {}).filter(([, entry]) => entry.status === 'failed');

  const refresh = useCallback(() => {
    repository.listDocuments().then(setDocuments, (error: unknown) => setProblem(error instanceof Error ? error.message : String(error)));
  }, [repository]);
  // List at once, and again when a v1 import still running on this load lands.
  useEffect(() => {
    refresh();
    runV1Import().then(refresh, () => undefined);
  }, [refresh]);
  useEffect(() => { renameRef.current?.select(); }, [renaming?.id]);

  const fail = (error: unknown) => setProblem(error instanceof Error ? error.message : String(error));
  // Keyboard focus follows the row it acted on, or "New diagram" once the row is gone.
  const focusAfter = (id: string | null) => requestAnimationFrame(() =>
    (document.querySelector<HTMLElement>(id ? `[data-doc-id="${id}"]` : '[data-home-new]'))?.focus());

  async function commitRename(): Promise<void> {
    if (!renaming || renameCancelled.current) return;
    const { id, draft } = renaming;
    const name = draft.trim();
    setRenaming(null);
    setProblem(null);
    try {
      const loaded = await repository.loadDocument(id);
      if (loaded.status !== 'ok') {
        setProblem('This diagram can only be renamed after it opens cleanly. Open it first.');
      } else if (name && loaded.record.document.name !== name) {
        const saved = await repository.saveDocument(id, { ...loaded.record.document, name }, loaded.record.revision + 1);
        if (saved.status !== 'saved') setProblem('That diagram changed in another tab. Reload and try again.');
      }
    } catch (error) {
      fail(error);
    }
    refresh();
    focusAfter(id);
  }

  function startRename(summary: V2DocumentSummary): void {
    renameCancelled.current = false;
    setRenaming({ id: summary.id, draft: summary.name });
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return;
    const { id } = deleting;
    setDeleting(null);
    setProblem(null);
    await repository.deleteDocument(id).catch(fail);
    forgetLastDocument(id);
    refresh();
    focusAfter(null);
  }

  return (
    <SystemRoot appearance={appearance} density={preferences.density}>
      <main className="ofk-home" data-testid="v2-home">
        <header className="ofk-home-header">
          <h1>All diagrams {documents ? <span>{documents.length}</span> : null}</h1>
          <Button data-home-new onClick={() => navigate(`/d/${mintV2Id('doc')}`)}><Icon icon={IconPlus} /> New diagram</Button>
        </header>
        {problem ? <p className="ofk-home-notice" role="alert">{problem}</p> : null}
        {failed.length > 0 ? (
          <section className="ofk-home-notice" aria-label="Not brought over">
            <p>{failed.length === 1 ? '1 diagram' : `${failed.length} diagrams`} from the previous editor could not be brought over yet. They stay safe in this browser; reloading tries again.</p>
            <ul>{failed.map(([v1Id, entry]) => <li key={v1Id}>{entry.name ?? v1Id}: {entry.error}</li>)}</ul>
          </section>
        ) : null}
        {documents && documents.length === 0 ? <p className="ofk-home-empty">No diagrams in this browser yet.</p> : null}
        <ul className="ofk-home-rows" aria-label="Diagrams">
          {documents?.map((document) => (
            <li key={document.id}>
              {renaming?.id === document.id ? (
                <input ref={renameRef} className="ofk-v2-page-rename" aria-label={`Rename ${document.name}`} maxLength={120}
                  value={renaming.draft} onChange={(event) => setRenaming({ id: document.id, draft: event.target.value })}
                  onBlur={() => void commitRename()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      renameCancelled.current = true;
                      setRenaming(null);
                      focusAfter(document.id);
                    }
                  }} />
              ) : (
                <button type="button" className="ofk-home-open" data-doc-id={document.id} onClick={() => navigate(`/d/${document.id}`)}>
                  <Icon icon={IconFile} />
                  <span className="ofk-v2-page-name">{document.name}</span>
                  {document.id.startsWith('v1-') ? <span className="ofk-home-tag">From v1</span> : null}
                  <span className="ofk-home-meta">
                    {document.pageCount > 1 ? `${document.pageCount} pages · ` : ''}{dateFormat.format(new Date(document.savedAt))}
                  </span>
                </button>
              )}
              <Tooltip content="Rename">
                <IconButton variant="quiet" label={`Rename ${document.name}`} icon={<Icon icon={IconPencil} />}
                  onClick={() => startRename(document)} />
              </Tooltip>
              <Tooltip content="Delete">
                <IconButton variant="quiet" label={`Delete ${document.name}`} icon={<Icon icon={IconTrash} />}
                  onClick={() => setDeleting(document)} />
              </Tooltip>
            </li>
          ))}
        </ul>
        <Dialog open={deleting !== null} onClose={() => setDeleting(null)} title={`Delete “${deleting?.name ?? ''}”?`}
          description="It is removed from this browser. This can't be undone."
          actions={<>
            <Button variant="quiet" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => void confirmDelete()}>Delete</Button>
          </>} />
      </main>
    </SystemRoot>
  );
}
