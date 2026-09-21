import type { JsonObject } from '../opencanvas/domain/document/json';
import type { SceneConnector, SceneNode } from '../opencanvas/domain/document/types';

/** A frame and everything the DSL owns inside it. `groups` are container-kind nodes. */
export interface DslFrameScene {
  frame: SceneNode;
  nodes: readonly SceneNode[];
  groups?: readonly SceneNode[];
  connectors: readonly SceneConnector[];
}

/** One canonical `[key: value]` / bare word entry, as stored in `metadata.dsl.attrs`. */
export interface CanonicalAttribute {
  key?: string;
  value: string;
}

export interface DslNodeMeta {
  id: string;
  line: number;
  /** Authored reference name when `label:` overrides the display label. */
  name?: string;
  /** Canonical DSL shape word when the scene shape alone cannot say it (e.g. `component`). */
  shape?: string;
  /** Canonical DSL colour word when the palette key alone cannot say it. */
  color?: string;
  fill?: 'bold' | 'outline';
  icon?: string;
  /** Reserved model kind (`person`, `system`, …) and block kinds. */
  kind?: string;
  /** Attributes with no scene representation: tech, desc, tags, link, pin, rank, width, height, order, unknown words. */
  attrs?: readonly CanonicalAttribute[];
  /** Full-line `//` comments that preceded the statement. */
  comments?: readonly string[];
  /** `note X : text` statements anchored to X. */
  notes?: readonly string[];
  /** Set on generated note stickies; they serialize as `note` lines, not declarations. */
  noteFor?: string;
}

export interface DslConnectorMeta {
  line: number;
  attrs?: readonly CanonicalAttribute[];
  comments?: readonly string[];
}

export interface DslFrameMeta {
  family: string;
  version: number;
  /** Authored direction; absent when the family default applies. */
  direction?: string;
  /** Authored source text, when the frame is still exactly that diagram. */
  source?: string;
  /** Structural hash of the compiled content, for the code panel's edited check. */
  hash?: string;
  /** Authored `title:`; the frame's `content.label` mirrors it. */
  title?: string;
  /** Authored `appearance:` palette; absent when the default palette applies. */
  appearance?: { palette?: string };
  comments?: readonly string[];
}

function metaObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** The raw `metadata.dsl` record, for family-specific keys the typed view does not model. */
export function dslFrameRaw(frame: SceneNode): Record<string, unknown> {
  return metaObject(frame.metadata.dsl);
}

export function dslFrameMeta(frame: SceneNode): DslFrameMeta {
  const meta = metaObject(frame.metadata.dsl);
  const appearance = metaObject(meta.appearance);
  return {
    family: typeof meta.family === 'string' ? meta.family : 'architecture',
    version: typeof meta.version === 'number' ? meta.version : 1,
    ...(typeof meta.direction === 'string' ? { direction: meta.direction } : {}),
    ...(typeof meta.source === 'string' ? { source: meta.source } : {}),
    ...(typeof meta.hash === 'string' ? { hash: meta.hash } : {}),
    ...(typeof meta.title === 'string' ? { title: meta.title } : {}),
    ...(typeof appearance.palette === 'string' ? { appearance: { palette: appearance.palette } } : {}),
    ...(Array.isArray(meta.comments) ? { comments: meta.comments.filter((item): item is string => typeof item === 'string') } : {}),
  };
}

export function dslNodeMeta(node: SceneNode): DslNodeMeta {
  const meta = metaObject(node.metadata.dsl);
  return {
    id: typeof meta.id === 'string' ? meta.id : node.id,
    line: typeof meta.line === 'number' ? meta.line : Number.MAX_SAFE_INTEGER,
    ...(typeof meta.name === 'string' ? { name: meta.name } : {}),
    ...(typeof meta.shape === 'string' ? { shape: meta.shape } : {}),
    ...(typeof meta.color === 'string' ? { color: meta.color } : {}),
    ...(meta.fill === 'bold' || meta.fill === 'outline' ? { fill: meta.fill } : {}),
    ...(typeof meta.icon === 'string' ? { icon: meta.icon } : {}),
    ...(typeof meta.kind === 'string' ? { kind: meta.kind } : {}),
    ...(Array.isArray(meta.attrs) ? { attrs: canonicalAttributes(meta.attrs) } : {}),
    ...(Array.isArray(meta.comments) ? { comments: meta.comments.filter((item): item is string => typeof item === 'string') } : {}),
    ...(Array.isArray(meta.notes) ? { notes: meta.notes.filter((item): item is string => typeof item === 'string') } : {}),
    ...(typeof meta.noteFor === 'string' ? { noteFor: meta.noteFor } : {}),
  };
}

export function dslConnectorMeta(connector: SceneConnector): DslConnectorMeta {
  const meta = metaObject(connector.metadata.dsl);
  return {
    line: typeof meta.line === 'number' ? meta.line : Number.MAX_SAFE_INTEGER,
    ...(Array.isArray(meta.attrs) ? { attrs: canonicalAttributes(meta.attrs) } : {}),
    ...(Array.isArray(meta.comments) ? { comments: meta.comments.filter((item): item is string => typeof item === 'string') } : {}),
  };
}

export function canonicalAttributes(value: readonly unknown[]): CanonicalAttribute[] {
  return value.flatMap((entry) => {
    const item = metaObject(entry);
    if (typeof item.value !== 'string') return [];
    return [{ ...(typeof item.key === 'string' ? { key: item.key } : {}), value: item.value }];
  });
}

/** Splits canonical attributes into the ones with no scene representation, keyed for re-emission. */
export function attrsToJson(attributes: readonly CanonicalAttribute[]): JsonObject[] {
  return attributes.map((attribute) => (attribute.key ? { key: attribute.key, value: attribute.value } : { value: attribute.value }));
}
