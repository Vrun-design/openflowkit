import { Text } from 'pixi.js';

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
