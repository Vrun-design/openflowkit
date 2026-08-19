import React, { useState } from 'react';
import type { DocumentCommand } from '../domain/commands/types';
import type { JsonValue } from '../domain/document/json';
import type { SceneNode, ScenePage } from '../domain/document/types';
import {
  buildProductionNodePropertiesCommand,
  nodePropertyFields,
  type NodePropertyField,
} from '../application/active-document/productionNodeProperties';

interface OpenCanvasNodePropertyFormProps {
  readonly node: SceneNode;
  readonly page: ScenePage;
  readonly onCommit: (command: DocumentCommand) => boolean;
}

function initialValue(node: SceneNode, field: NodePropertyField): string {
  const value = node.content[field.key];
  if (field.type === 'json') return value === undefined ? '' : JSON.stringify(value, null, 2);
  if (field.type === 'multiline' && Array.isArray(value)) return value.join('\n');
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function parseValue(field: NodePropertyField, form: FormData): JsonValue | undefined {
  if (field.type === 'boolean') return form.get(field.key) === 'on';
  const raw = String(form.get(field.key) ?? '');
  if (!raw.trim()) return undefined;
  if (field.type === 'number') return Number(raw);
  if (field.type === 'multiline') {
    return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }
  if (field.type === 'json') return JSON.parse(raw) as JsonValue;
  return raw;
}

export function OpenCanvasNodePropertyForm({
  node,
  page,
  onCommit,
}: OpenCanvasNodePropertyFormProps): React.JSX.Element {
  const fields = nodePropertyFields(node);
  const [error, setError] = useState('');
  return (
    <form
      aria-label={`Properties for ${String(node.content.label ?? node.id)}`}
      onSubmit={(event) => {
        event.preventDefault();
        try {
          const form = new FormData(event.currentTarget);
          const updates = Object.fromEntries(fields.map((field) => [field.key, parseValue(field, form)]));
          const command = buildProductionNodePropertiesCommand(page, node.id, updates);
          if (command) onCommit(command);
          setError('');
        } catch {
          setError('One or more property values are invalid.');
        }
      }}
    >
      {fields.map((field) => (
        <label key={field.key}>
          {field.label} for {String(node.content.label ?? node.id)}
          {field.type === 'boolean' ? (
            <input name={field.key} type="checkbox" defaultChecked={node.content[field.key] === true} />
          ) : field.type === 'select' ? (
            <select name={field.key} defaultValue={initialValue(node, field)}>
              <option value="">Default</option>
              {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ) : field.type === 'multiline' || field.type === 'json' ? (
            <textarea name={field.key} defaultValue={initialValue(node, field)} />
          ) : (
            <input
              name={field.key}
              type={field.type === 'number' ? 'number' : 'text'}
              min={field.type === 'number' ? field.min : undefined}
              max={field.type === 'number' ? field.max : undefined}
              step={field.type === 'number' ? 'any' : undefined}
              defaultValue={initialValue(node, field)}
            />
          )}
        </label>
      ))}
      <button type="submit">Update properties for {String(node.content.label ?? node.id)}</button>
      {error && <span role="alert">{error}</span>}
    </form>
  );
}
