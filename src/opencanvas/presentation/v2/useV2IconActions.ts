// Icons off (or back on) at the three scales a user thinks in: this node,
// this selection, this diagram. The "every diagram" scale is the Settings
// switch; all four end up as text the next compile respects.
import { useCallback, type RefObject } from 'react';
import type { CompileResult } from '../../../dsl/compile';
import { RESERVED_FAMILIES } from '../../../dsl/document';
import { dslFrames, frameScene } from '../../../dsl/frameScene';
import { archModelOfPage, placedElementId } from '../../../dsl/model/model';
import { dslFrameRaw } from '../../../dsl/sceneMeta';
import { serialize } from '../../../dsl/serialize';
import type { Point2d } from '../../domain/geometry/types';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1, SceneNode, ScenePage } from '../../domain/document/types';
import { buildDslPageCommand } from '../../application/dsl/dslPageCommand';
import { buildAutoIconsOffCommand, buildRemoveIconCommand, hasAutoIcon, hasIcon } from '../../application/dsl/iconCommands';
import { buildArchRemoveIconsCommand } from '../../application/dsl/architectureCommands';

export interface V2IconActionsOptions {
  readonly pageRef: RefObject<ScenePage | null>;
  readonly readOnly: boolean;
  readonly commit: (command: DocumentCommand) => void;
  readonly announce: (message: string) => void;
  readonly compileAt: (text: string, origin: Point2d) => Promise<CompileResult>;
  readonly document: SceneDocumentV1 | null;
  /** A C4 workspace's toggle goes through its model, so every view follows. */
  readonly setModelIcons: (on: boolean) => Promise<void>;
}

const ICON_FAMILIES: ReadonlySet<string> = new Set(['flowchart', 'architecture', ...RESERVED_FAMILIES]);

/** A generated diagram whose family draws icon cards. */
export function iconToggleFrame(page: ScenePage, frameId: string): boolean {
  const frame = dslFrames(page).find((candidate) => candidate.id === frameId);
  return Boolean(frame && ICON_FAMILIES.has(String(dslFrameRaw(frame).family)));
}

/**
 * On when the text says `icons: auto`, or when the diagram has icons it
 * inferred. A C4 view reads its model: that is where the workspace keeps it.
 */
export function diagramIconsOn(page: ScenePage, frameId: string): boolean {
  const scene = frameScene(page, frameId);
  if (!scene) return false;
  const mode = isModelFrame(scene.frame) ? archModelOfPage(page)?.icons : dslFrameRaw(scene.frame).icons;
  return mode === 'auto' || (mode !== 'off' && scene.nodes.some(hasAutoIcon));
}

function isModelFrame(frame: SceneNode): boolean {
  return Boolean(dslFrameRaw(frame).arch);
}

export function useV2IconActions(options: V2IconActionsOptions) {
  const { pageRef, readOnly, commit, announce, compileAt, document, setModelIcons } = options;

  const removeIcons = useCallback((nodeIds: readonly string[]) => {
    const page = pageRef.current;
    if (!page || readOnly) return;
    const nodes = page.nodes.filter((node) => nodeIds.includes(node.id) && hasIcon(node));
    // A model placement's icon lives on the element, shared by every view;
    // the rest are plain diagram nodes. One undo step either way.
    const elements = nodes.map(placedElementId).filter((id): id is string => id !== null);
    const commands = [
      document && elements.length ? buildArchRemoveIconsCommand(document, elements) : null,
      buildRemoveIconCommand(page, nodes.filter((node) => !placedElementId(node)).map((node) => node.id)),
    ].filter((command): command is DocumentCommand => command !== null);
    if (!commands.length) return;
    commit(commands.length === 1 ? commands[0]! : { kind: 'batch', id: 'remove-icon', label: 'Remove icon', commands });
    announce(nodes.length === 1 ? 'Icon removed.' : `${nodes.length} icons removed.`);
  }, [pageRef, readOnly, commit, announce, document]);

  const setDiagramIcons = useCallback(async (frameId: string, on: boolean) => {
    const page = pageRef.current;
    const scene = page ? frameScene(page, frameId) : null;
    if (!page || !scene || readOnly) return;
    if (isModelFrame(scene.frame)) { await setModelIcons(on); return; }
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
  }, [pageRef, readOnly, commit, announce, compileAt, setModelIcons]);

  return { removeIcons, setDiagramIcons };
}
