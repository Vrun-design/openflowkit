// Icons off (or back on) at the three scales a user thinks in: this node,
// this selection, this diagram. The "every diagram" scale is the Settings
// switch; all four end up as text the next compile respects.
import { useCallback, type RefObject } from 'react';
import type { CompileResult } from '../../../dsl/compile';
import { RESERVED_FAMILIES } from '../../../dsl/document';
import { dslFrames, frameScene } from '../../../dsl/frameScene';
import { placedElementId } from '../../../dsl/model/model';
import { dslFrameRaw } from '../../../dsl/sceneMeta';
import { serialize } from '../../../dsl/serialize';
import type { Point2d } from '../../domain/geometry/types';
import type { DocumentCommand } from '../../domain/commands/types';
import type { ScenePage } from '../../domain/document/types';
import { buildDslPageCommand } from '../../application/dsl/dslPageCommand';
import { buildAutoIconsOffCommand, buildRemoveIconCommand, hasAutoIcon, hasIcon } from '../../application/dsl/iconCommands';
import type { ArchElementPatch } from '../../application/dsl/architectureCommands';

export interface V2IconActionsOptions {
  readonly pageRef: RefObject<ScenePage | null>;
  readonly readOnly: boolean;
  readonly commit: (command: DocumentCommand) => void;
  readonly announce: (message: string) => void;
  readonly compileAt: (text: string, origin: Point2d) => Promise<CompileResult>;
  readonly editElement: (elementId: string, patch: ArchElementPatch) => void;
}

const ICON_FAMILIES: ReadonlySet<string> = new Set(['flowchart', 'architecture', ...RESERVED_FAMILIES]);

/**
 * A diagram whose family draws icon cards and whose text the toggle can
 * rewrite. Model views are left to per-element removal: their text is
 * regenerated from the model, which has no place for the directive.
 * ponytail: no diagram-level toggle on C4 views — add `icons` to the model workspace if asked.
 */
export function iconToggleFrame(page: ScenePage, frameId: string): boolean {
  const frame = dslFrames(page).find((candidate) => candidate.id === frameId);
  const raw = frame ? dslFrameRaw(frame) : null;
  return Boolean(raw && !raw.arch && ICON_FAMILIES.has(String(raw.family)));
}

/** On when the text says `icons: auto`, or when this diagram has icons it inferred. */
export function diagramIconsOn(page: ScenePage, frameId: string): boolean {
  const scene = frameScene(page, frameId);
  if (!scene) return false;
  const mode = dslFrameRaw(scene.frame).icons;
  return mode === 'auto' || (mode !== 'off' && scene.nodes.some(hasAutoIcon));
}

export function useV2IconActions(options: V2IconActionsOptions) {
  const { pageRef, readOnly, commit, announce, compileAt, editElement } = options;

  const removeIcons = useCallback((nodeIds: readonly string[]) => {
    const page = pageRef.current;
    if (!page || readOnly) return;
    const nodes = page.nodes.filter((node) => nodeIds.includes(node.id) && hasIcon(node));
    // A model placement's icon lives on the element, shared by every view.
    // ponytail: one undo step per model element — batch through the model command if mixed selections get common.
    const elements = nodes.map(placedElementId).filter((id): id is string => id !== null);
    for (const elementId of new Set(elements)) editElement(elementId, { icon: 'none' });
    const command = buildRemoveIconCommand(page, nodes.filter((node) => !placedElementId(node)).map((node) => node.id));
    if (command) commit(command);
    if (nodes.length) announce(nodes.length === 1 ? 'Icon removed.' : `${nodes.length} icons removed.`);
  }, [pageRef, readOnly, commit, announce, editElement]);

  const setDiagramIcons = useCallback(async (frameId: string, on: boolean) => {
    const page = pageRef.current;
    const scene = page ? frameScene(page, frameId) : null;
    if (!page || !scene || readOnly) return;
    if (!on) {
      const command = buildAutoIconsOffCommand(page, frameId);
      if (command) commit(command);
      announce('Icons from labels off for this diagram.');
      return;
    }
    // Cards are bigger than shapes, so turning icons on lays the diagram out again.
    const text = serialize({ ...scene, frame: { ...scene.frame, metadata: { ...scene.frame.metadata, dsl: { ...dslFrameRaw(scene.frame), icons: 'auto' } } } });
    const compiled = await compileAt(text, scene.frame.transform.translation);
    const current = pageRef.current;
    const command = current ? buildDslPageCommand(current, compiled, frameId) : null;
    if (command) commit(command);
    announce(`Icons from labels on: ${compiled.nodes.filter(hasAutoIcon).length} added.`);
  }, [pageRef, readOnly, commit, announce, compileAt]);

  return { removeIcons, setDiagramIcons };
}
