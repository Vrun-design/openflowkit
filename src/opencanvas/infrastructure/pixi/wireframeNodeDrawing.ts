import { Graphics } from 'pixi.js';
import type { SceneNode } from '../../domain/document/types';
import type { Matrix2d, Size2d } from '../../domain/geometry/types';
import { drawPixiLocalRect } from './pixiNodeOutline';
import type { PixiWireframeNodeVisual } from './wireframeNodeVisual';

export const BROWSER_HEADER_HEIGHT = 36;
export const MOBILE_STATUS_HEIGHT = 34;
export const MOBILE_HOME_HEIGHT = 22;

export function drawWireframeRect(
  graphics: Graphics,
  matrix: Matrix2d,
  bounds: { x: number; y: number; width: number; height: number },
  fill: number,
  stroke?: number,
  radius = 3
): void {
  drawPixiLocalRect(
    graphics,
    { ...bounds, width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) },
    matrix,
    radius
  );
  graphics.fill({ color: fill });
  if (stroke !== undefined) graphics.stroke({ color: stroke, width: 1 });
}

function lines(
  graphics: Graphics,
  matrix: Matrix2d,
  x: number,
  y: number,
  width: number,
  count: number,
  color: number
): void {
  for (let index = 0; index < count; index += 1) {
    drawWireframeRect(
      graphics,
      matrix,
      { x, y: y + index * 11, width: width * (index === count - 1 ? 0.68 : 1), height: 4 },
      color
    );
  }
}

function columns(
  graphics: Graphics,
  matrix: Matrix2d,
  size: Size2d,
  top: number,
  count: number,
  visual: PixiWireframeNodeVisual
): void {
  const gap = 8;
  const padding = 12;
  const width = (size.width - padding * 2 - gap * (count - 1)) / count;
  for (let index = 0; index < count; index += 1) {
    const x = padding + index * (width + gap);
    drawWireframeRect(
      graphics,
      matrix,
      { x, y: top, width, height: Math.max(28, size.height - top - 12) },
      visual.fill,
      visual.stroke,
      5
    );
    lines(graphics, matrix, x + 7, top + 9, Math.max(10, width - 14), 3, visual.accentFill);
  }
}

export function drawBrowserWireframeContent(
  graphics: Graphics,
  matrix: Matrix2d,
  node: SceneNode,
  visual: PixiWireframeNodeVisual
): void {
  const top = BROWSER_HEADER_HEIGHT;
  const height = Math.max(1, node.size.height - top);
  drawWireframeRect(
    graphics,
    matrix,
    { x: 0, y: top, width: node.size.width, height },
    visual.groundFill
  );
  const variant = visual.presentation.variant;
  if (variant === 'dashboard' || variant === 'settings' || variant === 'docs') {
    drawWireframeRect(
      graphics,
      matrix,
      { x: 0, y: top, width: Math.min(64, node.size.width * 0.2), height },
      visual.fill,
      visual.stroke,
      0
    );
    lines(
      graphics,
      matrix,
      10,
      top + 14,
      Math.min(40, node.size.width * 0.13),
      6,
      visual.accentFill
    );
    columns(
      graphics,
      matrix,
      { width: node.size.width - 64, height: node.size.height },
      top + 12,
      2,
      visual
    );
    return;
  }
  if (variant === 'kanban' || variant === 'pricing') {
    columns(graphics, matrix, node.size, top + 14, 3, visual);
    return;
  }
  if (variant === 'analytics') {
    const barWidth = Math.max(5, (node.size.width - 48) / 12);
    for (let index = 0; index < 7; index += 1) {
      const barHeight = 18 + ((index * 17) % Math.max(24, height - 58));
      drawWireframeRect(
        graphics,
        matrix,
        {
          x: 24 + index * barWidth * 1.5,
          y: node.size.height - 20 - barHeight,
          width: barWidth,
          height: barHeight,
        },
        visual.accentFill,
        visual.stroke,
        2
      );
    }
    return;
  }
  if (variant === 'form' || variant === 'checkout') {
    const width = Math.min(node.size.width - 32, node.size.width * 0.62);
    const x = (node.size.width - width) / 2;
    drawWireframeRect(
      graphics,
      matrix,
      { x, y: top + 16, width, height: Math.max(44, height - 32) },
      visual.fill,
      visual.stroke,
      6
    );
    lines(graphics, matrix, x + 12, top + 32, width - 24, 5, visual.accentFill);
    return;
  }
  if (variant === 'modal' || variant === 'cookie') {
    drawWireframeRect(
      graphics,
      matrix,
      { x: 0, y: top, width: node.size.width, height },
      visual.stroke
    );
    const width = variant === 'modal' ? node.size.width * 0.62 : node.size.width - 24;
    const panelHeight = variant === 'modal' ? height * 0.6 : Math.min(74, height - 12);
    const y =
      variant === 'modal' ? top + (height - panelHeight) / 2 : node.size.height - panelHeight;
    drawWireframeRect(
      graphics,
      matrix,
      { x: (node.size.width - width) / 2, y, width, height: panelHeight },
      visual.fill,
      visual.stroke,
      6
    );
    return;
  }
  drawWireframeRect(
    graphics,
    matrix,
    { x: 18, y: top + 18, width: node.size.width - 36, height: Math.max(28, height * 0.42) },
    visual.accentFill,
    undefined,
    6
  );
  columns(graphics, matrix, node.size, top + height * 0.58, 3, visual);
}

