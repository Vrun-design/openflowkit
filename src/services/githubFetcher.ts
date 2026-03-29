const GITHUB_API = 'https://api.github.com';
const MAX_FILES_TO_FETCH = 80;
const TOKEN_STORAGE_KEY = 'flowmind_github_token';

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

  const configFiles = files.filter((f) =>
    ['tsconfig.json', 'jsconfig.json', 'package.json'].includes(f.path)
  );

  const sourceFiles = files.filter((f) => {
    const ext = f.path.split('.').pop()?.toLowerCase() ?? '';
    return (
      [
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
      ].includes(ext) &&
      !f.path.includes('node_modules/') &&
      !f.path.includes('.git/')
    );
  });

  const toFetch = [...configFiles, ...sourceFiles.slice(0, MAX_FILES_TO_FETCH)];

  onProgress?.(`Fetching ${toFetch.length} source files...`);

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
    onProgress?.(`Fetched ${Math.min(i + batchSize, toFetch.length)}/${toFetch.length} files...`);
  }

  if (truncated) {
    results.unshift({
      path: '_NOTE',
      content: `This repo has more files than we could fetch. Showing ${results.length} source files.`,
    });
  }

  return results;
}
