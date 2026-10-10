// File-mode capabilities: what an MCP server can do without a browser.
// The grammar and the icon manifest are build artifacts (scripts/build-*),
// read once per process and cached.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICON_PACK_IDS, createFileCapabilities, headlessElkLayout, tablerSvg, type IconMatch, type OpCapabilities } from './agent.js';

const HERE = dirname(fileURLToPath(import.meta.url));
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

const PROVIDER_BY_PACK = new Map(Object.entries(ICON_PACK_IDS).map(([provider, packId]) => [packId, provider]));
const artPromises = new Map<string, Promise<Record<string, unknown>>>();

/** One provider's art file (data/icon-art, written by build:icons), read on first use. */
function providerArt(provider: string): Promise<Record<string, unknown>> {
  if (!artPromises.has(provider)) {
    artPromises.set(provider, readText(resolve(DATA_DIR, 'icon-art', `${provider}.json`)).then((text) => {
      try {
        return text ? JSON.parse(text) as Record<string, unknown> : {};
      } catch {
        return {};
      }
    }));
  }
  return artPromises.get(provider)!;
}

/** The art the editor draws for one icon, as a data URL; null when this install has none. */
export async function loadIconArt(packId: string, shapeId: string): Promise<string | null> {
  const provider = PROVIDER_BY_PACK.get(packId);
  if (!provider) return null;
  const art = (await providerArt(provider))[shapeId];
  const svg = provider === 'tabler' && Array.isArray(art) ? tablerSvg(art as Parameters<typeof tablerSvg>[0]) : typeof art === 'string' ? art : null;
  return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
}

export async function loadFileCapabilities(): Promise<OpCapabilities> {
  if (capabilities) return capabilities;
  const [grammar, icons] = await Promise.all([loadGrammar(), loadIcons()]);
  capabilities = createFileCapabilities({ grammar, icons, loadIcon: loadIconArt, layout: headlessElkLayout });
  return capabilities;
}
