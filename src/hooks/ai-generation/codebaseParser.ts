import type { SupportedLanguage } from './codeToArchitecture';

export interface FileImport {
  source: string;
  isLocal: boolean;
}

const _SOURCE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'py',
  'go',
  'java',
  'rb',
  'cs',
  'cpp',
  'cc',
  'cxx',
  'rs',
  'json',
]);

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
  'target',
  '.turbo',
  '.cache',
  'coverage',
  '.github',
  '.vscode',
  '.idea',
  'tmp',
  'temp',
]);

const SKIP_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'ico',
  'webp',
  'bmp',
  'woff',
  'woff2',
  'ttf',
  'eot',
  'otf',
  'mp4',
  'mp3',
  'wav',
  'avi',
  'mov',
  'zip',
  'tar',
  'gz',
  'rar',
  '7z',
  'lock',
  'map',
  'min.js',
  'min.css',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
]);

export function shouldIncludeFile(path: string): boolean {
  const parts = path.split('/');
  for (const part of parts) {
    if ((part.startsWith('.') && part !== '.') || SKIP_DIRS.has(part)) return false;
  }
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return !SKIP_EXTENSIONS.has(ext);
}

export function detectLanguage(path: string): SupportedLanguage | null {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, SupportedLanguage> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    py: 'python',
    go: 'go',
    java: 'java',
    rb: 'ruby',
    cs: 'csharp',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    rs: 'rust',
  };
  return map[ext] ?? null;
}

// ── Import Parsers ──────────────────────────────────────────────────

const TS_IMPORT_NAMED = /import\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/g;
const TS_IMPORT_DEFAULT = /import\s+\w+\s+from\s+['"]([^'"]+)['"]/g;
const TS_IMPORT_SIDE_EFFECT = /import\s+['"]([^'"]+)['"]/g;
const TS_IMPORT_ALL = /import\s+\*\s+as\s+\w+\s+from\s+['"]([^'"]+)['"]/g;
const TS_EXPORT_REEXPORT = /export\s+(?:\*|(?:type\s+)?\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g;
const TS_REQUIRE = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const TS_DYNAMIC_IMPORT = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function parseTsImports(code: string): FileImport[] {
  const imports: FileImport[] = [];
  const seen = new Set<string>();
  const addImport = (source: string) => {
    if (seen.has(source)) return;
    seen.add(source);
    imports.push({ source, isLocal: source.startsWith('.') || source.startsWith('/') });
  };
  for (const match of code.matchAll(TS_IMPORT_NAMED)) addImport(match[1]);
  for (const match of code.matchAll(TS_IMPORT_DEFAULT)) addImport(match[1]);
  for (const match of code.matchAll(TS_IMPORT_SIDE_EFFECT)) addImport(match[1]);
  for (const match of code.matchAll(TS_IMPORT_ALL)) addImport(match[1]);
  for (const match of code.matchAll(TS_EXPORT_REEXPORT)) addImport(match[1]);
  for (const match of code.matchAll(TS_REQUIRE)) addImport(match[1]);
  for (const match of code.matchAll(TS_DYNAMIC_IMPORT)) addImport(match[1]);
  return imports;
}

const PY_IMPORT = /^(?:from\s+([\w.]+)\s+import|import\s+([\w.]+(?:\s*,\s*[\w.]+)*))/gm;

function parsePythonImports(code: string): FileImport[] {
  const imports: FileImport[] = [];
  const seen = new Set<string>();
  for (const match of code.matchAll(PY_IMPORT)) {
    const mod = (match[1] ?? match[2] ?? '').split('.')[0];
    if (!mod || mod.startsWith('_') || seen.has(mod)) continue;
    seen.add(mod);
    const isLocal = ![
      'os',
      'sys',
      'json',
      're',
      'math',
      'datetime',
      'typing',
      'collections',
      'itertools',
      'functools',
      'pathlib',
      'abc',
      'dataclasses',
      'enum',
      'asyncio',
      'logging',
      'unittest',
      'io',
      'copy',
      'pickle',
      'hashlib',
      'base64',
      'urllib',
      'http',
      'socket',
      'subprocess',
      'threading',
      'multiprocessing',
      'argparse',
      'configparser',
      'csv',
      'xml',
      'html',
      'sqlite3',
    ].includes(mod);
    imports.push({ source: mod, isLocal });
  }
  return imports;
}

const GO_IMPORT = /"(?:[\w./-]+)"/g;

function parseGoImports(code: string): FileImport[] {
  const imports: FileImport[] = [];
  const seen = new Set<string>();
  for (const match of code.matchAll(GO_IMPORT)) {
    const pkg = match[0].replace(/"/g, '');
    if (seen.has(pkg)) continue;
    seen.add(pkg);
    const isLocal = pkg.startsWith('.') || pkg.startsWith('/') || !pkg.includes('.');
    imports.push({ source: pkg, isLocal });
  }
  return imports;
}

export function parseImports(
  code: string,
  language: SupportedLanguage | null,
  aliases: AliasMapping[] = []
): FileImport[] {
  if (!language) return [];
  const raw =
    language === 'typescript' || language === 'javascript'
      ? parseTsImports(code)
      : language === 'python'
        ? parsePythonImports(code)
        : language === 'go'
          ? parseGoImports(code)
          : [];

  if (aliases.length === 0) return raw;

  return raw.map((imp) => {
    if (imp.isLocal) return imp;
    const resolved = resolveAliasImport(imp.source, aliases);
    if (resolved) return { source: resolved, isLocal: true };
    return imp;
  });
}

// ── File Tree ───────────────────────────────────────────────────────

export interface FileEntry {
  path: string;
  content: string;
  language: SupportedLanguage | null;
  imports: FileImport[];
}

export interface DirectoryNode {
  name: string;
  path: string;
  children: Map<string, DirectoryNode>;
  files: string[];
}

export function buildFileTree(paths: string[]): DirectoryNode {
  const root: DirectoryNode = { name: '/', path: '', children: new Map(), files: [] };
  for (const path of paths) {
    const parts = path.split('/').filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i];
      const dirPath = parts.slice(0, i + 1).join('/');
      if (!node.children.has(dirName)) {
        node.children.set(dirName, {
          name: dirName,
          path: dirPath,
          children: new Map(),
          files: [],
        });
      }
      node = node.children.get(dirName)!;
    }
    node.files.push(parts[parts.length - 1]);
  }
  return root;
}

