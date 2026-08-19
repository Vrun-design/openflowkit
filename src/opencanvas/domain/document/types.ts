import type { Point2d, Size2d, Transform2d } from '../geometry/types';
import type { JsonObject } from './json';

export const SCENE_DOCUMENT_FORMAT = 'openflowkit.scene' as const;
export const SCENE_DOCUMENT_VERSION = 1 as const;

export interface ScenePort {
  readonly id: string;
  readonly anchor: SceneAnchor;
  readonly accepts: readonly string[];
  readonly metadata: JsonObject;
}

export type SceneAnchor =
  | { readonly kind: 'center' }
  | {
      readonly kind: 'side';
      readonly side: 'top' | 'right' | 'bottom' | 'left';
      readonly ratio: number;
    }
  | { readonly kind: 'normalized'; readonly x: number; readonly y: number };

export interface SceneNode {
  readonly id: string;
  readonly kind: string;
  readonly parentId: string | null;
  readonly layerId: string;
  readonly zIndex: number;
  readonly transform: Transform2d;
  readonly size: Size2d;
  readonly content: JsonObject;
  readonly appearance: JsonObject;
  readonly ports: readonly ScenePort[];
  readonly metadata: JsonObject;
  readonly extensions: JsonObject;
}

export interface ConnectorEndpoint {
  readonly nodeId: string;
  readonly portId: string | null;
  readonly anchor: SceneAnchor | null;
}

export type ConnectorRouteKind = 'direct' | 'polyline' | 'bezier' | 'orthogonal';
export type ConnectorRouteOwnership = 'automatic' | 'manual' | 'imported-fixed' | 'hybrid';

export interface ConnectorRouteIntent {
  readonly kind: ConnectorRouteKind;
  readonly ownership: ConnectorRouteOwnership;
}

export interface ConnectorLabel {
  readonly id: string;
  readonly text: string;
  readonly pathRatio: number;
  readonly offset: Point2d;
  readonly metadata: JsonObject;
}

export interface SceneConnector {
  readonly id: string;
  readonly source: ConnectorEndpoint;
  readonly target: ConnectorEndpoint;
  readonly route: ConnectorRouteIntent;
  readonly waypoints: readonly Point2d[];
  readonly labels: readonly ConnectorLabel[];
  readonly appearance: JsonObject;
  readonly semantics: JsonObject;
  readonly metadata: JsonObject;
  readonly extensions: JsonObject;
}

export interface SceneLayer {
  readonly id: string;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;
}

export interface ScenePage {
  readonly id: string;
  readonly name: string;
  readonly diagramKind: string;
  readonly layers: readonly SceneLayer[];
  readonly nodes: readonly SceneNode[];
  readonly connectors: readonly SceneConnector[];
  readonly metadata: JsonObject;
  readonly extensions: JsonObject;
}

export interface SceneDocumentV1 {
  readonly format: typeof SCENE_DOCUMENT_FORMAT;
  readonly schemaVersion: typeof SCENE_DOCUMENT_VERSION;
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly pages: readonly ScenePage[];
  readonly metadata: JsonObject;
  readonly extensions: JsonObject;
}

export type SceneDocument = SceneDocumentV1;
