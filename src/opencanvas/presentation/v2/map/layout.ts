import type { LinkKind, MapModel, MapNode } from '../../../../dsl/map/types';
import { layoutMap as layoutMapWith, type LayoutPorts, type Scene } from '../../../application/map/layoutMap';
import { getElkInstance } from '../../../../services/elk-layout/runtime';
import { foundation } from '../../design-system/tokens';

// Text measurement (canvas 2D, the real fonts) and the wiring of the pure layout (application/map/layoutMap) to the app's ELK.

export const FONT = {
  name: `600 12px ${foundation.font}`,
  desc: `400 11px ${foundation.font}`,
  mono: `500 11px ${foundation.mono}`,
  meta: `400 10px ${foundation.mono}`,
  eyebrow: `500 10px ${foundation.mono}`,
  label: `500 10px ${foundation.mono}`,
};

let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();
export function measure(text: string, font: string): number {
  const key = `${font}|${text}`;
  let w = cache.get(key);
  if (w === undefined) {
    ctx ??= document.createElement('canvas').getContext('2d');
    if (ctx) ctx.font = font;
    w = ctx ? ctx.measureText(text).width : text.length * 6;
    if (cache.size > 5000) cache.clear();
    cache.set(key, w);
  }
  return w;
}

/** `text` cut with an ellipsis to fit `width` px. */
export function fit(text: string, font: string, width: number): string {
  if (measure(text, font) <= width) return text;
  let s = text;
  while (s.length > 1 && measure(`${s}…`, font) > width) s = s.slice(0, -1);
  return `${s}…`;
}

/** Up to `lines` wrapped lines; the last ends with an ellipsis when the text did not fit. */
export function wrap(text: string, font: string, width: number, lines: number): string[] {
  const out: string[] = [];
  let cur = '';
  const words = text.split(/\s+/).filter(Boolean);
  for (const [i, word] of words.entries()) {
    const next = cur ? `${cur} ${word}` : word;
    if (measure(next, font) <= width || !cur) cur = next;
    else {
      out.push(cur);
      cur = word;
      if (out.length === lines - 1) { cur = words.slice(i).join(' '); break; }
    }
  }
  if (cur) out.push(fit(cur, font, width));
  return out.slice(0, lines);
}

export const sizeOf = (n: MapNode): { width: number; height: number } =>
  n.kind === 'file' || n.kind === 'more' ? { width: 200, height: 46 } : n.kind === 'external' ? { width: 212, height: 76 } : { width: 232, height: 92 };

/** The shared elkjs worker, canvas text measuring and the box sizes, handed to the pure layout. */
export async function layoutMap(model: MapModel, expanded: ReadonlySet<string>, layers?: readonly LinkKind[], showAll = false): Promise<Scene> {
  return layoutMapWith({ elk: await getElkInstance() as unknown as LayoutPorts['elk'], measure: (t) => measure(t, FONT.label), sizeOf }, model, expanded, layers, showAll);
}
