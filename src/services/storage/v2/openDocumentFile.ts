import { productionNodeCatalogEntry } from '../../../opencanvas/application/active-document/productionNodeCatalog';
import { isJsonObject, type JsonObject } from '../../../opencanvas/domain/document/json';
import { dropDanglingConnectors, projectLegacyDocument } from '../../../opencanvas/domain/document/legacyProjection';
import { migrateSceneDocument } from '../../../opencanvas/domain/document/migration';
import { SCENE_DOCUMENT_FORMAT, type SceneDocumentV1 } from '../../../opencanvas/domain/document/types';
import { validateSceneDocumentV1 } from '../../../opencanvas/domain/document/validation';

// A v1 node saved with no size at all (pre-March builds): the size v2 inserts that kind at.
// ponytail: catalog default, not v1's content-fitted DOM size — a long label may overflow.
export function defaultLegacyNodeSize(node: JsonObject) {
  return (productionNodeCatalogEntry(String(node.type)) ?? productionNodeCatalogEntry('custom'))?.size ?? null;
}

const OPENS = 'OpenFlowKit opens the .json files it exports, from this version or the previous one.';

/** `notice`: what opening had to change, for the person who opened it. */
export type OpenedDocumentFile = { readonly document: SceneDocumentV1; readonly notice?: string } | { readonly error: string };

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
    return { error: `It isn’t valid JSON. ${OPENS}` };
  }
  if (!isJsonObject(parsed)) return { error: `It isn’t an OpenFlowKit diagram. ${OPENS}` };
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
      const { document, dropped } = dropDanglingConnectors(projectLegacyDocument(parsed, {
        documentId: id, pageId: `${id}:page-1`, pageName: 'Page 1', now, resolveNodeSize: defaultLegacyNodeSize,
      }));
      // Anything else that would not open again is refused here, never saved as a damaged diagram.
      const valid = validateSceneDocumentV1(document);
      if (valid.success === false) return { error: `Invalid V1 document: ${valid.issues[0]?.message ?? 'unknown issue'}` };
      return dropped === 0 ? { document } : {
        document,
        notice: `${dropped} ${dropped === 1 ? 'connection pointed' : 'connections pointed'} at a shape that no longer exists and ${dropped === 1 ? 'was' : 'were'} left out.`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Invalid V1 document.' };
    }
  }
  return { error: `It isn’t an OpenFlowKit diagram. ${OPENS}` };
}
