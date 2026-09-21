// The one registry every surface reads: the MCP server builds its tools here,
// the editor's live bridge dispatches here, the manifest test proves it here.
import { createDiagram, getDiagram, listDiagrams, updateDiagram } from './dslOps';
import { findIconsFor, getSyntax, searchIcons } from './iconOps';
import { exportDiagram, fitView, getDocument, listPages, screenshotDiagram } from './pipelineOps';
import { addShape, deleteShapes, moveNodes, styleNodes } from './sceneOps';
import type { AgentOp } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyAgentOp = AgentOp<any, unknown>;

/** Order is the order tools appear in an MCP client's list. */
export const AGENT_OPS: readonly AnyAgentOp[] = [
  createDiagram,
  updateDiagram,
  getDiagram,
  listDiagrams,
  getSyntax,
  searchIcons,
  findIconsFor,
  moveNodes,
  styleNodes,
  deleteShapes,
  addShape,
  exportDiagram,
  screenshotDiagram,
  fitView,
  getDocument,
  listPages,
];

export function findAgentOp(name: string): AnyAgentOp | null {
  return AGENT_OPS.find((op) => op.name === name) ?? null;
}

export type { AgentOp, ExportedFile, ExportRequest, IconMatch, OpCapabilities, OpContext, OpOutcome } from './types';
export { defineOp, pointOf, pointSchema, requireFrame, requirePage } from './types';
