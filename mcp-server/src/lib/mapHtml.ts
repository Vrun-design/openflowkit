import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MapDepth, MapModelData } from './agent.js';
import type { GithubRepo } from './mapGit.js';

/** Built by `npm run build:map-viewer` (vite.map-viewer.config.ts); build-dist copies it next to the agent bundle. */
const VIEWER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'generated-viewer');

const JSON_ESCAPES: Record<string, string> = { '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029' };
/** JSON for a `<script type="application/json">`: no character in it can end the element or start a comment. */
export const safeJson = (value: unknown): string => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (c) => JSON_ESCAPES[c]!);

/** The page's own scripts and styles are ours, so a closing tag or comment opener inside one is a build problem, not input to repair. */
function assertInlineSafe(code: string, what: string, closing: string): void {
  if (code.toLowerCase().includes(closing) || code.includes('<!--')) throw new Error(`the map viewer's ${what} contains "${closing}" or "<!--" and cannot be inlined; rebuild it.`);
}
const escapeText = (s: string): string => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export async function renderMapHtml(input: { name: string; model: MapModelData; depth: MapDepth; repo: GithubRepo | null }): Promise<string> {
  const [js, css] = await Promise.all([
    readFile(path.join(VIEWER_DIR, 'map-viewer.js'), 'utf8'),
    readFile(path.join(VIEWER_DIR, 'map-viewer.css'), 'utf8'),
  ]).catch(() => { throw new Error('the map viewer is not built; run `npm run build:map-viewer` in the repository.'); });
  assertInlineSafe(js, 'script', '</script');
  assertInlineSafe(css, 'stylesheet', '</style');
  // Only this exact script may run; a model string can never become one.
  const csp = `default-src 'none'; script-src 'sha256-${createHash('sha256').update(js).digest('base64')}'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'`;
  const data = safeJson({ model: input.model, repo: input.repo, name: input.name, depth: input.depth });
  return [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="light dark">',
    `<title>${escapeText(input.name)} · map</title>`,
    `<style>${css}</style>`,
    '</head><body>',
    '<div id="root"></div>',
    `<script type="application/json" id="ofk-map-data">${data}</script>`,
    `<script>${js}</script>`,
    '</body></html>',
    '',
  ].join('\n');
}
