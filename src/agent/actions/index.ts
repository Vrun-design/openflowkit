import type { AgentAction } from './defineAction';
import { addNode } from './addNode';
import { connect } from './connect';
import { deleteNode } from './deleteNode';
import { getDocument } from './getDocument';
import { moveNode } from './moveNode';
import { setLabel } from './setLabel';

// Every surface (palette, WebMCP, MCP server, evals) reads this one list.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AGENT_ACTIONS: readonly AgentAction<any, unknown>[] = [
  getDocument, addNode, connect, setLabel, moveNode, deleteNode,
];

export function findAgentAction(name: string) {
  return AGENT_ACTIONS.find((action) => action.name === name) ?? null;
}

export type { ActionContext, ActionResult, AgentAction } from './defineAction';
