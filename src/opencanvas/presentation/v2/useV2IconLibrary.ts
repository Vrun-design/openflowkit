import { useCallback, useState, type RefObject } from 'react';
import type { DocumentCommand } from '../../domain/commands/types';
import type { ScenePage } from '../../domain/document/types';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';
import { buildInsertIconCommand } from '../../domain/commands/iconCommands';
import { DEFAULT_ICON_NODE_SIZE, type IconChoice } from '../../domain/nodes/iconNode';
import type { OpenEditorOptions } from './useV2LabelEditing';

interface V2IconLibraryOptions {
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly pageRef: RefObject<ScenePage | null>;
  readonly commit: (command: DocumentCommand) => void;
  readonly mintId: (prefix: string) => string;
  readonly openEditor: (nodeId: string, options?: OpenEditorOptions) => void;
  readonly readOnly: boolean;
}

// The toolbar's icon library: a pick lands the icon node at the centre of the
// view, selected, with its label open — the same gesture as a toolbar shape.
export function useV2IconLibrary(options: V2IconLibraryOptions) {
  const [open, setOpen] = useState(false);
  const { hostRef, pageRef, commit, mintId, openEditor, readOnly } = options;
  const insertIcon = useCallback((icon: IconChoice) => {
    const host = hostRef.current;
    const page = pageRef.current;
    if (!host || !page || readOnly) return;
    const view = host.getViewportSize();
    const centre = host.screenToWorld({ x: view.width / 2, y: view.height / 2 });
    const id = mintId('node');
    commit(buildInsertIconCommand(page, {
      id, icon, at: { x: centre.x - DEFAULT_ICON_NODE_SIZE.width / 2, y: centre.y - DEFAULT_ICON_NODE_SIZE.height / 2 },
    }));
    openEditor(id);
  }, [hostRef, pageRef, commit, mintId, openEditor, readOnly]);
  return { open, setOpen, toggle: useCallback(() => setOpen((value) => !value), []), insertIcon };
}
