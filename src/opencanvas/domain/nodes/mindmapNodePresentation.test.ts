import { describe, expect, it } from 'vitest';
import type { JsonObject } from '../document/json';
import type { SceneNode } from '../document/types';
import { createPixiSpikePage } from '../../infrastructure/pixi/spikeFixture';
import {
  createMindmapHierarchySnapshot,
  resolveMindmapNodePresentation,
} from './mindmapNodePresentation';

function node(id: string, kind: string, content: JsonObject): SceneNode {
  return { ...createPixiSpikePage(1).nodes[0], id, kind, content };
}

describe('mindmap node presentation', () => {
  it('preserves hierarchy, wrapper, side, branch style, and collapse semantics', () => {
    expect(
      resolveMindmapNodePresentation(
        node('topic', 'mindmap', {
          label: 'Platform',
          mindmapDepth: 2.8,
          mindmapParentId: 'root',
          mindmapAlias: 'platform.api',
          mindmapWrapper: 'double-square',
          mindmapSide: 'left',
          mindmapBranchStyle: 'straight',
          mindmapCollapsed: true,
        })
      )
    ).toMatchObject({
      kind: 'mindmap',
      label: 'Platform',
      depth: 2,
      parentId: 'root',
      alias: 'platform.api',
      wrapper: 'double-square',
      side: 'left',
      branchStyle: 'straight',
      collapsed: true,
    });
  });

  it('builds cycle-safe direct-child and descendant counts', () => {
    const snapshot = createMindmapHierarchySnapshot([
      node('root', 'mindmap', {}),
      node('child', 'mindmap', { mindmapParentId: 'root' }),
      node('leaf', 'mindmap', { mindmapParentId: 'child' }),
      node('cycle', 'mindmap', { mindmapParentId: 'cycle' }),
      node('cycle-a', 'mindmap', { mindmapParentId: 'cycle-b' }),
      node('cycle-b', 'mindmap', { mindmapParentId: 'cycle-a' }),
    ]);
    expect(snapshot.childCountByNodeId.get('root')).toBe(1);
    expect(snapshot.descendantCountByNodeId.get('root')).toBe(2);
    expect(snapshot.descendantCountByNodeId.get('cycle')).toBe(0);
    expect(snapshot.descendantCountByNodeId.get('cycle-a')).toBe(1);
    expect(snapshot.descendantCountByNodeId.get('cycle-b')).toBe(1);
  });

  it('rejects unrelated families', () => {
    expect(resolveMindmapNodePresentation(node('process', 'process', {}))).toBeNull();
  });
});
