import { z } from 'zod';
import { defineAction } from './defineAction';

export const getDocument = defineAction({
  name: 'get_document',
  description: 'Read the current page: every node (id, kind, label, position, size) and connector (id, source, target).',
  schema: z.object({}),
  run: (_input, { document, page }) => ({
    command: null,
    output: {
      documentId: document.id,
      pageId: page.id,
      pageName: page.name,
      nodes: page.nodes.map((node) => ({
        id: node.id,
        kind: node.kind,
        label: typeof node.content.label === 'string' ? node.content.label : '',
        parentId: node.parentId,
        x: node.transform.translation.x,
        y: node.transform.translation.y,
        width: node.size.width,
        height: node.size.height,
      })),
      connectors: page.connectors.map((connector) => ({
        id: connector.id,
        source: connector.source.nodeId,
        target: connector.target.nodeId,
        label: connector.labels[0]?.text ?? '',
      })),
    },
  }),
});
