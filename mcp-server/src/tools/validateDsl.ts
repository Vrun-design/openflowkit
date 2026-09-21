// Real-DSL validation: the shared parser's diagnostics, plus the note that a
// reserved family parses as graph syntax until its own engine lands.
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { lintDsl } from '../lib/agent.js';

export function registerValidateDsl(server: McpServer): void {
  server.registerTool(
    'validate_openflow_dsl',
    {
      title: 'Validate OpenFlow DSL',
      description:
        'Parse OpenFlow DSL and return structured diagnostics (code, severity, line, column, message). ' +
        'Warnings are recoverable; errors mean the line was dropped. Always run this before create_diagram.',
      inputSchema: { dsl: z.string().describe('The OpenFlow DSL source to validate.') },
    },
    async ({ dsl }) => {
      const report = lintDsl(dsl);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            ok: report.ok,
            family: report.family,
            reservedFamily: report.reserved,
            statements: report.statements,
            lines: report.lines,
            diagnostics: report.diagnostics,
            hint: report.ok
              ? 'Valid. Next: create_diagram(dsl) in the paired editor, or openflow_create + create_diagram for file mode.'
              : 'Fix the errors, then re-validate. See get_syntax for the grammar section that applies.',
          }, null, 2),
        }],
      };
    }
  );
}
