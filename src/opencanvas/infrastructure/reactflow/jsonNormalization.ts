import { isJsonObject, type JsonObject, type JsonValue } from '../../domain/document/json';

function normalizeJsonValue(value: unknown, path: string, ancestors: WeakSet<object>): JsonValue {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path} must be finite.`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (!value || typeof value !== 'object') {
    throw new TypeError(`${path} must be JSON-compatible.`);
  }
  if (ancestors.has(value)) throw new TypeError(`${path} must not contain a cycle.`);

  ancestors.add(value);
  let normalized: JsonValue;
  if (Array.isArray(value)) {
    normalized = value.map((item, index) => {
      if (item === undefined) throw new TypeError(`${path}[${index}] must be JSON-compatible.`);
      return normalizeJsonValue(item, `${path}[${index}]`, ancestors);
    });
  } else {
    const record: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) {
        record[key] = normalizeJsonValue(item, `${path}.${key}`, ancestors);
      }
    }
    normalized = record;
  }
  ancestors.delete(value);
  return normalized;
}

export function normalizeJsonObject(value: unknown, path = '$'): JsonObject {
  const normalized = normalizeJsonValue(value, path, new WeakSet());
  if (!isJsonObject(normalized)) {
    throw new TypeError(`${path} must be a JSON object.`);
  }
  return normalized;
}
