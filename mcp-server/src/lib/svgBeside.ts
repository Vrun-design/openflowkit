// The SVG that sits next to a saved diagram file, written only when someone asked.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { findAgentOp, runAgentOp, type SceneDocumentV1 } from './agent.js';
import { loadFileCapabilities } from './fileCapabilities.js';

/** Where the picture of a saved file goes: beside it, `.openflow.json` / `.ofk` / `.json` swapped for `.svg`, else `.svg` appended. */
export function svgBeside(file: string): string {
  const suffix = /\.(openflow\.json|ofk|json)$/i;
  return suffix.test(file) ? file.replace(suffix, '.svg') : `${file}.svg`;
}

/** The canonical SVG of one page, through the same `export` op `render` uses. */
export async function exportSvg(document: SceneDocumentV1, pageId: string, theme = 'light'): Promise<string> {
  const exported = await runAgentOp(findAgentOp('export')!, { format: 'svg', scope: 'page', theme }, {
    document, pageId, capabilities: await loadFileCapabilities(),
  });
  return (exported.output as { files: readonly { text?: string }[] }).files[0]!.text!;
}

/** Writes the SVG of `document` beside `file` and returns its path. */
export async function writeSvgBeside(file: string, document: SceneDocumentV1, pageId = document.pages[0]!.id, theme = 'light'): Promise<string> {
  const svgPath = svgBeside(file);
  await mkdir(path.dirname(path.resolve(svgPath)), { recursive: true });
  await writeFile(svgPath, await exportSvg(document, pageId, theme), 'utf8');
  return svgPath;
}

/** `writeSvgBeside` for a save that already succeeded: a failure comes back as text, never thrown. */
export async function tryWriteSvgBeside(file: string, document: SceneDocumentV1, pageId?: string, theme?: string): Promise<{ svg: string } | { svgError: string }> {
  try {
    return { svg: await writeSvgBeside(file, document, pageId, theme) };
  } catch (error) {
    return { svgError: error instanceof Error ? error.message : String(error) };
  }
}
