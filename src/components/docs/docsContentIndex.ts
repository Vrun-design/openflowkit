import { docsMarkdownLoaders } from './docsMarkdownLoaders';

let cachedDocsContextPromise: Promise<string> | null = null;

export function getMarkdownLoader(path: string): (() => Promise<unknown>) | undefined {
  return docsMarkdownLoaders[path];
}

export function getAvailableMarkdownPaths(): string[] {
  return Object.keys(docsMarkdownLoaders);
}

export async function loadAllDocsContext(): Promise<string> {
  if (!cachedDocsContextPromise) {
    cachedDocsContextPromise = (async () => {
      const entries = await Promise.all(
        Object.entries(docsMarkdownLoaders).map(async ([path, loader]) => {
          const filename = path.split('/').pop()?.replace('.md', '') || '';
          const content = await loader();
          return `--- FILE: ${filename} ---\n${String(content)}\n`;
        })
      );

      return entries.join('\n');
    })();
  }

  return cachedDocsContextPromise;
}
