// File-mode capabilities: what an MCP server can do without a browser.
// The grammar and the icon manifest are build artifacts (scripts/build-*),
// read once per process and cached.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createFileCapabilities, type IconMatch, type OpCapabilities } from './agent.js';

const HERE = import.meta.dirname ?? new URL('.', import.meta.url).pathname;
const DATA_DIR = resolve(HERE, '..', '..', 'data');

let grammarPromise: Promise<string> | null = null;
let iconsPromise: Promise<IconMatch[]> | null = null;
let capabilities: OpCapabilities | null = null;

async function readText(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return '';
  }
}

export function loadGrammar(): Promise<string> {
  // The build copies src/dsl/grammar.md here (scripts/build-grammar-doc.mjs).
  grammarPromise ??= readText(resolve(DATA_DIR, 'grammar.md')).then((text) =>
    text.trim().length > 0
      ? text
      : 'Grammar unavailable in this install. See src/dsl/grammar.md in the repository.');
  return grammarPromise;
}

export function loadIcons(): Promise<IconMatch[]> {
  iconsPromise ??= readText(resolve(DATA_DIR, 'icons.json')).then((text) => {
    if (!text) return [];
    try {
      const parsed: unknown = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.filter((entry): entry is IconMatch =>
        Boolean(entry) && typeof (entry as IconMatch).slug === 'string') : [];
    } catch {
      return [];
    }
  });
  return iconsPromise;
}

export async function loadFileCapabilities(): Promise<OpCapabilities> {
  if (capabilities) return capabilities;
  const [grammar, icons] = await Promise.all([loadGrammar(), loadIcons()]);
  capabilities = createFileCapabilities({ grammar, icons });
  return capabilities;
}
