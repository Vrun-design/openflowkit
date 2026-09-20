import type { SceneDocumentV1 } from '../../domain/document/types';
import { exportCanonicalSvg } from '../../infrastructure/export/canonicalSvg';
import { serializeCanonicalJson } from '../../infrastructure/export/canonicalJson';

export function buildV2SvgExport(document: SceneDocumentV1): { filename: string; svg: string } {
  return { filename: `${document.id}.svg`, svg: exportCanonicalSvg(document) };
}

export function buildV2JsonExport(document: SceneDocumentV1): { filename: string; json: string } {
  return { filename: `${document.id}.json`, json: serializeCanonicalJson(document) };
}

export function downloadTextFile(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
