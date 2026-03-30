const GITHUB_API = 'https://api.github.com';
const MAX_FILES_TO_FETCH = 200;
const TOKEN_STORAGE_KEY = 'flowmind_github_token';
const SOURCE_EXTENSIONS = new Set([
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
]);
const ALWAYS_INCLUDE_PATTERNS = [
  /^package\.json$/,
  /^tsconfig\.json$/,
  /^jsconfig\.json$/,
  /^pyproject\.toml$/,
  /^requirements\.txt$/,
  /^go\.mod$/,
  /^Cargo\.toml$/,
  /(^|\/)docker-compose\.ya?ml$/i,
  /(^|\/)compose\.ya?ml$/i,
  /(^|\/)Chart\.yaml$/,
  /\.tf$/,
] as const;
const ENTRY_POINT_PATTERNS = [
  /(^|\/)index\.[jt]sx?$/,
  /(^|\/)main\.[jt]sx?$/,
  /(^|\/)app\.[jt]sx?$/,
  /(^|\/)server\.[jt]sx?$/,
  /(^|\/)main\.py$/,
  /(^|\/)app\.py$/,
  /(^|\/)main\.go$/,
  /(^|\/)cmd\//,
] as const;
const DIRECTORY_SIGNAL_PATTERNS: Array<[RegExp, number]> = [
  [/(^|\/)(api|routes|route|controller|handlers?)\//i, 80],
  [/(^|\/)(services?|domain|usecases?|business)\//i, 72],
  [/(^|\/)(models?|schema|entity|entities|repository|repositories|db|database)\//i, 68],
  [/(^|\/)(auth|security|middleware|guard|permissions?)\//i, 64],
  [/(^|\/)(components?|pages|views|screens|ui|frontend|web)\//i, 60],
  [/(^|\/)(config|configs|settings)\//i, 56],
  [/(^|\/)(lib|utils?|helpers?|shared|common|core)\//i, 42],
] as const;

export function getGitHubToken(): string {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setGitHubToken(token: string): void {
  try {
    if (token.trim()) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

interface GitHubTreeItem {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
}

interface GitHubTreeResponse {
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  branch: string;
}

export function parseGitHubUrl(input: string): ParsedGitHubUrl | null {
  const cleaned = input
    .trim()
    .replace(/\.git$/, '')
    .replace(/\/+$/, '');
  const patterns = [/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/, /^([^/]+)\/([^/]+)$/];
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2],
        branch: match[3] ?? 'main',
      };
    }
  }
  return null;
}

function isIgnoredGitHubPath(path: string): boolean {
  return path.includes('node_modules/') || path.includes('.git/');
}

function isAlwaysIncludedGitHubPath(path: string): boolean {
  return ALWAYS_INCLUDE_PATTERNS.some((pattern) => pattern.test(path));
}

function isSourceGitHubPath(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return SOURCE_EXTENSIONS.has(ext);
}

function isCandidateGitHubPath(path: string): boolean {
  return !isIgnoredGitHubPath(path) && (isAlwaysIncludedGitHubPath(path) || isSourceGitHubPath(path));
}

function scoreGitHubFilePath(path: string): number {
  let score = 0;
  const normalizedPath = path.replace(/\\/g, '/');
  const depth = normalizedPath.split('/').length;

  if (isAlwaysIncludedGitHubPath(normalizedPath)) {
    score += 1000;
  }

  if (ENTRY_POINT_PATTERNS.some((pattern) => pattern.test(normalizedPath))) {
    score += 320;
  }

  for (const [pattern, weight] of DIRECTORY_SIGNAL_PATTERNS) {
    if (pattern.test(normalizedPath)) {
      score += weight;
    }
  }

  if (normalizedPath.startsWith('src/')) {
    score += 40;
  }
  if (/README|example|spec|fixture|mock|stories?|test/i.test(normalizedPath)) {
    score -= 80;
  }
  if (/index\.[jt]sx?$/.test(normalizedPath)) {
    score += 36;
  }
  if (/client|server|worker|queue|cache|database|redis|postgres|kafka|rabbit/i.test(normalizedPath)) {
    score += 28;
  }

  score -= depth * 3;
  return score;
}

export function prioritizeGitHubFiles(paths: string[], limit = MAX_FILES_TO_FETCH): string[] {
  const candidatePaths = paths.filter(isCandidateGitHubPath);
  const alwaysInclude = candidatePaths.filter(isAlwaysIncludedGitHubPath);
  const ranked = candidatePaths
    .filter((path) => !alwaysInclude.includes(path))
    .sort((left, right) => {
      const scoreDiff = scoreGitHubFilePath(right) - scoreGitHubFilePath(left);
      return scoreDiff !== 0 ? scoreDiff : left.localeCompare(right);
    });

  return [...new Set([...alwaysInclude.sort((left, right) => left.localeCompare(right)), ...ranked])].slice(
    0,
    limit
  );
}

export async function fetchGitHubFileTree(
  owner: string,
  repo: string,
  branch: string
): Promise<{ files: GitHubTreeItem[]; truncated: boolean }> {
  const token = getGitHubToken();
  const url = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 404 && branch === 'main') {
      return fetchGitHubFileTree(owner, repo, 'master');
    }
    if (res.status === 403) {
      const msg = token
        ? 'GitHub API rate limit exceeded. Your token may be invalid.'
        : 'GitHub API rate limit exceeded. Add a token in settings for 5,000 req/hour.';
      throw new Error(msg);
    }
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  const data: GitHubTreeResponse = await res.json();
  return {
    files: data.tree.filter((item) => item.type === 'blob'),
    truncated: data.truncated,
  };
}

export async function fetchGitHubFileContent(
  owner: string,
  repo: string,
  branch: string,
  path: string
): Promise<string> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const res = await fetch(url);
  if (!res.ok) return '';
  return res.text();
}

export async function fetchGitHubRepo(
  owner: string,
  repo: string,
  branch: string,
  onProgress?: (message: string) => void
): Promise<Array<{ path: string; content: string }>> {
  onProgress?.('Fetching file tree...');
  const { files, truncated } = await fetchGitHubFileTree(owner, repo, branch);
  const candidatePaths = files.map((file) => file.path).filter(isCandidateGitHubPath);
  const prioritizedPaths = prioritizeGitHubFiles(candidatePaths, MAX_FILES_TO_FETCH);
  const selectedPaths = new Set(prioritizedPaths);
  const toFetch = files.filter((file) => selectedPaths.has(file.path));

  onProgress?.(
    `Found ${candidatePaths.length} candidate files. Prioritizing top ${toFetch.length} high-signal files...`
  );
  onProgress?.('Picking entry points, config, infra, and core modules before fetching...');

  const results: Array<{ path: string; content: string }> = [];
  const batchSize = 10;
  for (let i = 0; i < toFetch.length; i += batchSize) {
    const batch = toFetch.slice(i, i + batchSize);
    const contents = await Promise.all(
      batch.map(async (f) => {
        const content = await fetchGitHubFileContent(owner, repo, branch, f.path);
        return { path: f.path, content };
      })
    );
    results.push(...contents);
    onProgress?.(`Fetched ${Math.min(i + batchSize, toFetch.length)}/${toFetch.length} prioritized files...`);
  }

  if (truncated) {
    results.unshift({
      path: '_NOTE',
      content: `This repo has more files than we could fetch. Showing ${results.length} source files.`,
    });
  }

  return results;
}
