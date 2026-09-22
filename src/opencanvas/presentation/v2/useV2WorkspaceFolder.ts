import { useCallback, useEffect, useRef, useState } from 'react';
import {
  pickWorkspaceFolder, readWorkspace, writeWorkspace, type WorkspaceContents,
  type WorkspaceFolder, type WorkspaceSnap,
} from '../../../services/workspace/workspaceFolder';
import type { SceneDocumentV1 } from '../../domain/document/types';

export interface V2WorkspaceFolderState {
  readonly folder: WorkspaceFolder | null;
  readonly adrs: WorkspaceContents['adrs'];
  readonly status: 'none' | 'opening' | 'open' | 'error';
  readonly openFolder: () => Promise<void>;
  readonly closeFolder: () => void;
  /** Writes the DSL + one snap per view; called by the autosave debounce. */
  readonly save: (dsl: string, document: SceneDocumentV1) => Promise<void>;
}

export interface V2WorkspaceFolderOptions {
  /** Applies a loaded workspace to the canvas (text + layout overrides). */
  readonly onLoad: (dsl: string, snaps: Readonly<Record<string, WorkspaceSnap>>) => void;
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

  const openFolder = useCallback(async () => {
    setStatus('opening');
    const picked = await pickWorkspaceFolder();
    if (!picked) {
      setStatus((current) => (current === 'opening' ? 'none' : current));
      return;
    }
    try {
      const contents = await readWorkspace(picked);
      setFolder(picked);
      setAdrs(contents.adrs);
      setStatus('open');
      if (!contents.dsl) {
        optionsRef.current.onToast('Folder opened. Add architecture.ofk or paste a workspace and generate.', 'warning');
        return;
      }
      optionsRef.current.onLoad(contents.dsl, contents.snaps);
      optionsRef.current.onToast(`Workspace ${picked.name} loaded.`, 'success');
    } catch (error) {
      setStatus('error');
      optionsRef.current.onToast(error instanceof Error ? error.message : 'Could not open the folder.', 'danger');
    }
  }, []);

  const closeFolder = useCallback(() => {
    setFolder(null);
    setAdrs([]);
    setStatus('none');
  }, []);

  const save = useCallback(async (dsl: string, document: SceneDocumentV1) => {
    if (!folder) return;
    try {
      await writeWorkspace(folder, { dsl, document });
    } catch (error) {
      optionsRef.current.onToast(error instanceof Error ? error.message : 'Workspace save failed.', 'warning');
    }
  }, [folder]);

  return { folder, adrs, status, openFolder, closeFolder, save };
}
