import type { SceneConnector, SceneNode } from '../../opencanvas/domain/document/types';
import type { Point2d, Size2d } from '../../opencanvas/domain/geometry/types';
import type { DslDiagnostic, DslDirection } from '../ast';
import type { CommentTracker } from '../document';
import type { LayoutRequest, LayoutOutcome } from '../layout';
import type { SwatchResolver } from '../../opencanvas/domain/nodes/nodePalette';
import type { DslFrameScene } from '../sceneMeta';
import type { DslSegment } from '../segments';

export type LayoutRunner = (request: LayoutRequest, signal?: AbortSignal) => Promise<LayoutOutcome>;

export interface FamilyContext {
  /** The exact source text, for `metadata.dsl.source`. */
  readonly text: string;
  readonly origin: Point2d;
  readonly direction: DslDirection;
  /** Authored `title:`; families pad for the frame's title band when set. */
  readonly title?: string;
  readonly layout: LayoutRunner;
  /** Palette for this compile (grammar `appearance:`); every swatch goes through it. */
  readonly swatch: SwatchResolver;
  /** Shared sink: every family pushes its own diagnostics here. */
  readonly diagnostics: DslDiagnostic[];
  /** Full-line comments, claimed by the statements they precede. */
  readonly comments: CommentTracker;
  readonly measureLabel?: (label: string, kind: string) => Size2d;
  readonly resolveIcon?: (id: string) => { packId: string; shapeId: string } | null;
  readonly signal?: AbortSignal;
}

/** What a family hands back: scene records with `parentId: null` for frame children. */
export interface FamilyScene {
  readonly nodes: readonly SceneNode[];
  readonly connectors: readonly SceneConnector[];
  /** Frame content size, already including padding. */
  readonly size: Size2d;
  /** Family-specific frame metadata (round-trips; serializers read it back). */
  readonly meta?: Record<string, unknown>;
}

/** One view of a family that compiles to several frames (the C4 model layer). */
export interface FamilyViewScene {
  /** Stable view id; used for frame ids and page matching. */
  readonly id: string;
  /** Page name the editor gives this view. */
  readonly name: string;
  readonly scene: FamilyScene;
}

/**
 * One diagram family: its statement parser, layout and scene mapping, plus the
 * canonical text it writes back. Families share the tokenizer, the attribute
 * vocabulary, sizing and the text helpers; nothing else.
 */
export interface Family {
  readonly name: string;
  /** Statement parse + scene mapping. Never throws; diagnostics go to `context.diagnostics`. */
  compile(segments: readonly DslSegment[], context: FamilyContext): Promise<FamilyScene>;
  /** Multi-frame families (architecture workspaces) override the single-frame path. */
  compileViews?(segments: readonly DslSegment[], context: FamilyContext): Promise<readonly FamilyViewScene[]>;
  /** Body lines after the pragma, family line and title. Pure function of the scene. */
  serialize(scene: DslFrameScene): string[];
}
