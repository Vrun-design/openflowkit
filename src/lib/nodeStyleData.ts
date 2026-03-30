import type { NodeData, NodeStyleData } from './types';

export const NODE_STYLE_FIELDS: Array<keyof NodeStyleData> = [
  'align',
  'backgroundColor',
  'color',
  'colorMode',
  'customColor',
  'customIconUrl',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'icon',
  'rotation',
  'shape',
  'subLabel',
  'transparency',
  'variant',
];

export function pickNodeStyleData(data: NodeData): Partial<NodeStyleData> {
  return NODE_STYLE_FIELDS.reduce<Partial<NodeStyleData>>((styleData, key) => {
    if (typeof data[key] !== 'undefined') {
      (styleData as Partial<Record<keyof NodeStyleData, unknown>>)[key] = data[key];
    }
    return styleData;
  }, {});
}

export function parseNodeStyleData(value: unknown): Partial<NodeStyleData> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const nextValue: Partial<NodeStyleData> = {};

  for (const key of NODE_STYLE_FIELDS) {
    if (typeof candidate[key] !== 'undefined') {
      (nextValue as Partial<Record<keyof NodeStyleData, unknown>>)[key] = candidate[key];
    }
  }

  return Object.keys(nextValue).length > 0 ? nextValue : null;
}
