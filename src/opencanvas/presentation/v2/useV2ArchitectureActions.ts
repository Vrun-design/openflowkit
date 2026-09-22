import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { architectureWorkspaceText } from '../../../dsl/families/architecture/text';
import type { CompileWorkspaceResult } from '../../../dsl/compile';
import { flowToSequenceDsl } from '../../../dsl/model/flowExport';
import type { ArchFlow, ArchModel, ArchView } from '../../../dsl/model/types';
import { buildWorkspacePagesCommand, type ArchElementPatch } from '../../application/dsl/architectureCommands';
import {
  buildArchElementEditCommand, buildArchElementRemoveCommand, buildArchUnplaceCommand,
} from '../../application/dsl/architectureCommands';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1, ScenePage } from '../../domain/document/types';
import type { V2Architecture } from './useV2Architecture';

/** Camera + selection side effects the actions ask the page to perform. */
export interface ArchitectureActionHost {
  readonly glideToNodes: (nodeIds: readonly string[]) => void;
  readonly openPage: (pageId: string) => void;
  readonly selectNodes: (nodeIds: readonly string[]) => void;
  readonly commit: (command: DocumentCommand) => void;
  readonly announce: (message: string) => void;
  readonly compileWorkspace: (text: string) => Promise<CompileWorkspaceResult>;
  readonly compileSequence: (text: string) => Promise<CompileWorkspaceResult>;
}

export interface ArchitectureActionsOptions {
  readonly architecture: V2Architecture;
  readonly document: SceneDocumentV1 | null;
  readonly pageRef: RefObject<ScenePage | null>;
  readonly readOnly: boolean;
  readonly mintId: (prefix: string) => string;
}

export interface ArchitectureActions {
  editElement: (elementId: string, patch: ArchElementPatch) => void;
  removeElement: (elementId: string) => void;
  /** Delete on a model view unplaces instead; false lets the normal delete run. */
  unplaceSelection: (nodeIds: readonly string[]) => boolean;
  drillInto: (elementId: string) => boolean;
  createChildView: (elementId: string) => Promise<void>;
  openCrumb: (crumb: { pageId: string; elementId?: string }) => void;
  openFlowAsSequence: (flow: ArchFlow) => Promise<void>;
  /** Focus frame for a tag perspective, or null when no tags are selected. */
  perspectiveFocus: (tags: readonly string[]) => { nodeIds: string[]; connectorIds: string[] } | null;
}

function commandPageId(command: DocumentCommand, viewId: string): string | null {
  const commands = command.kind === 'batch' ? command.commands : [command];
  for (const entry of commands) {
    if (entry.kind === 'insert-page') {
      const view = entry.page.metadata.view;
      if (view && typeof view === 'object' && !Array.isArray(view) && (view as { id?: unknown }).id === viewId) return entry.page.id;
    }
    if (entry.kind === 'set-page' && viewId === '') return entry.pageId;
  }
  return null;
}

function childViewKind(model: ArchModel, elementId: string): ArchView['kind'] {
  const element = model.elements.find((candidate) => candidate.id === elementId);
  if (element?.kind === 'system') return 'container';
  if (element?.kind === 'container') return 'component';
  return 'custom';
}

/**
 * Model-level edits for the canvas. Every action commits exactly one batch,
 * so a rename, a drill-down that creates a view, or a flow export to a page is
 * one undo step.
 */
