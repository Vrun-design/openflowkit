import { describe, expect, it } from 'vitest';
import type { JsonObject } from '../document/json';
import type { SceneNode } from '../document/types';
import { createPixiSpikePage } from '../../infrastructure/pixi/spikeFixture';
import { resolveContainerNodePresentation } from './containerNodePresentation';

function node(kind: string, content: JsonObject, id = 'node-0'): SceneNode {
  return { ...createPixiSpikePage(1).nodes[0], id, kind, content };
}

describe('container node presentation', () => {
  it('resolves group state through shared authored colors', () => {
    expect(
      resolveContainerNodePresentation(
        node('group', {
          label: 'Platform',
          subLabel: '3 services',
          color: 'custom',
          customColor: '#2563eb',
          sectionLocked: true,
          sectionCollapsed: true,
        })
      )
    ).toEqual({
      kind: 'group',
      label: 'Platform',
      subLabel: '3 services',
      colorKey: 'custom',
      colorMode: 'subtle',
      customColor: '#2563eb',
      locked: true,
      hidden: false,
      collapsed: true,
    });
  });

  it('keeps deterministic legacy defaults for each container family', () => {
    expect(resolveContainerNodePresentation(node('group', {}))).toMatchObject({
      label: 'Group',
      colorKey: 'violet',
    });
    expect(resolveContainerNodePresentation(node('section', {}))).toMatchObject({
      label: 'Section',
      colorKey: 'blue',
    });
    expect(resolveContainerNodePresentation(node('swimlane', {}, 'lane-2'))).toMatchObject({
      label: 'Swimlane',
      colorKey: 'yellow',
    });
  });

  it('rejects non-container node families', () => {
    expect(resolveContainerNodePresentation(node('process', {}))).toBeNull();
  });
});
