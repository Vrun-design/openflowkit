import { productionNodeCatalogEntry } from '../../../opencanvas/application/active-document/productionNodeCatalog';
import { isJsonObject, type JsonObject } from '../../../opencanvas/domain/document/json';
import { projectLegacyDocument } from '../../../opencanvas/domain/document/legacyProjection';
import { migrateSceneDocument } from '../../../opencanvas/domain/document/migration';
import { SCENE_DOCUMENT_FORMAT, type SceneDocumentV1 } from '../../../opencanvas/domain/document/types';

// A v1 node saved with no size at all (pre-March builds): the size v2 inserts that kind at.
// ponytail: catalog default, not v1's content-fitted DOM size — a long label may overflow.
export function defaultLegacyNodeSize(node: JsonObject) {
  return (productionNodeCatalogEntry(String(node.type)) ?? productionNodeCatalogEntry('custom'))?.size ?? null;
}

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
      return { document: projectLegacyDocument(parsed, {
        documentId: id, pageId: `${id}:page-1`, pageName: 'Page 1', now, resolveNodeSize: defaultLegacyNodeSize,
      }) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Invalid V1 document.' };
    }
  }
  return { error: 'Not an OpenFlowKit document.' };
}
