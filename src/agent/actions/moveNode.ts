import { z } from 'zod';
import { defineAction, requireNode } from './defineAction';

export const moveNode = defineAction({
  name: 'move_node',
  description: 'Move a node to an absolute position on the page.',
  schema: z.object({ id: z.string().min(1), x: z.number().finite(), y: z.number().finite() }),
  run: (input, { page }) => {
    const node = requireNode(page, input.id);
    const translation = { x: input.x, y: input.y };
    return {
      command: {
        kind: 'set-node', id: `move-node:${node.id}`, label: 'Move node', pageId: page.id,
        before: node, after: { ...node, transform: { ...node.transform, translation } },
      },
      output: { id: node.id },
    };
  },
});
