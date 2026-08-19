import React, { useState } from 'react';
import type { SceneNode, ScenePage } from '../domain/document/types';
import { resolveNodeSizingPolicy } from '../domain/node-sizing/model';
import type { NodeSizingMode } from '../domain/node-sizing/types';
import type { TextOverflowPolicy } from '../domain/text/measurement';
import type { DocumentCommand } from '../domain/commands/types';
import { buildProductionNodeSizingCommand } from '../application/active-document/productionNodeSizing';

interface Props {
  readonly node: SceneNode;
  readonly page: ScenePage;
  readonly onCommit: (command: DocumentCommand) => boolean;
}

export function OpenCanvasNodeSizingForm({ node, page, onCommit }: Props): React.JSX.Element {
  const policy = resolveNodeSizingPolicy(node);
  const [error, setError] = useState('');
  return (
    <form aria-label={`Sizing for ${node.content.label ?? node.id}`} onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        const command = buildProductionNodeSizingCommand(page, node.id, {
          version: 1,
          mode: String(form.get('mode')) as NodeSizingMode,
          minSize: { width: Number(form.get('minWidth')), height: Number(form.get('minHeight')) },
          maxSize: { width: Number(form.get('maxWidth')), height: Number(form.get('maxHeight')) },
          overflow: String(form.get('overflow')) as TextOverflowPolicy,
          clipContent: form.get('clipContent') === 'on',
          maxLines: Number(form.get('maxLines')),
        });
        if (command) onCommit(command);
        setError('');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Invalid sizing policy.');
      }
    }}>
      <label>Size mode for {String(node.content.label ?? node.id)}
        <select name="mode" defaultValue={policy.mode}>
          {(['fixed', 'auto', 'responsive'] as const).map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label>Overflow for {String(node.content.label ?? node.id)}
        <select name="overflow" defaultValue={policy.overflow}>
          {(['visible', 'clip', 'ellipsis', 'wrap'] as const).map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
      {([
        ['minWidth', 'Minimum width', policy.minSize.width],
        ['minHeight', 'Minimum height', policy.minSize.height],
        ['maxWidth', 'Maximum width', policy.maxSize.width],
        ['maxHeight', 'Maximum height', policy.maxSize.height],
        ['maxLines', 'Maximum lines', policy.maxLines],
      ] as const).map(([name, label, value]) => (
        <label key={name}>{label} for {String(node.content.label ?? node.id)}
          <input name={name} type="number" min="1" step="1" defaultValue={value} />
        </label>
      ))}
      <label><input name="clipContent" type="checkbox" defaultChecked={policy.clipContent} />
        Clip content for {String(node.content.label ?? node.id)}</label>
      <button type="submit">Update sizing for {String(node.content.label ?? node.id)}</button>
      {error ? <span role="alert">{error}</span> : null}
    </form>
  );
}
