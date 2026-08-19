import React from 'react';
import type { ScenePage } from '../domain/document/types';

export function OpenCanvasPageThumbnail({ page }: { readonly page: ScenePage }): React.JSX.Element {
  const visible = page.nodes.filter((node) =>
    page.layers.find(({ id }) => id === node.layerId)?.visible !== false);
  const minX = Math.min(0, ...visible.map((node) => node.transform.translation.x));
  const minY = Math.min(0, ...visible.map((node) => node.transform.translation.y));
  const maxX = Math.max(1, ...visible.map((node) => node.transform.translation.x + node.size.width));
  const maxY = Math.max(1, ...visible.map((node) => node.transform.translation.y + node.size.height));
  const width = maxX - minX; const height = maxY - minY;
  return (
    <svg className="pixi-spike__page-thumbnail" viewBox={`${minX} ${minY} ${width} ${height}`}
      role="img" aria-label={`${page.name} thumbnail with ${visible.length} objects`}>
      <rect x={minX} y={minY} width={width} height={height} fill="#f8fafc" />
      {visible.map((node) => <rect key={node.id} x={node.transform.translation.x}
        y={node.transform.translation.y} width={node.size.width} height={node.size.height}
        rx={Math.min(10, node.size.height / 5)} fill="#fff" stroke="#94a3b8" strokeWidth="2" />)}
    </svg>
  );
}
