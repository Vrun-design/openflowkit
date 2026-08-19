import type { Size2d } from '../geometry/types';

export type TextOverflowPolicy = 'clip' | 'ellipsis' | 'visible' | 'wrap';

export interface PortableTextStyle {
  readonly fontSize: number;
  readonly fontWeight?: 400 | 500 | 600 | 700;
  readonly lineHeight?: number;
  readonly maxWidth?: number;
  readonly maxLines?: number;
  readonly overflow?: TextOverflowPolicy;
}

export interface PortableTextMeasurement extends Size2d {
  readonly lines: readonly string[];
  readonly displayText: string;
  readonly truncated: boolean;
}

function glyphUnits(character: string): number {
  if (/\s/u.test(character)) return 0.32;
  if (/[ilI1|.,'`!]/u.test(character)) return 0.3;
  if (/[MW@#%&]/u.test(character)) return 0.9;
  if (/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Extended_Pictographic}/u.test(character)) return 1;
  return 0.56;
}

function lineWidth(text: string, fontSize: number, weight: number): number {
  const weightFactor = 1 + Math.max(0, weight - 400) / 3_000;
  return [...text].reduce((sum, character) => sum + glyphUnits(character), 0)
    * fontSize * weightFactor;
}

function fitPrefix(text: string, maximum: number, fontSize: number, weight: number): string {
  let result = '';
  for (const character of text) {
    if (lineWidth(result + character, fontSize, weight) > maximum) break;
    result += character;
  }
  return result;
}

function wrapParagraph(text: string, maximum: number, fontSize: number, weight: number): string[] {
  if (!text) return [''];
  const lines: string[] = [];
  let remaining = text;
  while (remaining) {
    if (lineWidth(remaining, fontSize, weight) <= maximum) {
      lines.push(remaining);
      break;
    }
    let prefix = fitPrefix(remaining, maximum, fontSize, weight);
    if (!prefix) prefix = [...remaining][0] ?? '';
    const breakAt = prefix.lastIndexOf(' ');
    if (breakAt > 0) prefix = prefix.slice(0, breakAt);
    lines.push(prefix.trimEnd());
    remaining = remaining.slice(prefix.length).trimStart();
  }
  return lines;
}

export function measurePortableText(
  text: string,
  style: PortableTextStyle
): PortableTextMeasurement {
  if (!Number.isFinite(style.fontSize) || style.fontSize <= 0) {
    throw new Error('Portable text font size must be positive and finite.');
  }
  const lineHeight = style.lineHeight ?? style.fontSize * 1.2;
  const weight = style.fontWeight ?? 400;
  const overflow = style.overflow ?? 'visible';
  const maximum = style.maxWidth;
  if (maximum !== undefined && (!Number.isFinite(maximum) || maximum <= 0)) {
    throw new Error('Portable text max width must be positive and finite.');
  }
  const sourceLines = text.split('\n');
  let lines = maximum && overflow === 'wrap'
    ? sourceLines.flatMap((line) => wrapParagraph(line, maximum, style.fontSize, weight))
    : sourceLines;
  let truncated = false;
  if (style.maxLines !== undefined && lines.length > style.maxLines) {
    if (!Number.isInteger(style.maxLines) || style.maxLines < 1) {
      throw new Error('Portable text max lines must be a positive integer.');
    }
    lines = lines.slice(0, style.maxLines);
    truncated = true;
  }
  if (maximum && overflow !== 'visible' && overflow !== 'wrap') {
    lines = lines.map((line) => {
      if (lineWidth(line, style.fontSize, weight) <= maximum) return line;
      truncated = true;
      if (overflow === 'clip') return fitPrefix(line, maximum, style.fontSize, weight);
      const suffix = '…';
      return `${fitPrefix(line, Math.max(0, maximum - lineWidth(suffix, style.fontSize, weight)), style.fontSize, weight)}${suffix}`;
    });
  } else if (maximum && overflow === 'wrap' && style.maxLines && truncated) {
    const last = lines.length - 1;
    const suffix = '…';
    lines[last] = `${fitPrefix(lines[last], Math.max(0, maximum - lineWidth(suffix, style.fontSize, weight)), style.fontSize, weight)}${suffix}`;
  }
  const width = Math.min(
    maximum ?? Number.POSITIVE_INFINITY,
    Math.max(0, ...lines.map((line) => lineWidth(line, style.fontSize, weight)))
  );
  return {
    width,
    height: Math.max(lineHeight, lines.length * lineHeight),
    lines,
    displayText: lines.join('\n'),
    truncated,
  };
}
