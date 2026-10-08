// The facts layer's vocabulary: what a scan takes in and what it hands the map.

export interface SourceFile {
  /** Repo-relative, `/`-separated. */
  path: string;
  content: string;
}

export interface ImportFact {
  from: string;
  /** A file path, or a folder path when `toKind` is `dir` (a workspace package whose entry file was not found). */
  to: string;
  /** 1-based line where the statement starts. */
  line: number;
  /** The statement as written, whitespace collapsed. */
  text: string;
  /** Absent for a file. */
  toKind?: 'dir';
}

export interface ExternalUse {
  file: string;
  /** Package name; scoped names keep their scope (`@aws-sdk/client-s3`). */
  pkg: string;
  line: number;
}

/** A local-looking import (relative, or an alias like `@/x`) that no file answers. */
export interface UnresolvedImport {
  from: string;
  line: number;
  text: string;
  spec: string;
}

export interface ImportScan {
  /** Sorted by `from`, then `line`. */
  imports: ImportFact[];
  unresolved: UnresolvedImport[];
  externals: ExternalUse[];
  /** Line count per scanned file. */
  loc: Record<string, number>;
}

/** One import statement as a language scanner reads it, before resolution. */
export interface RawImport {
  /** What follows `from`/`import`: a path, or a dotted module (Python keeps leading dots for relative). */
  spec: string;
  line: number;
  text: string;
  /** Python `from m import a, b`: the names, since each may be a submodule. */
  names?: string[];
}

/** No real specifier or module path is this long. */
export const MAX_SPEC = 256;
/** Bigger than any real tsconfig, package.json, go.mod or packaging file: skipped rather than parsed. */
export const MAX_CONFIG = 200_000;
