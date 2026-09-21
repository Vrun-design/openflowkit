import { z } from 'zod';
import type { CompileOptions, CompileResult } from '../../dsl/compile';
import type { DocumentCommand } from '../../opencanvas/domain/commands/types';
import type { SceneDocumentV1, ScenePage } from '../../opencanvas/domain/document/types';


/**
 * Shared point schema. zod's declaration types in this repo widen object
 * fields to optional (`{x?: number}` even though parsing guarantees both), so
 * `pointOf` narrows a parsed value back for the compiler; the schema is the
 * runtime truth.
 */
export const pointSchema = z.object({ x: z.number(), y: z.number() });

export function pointOf(value: { readonly x?: number; readonly y?: number }): { x: number; y: number } {
  return { x: value.x ?? 0, y: value.y ?? 0 };
}

/** One host action the ops cannot compute themselves (camera, raster, disk). */
export interface OpCapabilities {
  /** text → compiled frame scene. The host injects its layout port. */
  readonly compile: (text: string, options?: CompileOptions) => Promise<CompileResult>;
  /** Grammar reference, narrowed to one family when asked (async: may load a chunk). */
  readonly syntax: (family?: string) => string | Promise<string>;
  /** Icon catalog search over the packs this host ships. */
  readonly searchIcons: (query: string, limit: number) => Promise<readonly IconMatch[]>;
  /** PNG raster of a canonical SVG; absent in hosts without a canvas. */
  readonly rasterize?: (svg: string, scale: number) => Promise<Uint8Array>;
  /** Files for an export intent; absent in hosts without an export pipeline. */
  readonly exportFiles?: (request: ExportRequest) => Promise<readonly ExportedFile[]>;
  /** Frame the view on ids, or on everything when omitted. View-only. */
  readonly fitView?: (objectIds?: readonly string[]) => void;
}

export interface IconMatch {
  readonly provider: string;
  readonly slug: string;
  readonly label: string;
  readonly category?: string;
}

export type ExportFormat = 'png' | 'svg' | 'pdf' | 'json';
export type ExportScope = 'selection' | 'page' | 'document';
export type ExportTheme = 'light' | 'dark' | 'print';

export interface ExportRequest {
  readonly document: SceneDocumentV1;
  readonly format: ExportFormat;
  readonly scope: ExportScope;
  readonly pageId: string;
  readonly selectedNodeIds?: readonly string[];
  readonly scale?: 1 | 2 | 3;
  readonly theme?: ExportTheme;
}

export interface ExportedFile {
  readonly filename: string;
  readonly mime: string;
  /** Text formats. */
  readonly text?: string;
  /** Binary formats, base64 (the wire is JSON). */
  readonly base64?: string;
}

export interface OpContext {
  readonly document: SceneDocumentV1;
  /** Page the op acts on; defaults to the first page in `runAgentOp`. */
  readonly pageId: string;
  readonly capabilities: OpCapabilities;
}

/** What an op hands back: at most one reversible command plus a JSON-safe output. */
export interface OpOutcome<Output> {
  readonly command: DocumentCommand | null;
  readonly output: Output;
}

export interface AgentOp<Input = unknown, Output = unknown> {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  /**
   * `Input` is the parsed *output* of the schema; the third parameter keeps
   * zod's looser input type (optional nested objects) out of inference.
   */
  readonly schema: z.ZodType<Input, z.ZodTypeDef, unknown>;
  readonly run: (input: Input, context: OpContext) => Promise<OpOutcome<Output>>;
}

export function defineOp<Input, Output>(op: AgentOp<Input, Output>): AgentOp<Input, Output> {
  return op;
}

export function requirePage(document: SceneDocumentV1, pageId: string): ScenePage {
  const page = document.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new RangeError(`Page "${pageId}" was not found.`);
  return page;
}

export function requireFrame(page: ScenePage, frameId: string) {
  const frame = page.nodes.find((node) => node.id === frameId && node.kind === 'frame');
  if (!frame) throw new RangeError(`Diagram frame "${frameId}" was not found on this page.`);
  return frame;
}
