import type { SceneDocumentV1 } from './types';
import { isJsonValue, type JsonValue } from './json';
import { validateSceneDocumentV1 } from './validation';

function orderJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(orderJson);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, orderJson(value[key])])
    );
  }
  return value;
}

export function stringifyCanonicalJson(value: unknown, space = 2): string {
  if (!isJsonValue(value)) throw new TypeError('Canonical JSON requires finite JSON values.');
  return JSON.stringify(orderJson(value), null, space);
}

export function serializeSceneDocument(document: SceneDocumentV1): string {
  const result = validateSceneDocumentV1(document);
  if (!result.success) throw new TypeError('Cannot serialize invalid OpenCanvas document.');
  return stringifyCanonicalJson(result.document);
}
