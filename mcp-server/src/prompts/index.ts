import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Prompts are reusable templates that MCP clients can offer users as
 * starting points. They steer the model toward the right OpenFlowKit tool
 * with the right arguments.
 */
export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'flowchart_from_description',
    {
      title: 'Create a flowchart from a description',
      description:
        'Guides the assistant to write OpenFlow DSL itself, validate it, and create a viewer URL.',
      argsSchema: {
        description: z
          .string()
          .describe('What the flowchart should represent (e.g. "checkout flow with promo code branch").'),
      },
    },
    ({ description }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Read \`openflowkit://docs/grammar\`, then write OpenFlow DSL yourself for this flowchart.\n\n` +
              `Description:\n${description}\n\n` +
              `Call \`validate_openflow_dsl\` on your DSL and fix any errors. Then call \`create_diagram\` with the final DSL ` +
              `(or \`openflow_create\` + \`create_diagram\` for file mode) and report what was drawn.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    'convert_mermaid_to_openflow',
    {
      title: 'Convert a Mermaid diagram to OpenFlow DSL',
      description: 'Guides the assistant to convert Mermaid to OpenFlow DSL itself and validate it.',
      argsSchema: {
        mermaidSource: z.string().describe('The Mermaid diagram to convert.'),
      },
    },
    ({ mermaidSource }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Read \`openflowkit://docs/grammar\`, then convert this Mermaid source into OpenFlow DSL yourself.\n\n` +
              `Mermaid source:\n\`\`\`mermaid\n${mermaidSource}\n\`\`\`\n\n` +
              `Preserve direction, node labels, edge labels, and edge emphasis where possible. Call \`validate_openflow_dsl\`, fix any errors, then draw it with \`create_diagram\`. Return the final DSL and lint status.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    'architecture_from_codebase',
    {
      title: 'Draft an architecture diagram from a local codebase',
      description: 'Guides the assistant to scan a local project, write OpenFlow DSL itself, and validate it.',
      argsSchema: {
        rootPath: z.string().describe('Absolute path to the project root.'),
      },
    },
    ({ rootPath }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Call \`analyze_codebase\` on rootPath=\`${rootPath}\`, then read \`openflowkit://docs/grammar\`.\n\n` +
              `Write an OpenFlow DSL architecture diagram yourself from the scan. Use \`search_icons\` before assigning architecture icon slugs. Call \`validate_openflow_dsl\`, fix any errors, then draw it with \`create_diagram\`.\n\n` +
              `Return the final DSL, lint status, viewer URL, and a short architecture summary.`,
          },
        },
      ],
    })
  );
}
