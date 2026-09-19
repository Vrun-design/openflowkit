import type { FlowEdge, FlowNode } from '@/lib/types';
import {
  inspectDocumentIntegrity,
  type IntegrityRepairAction,
} from '@/opencanvas/domain/document/integrityRepair';
import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import { projectPersistedDocument } from './canonicalPersistence';
import type {
  LoadedDocument,
  PersistedDocument,
  PersistedDocumentContent,
} from './persistenceTypes';

export interface PersistedWorkspaceRepairBackup {
  readonly fileName: string;
  readonly json: string;
}

export interface PersistedWorkspaceRepairPlan {
  readonly original: LoadedDocument;
  readonly repairedDocuments: readonly PersistedDocument[];
  readonly actions: readonly IntegrityRepairAction[];
  readonly backup: PersistedWorkspaceRepairBackup;
}

export type PersistedWorkspaceIntegrityReport =
  | { readonly status: 'healthy' }
  | { readonly status: 'repairable'; readonly plan: PersistedWorkspaceRepairPlan }
  | {
      readonly status: 'unrepairable';
      readonly issues: readonly string[];
      readonly backup: PersistedWorkspaceRepairBackup;
    };


function repairNode(
  node: FlowNode,
  actionsByObjectId: ReadonlyMap<string, readonly IntegrityRepairAction[]>,
  repairedDocument: SceneDocumentV1,
  pageId: string
): FlowNode {
  const actions = actionsByObjectId.get(node.id) ?? [];
  let repaired = node;
  if (actions.some((action) => action.kind === 'detach-parent')) {
    const { parentId: _parentId, extent: _extent, ...detached } = repaired;
    repaired = detached as FlowNode;
  }
  if (actions.some((action) => action.kind === 'reset-layer')) {
    const canonicalNode = repairedDocument.pages
      .find((page) => page.id === pageId)
      ?.nodes.find((candidate) => candidate.id === node.id);
    if (canonicalNode) {
      repaired = {
        ...repaired,
        data: { ...repaired.data, layerId: canonicalNode.layerId },
      };
    }
  }
  return repaired;
}

function repairEdge(
  edge: FlowEdge,
  actionsByObjectId: ReadonlyMap<string, readonly IntegrityRepairAction[]>,
  repairedDocument: SceneDocumentV1,
  pageId: string
): FlowEdge | null {
  const actions = actionsByObjectId.get(edge.id) ?? [];
  if (actions.some((action) => action.kind === 'remove-connector')) return null;
  if (!actions.some((action) => action.kind === 'reset-port')) return edge;

  const canonical = repairedDocument.pages
    .find((page) => page.id === pageId)
    ?.connectors.find((candidate) => candidate.id === edge.id);
  if (!canonical) return edge;
  return {
    ...edge,
    sourceHandle: canonical.source.portId ?? undefined,
    targetHandle: canonical.target.portId ?? undefined,
  };
}

function repairContent(
  content: PersistedDocumentContent,
  pageId: string,
  actions: readonly IntegrityRepairAction[],
  repairedDocument: SceneDocumentV1
): PersistedDocumentContent {
  const pageActions = actions.filter((action) => action.pageId === pageId);
  const actionsByObjectId = new Map<string, IntegrityRepairAction[]>();
  for (const action of pageActions) {
    const existing = actionsByObjectId.get(action.objectId) ?? [];
    existing.push(action);
    actionsByObjectId.set(action.objectId, existing);
  }
  return {
    ...content,
    nodes: content.nodes.map((node) =>
      repairNode(node, actionsByObjectId, repairedDocument, pageId)
    ),
    edges: content.edges.flatMap((edge) => {
      const repaired = repairEdge(edge, actionsByObjectId, repairedDocument, pageId);
      return repaired ? [repaired] : [];
    }),
  };
}

function repairPersistedDocument(
  document: PersistedDocument,
  repairedCanonical: SceneDocumentV1,
  actions: readonly IntegrityRepairAction[]
): PersistedDocument {
  const primaryPageId = document.activePageId ?? repairedCanonical.pages[0]?.id;
  return {
    ...document,
    content:
      document.content && primaryPageId
        ? repairContent(document.content, primaryPageId, actions, repairedCanonical)
        : document.content,
    pages: document.pages?.map((page) => ({
      ...page,
      content: repairContent(page.content, page.id, actions, repairedCanonical),
    })),
  };
}

export function buildPersistedWorkspaceBackup(
  loaded: LoadedDocument,
  now: string
): PersistedWorkspaceRepairBackup {
  return {
    fileName: 'openflowkit-workspace-before-repair.json',
    json: JSON.stringify(
      {
        format: 'openflowkit-persisted-workspace-backup',
        schemaVersion: 1,
        exportedAt: now,
        workspaceMeta: loaded.workspaceMeta,
        documents: loaded.documents,
      },
      null,
      2
    ),
  };
}

export function inspectPersistedWorkspace(
  loaded: LoadedDocument,
  now = new Date().toISOString()
): PersistedWorkspaceIntegrityReport {
  const repairedDocuments: PersistedDocument[] = [];
  const allActions: IntegrityRepairAction[] = [];
  const issues: string[] = [];

  for (const document of loaded.documents) {
    try {
      const projected = projectPersistedDocument(document);
      const report = inspectDocumentIntegrity(projected);
      if (report.status === 'unrepairable') {
        issues.push(
          ...report.issues.map((issue) => `${document.id}${issue.path}: ${issue.message}`)
        );
        repairedDocuments.push(document);
        continue;
      }
      if (report.status === 'repairable') {
        const repairedDocument = repairPersistedDocument(document, report.document, report.actions);
        const verification = inspectDocumentIntegrity(projectPersistedDocument(repairedDocument));
        if (verification.status !== 'healthy') {
          issues.push(`${document.id}: Reference repair did not produce a valid document.`);
          repairedDocuments.push(document);
          continue;
        }
        repairedDocuments.push(repairedDocument);
        allActions.push(...report.actions);
      } else {
        repairedDocuments.push(document);
      }
    } catch (error) {
      issues.push(
        `${document.id}: ${error instanceof Error ? error.message : 'Unknown persisted document error.'}`
      );
      repairedDocuments.push(document);
    }
  }

  if (issues.length > 0) {
    return { status: 'unrepairable', issues, backup: buildPersistedWorkspaceBackup(loaded, now) };
  }
  if (allActions.length === 0) return { status: 'healthy' };
  return {
    status: 'repairable',
    plan: {
      original: structuredClone(loaded),
      repairedDocuments,
      actions: allActions,
      backup: buildPersistedWorkspaceBackup(loaded, now),
    },
  };
}
