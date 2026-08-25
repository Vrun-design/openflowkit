import type { NodeData } from '@/lib/types';
import type { DomainLibraryItem } from './domainLibrary';

export interface BuiltInShapeDefinition {
  readonly value: NonNullable<NodeData['shape']>;
  readonly label: string;
  readonly description: string;
  readonly keywords: readonly string[];
}

export const BUILT_IN_SHAPES: readonly BuiltInShapeDefinition[] = [
  {
    value: 'rectangle',
    label: 'Rectangle',
    description: 'Standard process box',
    keywords: ['box', 'process', 'square'],
  },
  {
    value: 'rounded',
    label: 'Rounded rectangle',
    description: 'Rounded process box',
    keywords: ['box', 'process', 'soft'],
  },
  {
    value: 'capsule',
    label: 'Capsule',
    description: 'Pill-shaped process',
    keywords: ['pill', 'terminator', 'start', 'end'],
  },
  {
    value: 'diamond',
    label: 'Diamond',
    description: 'Decision or branch shape',
    keywords: ['decision', 'branch', 'gateway'],
  },
  {
    value: 'hexagon',
    label: 'Hexagon',
    description: 'Preparation or operation shape',
    keywords: ['preparation', 'operation'],
  },
  {
    value: 'cylinder',
    label: 'Database',
    description: 'Data store cylinder',
    keywords: ['db', 'storage', 'data'],
  },
  {
    value: 'parallelogram',
    label: 'Input / output',
    description: 'Flowchart input or output',
    keywords: ['io', 'input', 'output', 'data'],
  },
  {
    value: 'circle',
    label: 'Circle',
    description: 'Circular event or connector',
    keywords: ['event', 'connector', 'round'],
  },
] as const;

export function createBuiltInShapeLibraryItem(
  definition: BuiltInShapeDefinition
): DomainLibraryItem {
  return {
    id: `built-in-shape:${definition.value}`,
    category: 'icons',
    label: definition.label,
    description: definition.description,
    icon: 'Shapes',
    color: 'slate',
    shape: definition.value,
    nodeType: 'process',
  };
}
