// Public surface of the agent layer, bundled for the MCP server by
// vite.agent.config.ts. Pure: no store, no browser, no React.
import { projectLegacyDocument } from '@/opencanvas/domain/document/legacyProjection';
import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import { validateSceneDocumentV1 } from '@/opencanvas/domain/document/validation';

export { AGENT_OPS, findAgentOp } from './ops';
export { createFileCapabilities, grammarSection } from './host';
export type { FileHostOptions } from './host';
export {
  BRIDGE_DEFAULT_PORT, BRIDGE_IDLE_MS, BRIDGE_POLL_SECONDS, BRIDGE_PROTOCOL_VERSION,
  bridgeTokenHeader, bridgeUrls, isAllowedBridgeOrigin, isBridgeRequest,
} from './bridge/protocol';
export type { BridgeClientInfo, BridgeHealth, BridgePageSummary, BridgeRequest, BridgeResult } from './bridge/protocol';
export type { AnyAgentOp } from './ops';
export type { AgentOp, ExportedFile, ExportRequest, IconMatch, OpCapabilities, OpContext, OpOutcome } from './ops';
export { CAPABILITY_MANIFEST, MANIFEST_VERSION, manifestCoverage, unlistedOps } from './manifest';
export { lintDsl } from './lint';
export type { DslLintReport } from './lint';
export { resolveAgentOpCommand, runAgentOp } from './runAction';
export type { RunOpResult } from './runAction';
export type { SceneDocumentV1 };

// Headless consumers (the `openflowkit` CLI) compile whole workspaces and
// render canonical SVG without a browser. Re-exported, not re-implemented.
export { compileWorkspace } from '../dsl/compile';
export { deterministicLayout } from '../dsl/layout';
export { architectureWorkspaceText } from '../dsl/families/architecture/text';
export { archModelFromJson } from '../dsl/model/model';
export { exportCanonicalSvg } from '../opencanvas/infrastructure/export/canonicalSvg';
// The wireframe vocabulary, so discovery lists what the renderer draws.
export { WIDGET_KINDS } from '../opencanvas/domain/nodes/widgetNodePresentation';
export { FRAME_PRESETS } from '../opencanvas/domain/nodes/framePreset';

export function createAgentDocument(name: string, id: string = crypto.randomUUID()): SceneDocumentV1 {
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
