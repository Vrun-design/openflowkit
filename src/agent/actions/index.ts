import type { AgentAction } from './defineAction';
import { addNode } from './addNode';
import { connect } from './connect';
import { deleteConnector } from './deleteConnector';
import { deleteNode } from './deleteNode';
import { duplicateNodes } from './duplicateNodes';
import { getDocument } from './getDocument';
import { moveNode } from './moveNode';
import { renameDocument } from './renameDocument';
import { setLabel } from './setLabel';
import { setStyle } from './setStyle';
import { transformNode } from './transformNode';

// Every surface (palette, WebMCP, MCP server, evals) reads this one list.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AGENT_ACTIONS: readonly AgentAction<any, unknown>[] = [
  getDocument, addNode, connect, setLabel, setStyle, moveNode, transformNode, duplicateNodes,
  deleteNode, deleteConnector, renameDocument,
];

export function findAgentAction(name: string) {
  return AGENT_ACTIONS.find((action) => action.name === name) ?? null;
}

export type { ActionContext, ActionResult, AgentAction } from './defineAction';