export function drawMobileWireframeContent(
  graphics: Graphics,
  matrix: Matrix2d,
  node: SceneNode,
  visual: PixiWireframeNodeVisual
): void {
  const top = MOBILE_STATUS_HEIGHT;
  const bottom = node.size.height - MOBILE_HOME_HEIGHT;
  const width = node.size.width - 24;
  const variant = visual.presentation.variant;
  if (variant === 'chat') {
    for (let index = 0; index < 5; index += 1) {
      const right = index % 2 === 1;
      drawWireframeRect(
        graphics,
        matrix,
        {
          x: right ? node.size.width * 0.38 : 16,
          y: top + 24 + index * 48,
          width: node.size.width * 0.54,
          height: 30,
        },
        right ? visual.accentFill : visual.groundFill,
        visual.stroke,
        9
      );
    }
    return;
  }
  if (variant === 'list' || variant === 'social' || variant === 'wallet' || variant === 'fitness') {
    for (let index = 0; index < 6; index += 1) {
      const y = top + 18 + index * Math.max(34, (bottom - top - 34) / 6);
      drawWireframeRect(
        graphics,
        matrix,
        { x: 12, y, width, height: 28 },
        visual.groundFill,
        visual.stroke,
        5
      );
      drawWireframeRect(
        graphics,
        matrix,
        { x: 20, y: y + 7, width: 14, height: 14 },
        visual.accentFill,
        undefined,
        7
      );
      drawWireframeRect(
        graphics,
        matrix,
        { x: 42, y: y + 10, width: width * 0.52, height: 5 },
        visual.accentFill
      );
    }
    return;
  }
  if (variant === 'calendar') {
    const cell = (node.size.width - 32) / 7;
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        drawWireframeRect(
          graphics,
          matrix,
          { x: 16 + column * cell, y: top + 46 + row * cell, width: cell - 3, height: cell - 3 },
          (row + column) % 5 === 0 ? visual.accentFill : visual.groundFill,
          visual.stroke,
          2
        );
      }
    }
    return;
  }
  if (variant === 'maps') {
    drawWireframeRect(
      graphics,
      matrix,
      { x: 12, y: top + 12, width, height: bottom - top - 24 },
      visual.groundFill,
      visual.stroke,
      7
    );
    for (let index = 0; index < 4; index += 1) {
      drawWireframeRect(
        graphics,
        matrix,
        { x: 32 + index * 42, y: top + 55 + (index % 2) * 60, width: 12, height: 12 },
        visual.accentFill,
        visual.stroke,
        6
      );
    }
    return;
  }
  if (variant === 'profile' || variant === 'product' || variant === 'music') {
    drawWireframeRect(
      graphics,
      matrix,
      {
        x: node.size.width * 0.2,
        y: top + 24,
        width: node.size.width * 0.6,
        height: node.size.width * 0.52,
      },
      visual.accentFill,
      visual.stroke,
      10
    );
    lines(
      graphics,
      matrix,
      24,
      top + node.size.width * 0.62,
      node.size.width - 48,
      5,
      visual.accentFill
    );
    return;
  }
  const panelTop = top + Math.max(28, (bottom - top) * 0.22);
  drawWireframeRect(
    graphics,
    matrix,
    {
      x: 18,
      y: panelTop,
      width: node.size.width - 36,
      height: Math.max(90, bottom - panelTop - 24),
    },
    visual.groundFill,
    visual.stroke,
    8
  );
  lines(graphics, matrix, 32, panelTop + 28, node.size.width - 64, 5, visual.accentFill);
}
