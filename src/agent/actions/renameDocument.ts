import { z } from 'zod';
import { defineAction } from './defineAction';

export const renameDocument = defineAction({
  name: 'rename_document',
  description: 'Rename the document.',
  schema: z.object({ name: z.string().trim().min(1) }),
  run: (input, { document }) => ({
    command: input.name === document.name ? null : {
      kind: 'set-document-name', id: `rename-document:${document.id}`, label: 'Rename document',
      before: document.name, after: input.name,
    },
    output: { name: input.name },
  }),
});
