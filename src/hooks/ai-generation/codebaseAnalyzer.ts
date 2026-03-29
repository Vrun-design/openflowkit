import type { SupportedLanguage } from './codeToArchitecture';
import {
  type DirectoryNode,
  type FileImport,
  buildFileTree,
  shouldIncludeFile,
  detectLanguage,
  parseImports,
  parseTsConfigAliases,
  resolveAliasImport,
} from './codebaseParser';

// ── Types ───────────────────────────────────────────────────────────

export interface CodebaseFile {
  path: string;
  content: string;
  language: SupportedLanguage | null;
  imports: FileImport[];
}

export interface DependencyEdge {
  from: string;
  to: string;
}

export interface CodebaseAnalysis {
  files: CodebaseFile[];
  edges: DependencyEdge[];
  entryPoints: string[];
  stats: {
    totalFiles: number;
    sourceFiles: number;
    languages: Record<string, number>;
    directories: number;
  };
  summary: string;
}

// ── Analysis ────────────────────────────────────────────────────────

const ENTRY_POINT_PATTERNS = [
  /^index\.[jt]sx?$/,
  /^main\.[jt]sx?$/,
  /^app\.[jt]sx?$/,
  /^main\.py$/,
  /^app\.py$/,
  /^main\.go$/,
  /^cmd\//,
  /^src\/index\.[jt]sx?$/,
  /^src\/main\.[jt]sx?$/,
  /^src\/app\.[jt]sx?$/,
];

function resolveRelativeImport(fromPath: string, importSource: string): string | null {
  if (!importSource.startsWith('.')) return null;
  const dir = fromPath.split('/').slice(0, -1).join('/');
  const resolved = [...dir.split('/').filter(Boolean), ...importSource.split('/').filter(Boolean)];
  const normalized: string[] = [];
  for (const part of resolved) {
    if (part === '..') normalized.pop();
    else if (part !== '.') normalized.push(part);
  }
  return normalized.join('/');
}

function tryResolvePath(path: string, allFiles: Set<string>): string | null {
  const extensions = [
    '',
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '/index.ts',
    '/index.tsx',
    '/index.js',
  ];
  for (const ext of extensions) {
    const candidate = path + ext;
    if (allFiles.has(candidate)) return candidate;
  }
  return null;
}

export function analyzeCodebase(
  rawFiles: Array<{ path: string; content: string }>,
  maxFiles = 500
): CodebaseAnalysis {
  const tsconfigContent = rawFiles.find(
    (f) => f.path === 'tsconfig.json' || f.path === 'jsconfig.json'
  )?.content;
  const packageJsonContent = rawFiles.find((f) => f.path === 'package.json')?.content;
  const aliases = parseTsConfigAliases(tsconfigContent ?? null, packageJsonContent ?? null);

  const filteredFiles = rawFiles
    .filter((f) => shouldIncludeFile(f.path) && !f.path.endsWith('.json'))
    .slice(0, maxFiles);

  const allPaths = new Set(filteredFiles.map((f) => f.path));

  const files: CodebaseFile[] = filteredFiles.map((f) => {
    const language = detectLanguage(f.path);
    const imports = parseImports(f.content, language, aliases);
    return { path: f.path, content: f.content, language, imports };
  });

  const edges: DependencyEdge[] = [];
  for (const file of files) {
    for (const imp of file.imports) {
      let resolved: string | null = null;
      if (imp.isLocal && imp.source.startsWith('.')) {
        resolved = resolveRelativeImport(file.path, imp.source);
      } else if (imp.isLocal) {
        resolved = resolveAliasImport(imp.source, aliases);
      }
      if (!resolved) continue;
      const target = tryResolvePath(resolved, allPaths);
      if (target && target !== file.path) {
        edges.push({ from: file.path, to: target });
      }
    }
  }

  const entryPoints = files
    .filter((f) => ENTRY_POINT_PATTERNS.some((p) => p.test(f.path)))
    .map((f) => f.path);

  const languages: Record<string, number> = {};
  for (const file of files) {
    if (file.language) {
      languages[file.language] = (languages[file.language] ?? 0) + 1;
    }
  }

  const dirSet = new Set<string>();
  for (const file of files) {
    const parts = file.path.split('/');
    for (let i = 1; i < parts.length; i++) {
      dirSet.add(parts.slice(0, i).join('/'));
    }
  }

  const tree = buildFileTree(files.map((f) => f.path));
  const summary = buildSummary(files, edges, entryPoints, tree, languages, dirSet.size);

  return {
    files,
    edges,
    entryPoints,
    stats: {
      totalFiles: rawFiles.length,
      sourceFiles: files.length,
      languages,
      directories: dirSet.size,
    },
    summary,
  };
}

