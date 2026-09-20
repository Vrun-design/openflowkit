import { z } from 'zod';
import { buildDeleteSelectionCommand } from '@/opencanvas/domain/commands/sceneEdits';
import { defineAction, requireNode } from './defineAction';

export const deleteNode = defineAction({
  name: 'delete_node',
  description: 'Delete a node, its children, and every connector attached to them.',
  schema: z.object({ id: z.string().min(1) }),
  run: (input, { page }) => {
    requireNode(page, input.id);
    const ids = new Set([input.id]);
    // Children first so a container takes its subtree with it.
    for (let grew = true; grew;) {
      grew = false;
      for (const node of page.nodes) {
        if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) { ids.add(node.id); grew = true; }
      }
    }
    return { command: buildDeleteSelectionCommand(page, [...ids], []), output: { id: input.id } };
  },
});