export function useV2ArchitectureActions(options: ArchitectureActionsOptions, host: ArchitectureActionHost): ArchitectureActions {
  const { architecture, document, pageRef, readOnly, mintId } = options;
  const hostRef = useRef(host);
  useEffect(() => { hostRef.current = host; });
  const timers = useRef<number[]>([]);
  useEffect(() => () => { for (const timer of timers.current) window.clearTimeout(timer); }, []);

  const editElement = useCallback((elementId: string, patch: ArchElementPatch) => {
    const current = hostRef.current;
    if (readOnly || !document) return;
    const command = buildArchElementEditCommand(document, elementId, patch);
    if (!command) return;
    current.commit(command);
    current.announce(patch.name !== undefined ? 'Element renamed in every view.' : 'Element updated in every view.');
  }, [document, readOnly]);

  const removeElement = useCallback((elementId: string) => {
    const current = hostRef.current;
    if (readOnly || !document) return;
    const command = buildArchElementRemoveCommand(document, elementId);
    if (!command) return;
    current.commit(command);
    current.announce('Element removed from the model and every view.');
  }, [document, readOnly]);

  const unplaceSelection = useCallback((nodeIds: readonly string[]): boolean => {
    const current = hostRef.current;
    const page = pageRef.current;
    if (readOnly || !page || nodeIds.length === 0) return false;
    const command = buildArchUnplaceCommand(page, nodeIds);
    if (!command) return false;
    current.commit(command);
    current.announce(`Unplaced ${nodeIds.length === 1 ? 'element' : 'elements'} from this view. The model keeps them.`);
    return true;
  }, [pageRef, readOnly]);

  const drillInto = useCallback((elementId: string): boolean => {
    const current = hostRef.current;
    const childView = architecture.childViewOf(elementId);
    const target = childView ? architecture.pageForView(childView.id) : undefined;
    if (!childView || !target) return false;
    const page = pageRef.current;
    const nodeIds = page
      ? page.nodes.filter((node) => {
        const model = node.metadata.model;
        return Boolean(model && typeof model === 'object' && !Array.isArray(model)
          && (model as Record<string, unknown>).elementId === elementId);
      }).map((node) => node.id)
      : [];
    // One animated step: glide into the element, then swap the page underneath.
    if (nodeIds.length > 0) {
      current.glideToNodes(nodeIds);
      timers.current.push(window.setTimeout(() => current.openPage(target.id), 280));
    } else {
      current.openPage(target.id);
    }
    return true;
  }, [architecture, pageRef]);

  const createChildView = useCallback(async (elementId: string) => {
    const current = hostRef.current;
    const model = architecture.model;
    if (readOnly || !document || !model || !architecture.index) return;
    const element = architecture.index.byId.get(elementId);
    if (!element) return;
    const kind = childViewKind(model, elementId);
    const viewId = `view:${kind}:${element.id}`;
    if (model.views.some((view) => view.id === viewId)) {
      drillInto(elementId);
      return;
    }
    const view: ArchView = { id: viewId, kind, name: `${kind} of ${element.name}`, of: element.id, rules: [] };
    const next: ArchModel = { ...model, views: [...model.views, view] };
    const workspace = await current.compileWorkspace(architectureWorkspaceText(next));
    const command = buildWorkspacePagesCommand(document, workspace, { mintId });
    if (!command) return;
    current.commit(command);
    const pageId = commandPageId(command, viewId);
    if (pageId) current.openPage(pageId);
    current.announce(`Created ${view.name}.`);
  }, [architecture, document, drillInto, mintId, readOnly]);

  const openCrumb = useCallback((crumb: { pageId: string; elementId?: string }) => {
    const current = hostRef.current;
    current.openPage(crumb.pageId);
    if (!crumb.elementId) return;
    const page = document?.pages.find((candidate) => candidate.id === crumb.pageId);
    const node = page?.nodes.find((candidate) => {
      const model = candidate.metadata.model;
      return Boolean(model && typeof model === 'object' && !Array.isArray(model)
        && (model as Record<string, unknown>).elementId === crumb.elementId);
    });
    if (node) current.selectNodes([node.id]);
  }, [document]);

  const openFlowAsSequence = useCallback(async (flow: ArchFlow) => {
    const current = hostRef.current;
    const model = architecture.model;
    if (readOnly || !document || !model) return;
    const text = flowToSequenceDsl(flow, model);
    const workspace = await current.compileSequence(text);
    const command = buildWorkspacePagesCommand(document, workspace, { mintId });
    if (!command) return;
    current.commit(command);
    const viewId = workspace.views[0]?.viewId ?? '';
    const pageId = commandPageId(command, viewId);
    if (pageId) current.openPage(pageId);
    current.announce(`Flow ${flow.name} opened as a sequence diagram.`);
  }, [architecture, document, mintId, readOnly]);

  const perspectiveFocus = useCallback((tags: readonly string[]): { nodeIds: string[]; connectorIds: string[] } | null => {
    const model = architecture.model;
    const page = pageRef.current;
    if (!model || !page || tags.length === 0) return null;
    const wanted = new Set(tags.map((tag) => tag.toLowerCase()));
    const nodeIds: string[] = [];
    for (const node of page.nodes) {
      const modelMeta = node.metadata.model;
      if (!modelMeta || typeof modelMeta !== 'object' || Array.isArray(modelMeta)) continue;
      const elementId = (modelMeta as Record<string, unknown>).elementId;
      if (typeof elementId !== 'string') continue;
      const element = model.elements.find((candidate) => candidate.id === elementId);
      if (!element?.tags.some((tag) => wanted.has(tag))) continue;
      nodeIds.push(node.id);
    }
    return { nodeIds, connectorIds: [] };
  }, [architecture, pageRef]);

  return { editElement, removeElement, unplaceSelection, drillInto, createChildView, openCrumb, openFlowAsSequence, perspectiveFocus };
}
