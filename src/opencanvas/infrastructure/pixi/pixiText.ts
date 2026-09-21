import { Graphics, Text, type Container, type TextStyleFontWeight, type TextStyleOptions } from 'pixi.js';
import { FONT_STACKS, type NodeStyle } from '../../domain/nodes/nodeStyle';

export function truncateTextToWidth(value: string, width: number, characterWidth = 6.5): string {
  const limit = Math.max(3, Math.floor(width / characterWidth));
  return value.length <= limit ? value : `${value.slice(0, Math.max(1, limit - 1))}…`;
}

export function createPixiText(
  text: string,
  options: {
    readonly size: number;
    readonly weight: string;
    readonly fill: number;
    readonly family?: string;
    readonly style?: string;
    readonly wrapWidth?: number;
  }
): Text {
  return new Text({
    text,
    resolution: currentTextResolution,
    style: {
      fontFamily: options.family ?? 'Inter, ui-sans-serif, system-ui, sans-serif',
      fontSize: options.size,
      fontWeight: options.weight as 'normal' | 'bold',
      fontStyle: (options.style ?? 'normal') as 'normal' | 'italic',
      fill: options.fill,
      ...(options.wrapWidth
        ? { wordWrap: true, wordWrapWidth: options.wrapWidth, breakWords: true }
        : {}),
    },
  });
}

// Labels rasterize once at a fixed resolution; zooming in scales that bitmap
// and blurs it. The host re-buckets the resolution when the zoom crosses an
// integer step so type stays crisp, without re-rasterizing on every wheel tick.
let currentTextResolution = 1;

export function textResolutionForZoom(zoom: number, devicePixelRatio: number): number {
  return Math.min(4, Math.max(1, Math.ceil(zoom * devicePixelRatio)));
}

export function currentPixiTextResolution(): number {
  return currentTextResolution;
}

export function applyTextResolution(root: Container, resolution: number): void {
  currentTextResolution = resolution;
  const visit = (node: Container): void => {
    if (node instanceof Text && node.resolution !== resolution) node.resolution = resolution;
    for (const child of node.children) visit(child);
  };
  visit(root);
}

/** Pixi TextStyle for a resolved node style; `fill` already resolved to a number. */
export function pixiTextStyle(style: NodeStyle, fill: number, wrapWidth: number | null): TextStyleOptions {
  return {
    fontFamily: FONT_STACKS[style.fontFamily],
    fontSize: style.fontSize,
    fontWeight: String(style.fontWeight) as TextStyleFontWeight,
    fontStyle: style.fontStyle,
    fill,
    lineHeight: style.fontSize * style.lineHeight,
    letterSpacing: style.fontSize * style.letterSpacing,
    ...(wrapWidth ? { wordWrap: true, wordWrapWidth: wrapWidth, breakWords: true } : {}),
  };
}

/** A label drawn from the node's resolved style (family renderers). */
export function createStyledPixiText(text: string, style: NodeStyle, fill: number, wrapWidth: number | null): Text {
  return new Text({ text, resolution: currentTextResolution, style: pixiTextStyle(style, fill, wrapWidth) });
}

// Pixi text has no text-decoration; draw the rule per rendered line.
export function decoratePixiText(parent: Container, text: Text, style: NodeStyle, color: number): void {
  if (style.textDecoration === 'none') return;
  const lines = text.text.split('\n').length;
  const lineHeight = style.fontSize * style.lineHeight;
  const rule = new Graphics();
  const left = text.x - text.anchor.x * text.width;
  const top = text.y - text.anchor.y * text.height;
  const thickness = Math.max(1, style.fontSize / 14);
  for (let line = 0; line < lines; line += 1) {
    const y = style.textDecoration === 'underline'
      ? top + line * lineHeight + style.fontSize * 1.08
      : top + line * lineHeight + style.fontSize * 0.62;
    rule.rect(left, y, text.width, thickness);
  }
  rule.fill({ color });
  parent.addChild(rule);
}