function buildSummary(
  files: CodebaseFile[],
  edges: DependencyEdge[],
  entryPoints: string[],
  tree: DirectoryNode,
  languages: Record<string, number>,
  dirCount: number
): string {
  const lines: string[] = [];

  const langSummary = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, count]) => `${lang}: ${count}`)
    .join(', ');

  lines.push(`CODEBASE STRUCTURE`);
  lines.push(`Files: ${files.length} source files across ${dirCount} directories`);
  lines.push(`Languages: ${langSummary}`);
  lines.push('');

  if (entryPoints.length > 0) {
    lines.push('ENTRY POINTS:');
    for (const ep of entryPoints.slice(0, 10)) {
      lines.push(`  ${ep}`);
    }
    lines.push('');
  }

  const depCounts = new Map<string, { incoming: number; outgoing: number }>();
  for (const edge of edges) {
    const from = depCounts.get(edge.from) ?? { incoming: 0, outgoing: 0 };
    from.outgoing++;
    depCounts.set(edge.from, from);
    const to = depCounts.get(edge.to) ?? { incoming: 0, outgoing: 0 };
    to.incoming++;
    depCounts.set(edge.to, to);
  }

  const hotFiles = [...depCounts.entries()]
    .filter(([, counts]) => counts.incoming >= 2)
    .sort((a, b) => b[1].incoming - a[1].incoming)
    .slice(0, 10);

  if (hotFiles.length > 0) {
    lines.push('KEY MODULES (most depended-on):');
    for (const [path, counts] of hotFiles) {
      lines.push(`  ${path} (${counts.incoming} dependents)`);
    }
    lines.push('');
  }

  const topDirs = getTopDirectories(tree);
  if (topDirs.length > 0) {
    lines.push('TOP-LEVEL STRUCTURE:');
    for (const dir of topDirs.slice(0, 15)) {
      lines.push(`  ${dir.path}/ — ${dir.fileCount} files`);
    }
    lines.push('');
  }

  if (edges.length > 0) {
    lines.push('DEPENDENCY GRAPH (local imports only):');
    const grouped = new Map<string, string[]>();
    for (const edge of edges.slice(0, 100)) {
      const dir = edge.from.split('/').slice(0, -1).join('/') || '/';
      if (!grouped.has(dir)) grouped.set(dir, []);
      grouped.get(dir)!.push(`  ${edge.from} → ${edge.to}`);
    }
    for (const [dir, deps] of grouped) {
      lines.push(`[${dir}]`);
      for (const dep of deps.slice(0, 5)) {
        lines.push(dep);
      }
    }
  }

  return lines.join('\n');
}

interface DirInfo {
  path: string;
  fileCount: number;
}

function getTopDirectories(tree: DirectoryNode): DirInfo[] {
  const dirs: DirInfo[] = [];
  for (const [name, child] of tree.children) {
    dirs.push({ path: name, fileCount: countFilesInNode(child) });
  }
  return dirs.sort((a, b) => b.fileCount - a.fileCount);
}

function countFilesInNode(node: DirectoryNode): number {
  let count = node.files.length;
  for (const child of node.children.values()) {
    count += countFilesInNode(child);
  }
  return count;
}
