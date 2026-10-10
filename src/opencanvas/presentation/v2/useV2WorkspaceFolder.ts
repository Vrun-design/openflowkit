import { useCallback, useEffect, useRef, useState } from 'react';
import {
  pickWorkspaceFolder, readWorkspace, snapOfPage, writeWorkspace, type WorkspaceContents,
  type WorkspaceFolder, type WorkspaceSnap,
} from '../../../services/workspace/workspaceFolder';
import type { SceneDocumentV1 } from '../../domain/document/types';

export interface V2WorkspaceFolderState {
  readonly folder: WorkspaceFolder | null;
  readonly adrs: WorkspaceContents['adrs'];
  readonly status: 'none' | 'opening' | 'open' | 'error';
  readonly openFolder: () => Promise<void>;
  readonly closeFolder: () => void;
  /** Writes the DSL + one snap per view; called by the autosave debounce. Writes nothing until this folder's
   * own workspace is on the canvas, and nothing when the text is what the folder already holds. */
  readonly save: (dsl: string, document: SceneDocumentV1) => Promise<void>;
}

export interface V2WorkspaceFolderOptions {
  /** Applies a loaded workspace to the canvas (text + layout overrides); true once it is committed. */
  readonly onLoad: (dsl: string, snaps: Readonly<Record<string, WorkspaceSnap>>) => Promise<boolean>;
  readonly onToast: (title: string, tone: 'success' | 'danger' | 'warning') => void;
}

/**
 * A folder workspace (phase 5.7): `architecture.ofk`, `views/*.snap` and
 * `adr/*.md`, opened through the File System Access API. Loading goes through
 * the normal generate path, so opening a folder is undoable like any compile.
 */
export function useV2WorkspaceFolder(options: V2WorkspaceFolderOptions): V2WorkspaceFolderState {
  const [folder, setFolder] = useState<WorkspaceFolder | null>(null);
  const [adrs, setAdrs] = useState<WorkspaceContents['adrs']>([]);
  const [status, setStatus] = useState<V2WorkspaceFolderState['status']>('none');
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });
  // The folder the canvas is in step with, and the text it holds (as the editor writes it). `pending`: the first
  // text after a load is the loaded workspace itself. Null: nothing loaded from the open folder yet, so no writes.
  // `snaps`: the views' layout as last written, so a moved box writes its snap even when the text is unchanged.
  const syncedRef = useRef<{ folder: WorkspaceFolder; text: string | null; snaps: string | null; pending: boolean } | null>(null);

  const openFolder = useCallback(async () => {
    setStatus('opening');
    const picked = await pickWorkspaceFolder();
    if (!picked) {
      setStatus((current) => (current === 'opening' ? 'none' : current));
      return;
    }
    syncedRef.current = null;
    try {
      const contents = await readWorkspace(picked);
      setFolder(picked);
      setAdrs(contents.adrs);
      setStatus('open');
      if (!contents.dsl) {
        // An empty folder takes the next generated workspace as its architecture.ofk.
        syncedRef.current = { folder: picked, text: null, snaps: null, pending: false };
        optionsRef.current.onToast('Folder opened. Add architecture.ofk or paste a workspace and generate.', 'warning');
        return;
      }
      if (!await optionsRef.current.onLoad(contents.dsl, contents.snaps)) {
        // Nothing drawn: the canvas does not hold this folder's workspace, so nothing may be written back over it.
        optionsRef.current.onToast(`architecture.ofk in ${picked.name} could not be drawn. Fix it in the code panel; nothing is written to the folder until it draws.`, 'danger');
        return;
      }
      syncedRef.current = { folder: picked, text: null, snaps: null, pending: true };
      optionsRef.current.onToast(`Workspace ${picked.name} loaded.`, 'success');
    } catch (error) {
      setStatus('error');
      optionsRef.current.onToast(error instanceof Error ? error.message : 'Could not open the folder.', 'danger');
    }
  }, []);

  const closeFolder = useCallback(() => {
    syncedRef.current = null;
    setFolder(null);
    setAdrs([]);
    setStatus('none');
  }, []);

  // ponytail: a load whose generate fails leaves `pending`, so the next edit is taken as the baseline and the one after writes.
  const save = useCallback(async (dsl: string, document: SceneDocumentV1) => {
    const synced = syncedRef.current;
    const snaps = JSON.stringify(document.pages.map(snapOfPage));
    if (!folder || synced?.folder !== folder || (dsl === synced.text && snaps === synced.snaps)) return;
    const loaded = synced.pending;
    // An unchanged text is not rewritten: the user's own formatting of architecture.ofk stays.
    const text = dsl === synced.text ? null : dsl;
    Object.assign(synced, { text: dsl, snaps, pending: false });
    if (loaded) return;
    try {
      await writeWorkspace(folder, { dsl: text, document });
    } catch (error) {
      optionsRef.current.onToast(error instanceof Error ? error.message : 'Workspace save failed.', 'warning');
    }
  }, [folder]);

  return { folder, adrs, status, openFolder, closeFolder, save };
}
