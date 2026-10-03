// Real-DSL validation: the shared parser's diagnostics, plus the note that a
// reserved family parses as graph syntax until its own engine lands. Mermaid
// converts first; the report carries the DSL it became and what did not carry over.
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { lintDsl } from '../lib/agent.js';

export function registerValidateDsl(server: McpServer): void {
  server.registerTool(
    'validate_openflow_dsl',
    {
      title: 'Validate OpenFlow DSL',
      description:
        'Parse OpenFlow DSL (or Mermaid, converted first) and return structured diagnostics (code, severity, line, column, message). ' +
        'Warnings are recoverable; errors mean the line was dropped. For Mermaid, `mermaid.dsl` is what it became and ' +
        '`mermaid.losses` name the Mermaid lines that did not carry over; diagnostics refer to `mermaid.dsl`.',
      inputSchema: { dsl: z.string().describe('OpenFlow DSL or Mermaid source to validate.') },
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
            ...(report.mermaid ? { mermaid: report.mermaid } : {}),
            hint: report.ok
              ? 'Valid. Next: create_diagram(dsl) in the paired editor, or openflow_create + create_diagram for file mode.'
              : 'Fix the errors, then re-validate. See get_syntax for the grammar section that applies.',
          }, null, 2),
        }],
      };
    }
  );
}
