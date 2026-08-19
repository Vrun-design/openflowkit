import { afterEach, describe, expect, it } from 'vitest';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import type { FlowNode } from '@/lib/types';
import { renderStandardNodesLayer } from './nodeLayers';

const node: FlowNode = {
  id: 'node-1',
  type: 'process',
  position: { x: 10, y: 20 },
  width: 200,
  height: 100,
  data: {
    label: 'Deploy',
    icon: 'none',
    contentLayout: {
      version: 1,
      horizontal: 'start',
      vertical: 'start',
      iconPlacement: 'right',
      labelAlignment: 'start',
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      gap: 6,
      iconScale: 1,
      freeIconPosition: { x: 0.5, y: 0.5 },
    },
  },
};

describe('Figma node layout export', () => {
  afterEach(() => {
    ROLLOUT_FLAGS.openCanvasNodeLayoutV1 = false;
  });

  it('uses canonical content geometry when rollout is enabled', () => {
    ROLLOUT_FLAGS.openCanvasNodeLayoutV1 = true;
    const output: string[] = [];
    renderStandardNodesLayer(output, [node], {});
    const svg = output.join('\n');
    expect(svg).toContain('text-anchor="start"');
    expect(svg).toContain('x="20"');
  });

  it('keeps legacy centered export when rollout is disabled', () => {
    const output: string[] = [];
    renderStandardNodesLayer(output, [node], {});
    expect(output.join('\n')).toContain('text-anchor="middle"');
  });
});
