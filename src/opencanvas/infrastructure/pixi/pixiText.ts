import { Text, type Container } from 'pixi.js';

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
