import React from 'react';
import type { DocumentCommand } from '../domain/commands/types';
import type { SceneNode, ScenePage } from '../domain/document/types';
import { buildSetNumericNodeGeometryCommand } from '../application/active-document/productionPrecision';

export function OpenCanvasPrecisionForm({ node, page, onCommit }: {
  readonly node: SceneNode; readonly page: ScenePage;
  readonly onCommit: (command: DocumentCommand) => boolean;
}): React.JSX.Element {
  const label = String(node.content.label ?? node.id);
  return <form aria-label={`Numeric geometry for ${label}`} onSubmit={(event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const command = buildSetNumericNodeGeometryCommand(page, node.id, {
      x: Number(form.get('x')), y: Number(form.get('y')), width: Number(form.get('width')),
      height: Number(form.get('height')), rotationDegrees: Number(form.get('rotation')),
    });
    if (command) onCommit(command);
  }}>
    {([['x', node.transform.translation.x], ['y', node.transform.translation.y],
      ['width', node.size.width], ['height', node.size.height],
      ['rotation', node.transform.rotationRadians * 180 / Math.PI]] as const).map(([name, value]) =>
      <label key={name}>{name} for {label}<input name={name} type="number" step="any"
        min={name === 'width' || name === 'height' ? Number.EPSILON : undefined}
        defaultValue={value} /></label>)}
    <button type="submit">Set numeric geometry for {label}</button>
  </form>;
}
