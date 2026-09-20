import { z } from 'zod';
import { buildMoveNodesCommand } from '@/opencanvas/domain/commands/sceneEdits';
import { defineAction, requireNode } from './defineAction';

export const moveNode = defineAction({
  name: 'move_node',
  description: 'Move a node to an absolute position on the page.',
  schema: z.object({ id: z.string().min(1), x: z.number().finite(), y: z.number().finite() }),
  run: (input, { page }) => {
    const { translation } = requireNode(page, input.id).transform;
    const delta = { x: input.x - translation.x, y: input.y - translation.y };
    return {
      command: delta.x === 0 && delta.y === 0 ? null : buildMoveNodesCommand(page, [input.id], delta),
      output: { id: input.id },
    };
  },
});
