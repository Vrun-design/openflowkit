import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { STARTER_TEMPLATES } from '../lib/starterTemplates.js';

export function registerListTemplates(server: McpServer): void {
  server.registerTool(
    'list_starter_templates',
    {
      title: 'List starter templates',
      description:
        'List built-in OpenFlow starter templates that can be loaded without any AI ' +
        'call. Returns names, titles, categories, and one-line summaries.',
    },
    async () => ({
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            STARTER_TEMPLATES.map(({ name, title, family, summary }) => ({
              name,
              title,
              family,
              summary,
            })),
            null,
            2
          ),
        },
      ],
    })
  );
}