export function formatFileTree(node: DirectoryNode, indent = 0): string {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);
  const sortedDirs = [...node.children.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const sortedFiles = [...node.files].sort();
  for (const [name, child] of sortedDirs) {
    const fileCount = countFiles(child);
    lines.push(`${prefix}${name}/ (${fileCount})`);
    lines.push(formatFileTree(child, indent + 1));
  }
  for (const file of sortedFiles) {
    lines.push(`${prefix}${file}`);
  }
  return lines.join('\n');
}

function countFiles(node: DirectoryNode): number {
  let count = node.files.length;
  for (const child of node.children.values()) {
    count += countFiles(child);
  }
  return count;
}

// ── TSConfig Alias Resolution ───────────────────────────────────────

export interface AliasMapping {
  prefix: string;
  target: string;
}

export function parseTsConfigAliases(
  tsconfigContent: string | null,
  packageJsonContent: string | null
): AliasMapping[] {
  const aliases: AliasMapping[] = [];

  if (tsconfigContent) {
    try {
      const config = JSON.parse(tsconfigContent) as Record<string, unknown>;
      const compilerOptions = (config.compilerOptions ?? {}) as Record<string, unknown>;
      const baseUrl = (compilerOptions.baseUrl as string) ?? '.';
      const paths = compilerOptions.paths as Record<string, string[]> | undefined;

      if (paths) {
        for (const [pattern, targets] of Object.entries(paths)) {
          if (!targets.length) continue;
          const prefix = pattern.replace(/\*$/, '');
          const target = targets[0].replace(/\*$/, '');
          const resolvedTarget = target.startsWith('.')
            ? normalizePath(`${baseUrl}/${target}`)
            : target;
          aliases.push({ prefix, target: resolvedTarget });
        }
      }
    } catch {
      /* invalid JSON */
    }
  }

  if (packageJsonContent) {
    try {
      const pkg = JSON.parse(packageJsonContent) as Record<string, unknown>;
      const pkgAliases = pkg.imports as Record<string, string> | undefined;
      if (pkgAliases) {
        for (const [pattern, target] of Object.entries(pkgAliases)) {
          if (typeof target !== 'string') continue;
          const prefix = pattern.replace(/\*$/, '');
          const resolvedTarget = target.replace(/\*$/, '').replace(/^\.\//, '');
          aliases.push({ prefix, target: resolvedTarget });
        }
      }
    } catch {
      /* invalid JSON */
    }
  }

  return aliases;
}

function normalizePath(p: string): string {
  const parts = p.split('/').filter(Boolean);
  const result: string[] = [];
  for (const part of parts) {
    if (part === '..') result.pop();
    else if (part !== '.') result.push(part);
  }
  return result.join('/');
}

export function resolveAliasImport(source: string, aliases: AliasMapping[]): string | null {
  for (const alias of aliases) {
    if (source.startsWith(alias.prefix)) {
      const suffix = source.slice(alias.prefix.length);
      return normalizePath(`${alias.target}/${suffix}`);
    }
  }
  return null;
}
