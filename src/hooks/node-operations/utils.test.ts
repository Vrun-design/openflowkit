import { describe, expect, it } from 'vitest';
import type { FlowNode } from '@/lib/types';
import {
  applySectionParenting,
  autoFitSectionsToChildren,
  bringContentsIntoSection,
  createArchitectureServiceNode,
  createSectionNode,
  duplicateSectionWithChildren,
  fitSectionToChildren,
  getContainingSectionId,
  getSectionInsertPosition,
  insertNodeIntoNearestSection,
  releaseNodeFromSection,
  unparentSectionChildren,
  withSectionDefaults,
  wrapSelectionInSection,
  createProcessNode,
} from './utils';

function makeProcessNode(id: string, x: number, y: number): FlowNode {
  return {
    id,
    type: 'process',
    position: { x, y },
    data: { label: id, color: 'white', shape: 'rounded' },
    style: { width: 120, height: 60 },
  };
}

function makeSectionNode(id: string, x: number, y: number, width = 500, height = 400): FlowNode {
  return {
    id,
    type: 'section',
    position: { x, y },
    data: { label: id, subLabel: '', color: 'blue' },
    style: { width, height },
    zIndex: -1,
  };
}

describe('section node utilities', () => {
  it('wraps selected nodes in a new section and reparents them', () => {
    const nodes: FlowNode[] = [
      { ...makeProcessNode('node-a', 200, 180), selected: true },
      { ...makeProcessNode('node-b', 380, 260), selected: true },
    ];

    const wrappedNodes = wrapSelectionInSection(nodes, 'section-1', 'New Section');
    const section = wrappedNodes.find((node) => node.id === 'section-1');
    const childA = wrappedNodes.find((node) => node.id === 'node-a');
    const childB = wrappedNodes.find((node) => node.id === 'node-b');

    expect(section).toBeTruthy();
    expect(section?.type).toBe('section');
    expect(section?.position).toEqual({ x: 168, y: 164 });
    expect(section?.style).toMatchObject({ width: 500, height: 400 });
    expect(childA?.parentId).toBe('section-1');
    expect(childA?.extent).toBe('parent');
    expect(childA?.position).toEqual({ x: 32, y: 16 });
    expect(childB?.position).toEqual({ x: 212, y: 96 });
  });

  it('parents a dragged node into the deepest section without auto-fitting manual sections', () => {
    const section = makeSectionNode('section-1', 100, 100, 500, 400);
    const node = makeProcessNode('node-a', 160, 180);

    const nextNodes = applySectionParenting([section, node], node);
    const nextSection = nextNodes.find((candidate) => candidate.id === 'section-1');
    const nextNode = nextNodes.find((candidate) => candidate.id === 'node-a');

    expect(nextNode?.parentId).toBe('section-1');
    expect(nextNode?.position).toEqual({ x: 60, y: 80 });
    expect(nextSection?.position).toEqual({ x: 100, y: 100 });
    expect(nextSection?.style).toMatchObject({ width: 500, height: 400 });
  });

  it('unparents direct section children while keeping their absolute position', () => {
    const section = makeSectionNode('section-1', 120, 140, 500, 400);
    const child = {
      ...makeProcessNode('node-a', 32, 56),
      parentId: 'section-1',
      extent: 'parent' as const,
    };

    const releasedNodes = unparentSectionChildren('section-1', [section, child]);
    const releasedChild = releasedNodes.find((node) => node.id === 'node-a');

    expect(releasedChild?.parentId).toBeUndefined();
    expect(releasedChild?.extent).toBeUndefined();
    expect(releasedChild?.position).toEqual({ x: 152, y: 196 });
  });

  it('only auto-fits sections that opt into fit sizing mode', () => {
    const section = makeSectionNode('section-1', 100, 100, 500, 400);
    const child = {
      ...makeProcessNode('node-a', 240, 180),
      parentId: 'section-1',
      extent: 'parent' as const,
    };

    const fittedNodes = autoFitSectionsToChildren([section, child]);
    const fittedSection = fittedNodes.find((node) => node.id === 'section-1');
    const fittedChild = fittedNodes.find((node) => node.id === 'node-a');

    expect(fittedSection?.position).toEqual({ x: 100, y: 100 });
    expect(fittedChild?.position).toEqual({ x: 240, y: 180 });
  });

  it('reports the deepest containing section for live drop targeting', () => {
    const outerSection = makeSectionNode('section-outer', 100, 100, 700, 520);
    const innerSection = makeSectionNode('section-inner', 180, 180, 500, 400);
    const draggedNode = makeProcessNode('node-a', 240, 260);

    expect(getContainingSectionId([outerSection, innerSection, draggedNode], draggedNode)).toBe('section-inner');
  });

  it('duplicates a section with its descendants and preserves hierarchy', () => {
    const section = makeSectionNode('section-1', 120, 140, 500, 400);
    const child = {
      ...makeProcessNode('child-1', 32, 56),
      parentId: 'section-1',
      extent: 'parent' as const,
    };
    const grandChild = {
      ...makeProcessNode('grandchild-1', 24, 36),
      parentId: 'child-1',
      extent: 'parent' as const,
    };

    const duplicatedNodes = duplicateSectionWithChildren([section, child, grandChild], 'section-1');
    const duplicatedSections = duplicatedNodes.filter((node) => node.type === 'section');
    const clonedSection = duplicatedSections.find((node) => node.id !== 'section-1');
    const clonedChild = duplicatedNodes.find((node) => node.id !== 'child-1' && node.parentId === clonedSection?.id);
    const clonedGrandChild = duplicatedNodes.find((node) => node.id !== 'grandchild-1' && node.parentId === clonedChild?.id);

    expect(duplicatedSections).toHaveLength(2);
    expect(clonedSection?.position).toEqual({ x: 180, y: 200 });
    expect(clonedChild?.position).toEqual({ x: 32, y: 56 });
    expect(clonedChild?.selected).toBe(true);
    expect(clonedGrandChild?.position).toEqual({ x: 24, y: 36 });
    expect(clonedGrandChild?.selected).toBe(true);
    expect(duplicatedNodes.find((node) => node.id === 'section-1')?.selected).toBe(false);
  });

  it('applies section defaults to legacy section nodes', () => {
    const section = withSectionDefaults({
      ...makeSectionNode('section-legacy', 0, 0),
      data: { label: 'Legacy' },
    } as FlowNode);

    expect(section.data.sectionSizingMode).toBe('manual');
    expect(section.data.sectionLayoutMode).toBe('freeform');
    expect(section.data.sectionLocked).toBe(false);
    expect(section.data.sectionHidden).toBe(false);
  });

  it('fits a section explicitly when requested', () => {
    const section = {
      ...makeSectionNode('section-1', 100, 100, 500, 400),
      data: { label: 'Section', sectionSizingMode: 'manual' },
    } as FlowNode;
    const child = {
      ...makeProcessNode('node-a', 240, 180),
      parentId: 'section-1',
      extent: 'parent' as const,
    };

    const fittedNodes = fitSectionToChildren(section, [section, child]);
    const fittedSection = fittedNodes.find((node) => node.id === 'section-1');

    expect(fittedSection?.position).toEqual({ x: 308, y: 264 });
  });

  it('releases a child from its parent section while preserving absolute position', () => {
    const section = makeSectionNode('section-1', 120, 140, 500, 400);
    const child = {
      ...makeProcessNode('node-a', 32, 56),
      parentId: 'section-1',
      extent: 'parent' as const,
    };

    const releasedNodes = releaseNodeFromSection([section, child], 'node-a');
    const releasedChild = releasedNodes.find((node) => node.id === 'node-a');

    expect(releasedChild?.parentId).toBeUndefined();
    expect(releasedChild?.position).toEqual({ x: 152, y: 196 });
  });

  it('can bring loose nodes inside a section based on the content bounds', () => {
    const section = makeSectionNode('section-1', 100, 100, 500, 400);
    const node = makeProcessNode('node-a', 180, 220);

    const nextNodes = bringContentsIntoSection([section, node], 'section-1');
    const nextNode = nextNodes.find((candidate) => candidate.id === 'node-a');

    expect(nextNode?.parentId).toBe('section-1');
  });

  it('inserts new nodes into an explicitly selected section', () => {
    const section = createSectionNode('section-1', { x: 100, y: 100 }, 'Frame');
    const node = makeProcessNode('node-a', 0, 0);

    const insertedNode = insertNodeIntoNearestSection([section], node, undefined, 'section-1');
    const insertPosition = getSectionInsertPosition(section, [section]);

    expect(insertedNode.parentId).toBe('section-1');
    expect(insertedNode.position).toEqual({
      x: insertPosition.x - section.position.x,
      y: insertPosition.y - section.position.y,
    });
  });
});

describe('createProcessNode', () => {
  it('creates blank generic shape content by default', () => {
    const node = createProcessNode('shape-1', { x: 10, y: 20 });

    expect(node.type).toBe('process');
    expect(node.data.label).toBe('');
    expect(node.data.subLabel).toBe('');
    expect(node.width).toBeUndefined();
    expect(node.height).toBeUndefined();
  });
});

describe('createArchitectureServiceNode', () => {
  it('inherits custom provider metadata from the source node', () => {
    const node = createArchitectureServiceNode({
      id: 'arch-2',
      position: { x: 50, y: 75 },
      layerId: 'layer-1',
      sourceNode: {
        id: 'arch-1',
        type: 'architecture',
        position: { x: 0, y: 0 },
        data: {
          label: 'Gateway',
          archProvider: 'custom',
          archProviderLabel: 'Hetzner',
          customIconUrl: 'data:image/svg+xml;base64,abc',
          archEnvironment: 'production',
        },
      } as never,
    });

    expect(node.data.archProvider).toBe('custom');
    expect(node.data.archProviderLabel).toBe('Hetzner');
    expect(node.data.customIconUrl).toBe('data:image/svg+xml;base64,abc');
    expect(node.data.archEnvironment).toBe('production');
  });
});
