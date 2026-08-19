import { cloneJsonValue, isJsonObject } from './json';
import { SCENE_DOCUMENT_VERSION, type SceneDocumentV1 } from './types';
import { validateSceneDocumentV1, type DocumentValidationIssue } from './validation';

export type DocumentMigrationResult =
  | { readonly success: true; readonly document: SceneDocumentV1; readonly migrated: false }
  | { readonly success: false; readonly issues: readonly DocumentValidationIssue[] };

export function migrateSceneDocument(value: unknown): DocumentMigrationResult {
  if (!isJsonObject(value)) {
    return {
      success: false,
      issues: [{ path: '$', message: 'Document must contain JSON values only.' }],
    };
  }
  if (typeof value.schemaVersion === 'number' && value.schemaVersion > SCENE_DOCUMENT_VERSION) {
    return {
      success: false,
      issues: [
        { path: '$.schemaVersion', message: 'Document uses a newer unsupported schema version.' },
      ],
    };
  }

  const cloned = cloneJsonValue(value);
  const validation = validateSceneDocumentV1(cloned);
  if (validation.success === false) {
    return { success: false, issues: validation.issues };
  }
  return { success: true, document: validation.document, migrated: false };
}
