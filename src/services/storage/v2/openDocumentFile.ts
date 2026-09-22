import { isJsonObject } from '../../../opencanvas/domain/document/json';
import { projectLegacyDocument } from '../../../opencanvas/domain/document/legacyProjection';
import { migrateSceneDocument } from '../../../opencanvas/domain/document/migration';
import { SCENE_DOCUMENT_FORMAT, type SceneDocumentV1 } from '../../../opencanvas/domain/document/types';

export type OpenedDocumentFile = { readonly document: SceneDocumentV1 } | { readonly error: string };

/**
 * A `.json` file the user opens: our own export (canonical JSON, any supported
 * schema version) or a V1 OpenFlowKit file (`{ nodes, edges }`). The result is
 * a fresh document under `id`, so opening a file never overwrites the one it
 * was exported from.
 */
export function documentFromFileText(text: string, id: string, now = new Date().toISOString()): OpenedDocumentFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: 'Not a JSON file.' };
  }
  if (!isJsonObject(parsed)) return { error: 'Not an OpenFlowKit document.' };
  if (parsed.format === SCENE_DOCUMENT_FORMAT) {
    const migrated = migrateSceneDocument({ ...parsed, id });
    if (migrated.success === true) return { document: { ...migrated.document, updatedAt: now } };
    return {
      error: migrated.reason === 'newer-schema'
        ? `This file was saved by a newer OpenFlowKit (schema ${migrated.schemaVersion}). Update to open it.`
        : `Invalid document: ${migrated.issues[0]?.message ?? 'unknown issue'}`,
    };
  }
  if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
    try {
      return { document: projectLegacyDocument(parsed, { documentId: id, pageId: `${id}:page-1`, pageName: 'Page 1', now }) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Invalid V1 document.' };
    }
  }
  return { error: 'Not an OpenFlowKit document.' };
}
