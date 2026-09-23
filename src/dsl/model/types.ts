import type { DslDirection } from '../ast';

/**
 * The phase 5 model layer: one object, many views. `ArchModel` is pure data —
 * it lives on every view frame's `metadata.dsl.arch` so a frame is always
 * self-describing, and views are pages whose nodes carry `metadata.model`.
 */

export const ELEMENT_KINDS = [
  'person', 'system', 'container', 'component', 'store', 'queue', 'external', 'node', 'instance',
] as const;
export type ElementKind = (typeof ELEMENT_KINDS)[number];

/** Kinds that may own children; used to render an element as a boundary. */
export const ELEMENT_KINDS_WITH_CHILDREN: readonly ElementKind[] = ['system', 'container', 'component', 'node'];

export interface ArchElement {
  /** Dotted path of ids: `shop.web`. Stable across renames. */
  readonly id: string;
  readonly kind: ElementKind;
  readonly name: string;
  readonly parent: string | null;
  readonly tech?: string;
  readonly desc?: string;
  readonly tags: readonly string[];
  readonly links: readonly string[];
  readonly icon?: string;
  readonly color?: string;
  /** Canonical attributes the typed fields above do not hold (`shape`, `fill`, unknown words). */
  readonly attrs?: readonly { readonly key?: string; readonly value: string }[];
  /** Deployment environment name (`Prod`), deployment nodes and instances only. */
  readonly env?: string;
  /** Instance target element id, `instance` kind only. */
  readonly instanceOf?: string;
  /** Authored line, for canonical ordering. */
  readonly line?: number;
}

export interface ArchRelation {
  /** `rel:<from>-><to>` for authored, `implied:<from>-><to>` for derived. */
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly tech?: string;
  readonly tags: readonly string[];
  readonly attrs?: readonly { readonly key?: string; readonly value: string }[];
  readonly line?: number;
  /** Derived from child relations; never serialized. */
  readonly implied?: boolean;
}

export const VIEW_KINDS = ['landscape', 'context', 'container', 'component', 'deployment', 'custom'] as const;
export type ViewKind = (typeof VIEW_KINDS)[number];

export interface ViewRuleWhere {
  readonly kind?: string;
  readonly tag?: string;
  readonly tagNot?: string;
}

/**
 * One `include`/`exclude` line. `subject` is `*`, `X`, `X.*`, `X.**`, or the
 * relation forms encoded as `arrow`: `A -> B`, `A ->`, `-> B`.
 */
export interface ViewRule {
  readonly op: 'include' | 'exclude';
  readonly subject: string;
  readonly arrow?: { readonly from?: string; readonly to?: string };
  readonly where?: ViewRuleWhere;
  /** Original line, so unsupported predicates can be re-emitted verbatim (W160). */
  readonly raw?: string;
  readonly line?: number;
}

export interface ArchView {
  readonly id: string;
  readonly kind: ViewKind;
  readonly name: string;
  readonly of?: string;
  readonly env?: string;
  readonly direction?: DslDirection;
  readonly rules: readonly ViewRule[];
  readonly line?: number;
}

/** IcePanel's eight step kinds, spelled in our DSL. */
export const FLOW_STEP_KINDS = [
  'intro', 'message', 'process', 'alternate', 'parallel', 'goto', 'info', 'conclusion',
] as const;
export type FlowStepKind = (typeof FLOW_STEP_KINDS)[number];

export interface FlowBranch {
  readonly label?: string;
  readonly steps: readonly FlowStep[];
}

export interface FlowStep {
  readonly id: string;
  readonly kind: FlowStepKind;
  readonly from?: string;
  readonly to?: string;
  readonly label?: string;
  readonly tech?: string;
  readonly tags: readonly string[];
  /** `alternate` branches (`else`) and `parallel` lanes (`and`). */
  readonly branches?: readonly FlowBranch[];
  /** `goto` target flow name. */
  readonly goto?: string;
  readonly line?: number;
}

export interface ArchFlow {
  readonly id: string;
  readonly name: string;
  readonly steps: readonly FlowStep[];
  readonly line?: number;
}

export interface ArchModel {
  readonly name?: string;
  /** Authored `appearance:` and `icons:` directives; the model regenerates the text, so it keeps them. */
  readonly palette?: string;
  readonly icons?: 'auto' | 'off';
  readonly elements: readonly ArchElement[];
  readonly relations: readonly ArchRelation[];
  readonly views: readonly ArchView[];
  readonly flows: readonly ArchFlow[];
}

export const EMPTY_ARCH_MODEL: ArchModel = { elements: [], relations: [], views: [], flows: [] };

/** One view compiled to a scene: the frame plus its placed elements and edges. */
export interface ArchViewScene {
  readonly view: ArchView;
  readonly scene: import('../families/types').FamilyScene;
}

/** A relation projected onto a view: endpoints resolved to shown elements. */
export interface ProjectedRelation {
  readonly relation: ArchRelation;
  readonly from: string;
  readonly to: string;
  readonly implied: boolean;
}
