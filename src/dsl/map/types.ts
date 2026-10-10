// The Living Map model and the facts that feed it. Pure data: the engine in this folder
// turns facts into a tree plus links, and every number on screen is a count of real lines.

export type MapNodeKind = 'part' | 'group' | 'folder' | 'file' | 'external' | 'more';
export type LinkKind = 'import' | 'call' | 'data' | 'build';
export type Depth = 'overview' | 'detailed' | 'everything';

export interface Evidence {
  file: string;
  line: number;
  text: string;
}

export interface MapNode {
  id: string;
  kind: MapNodeKind;
  name: string;
  desc?: string;
  /** Name or description came from the overlay (AI or a human), not from the code. */
  ai?: boolean;
  path?: string;
  parent: string | null;
  children: string[];
  files: number;
  loc: number;
}

export interface MapLink {
  /** Node ids: a file, an external, or (for `toKind: 'dir'` imports) a folder. */
  from: string;
  to: string;
  kind: LinkKind;
  label?: string;
  evidence: Evidence[];
  inferred?: boolean;
}

export interface MapSource {
  repo?: string;
  ref?: string;
  sha?: string;
}

export interface MapStats {
  files: number;
  loc: number;
  /** Resolved import lines (a link can carry several). */
  imports: number;
  /** Imports and links whose endpoint is not in the facts: dropped, but counted. */
  unresolved: number;
}

export interface MapModel {
  root: string;
  nodes: Record<string, MapNode>;
  links: MapLink[];
  source: MapSource;
  stats: MapStats;
}

export interface MapFacts {
  files: { path: string; loc: number }[];
  imports: { from: string; to: string; line: number; text: string; toKind?: 'file' | 'dir' }[];
  /** Extra links (runtime calls, data, build). Endpoints are file paths, folder paths or external ids. */
  links?: MapLink[];
  externals?: { id: string; name: string; desc?: string }[];
  /** Deployable parts; without them every top-level folder is a part. */
  /**
   * `id` is ignored: a part's node id is its dir. A part inside another part's folder opens from it, unless that one
   * is `rootApp`: the repo-root app standing for `src/`, whose folder holds its code, not other packages.
   */
  parts?: { id?: string; name: string; dir: string; desc?: string; rootApp?: true }[];
  source?: MapSource;
  /** Imports the scanner could not resolve (broken paths): added to `stats.unresolved`, so they show up somewhere. */
  unresolvedImports?: number;
}

export interface MapOverlay {
  names?: Record<string, { name: string; desc?: string }>;
  /** Folder id -> groups of that folder's loose files. */
  groups?: Record<string, { key: string; name: string; desc?: string; files: string[] }[]>;
}

/** Everything between two sibling boxes (the LCA rule), both directions merged. */
export interface AggEdge {
  key: string;
  kind: LinkKind;
  /** The open container (or the root) that holds both ends: lay the arrow out inside it. */
  parent: string;
  /** The busier direction, so the arrowhead points where most of the lines go. */
  from: string;
  to: string;
  count: number;
  forward: number;
  reverse: number;
  both: boolean;
  /** Per direction, capped at 80 lines; counts above stay exact. */
  evidence: Evidence[];
  reverseEvidence: Evidence[];
  links: MapLink[];
  inferred: boolean;
  /** Set by `budgetEdges`: not among the strongest arrows of its container, so surfaces may leave it undrawn. */
  minor?: boolean;
}

export interface Talk {
  id: string;
  out: number;
  in: number;
  links: MapLink[];
}
