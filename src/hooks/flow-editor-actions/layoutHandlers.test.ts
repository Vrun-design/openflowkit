import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { FlowTemplate } from '@/services/templates';
import { getElkLayout } from '@/services/elkLayout';
import {
  buildTemplateInsertionResult,
  getAutoLayoutResult,
  isMindmapAutoLayoutTarget,
  scheduleFitView,
} from './layoutHandlers';

vi.mock('@/services/elkLayout', () => ({
  getElkLayout: vi.fn(async (nodes: FlowNode[], edges: FlowEdge[]) => ({ nodes, edges })),
}));

function createNode(id: string, type: FlowNode['type'] = 'process'): FlowNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label: id, color: 'slate', shape: 'rounded' },
    selected: true,
  };
}

function createMindmapNode(id: string, data: Partial<FlowNode['data']> = {}): FlowNode {
  return {
    id,
    type: 'mindmap',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      color: 'slate',
      shape: 'rounded',
      ...data,
    },
    selected: true,
  };
}

function createEdge(id: string, source: string, target: string): FlowEdge {
  return { id, source, target };
}

describe('layoutHandlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detects when auto-layout should stay in mindmap mode', () => {
    expect(isMindmapAutoLayoutTarget([createMindmapNode('root')], 'mindmap')).toBe(true);
    expect(isMindmapAutoLayoutTarget([createMindmapNode('root')], undefined)).toBe(true);
    expect(isMindmapAutoLayoutTarget([createNode('n1')], undefined)).toBe(false);
  });

  it('uses ELK for non-mindmap auto-layout targets', async () => {
    const nodes = [createNode('n1')];
    const edges = [createEdge('e1', 'n1', 'n1')];

    const result = await getAutoLayoutResult({
      nodes,
      edges,
      direction: 'LR',
      algorithm: 'layered',
      spacing: 'compact',
      diagramType: 'flowchart',
    });

    expect(getElkLayout).toHaveBeenCalledWith(nodes, edges, {
      direction: 'LR',
      algorithm: 'layered',
      spacing: 'compact',
      diagramType: 'flowchart',
    });
    expect(result).toEqual({ nodes, edges });
  });

  it('builds template insertion data with deselected existing nodes', () => {
    const template: FlowTemplate = {
      id: 'template-1',
      name: 'Template',
      description: '',
      icon: vi.fn() as unknown as FlowTemplate['icon'],
      msg: 'general',
      category: 'flowchart',
      tags: ['test'],
      audience: 'developers',
      useCase: 'Test template insertion',
      launchPriority: 1,
      featured: false,
      difficulty: 'starter',
      outcome: 'Provides a small template fixture for layout tests.',
      replacementHints: ['Primary label', 'Owner'],
      nodes: [{
        id: 'node-a',
        type: 'process',
        position: { x: 10, y: 20 },
        data: { label: 'A', color: 'slate', shape: 'rounded' },
      }],
      edges: [],
    };
    const existingNodes = [createNode('existing')];

    const result = buildTemplateInsertionResult({
      template,
      existingNodes,
    });

    expect(result.nextNodes[0].selected).toBe(false);
    expect(result.nextNodes).toHaveLength(2);
    expect(result.newEdges).toHaveLength(0);
  });

  it('schedules fitView with the provided duration and delay', () => {
    vi.useFakeTimers();
    const fitView = vi.fn();

    scheduleFitView(fitView, 800, 100);
    expect(fitView).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fitView).toHaveBeenCalledWith({ duration: 800 });
    vi.useRealTimers();
  });
});
