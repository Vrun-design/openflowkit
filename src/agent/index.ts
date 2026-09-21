// Public surface of the agent action registry, bundled for the MCP server by
// vite.agent.config.ts. Pure: no store, no browser, no React.
import { projectLegacyDocument } from '@/opencanvas/domain/document/legacyProjection';
import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import { validateSceneDocumentV1 } from '@/opencanvas/domain/document/validation';

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
  const result = validateSceneDocumentV1(value);
  if (result.success === false) {
    const summary = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
    throw new TypeError(`Invalid OpenCanvas document: ${summary}`);
  }
  return result.document;
}

/** One page's canonical nodes and connectors. Phase 4 replaces this with DSL export. */
export function exportAgentDocumentPage(document: SceneDocumentV1, pageId = document.pages[0]?.id ?? '') {
  const page = document.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new RangeError(`Page "${pageId}" was not found.`);
  return { name: document.name, nodes: page.nodes, edges: page.connectors };
}
