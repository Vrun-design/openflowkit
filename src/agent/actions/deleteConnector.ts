import { z } from 'zod';
import { buildDeleteSelectionCommand } from '@/opencanvas/domain/commands/sceneEdits';
import { defineAction } from './defineAction';

export const deleteConnector = defineAction({
  name: 'delete_connector',
  description: 'Delete one connector.',
  schema: z.object({ id: z.string().min(1) }),
  run: (input, { page }) => {
    if (!page.connectors.some((connector) => connector.id === input.id)) {
      throw new RangeError(`Connector "${input.id}" was not found.`);
    }
    return { command: buildDeleteSelectionCommand(page, [], [input.id]), output: { id: input.id } };
  },
});
