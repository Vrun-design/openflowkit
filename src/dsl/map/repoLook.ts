import type { ArchElement, ElementKind } from '../model/types';
import type { MapLook } from './scene';
import type { MapModel, MapNode } from './types';

// A repo map drawn with the C4 renderers: every box becomes a stand-in architecture element so the
// editor's own cards, colours and open frames apply, and `tags` replaces the C4 kind word on the card
// with plain repo words ("Folder · 12 files"). `more` boxes stay synthetic (scene.ts draws those).

const KIND: Record<MapNode['kind'], { element: ElementKind; color?: string; word: string }> = {
  part: { element: 'system', word: 'Part' },
  folder: { element: 'container', word: 'Folder' },
  file: { element: 'container', word: 'File' },
  group: { element: 'container', color: 'gray', word: 'Group' },
  external: { element: 'external', word: 'Outside service' },
  more: { element: 'container', color: 'gray', word: 'More' },
};

const OUTSIDE = 'root#outside'; // build.ts: the group that holds the externals
const count = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

// Invented groups hold no file count of their own (build.ts leaves 0): their files are their descendants'.
const filesIn = (model: MapModel, node: MapNode): number => node.files || node.children.reduce((n, id) => n + filesIn(model, model.nodes[id]), 0);

function tagOf(model: MapModel, node: MapNode): string {
  const { word } = KIND[node.kind];
  if (node.kind === 'file') return `${word} · ${count(node.loc, 'line')}`;
  if (node.kind === 'external') return word;
  if (node.id === OUTSIDE) return 'Outside services';
  const files = filesIn(model, node);
  return files > 0 ? `${word} · ${count(files, 'file')}` : word;
}

export function repoLook(model: MapModel, base: Omit<MapLook, 'arch' | 'tags'>): MapLook {
  const elements: ArchElement[] = [];
  const tags = new Map<string, string>();
  for (const node of Object.values(model.nodes)) {
    if (node.id === model.root || node.kind === 'more') continue;
    const { element, color } = KIND[node.kind];
    const desc = node.kind === 'folder' || node.kind === 'file' || node.kind === 'part' ? node.path ?? node.id : node.desc;
    elements.push({
      id: node.id, kind: element, name: node.name, parent: node.parent === model.root ? null : node.parent,
      tags: [], links: [], icon: 'none', ...(color ? { color } : {}), ...(desc ? { desc } : {}),
    });
    tags.set(node.id, tagOf(model, node));
  }
  // No inferred icons: an icon card would name its kind with the C4 word.
  const { inferIcon: _inferIcon, ...plain } = base;
  return { ...plain, arch: { elements, relations: [], views: [], flows: [] }, tags };
}
