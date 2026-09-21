import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { findStarterTemplate, STARTER_TEMPLATES } from '../lib/starterTemplates.js';
import { toolError } from '../lib/errors.js';
import { lintDsl } from '../lib/agent.js';

export function registerGetTemplate(server: McpServer): void {
  server.registerTool(
    'get_starter_template',
    {
      title: 'Get a starter template',
      description:
        'Return the OpenFlow DSL for a named starter template. Use ' +
        'list_starter_templates to discover available names.',
      inputSchema: {
        name: z
          .string()
          .describe('Template name (one of: ' + STARTER_TEMPLATES.map((t) => t.name).join(', ') + ').'),
      },
    },
    async (args) => {
      const template = findStarterTemplate(args.name);
      if (!template) {
        return toolError(
          `Unknown template "${args.name}". Available: ${STARTER_TEMPLATES.map((t) => t.name).join(', ')}`
        );
      }
      return {
        content: [
          { type: 'text' as const, text: template.dsl },
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                name: template.name,
                title: template.title,
                family: template.family,
                summary: template.summary,
                lint: lintDsl(template.dsl),
                next: 'create_diagram(dsl) to draw it (paired editor) or openflow_create + create_diagram (file mode).',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
