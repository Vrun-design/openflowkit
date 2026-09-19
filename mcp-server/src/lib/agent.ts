import type { ZodObject, ZodRawShape } from 'zod';
// The bundle is emitted by `npm run build:agent` at the repo root (see
// vite.agent.config.ts) and carries no declarations; this file is its typed
// surface. Keep in sync with src/agent/index.ts in the app.
// @ts-expect-error generated bundle has no declaration file
import * as bundle from '../generated/openflowkit-agent.js';

export interface SceneDocumentV1 {
  readonly id: string;
  readonly name: string;
  readonly updatedAt: string;
  readonly pages: readonly { readonly id: string; readonly name: string }[];
}

export interface AgentAction {
  readonly name: string;
  readonly description: string;
  readonly schema: ZodObject<ZodRawShape>;
}

export interface RunActionResult {
  readonly document: SceneDocumentV1;
  readonly changed: boolean;
  readonly output: unknown;
}

interface AgentBundle {
  readonly AGENT_ACTIONS: readonly AgentAction[];
  findAgentAction(name: string): AgentAction | null;
  runAgentAction(action: AgentAction, rawInput: unknown, document: SceneDocumentV1, pageId: string): RunActionResult;
  createAgentDocument(name: string, id?: string): SceneDocumentV1;
  parseAgentDocument(value: unknown): SceneDocumentV1;
  exportAgentDocumentPage(document: SceneDocumentV1, pageId?: string): {
    name: string; nodes: unknown[]; edges: unknown[];
  };
}

export const {
  AGENT_ACTIONS, findAgentAction, runAgentAction, createAgentDocument, parseAgentDocument, exportAgentDocumentPage,
} = bundle as AgentBundle;
