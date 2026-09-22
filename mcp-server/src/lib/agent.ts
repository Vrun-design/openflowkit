import type { ZodType, ZodTypeDef } from 'zod';
// The bundle is emitted by `npm run build:agent` at the repo root (see
// vite.agent.config.ts) and carries no declarations; this file is its typed
// surface. Keep in sync with src/agent/index.ts in the app.
// @ts-expect-error generated bundle has no declaration file
import * as bundle from '../generated/openflowkit-agent.js';

export interface SceneDocumentV1 {
  readonly id: string;
  readonly name: string;
  readonly updatedAt: string;
  readonly pages: readonly {
    readonly id: string;
    readonly name: string;
    readonly nodes: readonly unknown[];
    readonly connectors: readonly unknown[];
  }[];
}

export interface AgentOp {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  /** Zod object schema; `shape` is read by the MCP tool registration. */
  readonly schema: ZodType<unknown, ZodTypeDef, unknown>;
  readonly run: (input: unknown, context: unknown) => Promise<{ command: unknown; output: unknown }>;
}

export interface AgentOpSchemaObject {
  readonly shape: Record<string, ZodType<unknown, ZodTypeDef, unknown>>;
}

export interface ExportedFile {
  readonly filename: string;
  readonly mime: string;
  readonly text?: string;
  readonly base64?: string;
}

export interface IconMatch {
  readonly provider: string;
  readonly slug: string;
  readonly label: string;
  readonly category?: string;
}

export interface BridgePageSummary {
  readonly pageId: string;
  readonly name: string;
  readonly nodes: number;
  readonly connectors: number;
}

export interface BridgeClientInfo {
  readonly documentId: string;
  readonly name: string;
  readonly revision: number;
  readonly pageId: string;
  readonly pages: readonly BridgePageSummary[];
  readonly app: string;
}

export interface BridgeRequest {
  readonly id: string;
  readonly op: string;
  readonly input: unknown;
  readonly pageId?: string;
}

export interface BridgeHealth {
  readonly ok: true;
  readonly protocol: number;
  readonly name: string;
  readonly version: string;
  readonly connected: boolean;
  readonly documentId: string | null;
  readonly documentName: string | null;
  readonly pageId: string | null;
  readonly pages: readonly BridgePageSummary[];
  readonly lastSeenMs: number | null;
}

export interface DslLintReport {
  readonly ok: boolean;
  readonly family: string;
  readonly reserved: boolean;
  readonly statements: number;
  readonly lines: number;
  readonly diagnostics: readonly { readonly code: string; readonly severity: string; readonly line: number; readonly col: number; readonly message: string }[];
}

/** A compiled scene node, as much of it as headless consumers read. */
export interface BundleSceneNode {
  readonly id: string;
  readonly kind: string;
  readonly parentId: string | null;
  readonly layerId: string;
  readonly zIndex: number;
  readonly content: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
  readonly size: { readonly width: number; readonly height: number };
}

export interface BundleSceneConnector {
  readonly id: string;
  readonly source: { readonly nodeId: string | null };
  readonly target: { readonly nodeId: string | null };
  readonly metadata: Record<string, unknown>;
}

export interface BundleCompileResult {
  readonly frame: BundleSceneNode;
  readonly nodes: readonly BundleSceneNode[];
  readonly groups: readonly BundleSceneNode[];
  readonly connectors: readonly BundleSceneConnector[];
  readonly diagnostics: DslLintReport['diagnostics'];
  readonly meta: { readonly family: string; readonly title?: string };
}

export interface BundleWorkspaceView {
  readonly viewId: string;
  readonly name: string;
  readonly result: BundleCompileResult;
}

export interface BundleWorkspace {
  readonly family: string;
  readonly views: readonly BundleWorkspaceView[];
}

/** Structural shape `exportCanonicalSvg` reads; the real document is richer. */
export interface SvgExportPage {
  readonly id: string;
  readonly layers: readonly { readonly id: string; readonly visible: boolean }[];
  readonly nodes: readonly unknown[];
  readonly connectors: readonly unknown[];
}

export interface SvgExportDocument {
  readonly id: string;
  readonly pages: readonly SvgExportPage[];
}

export interface SvgExportOptions {
  readonly pageId?: string;
  readonly theme?: 'light' | 'dark' | 'print';
  readonly padding?: number;
  readonly pixelRatio?: number;
  readonly transparent?: boolean;
}

export interface OpCapabilities {
  readonly compile: (text: string, options?: unknown) => Promise<unknown>;
  readonly syntax: (family?: string) => string | Promise<string>;
  readonly searchIcons: (query: string, limit: number) => Promise<readonly IconMatch[]>;
  readonly exportFiles?: (request: unknown) => Promise<readonly ExportedFile[]>;
  readonly fitView?: (objectIds?: readonly string[]) => void;
}

interface AgentBundle {
  readonly AGENT_OPS: readonly AgentOp[];
  findAgentOp(name: string): AgentOp | null;
  runAgentOp(op: AgentOp, rawInput: unknown, context: {
    document: SceneDocumentV1; pageId: string; capabilities: OpCapabilities;
  }): Promise<{ document: SceneDocumentV1; changed: boolean; output: unknown }>;
  createFileCapabilities(options: {
    grammar: string;
    icons?: readonly IconMatch[];
    resolveIcon?: (id: string) => { packId: string; shapeId: string } | null;
  }): OpCapabilities;
  grammarSection(grammar: string, family?: string): string;
  lintDsl(source: string): DslLintReport;
  createAgentDocument(name: string, id?: string): SceneDocumentV1;
  parseAgentDocument(value: unknown): SceneDocumentV1;
  compileWorkspace(text: string, options?: { readonly layout?: unknown; readonly origin?: { readonly x: number; readonly y: number } }): Promise<BundleWorkspace>;
  readonly deterministicLayout: unknown;
  architectureWorkspaceText(model: unknown): string;
  archModelFromJson(value: unknown): unknown;
  exportCanonicalSvg(document: SvgExportDocument, options?: SvgExportOptions): string;
  readonly BRIDGE_PROTOCOL_VERSION: number;
  readonly BRIDGE_DEFAULT_PORT: number;
  readonly BRIDGE_POLL_SECONDS: number;
  readonly BRIDGE_IDLE_MS: number;
  readonly bridgeTokenHeader: string;
  bridgeUrls(port: number, host?: string): { base: string; health: string; hello: string; next: string; result: string };
  isAllowedBridgeOrigin(origin: string | undefined | null): boolean;
  isBridgeRequest(value: unknown): value is BridgeRequest;
}

export const {
  AGENT_OPS, findAgentOp, runAgentOp, createFileCapabilities, grammarSection, lintDsl,
  createAgentDocument, parseAgentDocument,
  compileWorkspace, deterministicLayout, architectureWorkspaceText, archModelFromJson, exportCanonicalSvg,
  BRIDGE_PROTOCOL_VERSION, BRIDGE_DEFAULT_PORT, BRIDGE_POLL_SECONDS, BRIDGE_IDLE_MS,
  bridgeTokenHeader, bridgeUrls, isAllowedBridgeOrigin, isBridgeRequest,
} = bundle as unknown as AgentBundle;

export type { ZodType, ZodRawShape, ZodObject } from 'zod';
