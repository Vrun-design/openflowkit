import type { DocumentCommand } from '../../domain/commands/types';
import type { JsonObject, JsonValue } from '../../domain/document/json';
import type { SceneNode, ScenePage } from '../../domain/document/types';

const SYMBOL_KEY = 'openCanvasSymbol';

export interface SymbolOverrides {
  readonly content: JsonObject;
  readonly appearance: JsonObject;
}

export type SymbolBinding =
  | { readonly version: 1; readonly role: 'definition'; readonly definitionId: string }
  | { readonly version: 1; readonly role: 'instance'; readonly definitionId: string;
      readonly overrides: SymbolOverrides };

function isObject(value: JsonValue | undefined): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function symbolBinding(node: SceneNode): SymbolBinding | null {
  const value = node.content[SYMBOL_KEY];
  if (!isObject(value) || value.version !== 1 || typeof value.definitionId !== 'string') return null;
  if (value.role === 'definition') {
    return { version: 1, role: 'definition', definitionId: value.definitionId };
  }
  if (value.role !== 'instance' || !isObject(value.overrides)) return null;
  const content = value.overrides.content; const appearance = value.overrides.appearance;
  if (!isObject(content) || !isObject(appearance)) return null;
  return { version: 1, role: 'instance', definitionId: value.definitionId,
    overrides: { content, appearance } };
}

function withBinding(node: SceneNode, binding: SymbolBinding): SceneNode {
  return { ...node, content: { ...node.content, [SYMBOL_KEY]: binding as unknown as JsonValue } };
}

export function buildCreateSymbolDefinitionCommand(
  page: ScenePage, nodeId: string, definitionId: string
): DocumentCommand {
  if (!definitionId.trim()) throw new TypeError('Symbol definition id must not be empty.');
  if (page.nodes.some((node) => symbolBinding(node)?.definitionId === definitionId)) {
    throw new TypeError(`Symbol definition "${definitionId}" already exists.`);
  }
  const before = page.nodes.find(({ id }) => id === nodeId);
  if (!before) throw new RangeError(`Node "${nodeId}" was not found.`);
  const after = withBinding(before, { version: 1, role: 'definition', definitionId });
  return { kind: 'set-node', id: `create-symbol:${definitionId}`, label: 'Create symbol definition',
    pageId: page.id, before, after };
}

export function buildCreateSymbolInstanceCommand(
  page: ScenePage, definitionId: string, instanceId: string
): DocumentCommand {
  const definition = page.nodes.find((node) => {
    const binding = symbolBinding(node);
    return binding?.role === 'definition' && binding.definitionId === definitionId;
  });
  if (!definition) throw new RangeError(`Symbol definition "${definitionId}" was not found.`);
  if (!instanceId || page.nodes.some(({ id }) => id === instanceId)) throw new TypeError('Symbol instance id must be unique.');
  const instance = withBinding({ ...structuredClone(definition), id: instanceId,
    zIndex: Math.max(0, ...page.nodes.map(({ zIndex }) => zIndex)) + 1,
    transform: { ...definition.transform, translation: {
      x: definition.transform.translation.x + 24, y: definition.transform.translation.y + 24,
    } } }, { version: 1, role: 'instance', definitionId,
      overrides: { content: {}, appearance: {} } });
  return { kind: 'insert-node', id: `create-symbol-instance:${instanceId}`, label: 'Create symbol instance',
    pageId: page.id, index: page.nodes.length, node: instance };
}

export function buildSetSymbolOverridesCommand(
  page: ScenePage, instanceId: string, overrides: SymbolOverrides
): DocumentCommand {
  const before = page.nodes.find(({ id }) => id === instanceId);
  if (!before) throw new RangeError(`Node "${instanceId}" was not found.`);
  const binding = symbolBinding(before);
  if (binding?.role !== 'instance') throw new TypeError('Node is not a symbol instance.');
  const definition = page.nodes.find((node) => {
    const candidate = symbolBinding(node);
    return candidate?.role === 'definition' && candidate.definitionId === binding.definitionId;
  });
  if (!definition) throw new RangeError(`Symbol definition "${binding.definitionId}" was not found.`);
  const after = withBinding({ ...before,
    content: { ...structuredClone(definition.content), ...structuredClone(overrides.content) },
    appearance: { ...structuredClone(definition.appearance), ...structuredClone(overrides.appearance) },
  }, { ...binding, overrides: structuredClone(overrides) });
  return { kind: 'set-node', id: `override-symbol:${instanceId}`, label: 'Override symbol instance',
    pageId: page.id, before, after };
}

export function buildUpdateSymbolDefinitionCommand(
  page: ScenePage, definitionId: string, updatedDefinition: SceneNode
): DocumentCommand {
  const definition = page.nodes.find((node) => {
    const binding = symbolBinding(node);
    return binding?.role === 'definition' && binding.definitionId === definitionId;
  });
  if (!definition) throw new RangeError(`Symbol definition "${definitionId}" was not found.`);
  const commands: DocumentCommand[] = [];
  if (updatedDefinition.id !== definition.id) throw new TypeError('Symbol update cannot change definition identity.');
  commands.push({ kind: 'set-node', id: `update-symbol-definition:${definitionId}`,
    label: 'Update symbol definition', pageId: page.id, before: definition, after: updatedDefinition });
  for (const instance of page.nodes) {
    const binding = symbolBinding(instance);
    if (binding?.role !== 'instance' || binding.definitionId !== definitionId) continue;
    const after = withBinding({ ...instance, size: structuredClone(updatedDefinition.size),
      ports: structuredClone(updatedDefinition.ports),
      content: { ...structuredClone(updatedDefinition.content), ...structuredClone(binding.overrides.content) },
      appearance: { ...structuredClone(updatedDefinition.appearance), ...structuredClone(binding.overrides.appearance) },
    }, binding);
    commands.push({ kind: 'set-node', id: `sync-symbol-instance:${instance.id}`,
      label: 'Sync symbol instance', pageId: page.id, before: instance, after });
  }
  return { kind: 'batch', id: `update-symbol:${definitionId}`, label: 'Update symbol', commands };
}
