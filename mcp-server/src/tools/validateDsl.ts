// Real-DSL validation: the same parse-then-compile check `openflowkit validate`
// runs, so an agent sees every line the compiler drops. Mermaid converts first;
// the report carries the DSL it became and what did not carry over.
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { check, failed } from '../cliCommands.js';
import { toolError } from '../lib/errors.js';

export function registerValidateDsl(server: McpServer): void {
  server.registerTool(
    'validate_openflow_dsl',
    {
      title: 'Validate OpenFlow DSL',
      description:
        'Parse and compile OpenFlow DSL — or Mermaid, Structurizr DSL or D2, converted first — and return structured diagnostics ' +
        '(code, severity, line, column, message), the same check as `openflowkit validate`. Errors mean it cannot be drawn; ' +
        'warnings name lines that were dropped or guessed. For another language, `converted.dsl` is what it became and ' +
        '`converted.losses` name the lines of your text that did not carry over; diagnostics then refer to `converted.dsl`.',
      inputSchema: { dsl: z.string().describe('OpenFlow DSL, Mermaid, Structurizr DSL or D2 source to validate.') },
    },
    async ({ dsl }) => {
      try {
        const checked = await check(dsl, 'validate', 'none');
        const { lint, issues } = checked;
        const ok = !failed(checked, false);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              ok,
              family: lint.family,
              reservedFamily: lint.reserved,
              statements: lint.statements,
              lines: lint.lines,
              diagnostics: issues,
              ...(lint.converted ? { converted: lint.converted } : {}),
              hint: !ok
                ? 'Fix the errors, then re-validate. See get_syntax for the grammar section that applies.'
                : issues.length > 0
                  ? 'Draws, with warnings: each names a line that was dropped or guessed. Fix them unless that is what you meant.'
                  : 'Valid. Next: create_diagram(dsl) in the paired editor, or openflow_create + create_diagram for file mode.',
            }, null, 2),
          }],
        };
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    }
  );
}
