// Public surface of the agent action registry, bundled for the MCP server by
// vite.agent.config.ts. Pure: no store, no browser, no React.
import { projectLegacyDocument } from '@/opencanvas/domain/document/legacyProjection';
import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import { requireValidSceneDocument } from '@/opencanvas/infrastructure/reactflow/validationBoundary';
import { projectSceneDocumentToReactFlow } from '@/opencanvas/infrastructure/reactflow/toReactFlow';

export { AGENT_ACTIONS, findAgentAction } from './actions';
export type { ActionContext, ActionResult, AgentAction } from './actions';
export { runAgentAction } from './runAction';
export type { RunActionResult } from './runAction';
export type { SceneDocumentV1 };

export function createAgentDocument(name: string, id = crypto.randomUUID()): SceneDocumentV1 {
  const now = new Date().toISOString();
  return projectLegacyDocument({ name, nodes: [], edges: [] }, {
    documentId: id, pageId: `${id}:page-1`, pageName: 'Page 1', now,
  });
}

export function parseAgentDocument(value: unknown): SceneDocumentV1 {
  return requireValidSceneDocument(value);
}

/** The JSON the OpenFlowKit app imports: nodes and edges of one page. */
export function exportAgentDocumentPage(document: SceneDocumentV1, pageId = document.pages[0]?.id ?? '') {
  const { nodes, edges } = projectSceneDocumentToReactFlow(document, pageId);
  return { name: document.name, nodes, edges };
}
