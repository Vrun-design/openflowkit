import type { FlowEdge, FlowNode } from '@/lib/types';
import type { JsonObject } from '../../domain/document/json';
import type { SceneDocumentV1, SceneLayer } from '../../domain/document/types';

export interface ReactFlowGraph {
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
}

export interface ReactFlowProjectionContext {
  readonly documentId: string;
  readonly pageId: string;
  readonly pageName?: string;
  readonly name: string;
  readonly diagramType: string;
  readonly now: string;
  readonly createdAt?: string;
  readonly layers?: readonly SceneLayer[];
  readonly pageExtensions?: JsonObject;
}

export interface ReactFlowProjection {
  readonly nodes: FlowNode[];
  readonly edges: FlowEdge[];
  readonly envelope: JsonObject;
  readonly diagramType: string;
  readonly layers: readonly SceneLayer[];
  readonly pageExtensions: JsonObject;
}

export type OpenCanvasBridgeResult =
  | {
      readonly usedCanonicalDocument: false;
      readonly nodes: readonly FlowNode[];
      readonly edges: readonly FlowEdge[];
      readonly document: null;
    }
  | {
      readonly usedCanonicalDocument: true;
      readonly nodes: readonly FlowNode[];
      readonly edges: readonly FlowEdge[];
      readonly document: SceneDocumentV1;
    };
