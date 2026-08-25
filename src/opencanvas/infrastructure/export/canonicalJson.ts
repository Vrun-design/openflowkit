import type { SceneDocumentV1 } from '../../domain/document/types';
import { validateSceneDocumentV1 } from '../../domain/document/validation';

export function serializeCanonicalJson(document: SceneDocumentV1): string {
  const validation = validateSceneDocumentV1(document);
  if (validation.success === false) {
    throw new TypeError('Cannot serialize an invalid canonical document.');
  }
  return JSON.stringify(validation.document, null, 2) + '\n';
}
